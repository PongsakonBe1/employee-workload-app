// Explicitly approved, bounded staging Rules install/restore. No Firestore data writes.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { qaTextHash, MUTATION_QA_MANIFEST_SHA, APPEND_ONLY_SOURCE_SHA } from "./calendar-mutation-cloud-plan.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), target = "labboy-workload-app-staging", [account, action] = process.argv.slice(2);
if (!account?.includes("@") || !["inspect", "install", "restore"].includes(action)) throw new Error("Explicit operator and inspect/install/restore required");
const directory = path.join(root, ".tools/calendar-staging/mutation-cloud-qa"), output = path.join(root, "output/playwright/calendar-staging-mutation-cloud-execute");
const approved = JSON.parse(fs.readFileSync(path.join(output, "cloud-approval.json"), "utf8")), prepared = JSON.parse(fs.readFileSync(path.join(directory, "prepared.json"), "utf8"));
if (approved.approved !== true || approved.target !== target || prepared.target !== target || approved.manifestHash !== MUTATION_QA_MANIFEST_SHA || prepared.manifestHash !== approved.manifestHash || prepared.candidateRulesHash !== approved.candidateRulesHash || prepared.rollbackRulesHash !== APPEND_ONLY_SOURCE_SHA || approved.rollbackRulesHash !== APPEND_ONLY_SOURCE_SHA) throw new Error("Approved target/hash mismatch");
if (qaTextHash(fs.readFileSync(path.join(directory, "firestore.rules"), "utf8")) !== approved.candidateRulesHash || qaTextHash(fs.readFileSync(path.join(directory, "rollback.rules"), "utf8")) !== approved.rollbackRulesHash) throw new Error("Reviewed Rules artifact changed");
const require = createRequire(path.join(process.env.APPDATA, "npm/node_modules/firebase-tools/package.json"));
if (require("./package.json").version !== "15.18.0") throw new Error("Review CLI compatibility first");
delete process.env.FIREBASE_TOKEN;delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
const { Command } = require("./lib/command"), { requireAuth } = require("./lib/requireAuth"), { Client } = require("./lib/apiv2");
const command = new Command("approved-calendar-mutation-qa-rules").before(options => { if (options.project !== target || options.user?.email !== account) throw new Error("Staging target/operator mismatch"); }).before(requireAuth).action(async () => {
  const api = new Client({ urlPrefix: "https://firebaserules.googleapis.com", apiVersion: "v1" });
  async function deployed() {
    const release = (await api.get(`/projects/${target}/releases/cloud.firestore`)).body;
    if (!release.rulesetName?.startsWith(`projects/${target}/rulesets/`)) throw new Error("Unexpected Rules resource");
    const source = (await api.get("/" + release.rulesetName)).body.source?.files || [];
    if (source.length !== 1) throw new Error("Expected exactly one Rules source");
    return qaTextHash(source[0].content);
  }
  const before = await deployed();
  if (action === "inspect") return { target, hash: before, candidateActive: before === approved.candidateRulesHash, appendOnlyActive: before === approved.rollbackRulesHash, rulesChanged: false };
  const expected = action === "install" ? approved.rollbackRulesHash : approved.candidateRulesHash, desired = action === "install" ? approved.candidateRulesHash : approved.rollbackRulesHash;
  if (before === desired) return { target, action, alreadyAtDesiredRules: true, hash: before, rulesChanged: false };
  if (before !== expected) throw new Error("Current Rules changed; refusing to overwrite another release");
  if (action === "install") {
    const audit = spawnSync(process.execPath, [path.join(root, "scripts/calendar-mutation-cloud-prepare.mjs"), account, "audit", "0"], { cwd: root, encoding: "utf8", windowsHide: true, timeout: 60000 });
    if (audit.status !== 0) throw new Error("Fresh audit 0 failed; temporary Rules were not installed");
  }
  const config = path.join(directory, action === "install" ? "firebase.json" : "firebase.rollback.json");
  const configValue = JSON.parse(fs.readFileSync(config, "utf8"));
  if (configValue.firestore?.database !== "(default)" || configValue.firestore.rules !== (action === "install" ? "firestore.rules" : "rollback.rules") || Object.keys(configValue).some(key => key !== "firestore")) throw new Error("Rules-only config mismatch");
  const cli = path.join(process.env.APPDATA, "npm/node_modules/firebase-tools/lib/bin/firebase.js");
  const result = spawnSync(process.execPath, [cli, "deploy", "--config", config, "--only", "firestore:rules", "--project", target, "--account", account, "--json", "--non-interactive"], { cwd: directory, env: { ...process.env, CI: "true", FIREBASE_CLI_DISABLE_UPDATE_CHECK: "true" }, encoding: "utf8", windowsHide: true, timeout: 120000, maxBuffer: 1024 * 1024 });
  const after = await deployed();
  const report = { checkedAt: new Date().toISOString(), target, database: "(default)", action, manifestHash: approved.manifestHash, before, after, observedDesiredRules: after === desired, cliExitCode: result.status, cloudRecordsWritten: 0, productionAccessed: false, applicationDeployed: false };
  fs.writeFileSync(path.join(output, `rules-${action}-${Date.now()}.json`), JSON.stringify(report, null, 2));
  if (after !== desired) throw new Error("Rules result not confirmed; inspect current source before continuing");
  return report;
});
try { console.log(JSON.stringify({ success: true, result: await command.runner()({ project: target, account, json: true, nonInteractive: true, cwd: directory }) })); }
catch (error) { console.log(JSON.stringify({ success: false, action, reason: String(error.message || "Rules operation failed").replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[account]").replace(/Bearer\s+\S+/gi, "Bearer [redacted]").slice(0, 500) }));process.exitCode = 1; }
