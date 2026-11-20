import { afterEach, describe, expect, it, vi } from "vitest";
import http from "node:http";
import { createCalendarConnectivityProbe } from "./connectivity.js";
import { createTrustedCalendarApp } from "../../../calendar-server/src/app.js";
import { validateStagingCalendarRuntime } from "./stagingConfig.js";
import { validateTrustedCalendarRuntime } from "./emulatorConfig.js";
const projectId = "demo-calendar-trusted";
const profile = { active: true, role: "superadmin", calendarWriter: true };
function fixture(user = profile, revision = 0) {
  const queries = [], reads = [];
  const db = { projectId, doc: path => ({ get: async () => { reads.push(path);return { exists: path.startsWith("users/") ? Boolean(user) : revision !== null, data: () => path.startsWith("users/") ? user : { revision } }; } }), collection: name => ({ limit: count => ({ get: async () => { queries.push([name, count]);return { docs: [] }; } }) }) };
  return { db, queries, reads, probe: createCalendarConnectivityProbe({ db, projectId }) };
}
describe("bounded, read-only Calendar connectivity service", () => {
  it("reads only own profile, gate and two limit-one queries, returns no data", async () => {
    const f = fixture();expect(await f.probe("synthetic-admin")).toEqual({ auth: true, profile: true, gate: true, classrooms: true, exams: true });
    expect(f.reads).toEqual(["users/synthetic-admin", "calendarWriteState/main"]);expect(f.queries).toEqual([["classroomSchedules", 1], ["dlExamSchedules", 1]]);
  });
  it.each([null, { ...profile, role: "staff" }, { ...profile, active: false }, { ...profile, calendarWriter: false }])("rejects unauthorized profiles before gate/query reads", async user => {
    const f = fixture(user);await expect(f.probe("synthetic-staff")).rejects.toMatchObject({ code: "permission-denied" });expect(f.reads).toHaveLength(1);expect(f.queries).toEqual([]);
  });
  it.each([null, -1, "0", Number.MAX_SAFE_INTEGER])("rejects invalid gate %s", async revision => { const f = fixture(profile, revision);await expect(f.probe("synthetic-admin")).rejects.toThrow();expect(f.queries).toEqual([]); });
  it("pins project, UID and reevaluates profile on each attempt", async () => {
    expect(() => createCalendarConnectivityProbe({ db: { projectId: "labboy-workload-app" }, projectId: "labboy-workload-app" })).toThrow();
    const f = fixture({ ...profile });await expect(f.probe("bad/uid")).rejects.toThrow();expect(f.reads).toEqual([]);
    await f.probe("synthetic-admin");const record = (await f.db.doc("users/synthetic-admin").get()).data();record.active = false;
    await expect(f.probe("synthetic-admin")).rejects.toHaveProperty("code", "permission-denied");
  });
});
const servers = [];
afterEach(async () => { await Promise.all(servers.splice(0).map(server => new Promise(resolve => server.close(resolve)))); });
async function server({ enabled = true, writable = false, verify, probe, limits } = {}) {
  const auth = { verifyIdToken: verify || vi.fn(async () => ({ uid: "synthetic-admin", aud: projectId, iss: `https://securetoken.google.com/${projectId}` })) }, execute = vi.fn(async () => ({ accepted: true }));
  const runProbe = probe || vi.fn(async () => ({ auth: true, profile: true, gate: true, classrooms: true, exams: true, privateData: "must-not-return" }));
  const app = createTrustedCalendarApp({ auth, execute, probe: runProbe, runtime: { mode: "emulator", projectId, apiOrigin: "http://127.0.0.1:4321", origins: ["http://127.0.0.1:4313"], writable, connectivity: enabled }, ...(limits ? { limits } : {}) });
  const listener = app.listen(0, "127.0.0.1");servers.push(listener);await new Promise(resolve => listener.once("listening", resolve));
  const request = (route = "connectivity", { body = "{}", headers = {}, method = "POST" } = {}) => new Promise((resolve, reject) => {
    const req = http.request({ hostname: "127.0.0.1", port: listener.address().port, path: route === "health" ? "/health" : "/api/calendar/" + route, method, headers: { Host: "127.0.0.1:4321", Origin: "http://127.0.0.1:4313", Authorization: "Bearer synthetic-token", "Content-Type": "application/json", ...headers } }, res => { let text = "";res.on("data", chunk => { text += chunk; });res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, value: JSON.parse(text) })); });
    req.on("error", reject);req.end(method === "GET" ? undefined : body);
  });
  return { request, auth, execute, probe: runProbe };
}
describe("connectivity HTTP boundary", () => {
  it("preserves the existing opt-in writer dispatch while the probe is off", async () => {
    const f = await server({ enabled: false, writable: true });
    for (const kind of ["create", "mutate"]) { expect((await f.request(kind)).status).toBe(200);expect(f.execute).toHaveBeenCalledWith(kind, "synthetic-admin", {}); }
    expect((await f.request()).status).toBe(503);expect(f.probe).not.toHaveBeenCalled();
  });
  it("checks revoked tokens, emits only booleans, never executes writes", async () => {
    const f = await server(), result = await f.request();expect(result.status).toBe(200);expect(result.headers["cache-control"]).toBe("no-store");
    expect(result.value.writesEnabled).toBe(false);expect(result.value.checks.privateData).toBeUndefined();expect(JSON.stringify(result)).not.toContain("synthetic-admin");
    expect(f.auth.verifyIdToken).toHaveBeenCalledWith("synthetic-token", true);expect(f.probe).toHaveBeenCalledWith("synthetic-admin");
    for (const kind of ["create", "mutate"]) expect((await f.request(kind)).status).toBe(503);expect(f.execute).not.toHaveBeenCalled();
  });
  it("default-off and health never touch Auth or Firestore", async () => {
    const f = await server({ enabled: false });expect((await f.request("health", { method: "GET" })).value.connectivityEnabled).toBe(false);expect((await f.request()).status).toBe(503);expect(f.auth.verifyIdToken).not.toHaveBeenCalled();expect(f.probe).not.toHaveBeenCalled();
  });
  it.each(["auth/id-token-revoked", "auth/id-token-expired"])("classifies invalid token %s as 401", async code => {
    const f = await server({ verify: vi.fn(async () => { throw { code }; }) });expect((await f.request()).status).toBe(401);expect(f.probe).not.toHaveBeenCalled();
  });
  it("does not mislabel missing server credentials as expired user Auth", async () => {
    const f = await server({ verify: vi.fn(async () => { throw { code: "app/invalid-credential", message: "private diagnostic" }; }) });const result = await f.request();expect(result.status).toBe(503);expect(JSON.stringify(result)).not.toContain("private diagnostic");
  });
  it("denies wrong audience, foreign Origin, missing Bearer and nonempty input", async () => {
    const f = await server();for (const headers of [{ Origin: "https://example.test" }, { Authorization: "" }]) expect((await f.request("connectivity", { headers })).status).toBe(headers.Origin ? 403 : 401);
    expect((await f.request("connectivity", { body: '{"uid":"another-user"}' })).status).toBe(400);expect(f.probe).not.toHaveBeenCalled();
    const other = await server({ verify: vi.fn(async () => ({ uid: "synthetic-admin", aud: "labboy-workload-app", iss: "wrong" })) });expect((await other.request()).status).toBe(401);
  });
  it.each([403, 503])("does not leak probe errors (%s)", async status => {
    const f = await server({ probe: vi.fn(async () => { throw { code: status === 403 ? "permission-denied" : "iam-failure", message: "private diagnostic" }; }) });const result = await f.request();expect(result.status).toBe(status);expect(JSON.stringify(result)).not.toContain("private diagnostic");
  });
  it("rate limits before SDK and releases concurrency after failure", async () => {
    const release = vi.fn(), limits = { request: vi.fn().mockReturnValueOnce(false).mockReturnValue(true), enter: vi.fn(() => release) };
    const f = await server({ limits, probe: vi.fn(async () => { throw new Error(); }) });expect((await f.request()).status).toBe(429);expect(f.auth.verifyIdToken).not.toHaveBeenCalled();expect((await f.request()).status).toBe(503);expect(release).toHaveBeenCalledOnce();
  });
});
describe("connectivity configuration", () => {
  const staging = { NODE_ENV: "production", CALENDAR_SERVER_MODE: "staging", GCLOUD_PROJECT: "labboy-workload-app-staging", CALENDAR_API_ORIGIN: "https://labboy-calendar-staging.onrender.com", GOOGLE_APPLICATION_CREDENTIALS: "/etc/secrets/calendar-staging-admin.json", CALENDAR_DATABASE_ID: "(default)", CALENDAR_CLIENT_ORIGINS: "http://127.0.0.1:4311", PORT: "10000" };
  const emulator = { NODE_ENV: "development", CALENDAR_TRUSTED_EMULATOR: "1", GCLOUD_PROJECT: projectId, FIRESTORE_EMULATOR_HOST: "127.0.0.1:18180", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:19199" };
  it.each([[staging, validateStagingCalendarRuntime], [emulator, validateTrustedCalendarRuntime]])("requires explicit write-off and exact flag", (env, validate) => {
    expect(validate(env).connectivity).toBe(false);expect(validate({ ...env, CALENDAR_SERVER_CONNECTIVITY: "1", CALENDAR_SERVER_WRITE: "0" })).toMatchObject({ connectivity: true, writable: false });
    for (const write of [undefined, "1"]) expect(() => validate({ ...env, CALENDAR_SERVER_CONNECTIVITY: "1", CALENDAR_SERVER_WRITE: write })).toThrow();
    expect(() => validate({ ...env, CALENDAR_SERVER_CONNECTIVITY: "true" })).toThrow();
  });
});
