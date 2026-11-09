// Own config/cache, a demo project and loopback endpoints; no real project selection/login.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tools = path.join(root, ".tools/calendar-emulator"),
  javaBin = path.join(tools, "jdk-21.0.13+9/bin");
if (!fs.existsSync(path.join(javaBin, "java.exe"))) throw new Error("Run scripts/setup-calendar-emulator.ps1 first");
const cli = path.join(process.env.APPDATA, "npm/node_modules/firebase-tools/lib/bin/firebase.js");
if (!fs.existsSync(cli)) throw new Error("The previously installed Firebase CLI was not found");
const cliVersion = JSON.parse(fs.readFileSync(path.resolve(path.dirname(cli), "../../package.json"), "utf8")).version;
if (cliVersion !== "15.18.0") throw new Error("This test runtime was verified with Firebase CLI 15.18.0; review runtime versions before upgrading");
const env = {
  ...process.env,
  PATH: javaBin + path.delimiter + process.env.PATH,
  XDG_CONFIG_HOME: path.join(tools, "cli-config"),
  FIREBASE_EMULATORS_PATH: tools,
  FIREBASE_CLI_DISABLE_UPDATE_CHECK: "true",
  CI: "true",
  GCLOUD_PROJECT: "demo-calendar-readonly"
};
for (const key of ["GOOGLE_APPLICATION_CREDENTIALS", "GOOGLE_CLOUD_PROJECT", "FIREBASE_TOKEN", "FIREBASE_CONFIG"]) delete env[key];
const child = spawn(process.execPath, [cli, "emulators:start", "--project", "demo-calendar-readonly", "--config", "firebase.json", "--only", "auth,firestore", "--non-interactive"], {
  cwd: path.join(root, "firebase/calendar-emulator"),
  env,
  stdio: "inherit",
  windowsHide: true
});
child.on("exit", code => {
  process.exitCode = code ?? 1;
});
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
