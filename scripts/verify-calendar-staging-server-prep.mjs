// Local HTTP and copied-monorepo smoke only. No cloud SDK credentials, install, deploy or service creation.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import net from "node:net";
import http from "node:http";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createTrustedCalendarApp } from "../backend/src/calendar/app.js";
import { createCalendarLimits } from "../backend/src/calendar/limits.js";
import { STAGING_CALENDAR_PROJECT, STAGING_CALENDAR_API_ORIGIN } from "../frontend/lib/calendarServerProtocol.js";
const require = createRequire(import.meta.url), yaml = require("js-yaml");
const output = "output/playwright/calendar-staging-server-prep", checks = [], servers = [];
fs.mkdirSync(output, { recursive: true });
const runtime = { mode: "staging", projectId: STAGING_CALENDAR_PROJECT, apiOrigin: STAGING_CALENDAR_API_ORIGIN, origins: ["http://127.0.0.1:4311"], writable: true };
const result = { created: 1, skipped: 0, operationId: "op-" + "a".repeat(64), repeated: false };
const host = new URL(STAGING_CALENDAR_API_ORIGIN).host;
// Node fetch rewrites Host; use node:http to exercise the reviewed virtual host locally.
function localRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const request = http.request(url, { method: options.method || "GET", headers: options.headers, timeout: 10000 }, response => {
      const chunks = [];response.on("data", chunk => chunks.push(chunk));response.on("end", () => { const text = Buffer.concat(chunks).toString();resolve({ status: response.statusCode, text, value: text ? JSON.parse(text) : null, headers: new Headers(response.headers) }); });
    });request.on("error", reject);request.on("timeout", () => request.destroy(new Error("Local request timeout")));request.end(options.body);
  });
}
async function serving(app) {
  const server = app.listen(0, "127.0.0.1");servers.push(server);await new Promise((resolve, reject) => { server.once("listening", resolve);server.once("error", reject); });
  const origin = "http://127.0.0.1:" + server.address().port;
  return async (route, { token = "synthetic-good", body = {}, headers = {}, method = "POST" } = {}) => {
    return localRequest(origin + route, { method, headers: { Host: host, Origin: runtime.origins[0], "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}), ...headers }, ...(method === "POST" ? { body: typeof body === "string" ? body : JSON.stringify(body) } : {}) });
  };
}
function fixture({ writable = true, execute, limits } = {}) {
  const calls = [], logs = [], authCalls = [];
  const auth = { async verifyIdToken(token, revoked) {
    authCalls.push({ token, revoked });if (token === "synthetic-bad") throw new Error("Synthetic invalid token");
    const project = token === "synthetic-wrong" ? "labboy-workload-app" : STAGING_CALENDAR_PROJECT;
    return { uid: token === "synthetic-other" ? "synthetic-other-user" : "synthetic-user", aud: project, iss: "https://securetoken.google.com/" + project };
  } };
  return { calls, logs, authCalls, app: createTrustedCalendarApp({ runtime: { ...runtime, writable }, auth, limits, execute: async (...args) => { calls.push(args);return execute ? execute(...args) : result; }, log: event => logs.push(event) }) };
}
let failure, child;
try {
  const blueprint = yaml.load(fs.readFileSync("deploy/calendar-staging/render.yaml", "utf8"));assert.equal(blueprint.services.length, 1);const service = blueprint.services[0];
  assert.equal(service.name, "labboy-calendar-staging");assert.equal(service.runtime, "node");assert.equal(service.autoDeployTrigger, "off");assert.equal(service.rootDir, undefined);assert.equal(service.startCommand, "node backend/src/calendar/staging-server.js");
  assert.ok(service.buildCommand.includes("--workspace backend"));assert.ok(service.buildCommand.includes("--include-workspace-root"));
  const env = Object.fromEntries(service.envVars.map(row => [row.key, row.value]));assert.equal(env.CALENDAR_SERVER_WRITE, "0");assert.equal(env.GCLOUD_PROJECT, STAGING_CALENDAR_PROJECT);assert.equal(env.CALENDAR_API_ORIGIN, STAGING_CALENDAR_API_ORIGIN);
  const iam = JSON.parse(fs.readFileSync("deploy/calendar-staging/iam-role.review.json", "utf8"));assert.equal(iam.targetProjectId, STAGING_CALENDAR_PROJECT);assert.ok(iam.includedPermissions.includes("firebaseauth.users.get"));assert.ok(iam.includedPermissions.every(permission => !permission.includes("delete") && !permission.startsWith("iam.")));checks.push("Blueprint YAML parsed; repo-root layout; no auto-deploy, extra services, or enabled writer; IAM draft excludes delete/admin");
  const disabled = fixture({ writable: false }), requestOff = await serving(disabled.app);
  const health = await requestOff("/health", { method: "GET" });assert.equal(health.value.writesEnabled, false);assert.equal(health.value.protocol, 1);assert.ok(health.text.length < 4096);assert.equal((await requestOff("/health", { method: "HEAD" })).text, "");
  assert.equal((await requestOff("/api/calendar/create")).value.code, "calendar-write-disabled");assert.equal(disabled.authCalls.length, 0);assert.equal(disabled.calls.length, 0);checks.push("write-off GET/HEAD health is small; POST rejected before Auth or Firestore");
  const normal = fixture(), request = await serving(normal.app);
  for (const token of [null, "synthetic-bad", "synthetic-wrong"]) assert.equal((await request("/api/calendar/create", { token })).status, 401);
  assert.equal((await request("/api/calendar/create", { headers: { Origin: "https://unreviewed.example.test" } })).status, 403);
  assert.equal((await request("/api/calendar/create", { headers: { Host: "employee-workload-app.onrender.com" } })).status, 403);
  assert.equal((await request("/api/calendar/create", { body: "{" })).status, 400);
  assert.equal((await request("/api/calendar/create", { body: { text: "x".repeat(300000) } })).status, 413);
  assert.equal(normal.calls.length, 0);const ok = await request("/api/calendar/create", { body: { rules: [], events: [] } });assert.equal(ok.status, 200);assert.ok(ok.headers.get("x-request-id"));assert.ok(normal.authCalls.every(row => row.revoked === true));
  for (const event of normal.logs) { assert.deepEqual(Object.keys(event).sort(), ["durationMs", "event", "requestId", "status"]);assert.ok(!JSON.stringify(event).includes("synthetic-good")); }
  checks.push("HTTP token audience/issuer, Host/Origin, JSON/body size and revocation flag checked; logs contain no token/body/UID");
  const capped = fixture({ limits: createCalendarLimits({ globalLimit: 1 }) }), capRequest = await serving(capped.app);
  assert.equal((await capRequest("/api/calendar/create", { token: "synthetic-bad" })).status, 401);const capResult = await capRequest("/api/calendar/create");assert.equal(capResult.status, 429);assert.equal(capResult.value.code, "calendar-write-busy");assert.equal(capped.authCalls.length, 1);assert.equal(capped.calls.length, 0);
  checks.push("global request cap rejects before expensive Auth/transaction calls");
  let release, entered;const started = new Promise(resolve => { entered = resolve; });
  const concurrent = fixture({ limits: createCalendarLimits({ concurrent: 1 }), execute: () => new Promise(resolve => { release = () => resolve(result);entered(); }) }), concurrentRequest = await serving(concurrent.app);
  const pending = concurrentRequest("/api/calendar/create");await started;assert.equal((await concurrentRequest("/api/calendar/create", { token: "synthetic-other" })).status, 429);assert.equal(concurrent.calls.length, 1);release();assert.equal((await pending).status, 200);checks.push("active transaction slots bounded and admission failure does not execute a second write");
  const folder = path.resolve(".tools/calendar-staging/server-package-" + Date.now());fs.mkdirSync(folder, { recursive: true });
  const backendFiles = fs.readdirSync("backend/src/calendar").filter(file => file.endsWith(".js") && !file.endsWith(".test.js")).map(file => "backend/src/calendar/" + file);
  const copied = [...backendFiles, "package.json", "package-lock.json", "backend/package.json", "frontend/package.json", ...["calendarServerProtocol.js", "calendarCreatePlan.js", "calendarMutationPlan.js", "calendarDataAdapter.js", "calendarView.js"].map(file => "frontend/lib/" + file)];
  for (const file of copied) { const destination = path.join(folder, file);fs.mkdirSync(path.dirname(destination), { recursive: true });fs.copyFileSync(file, destination); }
  const importProbe = spawn(process.execPath, ["--input-type=module", "-e", "await import('./backend/src/calendar/service.js')"], { cwd: folder, windowsHide: true, stdio: "pipe" });
  const importCode = await new Promise(resolve => importProbe.once("exit", resolve));assert.equal(importCode, 0, "Copied service and shared planner imports resolve");checks.push("copied service imports resolve shared frontend planners from repository-root layout");
  const probe = net.createServer();await new Promise(resolve => probe.listen(0, "127.0.0.1", resolve));const port = probe.address().port;await new Promise(resolve => probe.close(resolve));
  const childEnv = Object.fromEntries(["PATH", "SystemRoot", "WINDIR", "TEMP", "TMP"].filter(key => process.env[key]).map(key => [key, process.env[key]]));Object.assign(childEnv, env, { PORT: String(port) });
  let exited = false;child = spawn(process.execPath, [path.join(folder, service.startCommand.slice(5))], { cwd: folder, env: childEnv, windowsHide: true, stdio: "pipe" });child.on("exit", () => { exited = true; });
  let warmed;
  for (let attempt = 0; attempt < 50 && !exited; attempt++) {
    try { const response = await localRequest(`http://127.0.0.1:${port}/health`, { headers: { Host: host } });if (response.status === 200) { warmed = response.value;break; } } catch { /* Wait for local child startup, not a cloud service. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(warmed?.projectId, STAGING_CALENDAR_PROJECT);assert.equal(warmed.writesEnabled, false);
  const noSdk = await localRequest(`http://127.0.0.1:${port}/api/calendar/create`, { method: "POST", headers: { Host: host, "Content-Type": "application/json" }, body: "{}" });assert.equal(noSdk.value.code, "calendar-write-disabled");
  checks.push("copied monorepo production entry boots write-disabled without secret file/ADC or cloud requests; clean npm ci not run");
} catch (error) { failure = error; }
finally { if (child && child.exitCode === null) { child.kill("SIGTERM");await new Promise(resolve => child.once("exit", resolve)); }for (const server of servers) await new Promise(resolve => server.close(resolve)); }
const report = { passed: !failure, checks, cloudUsed: false, installedPackages: false, blueprintValidation: "Local YAML parse and reviewed constraints; not Render CLI/API validation", credentialFilesOpened: false, ...(failure ? { failure: { code: failure.code || "unknown", message: failure.message } } : {}) };
fs.writeFileSync(output + "/http-package-report.json", JSON.stringify(report, null, 2));console.log(JSON.stringify(report));if (failure) process.exitCode = 1;
