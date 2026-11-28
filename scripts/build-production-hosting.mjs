import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prepareClassroomPdfAssets } from "./prepare-classroom-pdf.mjs";
import { prepareDlOcrAssets } from "./prepare-dl-ocr.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const flags = process.argv.slice(2);
assert(new Set(flags).size === flags.length && flags.every(flag => ["--verify", "--mobile-tab-scrub"].includes(flag)),
  "Usage: build-production-hosting.mjs [--verify] [--mobile-tab-scrub]");
const verify = flags.includes("--verify");
const mobileTabScrub = flags.includes("--mobile-tab-scrub");
assert.equal(git("status", "--porcelain", "--untracked-files=no").trim(), "", "Commit tracked changes before building");

const project = "labboy-workload-app";
const browserConfig = verify ? {
  NEXT_PUBLIC_FIREBASE_API_KEY: "synthetic-browser-api-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: project + ".firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: project,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: project + ".appspot.com",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "000000000000",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:000000000000:web:0000000000000000",
} : Object.fromEntries([
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_FIREBASE_VAPID_KEY",
].map(name => {
  assert(process.env[name]?.trim(), "Set " + name + " in the build environment");
  return [name, process.env[name]];
}));
assert.equal(browserConfig.NEXT_PUBLIC_FIREBASE_PROJECT_ID, project);
assert([project + ".firebaseapp.com", project + ".web.app"].includes(browserConfig.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN));
assert([project + ".appspot.com", project + ".firebasestorage.app"].includes(browserConfig.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET));

const outRoot = path.join(root, ".tools", "production-hosting");
fs.mkdirSync(outRoot, { recursive: true });
const release = fs.mkdtempSync(path.join(outRoot, verify ? "verify-" : "release-"));
const frontend = path.join(release, "frontend");
const dependencies = [
  "scripts/calendar-role-write-plan.mjs",
  "docs/development/calendar-role-write-plan/staging-fixture.json",
  "docs/development/calendar-staging-writer-smoke/review.json",
];
const files = git("ls-files", "-z", "--", "frontend").split("\0").filter(Boolean);
const excluded = /(?:^|\/)(?:\.env(?:\.[^/]*)?|[^/]*(?:credential|private[-_]?key|service[-_]?account)[^/]*|dev-staging-config\.json)(?:\/|$)/i;
for (const file of [...files.filter(name => !excluded.test(name)), ...dependencies]) {
  const original = path.join(root, file);
  const destination = path.join(release, file);
  assert(fs.lstatSync(original).isFile(), "Expected a regular source file: " + file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(original, destination);
}
assert(prepareClassroomPdfAssets(path.join(frontend, "public/dev-pdfjs")), "Install the locked PDF.js dependency");
prepareDlOcrAssets(path.join(frontend, "public/dev-ocr"));

const env = Object.fromEntries(Object.entries(process.env).filter(([name]) =>
  !/^(NEXT_PUBLIC_|CALENDAR_|FIREBASE_|GOOGLE_|GCLOUD_|FIRESTORE_|NODE_OPTIONS$)/i.test(name)
));
const require = createRequire(path.join(root, "frontend/package.json"));
execFileSync(process.execPath, [require.resolve("next/dist/bin/next"), "build", "--no-lint"], {
  cwd: frontend,
  stdio: "inherit",
  windowsHide: true,
  env: {
    ...env,
    ...browserConfig,
    NEXT_PUBLIC_API_URL: "https://employee-workload-app.onrender.com",
    NEXT_PUBLIC_ANALYTICS_WORKSPACE: "1",
    NEXT_PUBLIC_WORKLOG_WORKSPACE: "1",
    NEXT_PUBLIC_CALENDAR_PRODUCTION_CREATE: "1",
    NEXT_PUBLIC_MOBILE_TAB_SCRUB: mobileTabScrub ? "1" : "0",
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
    UI_BUILD_CHECK: "1",
  },
});

const publicFiles = path.join(release, "public");
fs.renameSync(path.join(frontend, ".ui-build-check"), publicFiles);
for (const file of [
  "help.html", "calendar.html", "dashboard.html", "admin/staff-analytics.html", "worklogs/new.html", "resources.html",
  "dev-pdfjs/pdf.worker.min.mjs", "dev-ocr/worker.min.js", "dev-ocr/tha.traineddata.gz", "dev-ocr/eng.traineddata.gz",
]) assert(fs.existsSync(path.join(publicFiles, file)), "Missing Hosting asset: " + file);
assert(!fs.existsSync(path.join(publicFiles, "dev-staging-config.json")));

const assets = fs.readdirSync(publicFiles, { recursive: true, withFileTypes: true }).filter(entry => entry.isFile()).map(entry => {
  const file = path.join(entry.parentPath, entry.name);
  const relative = path.relative(publicFiles, file).split(path.sep).join("/");
  assert(!excluded.test(relative), "Unexpected Hosting asset: " + relative);
  return { path: relative, sha256: hash(fs.readFileSync(file)) };
}).sort((left, right) => left.path.localeCompare(right.path, "en"));
const { hosting } = JSON.parse(fs.readFileSync(path.join(root, "firebase/firebase.json"), "utf8"));
const config = JSON.stringify({ hosting: { ...hosting, public: "public", site: project } }, null, 2) + "\n";
const manifest = {
  commit: git("rev-parse", "HEAD").trim(),
  project,
  verificationOnly: verify,
  features: { mobileTabScrub },
  hostingConfigSha256: hash(config),
  assets,
};
if (!verify) fs.writeFileSync(path.join(release, "firebase.json"), config);
fs.writeFileSync(path.join(release, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify({ release, verificationOnly: verify, files: assets.length, commit: manifest.commit }));
