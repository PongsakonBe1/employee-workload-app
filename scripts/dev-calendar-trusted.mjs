// Explicit --writer starts the local API. Default UI is read-only; no dotenv/credentials/cloud fallback.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { uiDevelopmentEnvironment } from "./dev-ui.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), writable = process.argv.includes("--writer");
const apiRunning = process.argv.includes("--api-running");
if (apiRunning) {
  if (!writable) throw new Error("--api-running requires --writer");
  const response = await fetch("http://127.0.0.1:4321/health", { redirect: "error", signal: AbortSignal.timeout(3000) }), peer = await response.json();
  if (!response.ok || peer.projectId !== "demo-calendar-trusted" || peer.mode !== "emulator" || peer.protocol !== 1 || peer.writesEnabled !== true) throw new Error("The existing API must be the dedicated writable demo Emulator peer");
}
const env = { ...process.env, ...uiDevelopmentEnvironment, GCLOUD_PROJECT: "demo-calendar-trusted", FIRESTORE_EMULATOR_HOST: "127.0.0.1:18180", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:19199", CALENDAR_TRUSTED_EMULATOR: "1", CALENDAR_TRUSTED_EMULATOR_RUNTIME: "1", NEXT_PUBLIC_CALENDAR_STAGING_ENTRY: "1", NEXT_PUBLIC_CALENDAR_STAGING_WRITE: writable ? "1" : "0", NEXT_PUBLIC_CALENDAR_STAGING_MUTATIONS: writable ? "1" : "0", NEXT_PUBLIC_CALENDAR_MUTATION_EMULATOR: "1", NEXT_PUBLIC_CALENDAR_TRUSTED_SERVER: "1", NEXT_PUBLIC_CALENDAR_SERVER_PREFLIGHT: process.argv.includes("--server-preflight") ? "1" : "0" };
for (const key of ["GOOGLE_APPLICATION_CREDENTIALS", "GOOGLE_CLOUD_PROJECT", "FIREBASE_TOKEN", "FIREBASE_CONFIG"]) delete env[key];
const children = [];
if (writable && !apiRunning) children.push(spawn(process.execPath, [path.join(root, "backend/src/calendar/server.js")], { cwd: root, env, stdio: "inherit", windowsHide: true }));
children.push(spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "dev", "-H", "127.0.0.1", "-p", "4313"], { cwd: path.join(root, "frontend"), env, stdio: "inherit", windowsHide: true }));
console.log(`Trusted calendar UI http://127.0.0.1:4313/calendar; API ${writable ? "4321 opt-in" : "off"}; demo Emulator only`);
let stopping = false;
function stop(code = 0) { if (stopping) return;stopping = true;for (const child of children) child.kill("SIGTERM");process.exitCode = code; }
for (const child of children) { child.on("error", () => stop(1));child.on("exit", code => stop(code ?? 1)); }
process.on("SIGINT", () => stop());process.on("SIGTERM", () => stop());
