// Desktop/mobile viewport smoke with two signed-in Google Auth Emulator sessions.
const assert = require("node:assert/strict");
const { mkdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { chromium } = require(process.argv[2]);
const origin = "http://127.0.0.1:4318";
const auth = "http://127.0.0.1:19218";
const firestore = "http://127.0.0.1:18218";
const out = "output/playwright/worklog-access-boundary";
const student = "0000000000001";
const report = { passed: false, source: "demo-worklog-workspace", physicalDevice: false };

async function login(browser, handle, width) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: "block" });
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    const gapiScript = url.origin === "https://apis.google.com" && route.request().resourceType() === "script";
    return [origin, auth, firestore].includes(url.origin) || gapiScript || ["about:", "blob:", "data:"].includes(url.protocol)
      ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(16000);
  await page.goto(origin + "/worklogs/new");
  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "เข้าสู่ระบบด้วย Google", exact: true }).click()
  ]);
  await popup.waitForURL(auth + "/**");
  const email = `${handle}@example.test`;
  const add = popup.getByRole("button", { name: "Add new account", exact: true });
  await add.waitFor();
  const account = popup.getByText(email, { exact: true });
  if (await account.count()) await account.click();
  else {
    await add.click();
    await popup.getByRole("textbox", { name: "Email", exact: true }).fill(email);
    await popup.getByRole("textbox", { name: "Display name", exact: true }).fill("QA Resource Operator");
    await popup.getByRole("button", { name: "Sign in with Google.com", exact: true }).click();
  }
  await page.getByRole("heading", { name: "บันทึกงาน", exact: true }).waitFor();
  return page;
}

async function room(page, action) {
  await page.getByRole("button", { name: /QA ห้องชั้น 4/ }).click();
  await page.getByRole("button", { name: new RegExp("^401\\s*" + action) }).click();
  await page.getByRole("button", { name: new RegExp("ยืนยัน.*" + action + "ห้อง 401") }).click();
  await page.getByRole("heading", { name: "QA ห้องชั้น 4", exact: true }).waitFor({ state: "hidden" });
}

async function equipmentModal(page) {
  await page.getByRole("button", { name: /QA หูฟัง/ }).click();
  const title = page.getByRole("heading", { name: "QA หูฟัง", exact: true });
  await title.waitFor();
  await page.getByRole("button", { name: /^1(?:\s|ยืม|คืน)/ }).click();
  return title;
}

async function verifyWrites() {
  const source = `${firestore}/v1/projects/demo-worklog-workspace/databases/(default)/documents/worklogs`;
  const res = await fetch(source, {
    headers: { Authorization: "Bearer owner" }, signal: AbortSignal.timeout(8000), redirect: "error"
  });
  assert(res.ok);
  const rows = (await res.json()).documents.map(({ fields }) => Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, value.stringValue])
  ));
  const rooms = rows.filter(row => row.room === "401");
  assert.equal(rooms.length, 2);
  assert(rooms.some(row => row.employeeId === "qa-role-staff-a" && row.minorTask === "เปิดห้องเรียนชั้น 4"));
  assert(rooms.some(row => row.employeeId === "qa-role-staff-b" && row.minorTask === "ปิดห้องเรียนชั้น 4"));
  const loans = rows.filter(row => row.equipment === "ICIT01");
  assert.equal(loans.length, 2);
  assert(loans.some(row => row.employeeId === "qa-role-staff-a" && row.minorTask === "ยืมหูฟัง"));
  assert(loans.some(row => row.employeeId === "qa-role-staff-b" && row.minorTask === "คืนหูฟัง"));
  assert(loans.every(row => row.recipient === student));
}

(async () => {
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.argv[3] });
  try {
    const desktop = await login(browser, "qa-role-staff-a", 1440);
    const mobile = await login(browser, "qa-role-staff-b", 390);
    await room(desktop, "เปิดใช้งาน");
    await room(mobile, "ปิดการใช้งาน");
    const first = await equipmentModal(desktop);
    const field = desktop.getByRole("textbox", { name: "รหัสนักศึกษา 13 หลัก" });
    await field.fill(student);
    await field.press("Enter");
    await first.waitFor({ state: "hidden" });
    const second = await equipmentModal(mobile);
    await mobile.getByText(student, { exact: true }).first().waitFor();
    await mobile.getByRole("button", { name: "คืน ICIT01 — สมบูรณ์", exact: true }).click();
    await second.waitFor({ state: "hidden" });
    await verifyWrites();
    await mobile.goto(origin + "/worklogs");
    await mobile.getByRole("button").filter({ hasText: "คืนหูฟัง ICIT01" }).first().waitFor();
    assert.equal(await mobile.getByRole("button").filter({ hasText: "ยืมหูฟัง ICIT01" }).count(), 0);
    Object.assign(report, { passed: true, roomCrossStaff: true, loanCrossStaff: true, sameBorrower: true, noDuplicate: true, ownHistoryOnly: true });
    console.log(JSON.stringify(report));
  } finally {
    writeFileSync(join(out, "browser-report.json"), JSON.stringify(report, null, 2) + "\n");
    await browser.close();
  }
})().catch(error => { console.error(error.message);process.exitCode = 1; });
