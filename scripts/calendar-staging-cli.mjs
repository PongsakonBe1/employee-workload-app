// Explicit staging target/account, isolated logs, allowlisted commands; never use prod aliases.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = "labboy-workload-app-staging",
  account = process.argv[2],
  action = process.argv[3];
if (!account || !account.includes("@")) throw new Error("An explicit authorized account is required");
const actions = {
  create: ["projects:create", target, "--display-name", "labboy Workload Staging"],
  databases: ["firestore:databases:list"],
  database: ["firestore:databases:get", "(default)"],
  createDatabase: ["firestore:databases:create", "(default)", "--location", "asia-southeast1", "--edition", "standard"],
  apps: ["apps:list"],
  createWebApp: ["apps:create", "WEB", "labboy Workload Staging Web"],
  sdkConfig: ["apps:sdkconfig", "WEB", "1:299459134462:web:5f1bd25089a933cdf7b6af"],
  deployFirestore: ["deploy", "--config", path.join(root, "firebase/calendar-staging/firebase.json"), "--only", "firestore:rules,firestore:indexes"],
  deployAuth: ["deploy", "--config", path.join(root, ".tools/calendar-staging/firebase.auth.json"), "--only", "auth"]
};
if (!actions[action]) throw new Error("Unknown staging operation");
const directory = path.join(root, ".tools/calendar-staging");
fs.mkdirSync(directory, {
  recursive: true
});
const cli = path.join(process.env.APPDATA, "npm/node_modules/firebase-tools/lib/bin/firebase.js");
if (JSON.parse(fs.readFileSync(path.resolve(path.dirname(cli), "../../package.json"), "utf8")).version !== "15.18.0") throw new Error("Review CLI compatibility before updating staging provisioning tools");
const env = {
  ...process.env,
  CI: "true",
  FIREBASE_CLI_DISABLE_UPDATE_CHECK: "true"
};
delete env.FIREBASE_TOKEN;
delete env.GOOGLE_APPLICATION_CREDENTIALS;
const result = spawnSync(process.execPath, [cli, ...actions[action], "--project", target, "--account", account, "--json", "--non-interactive"], {
  cwd: directory,
  windowsHide: true,
  encoding: "utf8",
  timeout: 180000,
  maxBuffer: 1024 * 1024,
  env
});
let parsed;
try {
  parsed = JSON.parse(result.stdout || "{}");
} catch {/* Never dump raw CLI/debug output. */}
const clean = value => {
  if (Array.isArray(value)) return value.map(clean);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => ["projectId", "displayName", "state", "name", "locationId", "type", "databaseEdition", "appId", "platform", "resources", "hostingSite", "defaultBucket", "databaseId"].includes(key)).map(([key, item]) => [key, clean(item)]));
};
if (result.status !== 0 || parsed?.status !== "success") {
  const message = typeof parsed?.error === "string" ? parsed.error : parsed?.error?.message || "Staging command failed";
  console.log(JSON.stringify({
    success: false,
    target,
    action,
    exitCode: result.status,
    reason: message.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[account]").replace(/Bearer\s+\S+/gi, "Bearer [redacted]").slice(0, 1400)
  }));
  process.exitCode = 1;
} else if (action === "sdkConfig") {
  const source = parsed.result?.sdkConfig;
  if (!source || source.projectId !== target || source.appId !== "1:299459134462:web:5f1bd25089a933cdf7b6af") throw new Error("Unexpected public SDK config target");
  const config = Object.fromEntries(["apiKey", "appId", "projectId", "authDomain", "messagingSenderId"].map(key => [key, source[key]]));
  fs.writeFileSync(path.join(root, "frontend/public/dev-staging-config.json"), JSON.stringify(config, null, 2));
  console.log(JSON.stringify({
    success: true,
    target,
    action,
    publicConfigPrepared: true,
    credentialsPrinted: false
  }));
} else console.log(JSON.stringify({
  success: true,
  target,
  action,
  result: clean(parsed.result)
}));
