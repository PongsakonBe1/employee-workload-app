import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
// Inspect only the maintenance source. No credential file is read or SDK loaded.
const source = fs.readFileSync(new URL("../../../firebase/seed-data/mark-icit02-damaged.js", import.meta.url), "utf8");
const syntheticPath = path.resolve("..", "synthetic-credentials-not-read.json");
function context(env) {
  const write = vi.fn(async () => ({ id: "synthetic-worklog" }));
  const firestore = Object.assign(vi.fn(() => ({ collection: vi.fn(() => ({ add: write })) })), { FieldValue: { serverTimestamp: () => "synthetic-timestamp" } });
  const admin = { initializeApp: vi.fn(), credential: { applicationDefault: vi.fn(() => "synthetic-adc") }, firestore };
  const loadSdk = vi.fn(() => admin), exit = vi.fn();
  return { admin, write, exit, loadSdk, run: () => vm.runInNewContext(source, { __dirname: path.resolve("firebase/seed-data"), require: name => { if (name === "node:path") return path;if (name === "firebase-admin") return loadSdk();throw new Error("Unexpected module: credential material must not be loaded"); }, process: { env, exit }, console: { log: vi.fn(), error: vi.fn() }, Date }) };
}
describe("one-off maintenance credential boundary", () => {
  it.each([{}, { GCLOUD_PROJECT: "other-project", GOOGLE_APPLICATION_CREDENTIALS: syntheticPath }, { GCLOUD_PROJECT: "labboy-workload-app" }, { GCLOUD_PROJECT: "labboy-workload-app", GOOGLE_APPLICATION_CREDENTIALS: "relative-key.json" }, { GCLOUD_PROJECT: "labboy-workload-app", GOOGLE_APPLICATION_CREDENTIALS: path.resolve("synthetic-key.json") }])("fails before SDK initialization for missing/ambiguous configuration", env => {
    const f = context(env);expect(f.run).toThrow(/explicit GCLOUD_PROJECT/);expect(f.loadSdk).not.toHaveBeenCalled();expect(f.write).not.toHaveBeenCalled();
  });
  it("uses external ADC with explicit project and preserves the maintenance record via a mock SDK", async () => {
    const f = context({ GCLOUD_PROJECT: "labboy-workload-app", GOOGLE_APPLICATION_CREDENTIALS: syntheticPath });await f.run();
    expect(f.admin.initializeApp).toHaveBeenCalledWith({ projectId: "labboy-workload-app", credential: "synthetic-adc" });expect(f.admin.credential.applicationDefault).toHaveBeenCalledOnce();
    expect(f.write).toHaveBeenCalledOnce();expect(f.write).toHaveBeenCalledWith(expect.objectContaining({ equipment: "ICIT02", equipmentCondition: "damaged", locked: true, _source: "manual-admin-entry" }));expect(f.exit).toHaveBeenCalledWith(0);
  });
});
