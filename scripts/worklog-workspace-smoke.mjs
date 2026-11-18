// Local production-mode browser smoke against the installed Firebase emulators.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { uiDevelopmentEnvironment } from "./dev-ui.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const frontend = path.join(root, "frontend");
const project = "demo-worklog-workspace";
const artifact = path.join(root, "output/playwright/worklog-workspace-smoke");
const out = path.join(frontend, ".ui-build-check");
const documents = `http://127.0.0.1:18218/v1/projects/${project}/databases/(default)/documents`;
const testUser = "qa-worklog-workspace";

async function localJson(url, method = "GET", body) {
  assert(["http://127.0.0.1:18218", "http://127.0.0.1:19218"].includes(new URL(url).origin));
  const response = await fetch(url, { method, redirect: "error", signal: AbortSignal.timeout(12000), headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!response.ok) throw new Error(`Demo fixture request failed with HTTP ${response.status}`);
  return response.json();
}

switch (process.argv[2]) {
  case "build": {
    assert(!fs.existsSync(path.join(frontend, "public/dev-staging-config.json")));
    fs.mkdirSync(artifact, { recursive: true });
    const result = spawnSync(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "build", "--no-lint"], {
      cwd: frontend,
      env: { ...process.env, ...uiDevelopmentEnvironment, NODE_ENV: "production", UI_BUILD_CHECK: "1", NEXT_PUBLIC_WORKLOG_WORKSPACE: "1", NEXT_PUBLIC_ANALYTICS_WORKSPACE: process.argv.includes("--analytics") ? "1" : "0", NEXT_PUBLIC_API_URL: "http://127.0.0.1:4318", NEXT_PUBLIC_FIREBASE_PROJECT_ID: project, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${project}.firebaseapp.com`, NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: `${project}.appspot.com`, CALENDAR_TRUSTED_DENIAL_UI: "1" },
      encoding: "utf8", maxBuffer: 8 * 1024 * 1024
    });
    fs.writeFileSync(path.join(artifact, "build.log"), (result.stdout ?? "") + (result.stderr ?? ""));
    assert.equal(result.status, 0, "See the isolated build log");
    for (const file of ["dev-staging-config.json", "dev/staging-web-config", "dev/staging-web-config.json", "dev/staging-web-config/body"]) {
      const candidate = path.join(out, file);
      assert(!fs.existsSync(candidate) || fs.statSync(candidate).isDirectory() || fs.statSync(candidate).size === 0, `Development SDK config was exported at ${file}`);
    }
    for (const route of ["worklogs", "worklogs/new"]) assert(fs.existsSync(path.join(out, `${route}.html`)));
    console.log("PASS production-mode smoke export. No staging Web SDK config payload was copied.");
    break;
  }
  case "emulators": {
    const tools = path.join(root, ".tools/calendar-emulator");
    const java = path.join(tools, "jdk-21.0.13+9/bin");
    const cli = path.join(process.env.APPDATA, "npm/node_modules/firebase-tools/lib/bin/firebase.js");
    assert(fs.existsSync(path.join(java, "java.exe")) && fs.existsSync(path.join(tools, "cloud-firestore-emulator-v1.21.0.jar")), "Installed Emulator tools are required");
    assert.equal(JSON.parse(fs.readFileSync(path.resolve(path.dirname(cli), "../../package.json"), "utf8")).version, "15.18.0");
    const directory = path.join(root, ".tools/calendar-staging/worklog-workspace-smoke");
    fs.mkdirSync(directory, { recursive: true });
    fs.copyFileSync(path.join(root, "firebase/firestore.rules"), path.join(directory, "firestore.rules"));
    fs.copyFileSync(path.join(root, "firebase/firestore.indexes.json"), path.join(directory, "firestore.indexes.json"));
    const localPort = port => ({ host: "127.0.0.1", port });
    fs.writeFileSync(path.join(directory, "firebase.json"), JSON.stringify({ firestore: { rules: "firestore.rules", indexes: "firestore.indexes.json", edition: "standard" }, emulators: { auth: localPort(19218), firestore: { ...localPort(18218), edition: "standard" }, hub: localPort(14418), logging: localPort(14518), ui: { enabled: false }, singleProjectMode: true } }));
    const env = { ...process.env, GCLOUD_PROJECT: project, PATH: java + path.delimiter + process.env.PATH, XDG_CONFIG_HOME: path.join(tools, "cli-config"), FIREBASE_EMULATORS_PATH: tools, CI: "true", FIREBASE_CLI_DISABLE_UPDATE_CHECK: "true" };
    for (const key of ["GOOGLE_APPLICATION_CREDENTIALS", "GOOGLE_CLOUD_PROJECT", "FIREBASE_TOKEN", "FIREBASE_CONFIG"]) delete env[key];
    const child = spawn(process.execPath, [cli, "emulators:start", "--project", project, "--config", "firebase.json", "--only", "auth,firestore", "--non-interactive"], { cwd: directory, env, stdio: "inherit", windowsHide: true });
    child.on("exit", code => { process.exitCode = code ?? 1; });
    process.on("SIGINT", () => child.kill("SIGINT"));
    process.on("SIGTERM", () => child.kill("SIGTERM"));
    break;
  }
  case "serve": {
    const { default: express } = await import("express");
    assert(fs.existsSync(path.join(out, "worklogs/new.html")), "Build the isolated smoke export first");
    const app = express();
    app.use((req, res, next) => {
      if (req.headers.host !== "127.0.0.1:4318") return res.sendStatus(403);
      res.set("Cache-Control", "no-store");
      res.set("Content-Security-Policy", "connect-src 'self' http://127.0.0.1:19218 http://127.0.0.1:18218; form-action 'self' http://127.0.0.1:19218");
      next();
    });
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:19218";
    process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:18218";
    process.env.GCLOUD_PROJECT = project;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const { initializeApp } = await import("firebase-admin/app");
    const { getAuth } = await import("firebase-admin/auth");
    const { getFirestore } = await import("firebase-admin/firestore");
    const { createResourceStatusRouter } = await import("../backend/src/routes/resourceStatus.js");
    const firebase = initializeApp({ projectId: project });
    app.use("/api/resource-status", createResourceStatusRouter(() => ({
      auth: () => getAuth(firebase),
      firestore: () => getFirestore(firebase)
    })));
    // Match the Hosting cleanUrls/trailingSlash policy when a page also has child routes.
    app.use((req, res, next) => {
      if (!["GET", "HEAD"].includes(req.method) || !/^\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\/?$/.test(req.path)) return next();
      const clean = req.path.replace(/\/+$/, "");
      const file = path.join(out, clean + ".html");
      if (!fs.existsSync(file)) return next();
      if (clean !== req.path) return res.redirect(308, clean);
      res.sendFile(file);
    });
    app.use(express.static(out, { dotfiles: "deny", redirect: false }));
    app.listen(4318, "127.0.0.1", () => console.log("Worklog smoke: http://127.0.0.1:4318/worklogs/new"));
    break;
  }
  case "seed": {
    for (const name of ["users", "worklogs"]) assert.equal((await localJson(`${documents}/${name}`)).documents?.length ?? 0, 0, "Use a new empty Emulator");
    const email = `${testUser}@example.test`;
    const auth = await localJson("http://127.0.0.1:19218/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-worklog-key", "POST", { localId: testUser, email, password: crypto.randomUUID(), targetProjectId: project, returnSecureToken: false });
    assert.equal(auth.localId, testUser);
    const values = { uid: testUser, role: "staff", active: true, email, displayName: "เจ้าหน้าที่ทดสอบ", fullName: "QA Worklog Workspace" };
    const fields = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, typeof value === "boolean" ? { booleanValue: value } : { stringValue: value }]));
    await localJson(`${documents}/users/${testUser}?currentDocument.exists=false`, "PATCH", { fields });
    console.log("PASS synthetic Staff profile seeded in the local emulator");
    break;
  }
  case "verify": {
    const logs = (await localJson(`${documents}/worklogs`)).documents ?? [];
    assert.equal(logs.length, 2);
    assert.deepEqual(logs.map(log => log.fields.comment?.stringValue).sort(), ["QA-WORKLOG-DESKTOP", "QA-WORKLOG-MOBILE"]);
    for (const log of logs) {
      const fields = log.fields;
      assert.equal(fields.employeeId.stringValue, testUser);
      assert.equal(fields.minorTask.stringValue, "ติดตั้ง Software");
      assert.match(fields.date.stringValue, /^\d{4}-\d\d-\d\d$/);
      assert.match(fields.time.stringValue, /^\d\d:\d\d$/);
      assert(fields.createdAt.timestampValue);
    }
    console.log("PASS exactly two persisted demo worklogs with the expected identity and schema");
    break;
  }
  default: throw new Error("Use build, emulators, serve, seed or verify");
}
