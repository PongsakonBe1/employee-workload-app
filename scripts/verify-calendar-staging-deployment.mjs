// Approved write-off service only. Never sends ID tokens or Firebase SDK/database requests.
import fs from "node:fs";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { gzipSync } from "node:zlib";
import { STAGING_CALENDAR_API_ORIGIN as origin, STAGING_CALENDAR_PROJECT, CALENDAR_SERVER_PROTOCOL } from "../frontend/lib/calendarServerProtocol.js";
import { createCalendarServerReadiness } from "../frontend/lib/calendarServerReadiness.js";
const output = process.argv.includes("--hardening") ? "output/playwright/calendar-runtime-hardening-deploy" : "output/playwright/calendar-staging-server-deploy", checks = [], requests = [];
fs.mkdirSync(output, { recursive: true });
const allowedOrigin = "http://127.0.0.1:4311", deniedOrigin = "https://unreviewed.example.test";
async function call(path, options = {}) {
  const start = performance.now(), startedAt = new Date().toISOString();
  const response = await fetch(origin + path, { redirect: "error", credentials: "omit", cache: "no-store", signal: AbortSignal.timeout(90000), ...options });
  const text = await response.text();assert.ok(text.length < 8192, "Small API response expected");
  const value = text && response.headers.get("content-type")?.includes("application/json") ? JSON.parse(text) : null;
  const record = { path, method: options.method || "GET", status: response.status, elapsedMs: Math.round(performance.now() - start), startedAt, completedAt: new Date().toISOString() };requests.push(record);
  return { response, text, value };
}
function healthy(result) {
  assert.equal(result.response.status, 200);assert.deepEqual(result.value, { ok: true, projectId: STAGING_CALENDAR_PROJECT, mode: "staging", protocol: CALENDAR_SERVER_PROTOCOL, writesEnabled: false, emulator: false });
  assert.equal(result.response.headers.get("cache-control"), "no-store");
}
let failure, warmupElapsedMs;
try {
  if (process.argv.includes("--cold")) {
    // Start only after an operator-observed idle interval; this script does not probe while idle.
    let peer;
    const fetcher = async (url, options) => {
      assert.equal(url, origin + "/health");assert.equal(options.method, "GET");assert.equal(options.headers, undefined);
      const start = performance.now(), startedAt = new Date().toISOString();
      try {
        const response = await fetch(url, options), type = response.headers.get("content-type");
        requests.push({ path: "/health", method: "GET", status: response.status, contentType: type, elapsedMs: Math.round(performance.now() - start), startedAt, completedAt: new Date().toISOString() });
        if (response.ok && type?.includes("application/json")) peer = { response, value: await response.clone().json() };
        return response;
      } catch (error) { requests.push({ path: "/health", method: "GET", status: 0, elapsedMs: Math.round(performance.now() - start), startedAt, completedAt: new Date().toISOString(), networkFailure: true });throw error; }
    };
    const started = performance.now();
    await assert.rejects(createCalendarServerReadiness({ origin, fetcher })(), error => error.code === "calendar-write-preflight" && error.message.includes("ยังไม่เปิดรับบันทึก"));
    warmupElapsedMs = Math.round(performance.now() - started);healthy(peer);
    checks.push("actual frontend readiness GET-only loop reached the exact write-off peer after idle within its 90-second budget, then correctly denied submission");
    healthy(await call("/health"));checks.push("follow-up warm GET still reports writes disabled");
  } else {
    healthy(await call("/health"));checks.push("HTTPS peer has the exact staging project/mode/protocol, writes=false and emulator=false");
    const head = await call("/health", { method: "HEAD" });assert.equal(head.response.status, 200);assert.equal(head.text, "");checks.push("HEAD health returns no body");
    const cors = await call("/health", { headers: { Origin: allowedOrigin } });healthy(cors);assert.equal(cors.response.headers.get("access-control-allow-origin"), allowedOrigin);assert.match(cors.response.headers.get("vary"), /Origin/);checks.push("exact allowed browser origin accepted without cookies or token");
    for (const path of ["create", "mutate"]) {
      const result = await call("/api/calendar/" + path, { method: "POST", headers: { Origin: allowedOrigin, "Content-Type": "application/json" }, body: "{}" });
      assert.equal(result.response.status, 503);assert.equal(result.value.code, "calendar-write-disabled");assert.ok(result.response.headers.get("x-request-id"));
    }
    checks.push("both write endpoints reject empty unauthenticated probes with calendar-write-disabled before Auth/execute");
    const compressed = await call("/api/calendar/create", { method: "POST", headers: { Origin: allowedOrigin, "Content-Type": "application/json", "Content-Encoding": "gzip" }, body: gzipSync(Buffer.from("{}")) });
    assert.equal(compressed.response.status, 415);assert.equal(compressed.value.code, "calendar-write-validation");healthy(await call("/health"));
    checks.push("benign valid gzip rejected with 415 and health remains available; no exploit payload sent to cloud");
    const preflight = await call("/api/calendar/create", { method: "OPTIONS", headers: { Origin: allowedOrigin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization,content-type" } });assert.equal(preflight.response.status, 204);assert.equal(preflight.response.headers.get("access-control-allow-origin"), allowedOrigin);checks.push("allowed POST CORS preflight succeeds");
    for (const method of ["GET", "OPTIONS"]) {
      const denied = await call(method === "GET" ? "/health" : "/api/calendar/create", { method, headers: { Origin: deniedOrigin } });assert.equal(denied.response.status, 403);assert.equal(denied.response.headers.get("access-control-allow-origin"), null);
    }
    checks.push("unreviewed origin GET and preflight denied without reflected CORS");
  }
} catch (error) { failure = error; }
const report = { passed: !failure, targetOrigin: origin, requests, checks, ...(warmupElapsedMs !== undefined ? { warmupElapsedMs } : {}), idTokensSent: false, firebaseSdkUsed: false, firebaseDataOperationsRequested: false, ...(failure ? { failure: { code: failure.code || "unknown", message: failure.message } } : {}) };
fs.writeFileSync(output + (process.argv.includes("--cold") ? "/cold-start-report.json" : "/https-smoke-report.json"), JSON.stringify(report, null, 2));console.log(JSON.stringify(report));if (failure) process.exitCode = 1;
