// Default preview is on an origin rejected by the SDK adapter. Cloud-session mode is explicit.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { uiDevelopmentEnvironment } from "./dev-ui.mjs";
const args = process.argv.slice(2);
if (args.length > 1 || args.some(value => value !== "--staging-session")) throw new Error("Only --staging-session is supported");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), port = args.includes("--staging-session") ? "4311" : "4315";
const child = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "dev", "-H", "127.0.0.1", "-p", port], { cwd: path.join(root, "frontend"), windowsHide: true, stdio: "inherit", env: { ...process.env, ...uiDevelopmentEnvironment, CALENDAR_TRUSTED_DENIAL_RUNTIME: "1", CALENDAR_TRUSTED_DENIAL_UI: "1" } });
console.log(`Cutover QA: http://127.0.0.1:${port}/dev/calendar-trusted-cutover; API writers and connectivity remain off; files/approval required; no automatic Firebase login or probe`);
child.on("exit", code => { process.exitCode = code ?? 1; });
process.on("SIGINT", () => child.kill("SIGINT"));process.on("SIGTERM", () => child.kill("SIGTERM"));
