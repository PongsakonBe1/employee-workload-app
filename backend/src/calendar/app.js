import express from "express";
import helmet from "helmet";
import { TRUSTED_CALENDAR_PROJECT, TRUSTED_CALENDAR_ORIGIN, TRUSTED_CALENDAR_PORT } from "./emulatorConfig.js";
const errorResponse = (res, status, code, message) => res.status(status).json({ code, message });
export function createTrustedCalendarApp({ auth, execute }) {
  const app = express();app.disable("x-powered-by");app.use(helmet());
  app.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (req.headers.host !== `127.0.0.1:${TRUSTED_CALENDAR_PORT}` || req.headers.origin && req.headers.origin !== TRUSTED_CALENDAR_ORIGIN) return errorResponse(res, 403, "permission-denied", "Origin ไม่ตรงกับพื้นที่ทดลอง");
    res.set("Access-Control-Allow-Origin", TRUSTED_CALENDAR_ORIGIN);
    res.set("Vary", "Origin");res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });
  app.get("/health", (_req, res) => res.json({ ok: true, projectId: TRUSTED_CALENDAR_PROJECT, emulator: true }));
  app.use(express.json({ limit: "256kb", strict: true }));
  for (const kind of ["create", "mutate"]) app.post(`/api/calendar/${kind}`, async (req, res, next) => {
    try {
      const header = req.headers.authorization;
      if (!/^Bearer \S{1,10000}$/.test(header || "")) return errorResponse(res, 401, "unauthenticated", "เข้าสู่ระบบก่อนบันทึก");
      let decoded;
      try { decoded = await auth.verifyIdToken(header.slice(7), true); }
      catch { return errorResponse(res, 401, "unauthenticated", "session หมดอายุหรือไม่ตรง project"); }
      if (decoded.aud !== TRUSTED_CALENDAR_PROJECT || decoded.iss !== `https://securetoken.google.com/${TRUSTED_CALENDAR_PROJECT}` || typeof decoded.uid !== "string" || !decoded.uid || decoded.uid.includes("/")) return errorResponse(res, 401, "unauthenticated", "session ไม่ตรงพื้นที่ทดลอง");
      if (!req.is("application/json") || !req.body || typeof req.body !== "object" || Array.isArray(req.body)) return errorResponse(res, 400, "calendar-write-validation", "รูปแบบคำขอไม่ถูกต้อง");
      res.json(await execute(kind, decoded.uid, req.body));
    } catch (error) { next(error); }
  });
  app.use((_req, res) => errorResponse(res, 404, "not-found", "ไม่พบคำสั่ง"));
  app.use((error, _req, res, _next) => {
    if (error.code === "permission-denied") return errorResponse(res, 403, error.code, "บัญชีนี้ไม่มีสิทธิ์เขียนปฏิทิน");
    if (["calendar-write-validation", "calendar-write-stale"].includes(error.code)) return errorResponse(res, error.code === "calendar-write-stale" ? 409 : 400, error.code, error.message);
    if (error.type === "entity.parse.failed" || error.type === "entity.too.large") return errorResponse(res, error.status, "calendar-write-validation", "JSON ไม่ถูกต้องหรือคำขอใหญ่เกินกำหนด");
    // Do not leak request bodies, ID tokens, Admin errors or credentials into logs/responses.
    return errorResponse(res, 503, "unavailable", "ยังยืนยันผลไม่ได้ โปรดส่งชุดเดิมเพื่อตรวจ receipt");
  });
  return app;
}
