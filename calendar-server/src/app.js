import express from "express";
import helmet from "helmet";
import { randomUUID } from "node:crypto";
import { TRUSTED_CALENDAR_PROJECT, TRUSTED_CALENDAR_ORIGIN, TRUSTED_CALENDAR_PORT } from "../../backend/src/calendar/emulatorConfig.js";
import { CALENDAR_SERVER_PROTOCOL } from "../../frontend/lib/calendarServerProtocol.js";
import { createCalendarLimits } from "../../backend/src/calendar/limits.js";
const errorResponse = (res, status, code, message) => res.status(status).json({ code, message });
export function createTrustedCalendarApp({ auth, execute, probe, resourceStatus, runtime = { mode: "emulator", projectId: TRUSTED_CALENDAR_PROJECT, apiOrigin: `http://127.0.0.1:${TRUSTED_CALENDAR_PORT}`, origins: [TRUSTED_CALENDAR_ORIGIN], writable: true }, limits = createCalendarLimits(runtime.mode === "emulator" ? { globalLimit: 600, userLimit: 120 } : {}), log = () => {} }) {
  if (runtime.connectivity && runtime.writable) throw new Error("Connectivity cannot run alongside writes");
  if (runtime.resourceStatus && (runtime.connectivity || runtime.writable || typeof resourceStatus !== "function")) throw new Error("Staging resource status must be read-only");
  const app = express();app.disable("x-powered-by");app.use(helmet());
  app.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    const host = new URL(runtime.apiOrigin).host;
    if (req.headers.host !== host || req.headers.origin && !runtime.origins.includes(req.headers.origin)) return errorResponse(res, 403, "permission-denied", "Origin ไม่ตรงกับพื้นที่ทดลอง");
    if (req.headers.origin) res.set("Access-Control-Allow-Origin", req.headers.origin);
    res.set("Vary", "Origin");res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.set("Access-Control-Allow-Methods", runtime.resourceStatus && req.path === "/api/resource-status" ? "GET, OPTIONS" : "POST, OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });
  app.get("/health", (_req, res) => res.json({ ok: true, projectId: runtime.projectId, mode: runtime.mode, protocol: CALENDAR_SERVER_PROTOCOL, writesEnabled: runtime.writable, connectivityEnabled: runtime.connectivity === true, emulator: runtime.mode === "emulator" }));
  if (runtime.resourceStatus) app.get("/api/resource-status", resourceStatus);
  // The browser sends plain JSON. Reject encoded bodies before creating a decompressor (GHSA-27r3-jxmh-p828).
  app.use(express.json({ limit: "256kb", strict: true, inflate: false }));
  for (const kind of ["create", "mutate", "connectivity"]) app.post(`/api/calendar/${kind}`, async (req, res, next) => {
    const started = Date.now(), requestId = randomUUID();res.set("X-Request-Id", requestId);
    res.on("finish", () => log({ event: kind === "connectivity" ? "calendar-connectivity" : "calendar-write", requestId, status: res.statusCode, durationMs: Date.now() - started }));
    let release;
    try {
      if (kind === "connectivity" ? runtime.connectivity !== true : !runtime.writable) return errorResponse(res, 503, kind === "connectivity" ? "calendar-connectivity-disabled" : "calendar-write-disabled", "พื้นที่นี้ยังไม่เปิดรับคำสั่งนี้");
      if (!limits.request()) { res.set("Retry-After", "60");return errorResponse(res, 429, "calendar-write-busy", "คำขอเกินขอบเขต กรุณารอแล้วส่งชุดเดิม"); }
      const header = req.headers.authorization;
      if (!/^Bearer \S{1,10000}$/.test(header || "")) return errorResponse(res, 401, "unauthenticated", "เข้าสู่ระบบก่อนใช้คำสั่ง");
      let decoded;
      try { decoded = await auth.verifyIdToken(header.slice(7), true); }
      catch (error) {
        if (kind === "connectivity" && !["auth/argument-error", "auth/invalid-id-token", "auth/id-token-expired", "auth/id-token-revoked", "auth/user-disabled", "auth/user-not-found"].includes(error.code)) return errorResponse(res, 503, "unavailable", "ตรวจการเชื่อมต่อไม่สำเร็จ โปรดลองใหม่");
        return errorResponse(res, 401, "unauthenticated", "session หมดอายุหรือไม่ตรง project");
      }
      if (decoded.aud !== runtime.projectId || decoded.iss !== `https://securetoken.google.com/${runtime.projectId}` || typeof decoded.uid !== "string" || !decoded.uid || decoded.uid.includes("/")) return errorResponse(res, 401, "unauthenticated", "session ไม่ตรงพื้นที่ทดลอง");
      if (!req.is("application/json") || !req.body || typeof req.body !== "object" || Array.isArray(req.body)) return errorResponse(res, 400, "calendar-write-validation", "รูปแบบคำขอไม่ถูกต้อง");
      if (kind === "connectivity" && Object.keys(req.body).length) return errorResponse(res, 400, "calendar-write-validation", "การตรวจเชื่อมต่อไม่รับข้อมูลเพิ่มเติม");
      release = limits.enter(decoded.uid);
      if (!release) { res.set("Retry-After", "60");return errorResponse(res, 429, "calendar-write-busy", "มีคำขอกำลังทำงานหรือเกินขอบเขต กรุณารอแล้วส่งชุดเดิม"); }
      if (kind === "connectivity") {
        const checks = await probe(decoded.uid);
        if (!["auth", "profile", "gate", "classrooms", "exams"].every(key => checks?.[key] === true)) throw new Error("Incomplete connectivity result");
        res.json({ ok: true, projectId: runtime.projectId, mode: runtime.mode, protocol: CALENDAR_SERVER_PROTOCOL, writesEnabled: false, checks: { auth: true, profile: true, gate: true, classrooms: true, exams: true } });
      } else res.json(await execute(kind, decoded.uid, req.body));
    } catch (error) { next(error); } finally { release?.(); }
  });
  app.use((_req, res) => errorResponse(res, 404, "not-found", "ไม่พบคำสั่ง"));
  app.use((error, req, res, _next) => {
    if (error.code === "permission-denied") return errorResponse(res, 403, error.code, "บัญชีนี้ไม่มีสิทธิ์ใช้คำสั่งปฏิทิน");
    if (["calendar-write-validation", "calendar-write-stale"].includes(error.code)) return errorResponse(res, error.code === "calendar-write-stale" ? 409 : 400, error.code, error.message);
    if (error.type === "encoding.unsupported") return errorResponse(res, 415, "calendar-write-validation", "ส่ง JSON ปกติโดยไม่บีบอัดข้อมูล");
    if (error.type === "entity.parse.failed" || error.type === "entity.too.large") return errorResponse(res, error.status, "calendar-write-validation", "JSON ไม่ถูกต้องหรือคำขอใหญ่เกินกำหนด");
    // Do not leak request bodies, ID tokens, Admin errors or credentials into logs/responses.
    if (req.path === "/api/calendar/connectivity") return errorResponse(res, 503, "unavailable", "ตรวจการเชื่อมต่อไม่สำเร็จ โปรดลองใหม่");
    return errorResponse(res, 503, "unavailable", "ยังยืนยันผลไม่ได้ โปรดส่งชุดเดิมเพื่อตรวจ receipt");
  });
  return app;
}
