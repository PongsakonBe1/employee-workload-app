// Isolated demo-only Rules SIT using installed tools; never installs or deploys anything.
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), tools = path.join(root, ".tools/calendar-emulator"), javaBin = path.join(tools, "jdk-21.0.13+9/bin");
const cli = path.join(process.env.APPDATA, "npm/node_modules/firebase-tools/lib/bin/firebase.js");
if (!fs.existsSync(path.join(javaBin, "java.exe")) || !fs.readdirSync(tools).some(name => /^cloud-firestore-emulator-v.*\.jar$/.test(name)) || JSON.parse(fs.readFileSync(path.resolve(path.dirname(cli), "../../package.json"), "utf8")).version !== "15.18.0") throw new Error("Previously reviewed local tools required; no auto-install");
for (const port of [18220, 19220, 14430, 14530, 9150]) await new Promise((resolve, reject) => { const server = net.createServer();server.once("error", () => reject(new Error("Owned Emulator port occupied: " + port)));server.listen(port, "127.0.0.1", () => server.close(resolve)); });
const directory = path.join(root, ".tools/calendar-staging/cutover-emulators");fs.mkdirSync(directory, { recursive: true });
const config = { firestore: { rules: "firestore.rules", edition: "standard" }, emulators: { auth: { host: "127.0.0.1", port: 19220 }, firestore: { host: "127.0.0.1", port: 18220, edition: "standard" }, hub: { host: "127.0.0.1", port: 14430 }, logging: { host: "127.0.0.1", port: 14530 }, ui: { enabled: false }, singleProjectMode: true } };
for (const [name, source] of [["firebase.json", JSON.stringify(config, null, 2)], ["firestore.rules", fs.readFileSync(path.join(root, "deploy/calendar-staging/firestore.review.rules"), "utf8")]]) {
  const file = path.join(directory, name);if (fs.existsSync(file) && fs.readFileSync(file, "utf8") !== source) throw new Error("Preserve and review existing Emulator configuration");
  if (!fs.existsSync(file)) fs.writeFileSync(file, source, { flag: "wx" });
}
const env = { ...process.env, GCLOUD_PROJECT: "demo-calendar-cutover", PATH: javaBin + path.delimiter + process.env.PATH, XDG_CONFIG_HOME: path.join(tools, "cli-config"), FIREBASE_EMULATORS_PATH: tools, FIREBASE_CLI_DISABLE_UPDATE_CHECK: "true", CI: "true" };
for (const key of ["GOOGLE_APPLICATION_CREDENTIALS", "GOOGLE_CLOUD_PROJECT", "FIREBASE_TOKEN", "FIREBASE_CONFIG"]) delete env[key];
const child = spawn(process.execPath, [cli, "emulators:start", "--project", "demo-calendar-cutover", "--config", "firebase.json", "--only", "auth,firestore", "--non-interactive"], { cwd: directory, env, stdio: "inherit", windowsHide: true });
child.on("exit", code => { process.exitCode = code ?? 1; });process.on("SIGINT", () => child.kill("SIGINT"));process.on("SIGTERM", () => child.kill("SIGTERM"));
