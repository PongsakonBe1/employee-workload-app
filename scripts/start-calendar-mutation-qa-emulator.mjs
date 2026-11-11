// Dedicated aligned Auth/Firestore loopback runtime. Reuse installed CLI/JDK/jar; never install or log in.
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), tools = path.join(root, ".tools/calendar-emulator");
const javaBin = path.join(tools, "jdk-21.0.13+9/bin"), directory = path.join(root, ".tools/calendar-staging/mutation-qa-emulators");
if (!fs.existsSync(path.join(javaBin, "java.exe")) || !fs.readdirSync(tools).some(name => /^cloud-firestore-emulator-v.*\.jar$/.test(name))) throw new Error("Previously installed JDK/Firestore jar required; this launcher never installs dependencies");
const cli = path.join(process.env.APPDATA, "npm/node_modules/firebase-tools/lib/bin/firebase.js");
if (JSON.parse(fs.readFileSync(path.resolve(path.dirname(cli), "../../package.json"), "utf8")).version !== "15.18.0") throw new Error("Review CLI version before running QA");
for (const port of [18180, 19199, 14410, 14510]) await new Promise((resolve, reject) => { const server = net.createServer();server.once("error", () => reject(new Error("Dedicated QA port is occupied: " + port)));server.listen(port, "127.0.0.1", () => server.close(resolve)); });
fs.mkdirSync(directory, { recursive: true });
const config = { firestore: { rules: "firestore.rules", edition: "standard" }, emulators: { auth: { host: "127.0.0.1", port: 19199 }, firestore: { host: "127.0.0.1", port: 18180, edition: "standard" }, hub: { host: "127.0.0.1", port: 14410 }, logging: { host: "127.0.0.1", port: 14510 }, ui: { enabled: false }, singleProjectMode: true } };
for (const [filename, value] of [["firebase.json", JSON.stringify(config, null, 2)], ["firestore.rules", fs.readFileSync(path.join(root, "firebase/calendar-writer/firestore.rules"), "utf8")]]) {
  const output = path.join(directory, filename);
  if (fs.existsSync(output) && fs.readFileSync(output, "utf8") !== value) throw new Error("Existing QA config differs; review before overwriting");
  if (!fs.existsSync(output)) fs.writeFileSync(output, value, { flag: "wx" });
}
const env = { ...process.env, PATH: javaBin + path.delimiter + process.env.PATH, XDG_CONFIG_HOME: path.join(tools, "cli-config"), FIREBASE_EMULATORS_PATH: tools, FIREBASE_CLI_DISABLE_UPDATE_CHECK: "true", CI: "true", GCLOUD_PROJECT: "labboy-workload-app-staging" };
for (const name of ["GOOGLE_APPLICATION_CREDENTIALS", "GOOGLE_CLOUD_PROJECT", "FIREBASE_TOKEN", "FIREBASE_CONFIG"]) delete env[name];
const child = spawn(process.execPath, [cli, "emulators:start", "--project", "labboy-workload-app-staging", "--config", "firebase.json", "--only", "auth,firestore", "--non-interactive"], { cwd: directory, env, stdio: "inherit", windowsHide: true });
child.on("exit", code => { process.exitCode = code ?? 1; });process.on("SIGINT", () => child.kill("SIGINT"));process.on("SIGTERM", () => child.kill("SIGTERM"));
