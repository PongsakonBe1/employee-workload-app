// Isolated staging runtime. Writes require --writer; no env files are read or copied.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { uiDevelopmentEnvironment } from "./dev-ui.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const enabled = !process.argv.includes("--legacy");
const mutations = process.argv.includes("--mutations");
const writable = process.argv.includes("--writer");
if (mutations && !writable) throw new Error("--mutations requires --writer; Rules rollout is separate");
if (writable && !enabled) throw new Error("--writer requires the staging entry; do not combine with --legacy");
const child = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "dev", "-H", "127.0.0.1", "-p", "4311"], { cwd: path.join(root, "frontend"), env: { ...process.env, ...uiDevelopmentEnvironment, NEXT_PUBLIC_CALENDAR_STAGING_ENTRY: enabled ? "1" : "0", NEXT_PUBLIC_CALENDAR_STAGING_WRITE: writable ? "1" : "0", NEXT_PUBLIC_CALENDAR_STAGING_MUTATIONS: mutations ? "1" : "0", CALENDAR_STAGING_ENTRY_RUNTIME: "1", NEXT_PUBLIC_API_URL: "http://127.0.0.1:4311/__staging-disabled-api" }, stdio: "inherit", windowsHide: true });
console.log(`Staging calendar entry: http://127.0.0.1:4311/calendar — entry ${enabled ? "on" : "off"}; writer ${writable ? "opt-in" : "off (read-only)"}; mutations ${mutations ? "opt-in (Rules review required)" : "off"}; isolated cache`);
child.on("exit", code => { process.exitCode = code ?? 1; });
process.on("SIGINT", () => child.kill("SIGINT"));process.on("SIGTERM", () => child.kill("SIGTERM"));
