// Local UI runtime: override public service endpoints with synthetic values.
// Never read/copy .env files and never invoke build:prod or deployment scripts.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const uiDevelopmentEnvironment = {
  NODE_ENV: "development", NEXT_TELEMETRY_DISABLED: "1",
  NEXT_PUBLIC_FIREBASE_API_KEY: "development-ui-placeholder-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-ui-foundation.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-ui-foundation",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-ui-foundation.appspot.com",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123456789",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:123456789:web:0000000000000000",
  NEXT_PUBLIC_FIREBASE_VAPID_KEY: "",
  NEXT_PUBLIC_API_URL: "http://127.0.0.1:4310/__ui-test-api",
  NEXT_PUBLIC_UI_BRANCH: "codex/develop-ui-foundation",
};
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log("Development UI preview: http://127.0.0.1:4310/dev/ui — synthetic configuration, no production sign-in");
  const child = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "dev", "-H", "127.0.0.1", "-p", "4310"], { cwd: path.join(root, "frontend"), env: { ...process.env, ...uiDevelopmentEnvironment }, stdio: "inherit" });
  child.on("exit", code => { process.exitCode = code ?? 1; });
  process.on("SIGINT", () => child.kill("SIGINT"));process.on("SIGTERM", () => child.kill("SIGTERM"));
}
