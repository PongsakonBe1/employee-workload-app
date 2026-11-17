// Reproducible isolated install/probe. No credentials, real Firebase project access or lifecycle scripts.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import http from "node:http";
import net from "node:net";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const root = process.cwd(), output = path.join(root, "output/playwright/calendar-runtime-hardening"), stateFile = path.join(root, ".tools/calendar-staging/hardening-package-state.json");
fs.mkdirSync(output, { recursive: true });
if (process.argv.includes("--legacy")) {
  for (const file of ["backend/package.json", "backend/src/services/fcm.js", "backend/src/routes/notify.js"]) {
    const original = spawnSync("git", ["show", "ebd2336:" + file], { encoding: "utf8" });assert.equal(original.status, 0);assert.equal(fs.readFileSync(file, "utf8").replaceAll("\r\n", "\n"), original.stdout.replaceAll("\r\n", "\n"));
  }
  const require = createRequire(path.join(root, "backend/package.json")), admin = (await import(pathToFileURL(require.resolve("firebase-admin")))).default;
  for (const name of ["initializeApp", "auth", "firestore", "messaging"]) assert.equal(typeof admin[name], "function");assert.equal(admin.apps.length, 0);
  const manifest = JSON.parse(fs.readFileSync("node_modules/firebase-admin/package.json", "utf8"));assert.equal(manifest.version, "12.7.0");
  const report = { passed: true, legacyAdminVersion: manifest.version, legacyNamespaceAvailable: true, backendManifestAndFcmNotifySourceUnchanged: true, initializedApps: 0, realFcmMessagesSent: 0, cloudUsed: false };
  fs.writeFileSync(path.join(output, "legacy-compatibility-report.json"), JSON.stringify(report, null, 2));console.log(JSON.stringify(report));
} else if (process.argv.includes("--prepare")) {
  const folder = path.join(root, ".tools/calendar-staging/hardening-clean-" + Date.now());fs.mkdirSync(folder, { recursive: true });
  const runtime = fs.readdirSync("calendar-server/src").filter(file => file.endsWith(".js")).map(file => "calendar-server/src/" + file);
  const backend = fs.readdirSync("backend/src/calendar").filter(file => file.endsWith(".js") && !file.endsWith(".test.js")).map(file => "backend/src/calendar/" + file);
  const files = [...runtime, ...backend, "package.json", "package-lock.json", "calendar-server/package.json", "backend/package.json", "frontend/package.json", ...["calendarServerProtocol.js", "calendarCreatePlan.js", "calendarMutationPlan.js", "calendarDataAdapter.js", "calendarView.js"].map(file => "frontend/lib/" + file)];
  for (const file of files) { const destination = path.join(folder, file);fs.mkdirSync(path.dirname(destination), { recursive: true });fs.copyFileSync(file, destination); }
  fs.writeFileSync(stateFile, JSON.stringify({ folder, files }, null, 2));console.log(JSON.stringify({ prepared: true, folder, copiedFiles: files.length, credentialsCopied: false }));
} else {
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8")), folder = path.resolve(state.folder);
  assert.ok(folder.startsWith(path.join(root, ".tools/calendar-staging/hardening-clean-")));
  if (process.argv.includes("--install")) {
    const npmCli = path.join(path.dirname(process.execPath), "node_modules/npm/bin/npm-cli.js");assert.ok(fs.existsSync(npmCli));
    const result = spawnSync(process.execPath, [npmCli, "ci", "--workspace", "calendar-server", "--include-workspace-root=false", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund", "--registry=https://registry.npmjs.org", "--cache", path.join(root, ".tools/calendar-staging/hardening-npm-cache")], { cwd: folder, env: process.env, windowsHide: true, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
    fs.writeFileSync(path.join(output, "clean-install.log"), (result.stdout || "") + (result.stderr || ""));assert.equal(result.status, 0, "Clean scoped npm ci must succeed");console.log(JSON.stringify({ installed: true, lifecycleScripts: false, auditSent: false, folder }));
  } else if (process.argv.includes("--boot")) {
    const yaml = createRequire(import.meta.url)("js-yaml"), service = yaml.load(fs.readFileSync("deploy/calendar-staging/render.yaml", "utf8")).services[0];
    const env = Object.fromEntries(service.envVars.map(row => [row.key, row.value]));assert.equal(env.CALENDAR_SERVER_WRITE, "0");
    const system = Object.fromEntries(["PATH", "SystemRoot", "WINDIR", "TEMP", "TMP"].filter(key => process.env[key]).map(key => [key, process.env[key]]));
    const entry = path.join(folder, "calendar-server/src/staging-server.js");
    const bad = spawn(process.execPath, [entry], { cwd: folder, env: { ...system, ...env, GCLOUD_PROJECT: "labboy-workload-app" }, windowsHide: true, stdio: "pipe" });
    let badOutput = "";bad.stderr.on("data", chunk => { badOutput += chunk; });assert.equal(await new Promise(resolve => bad.once("exit", resolve)), 1);assert.match(badOutput, /configuration rejected/);
    const free = net.createServer();await new Promise(resolve => free.listen(0, "127.0.0.1", resolve));const port = free.address().port;await new Promise(resolve => free.close(resolve));
    const child = spawn(process.execPath, [entry], { cwd: folder, env: { ...system, ...env, PORT: String(port) }, windowsHide: true, stdio: "pipe" });let outputText = "";for (const stream of [child.stdout, child.stderr]) stream.on("data", chunk => { outputText += chunk; });
    const request = (route, method = "GET") => new Promise((resolve, reject) => {
      const req = http.request(`http://127.0.0.1:${port}${route}`, { method, headers: { Host: new URL(env.CALENDAR_API_ORIGIN).host, "Content-Type": "application/json" }, timeout: 1000 }, res => { const body = [];res.on("data", chunk => body.push(chunk));res.on("end", () => resolve({ status: res.statusCode, value: JSON.parse(Buffer.concat(body).toString()) })); });req.on("error", reject);req.on("timeout", () => req.destroy(new Error("Boot probe timeout")));req.end(method === "POST" ? "{}" : undefined);
    });
    try {
      let health;for (let attempt = 0; attempt < 50; attempt++) { try { health = await request("/health");break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); } }
      assert.equal(health?.status, 200);assert.equal(health.value.writesEnabled, false);assert.equal(health.value.projectId, "labboy-workload-app-staging");
      for (const action of ["create", "mutate"]) { const denied = await request("/api/calendar/" + action, "POST");assert.equal(denied.status, 503);assert.equal(denied.value.code, "calendar-write-disabled"); }
      fs.writeFileSync(path.join(output, "clean-production-boot.log"), outputText);
      const report = { passed: true, isolatedInstall: true, health: true, writeOff: true, wrongProjectRejectedBeforeSdk: true, credentialFilesProvided: false, cloudUsed: false };fs.writeFileSync(path.join(output, "clean-production-boot-report.json"), JSON.stringify(report, null, 2));console.log(JSON.stringify(report));
    } finally { if (child.exitCode === null) { child.kill("SIGTERM");await new Promise(resolve => child.once("exit", resolve)); } }
  } else {
    const pkgPath = path.join(folder, "calendar-server/package.json"), require = createRequire(pkgPath), within = value => { const actual = fs.realpathSync(value), base = fs.realpathSync(folder);return actual === base || actual.startsWith(base + path.sep); };
    function installedPackage(name, from) {
      let directory = path.dirname(from);
      while (within(directory)) {
        const file = path.join(directory, "node_modules", name, "package.json");if (fs.existsSync(file)) { assert.ok(within(file), "No ancestor/global dependency fallback");return fs.realpathSync(file); }
        const parent = path.dirname(directory);if (parent === directory) break;directory = parent;
      }
      return null;
    }
    const visited = new Set(), packages = [], missing = [];
    function walk(file) {
      if (visited.has(file)) return;visited.add(file);const pkg = JSON.parse(fs.readFileSync(file, "utf8"));packages.push({ name: pkg.name, version: pkg.version, path: path.relative(folder, file).replaceAll("\\", "/") });
      for (const name of Object.keys({ ...pkg.dependencies, ...pkg.optionalDependencies, ...pkg.peerDependencies })) {
        const child = installedPackage(name, file);if (child) walk(child);else if (!(name in (pkg.optionalDependencies || {})) && !pkg.peerDependenciesMeta?.[name]?.optional) missing.push({ parent: pkg.name, name });
      }
    }
    // The workspace is the only root. Legacy manifests on disk do not imply installed/runtime dependencies.
    walk(pkgPath);assert.equal(missing.length, 0, "All required runtime and peer dependencies resolve inside the clean install");
    const versions = name => [...new Set(packages.filter(pkg => pkg.name === name).map(pkg => pkg.version))];
    assert.deepEqual(versions("firebase-admin"), ["14.5.1"]);assert.deepEqual(versions("express"), ["4.22.3"]);assert.deepEqual(versions("helmet"), ["8.3.0"]);assert.deepEqual(versions("mongoose"), []);
    const appPath = require.resolve("firebase-admin/app"), authPath = require.resolve("firebase-admin/auth"), firestorePath = require.resolve("firebase-admin/firestore");for (const file of [appPath, authPath, firestorePath]) assert.ok(within(file));
    const app = await import(pathToFileURL(appPath)), auth = await import(pathToFileURL(authPath)), store = await import(pathToFileURL(firestorePath));
    assert.equal(typeof app.initializeApp, "function");assert.equal(typeof auth.getAuth, "function");assert.equal(typeof store.getFirestore, "function");assert.equal(typeof store.Firestore, "function");assert.equal(typeof store.FieldValue.serverTimestamp, "function");assert.equal(app.getApps().length, 0);
    const report = { passed: true, node: process.version, direct: { "firebase-admin": versions("firebase-admin"), express: versions("express"), helmet: versions("helmet") }, installedPackageCount: packages.length, packages, missing, mongooseInstalled: false, ancestorFallback: false, sdkAppsInitialized: 0, cloudUsed: false };
    fs.writeFileSync(path.join(output, "clean-dependency-graph.json"), JSON.stringify(report, null, 2));console.log(JSON.stringify({ passed: true, direct: report.direct, installedPackageCount: packages.length, ancestorFallback: false, sdkAppsInitialized: 0 }));
  }
}
