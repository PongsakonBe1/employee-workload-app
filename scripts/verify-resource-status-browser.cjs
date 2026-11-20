// Desktop/mobile viewport smoke with two signed-in Google Auth Emulator sessions.
const assert = require("node:assert/strict");
const { mkdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { chromium } = require(process.argv[2]);
const origin = "http://127.0.0.1:4318";
const auth = "http://127.0.0.1:19218";
const firestore = "http://127.0.0.1:18218";
const out = "output/playwright/resource-catalog-backfill";
const student = "0000000000001";
const asset = "ICIT31";
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
  if (handle === "qa-role-admin") await page.waitForURL(origin + "/admin/record");
  else await page.getByRole("heading", { name: "บันทึกงาน", exact: true }).waitFor();
  return page;
}

async function room(page, action) {
  await page.getByRole("button", { name: /QA ห้องชั้น 4/ }).click();
  await page.getByRole("button", { name: new RegExp("^ห้อง 401 .*" + action) }).click();
  await page.getByRole("button", { name: new RegExp("ยืนยัน.*" + action + "ห้อง 401") }).click();
  await page.getByRole("heading", { name: "QA ห้องชั้น 4", exact: true }).waitFor({ state: "hidden" });
}

async function equipmentModal(page, template, location) {
  await page.getByRole("button", { name: new RegExp(template) }).click();
  const title = page.getByRole("heading", { name: template, exact: true });
  await title.waitFor();
  await page.getByRole("button", { name: new RegExp(`^${asset} .*${location}`) }).click();
  return title;
}

async function addEquipment(page) {
  await page.goto(`${origin}/admin/equipment-items`);
  await page.getByRole("heading", { name: "จัดการอุปกรณ์", exact: true }).waitFor();
  await page.getByRole("button", { name: "เพิ่มอุปกรณ์", exact: true }).click();
  const form = page.locator("form");
  await form.getByLabel(/รหัสอุปกรณ์/).fill(asset);
  await form.getByLabel(/หัวข้อรอง/).selectOption("ยืมหูฟัง");
  await form.getByLabel("สถานที่ประจำ", { exact: true }).fill("ห้องบริการชั้น 3");
  await form.getByRole("button", { name: "เพิ่มอุปกรณ์", exact: true }).click();
  const row = page.getByRole("row").filter({ has: page.getByText(asset, { exact: true }) });
  await row.waitFor();
  return row;
}

async function moveEquipment(page, row) {
  await row.getByRole("button", { name: "แก้ไข", exact: true }).click();
  await page.getByLabel("สถานที่ประจำ", { exact: true }).fill("Finn Space");
  await page.getByRole("button", { name: "อัปเดต", exact: true }).click();
  await row.getByText("Finn Space", { exact: true }).waitFor();
}

async function verifyWrites() {
  const source = `${firestore}/v1/projects/demo-worklog-workspace/databases/(default)/documents:runQuery`;
  async function matching(fieldPath, stringValue) {
    const res = await fetch(source, {
      method: "POST", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
      body: JSON.stringify({ structuredQuery: {
        from: [{ collectionId: "worklogs" }],
        where: { fieldFilter: { field: { fieldPath }, op: "EQUAL", value: { stringValue } } }
      } }),
      signal: AbortSignal.timeout(8000), redirect: "error"
    });
    assert(res.ok);
    const rows = await res.json();
    return rows.filter(row => row.document).map(({ document: { fields } }) => Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [key, value.stringValue])
    ));
  }
  const [rooms, loans] = await Promise.all([matching("room", "401"), matching("equipment", asset)]);
  assert.equal(rooms.length, 2);
  assert(rooms.some(row => row.employeeId === "qa-role-staff-a" && row.minorTask === "เปิดห้องเรียนชั้น 4"));
  assert(rooms.some(row => row.employeeId === "qa-role-staff-b" && row.minorTask === "ปิดห้องเรียนชั้น 4"));
  assert.equal(loans.length, 2);
  assert(loans.some(row => row.employeeId === "qa-role-staff-a" && row.minorTask === "ยืมหูฟัง"));
  assert(loans.some(row => row.employeeId === "qa-role-staff-b" && row.minorTask === "คืนหูฟัง"));
  assert(loans.every(row => row.recipient === student));
}

(async () => {
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.argv[3] });
  try {
    const admin = await login(browser, "qa-role-admin", 1440);
    const row = await addEquipment(admin);
    const desktop = await login(browser, "qa-role-staff-a", 1440);
    const mobile = await login(browser, "qa-role-staff-b", 390);
    await room(desktop, "เปิดใช้งาน");
    await room(mobile, "ปิดการใช้งาน");
    const first = await equipmentModal(desktop, "QA หูฟัง", "ห้องบริการชั้น 3");
    const field = desktop.getByRole("textbox", { name: "รหัสนักศึกษา 13 หลัก" });
    await field.fill(student);
    await field.press("Enter");
    await first.waitFor({ state: "hidden" });
    await moveEquipment(admin, row);
    const second = await equipmentModal(mobile, "QA Finn หูฟัง", "Finn Space");
    await mobile.getByText(student, { exact: true }).first().waitFor();
    await mobile.getByRole("button", { name: `คืน ${asset} — สมบูรณ์`, exact: true }).click();
    await second.waitFor({ state: "hidden" });
    await verifyWrites();
    await mobile.goto(origin + "/worklogs");
    await mobile.getByRole("button").filter({ hasText: `คืนหูฟัง ${asset}` }).first().waitFor();
    assert.equal(await mobile.getByRole("button").filter({ hasText: `ยืมหูฟัง ${asset}` }).count(), 0);
    await desktop.goto(origin + "/resources");
    await desktop.getByRole("button", { name: "อุปกรณ์", exact: true }).click();
    await desktop.getByRole("button", { name: new RegExp(`${asset}.*Finn Space`) }).click();
    assert.equal(await desktop.getByRole("button", { name: new RegExp(`${asset}.*ห้องบริการชั้น 3`) }).count(), 0);
    await desktop.screenshot({ path: join(out, "equipment-moved-finn.png") });
    Object.assign(report, { passed: true, adminCreateAndMove: true, locationMatchedOnResourcePage: true, roomCrossStaff: true, loanCrossStaff: true, sameBorrower: true, noDuplicate: true, ownHistoryOnly: true });
    console.log(JSON.stringify(report));
  } finally {
    writeFileSync(join(out, "browser-report.json"), JSON.stringify(report, null, 2) + "\n");
    await browser.close();
  }
})().catch(error => { console.error(error.message);process.exitCode = 1; });
