// Run against a fresh copy of the existing loopback smoke environment.
const assert = require("node:assert/strict");
const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { chromium } = require(process.argv[2]);

const project = "demo-worklog-workspace";
const origin = "http://127.0.0.1:4318";
const auth = "http://127.0.0.1:19218";
const firestore = "http://127.0.0.1:18218";
const api = `${firestore}/v1/projects/${project}/databases/(default)/documents`;
const out = "output/playwright/analytics-production-workspace";
const staff = { id: "qa-analytics-staff", name: "QA Staff", role: "staff" };
const admin = { id: "qa-analytics-admin", name: "QA Admin", role: "admin" };
const oldDate = "2024-11-06";
const email = person => `${person.id}@example.test`;
const shift = (date, days) => new Date(Date.parse(date) + 86400000 * days).toISOString().slice(0, 10);
const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Bangkok" }).format(new Date());
const monday = shift(today, -((new Date(today).getUTCDay() + 6) % 7));
const sunday = shift(monday, 6);
const report = { commitMode: "production export with flag enabled", source: project, passed: false };

async function json(url, body) {
  assert([auth, firestore].includes(new URL(url).origin));
  const res = await fetch(url, {
    method: body ? "POST" : "GET", redirect: "error", signal: AbortSignal.timeout(20000),
    headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
    body: body && JSON.stringify(body)
  });
  assert(res.ok, `Local fixture request failed with HTTP ${res.status}`);
  return res.json();
}

async function seed() {
  const existing = await json(`${api}/worklogs?pageSize=1`);
  assert(!existing.documents?.length, "Start a fresh Emulator before this test");
  for (const person of [staff, admin]) {
    const account = await json(`${auth}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {
      email: email(person), localId: person.id, password: crypto.randomUUID(), targetProjectId: project, returnSecureToken: false
    });
    assert.equal(account.localId, person.id);
  }
  const put = (path, data) => ({ update: {
    name: `${new URL(api).pathname.slice(4)}/${path}`,
    fields: Object.fromEntries(Object.entries(data).map(([field, value]) =>
      [field, typeof value === "boolean" ? { booleanValue: value } : { stringValue: value }]))
  }, currentDocument: { exists: false } });
  const log = (id, employeeId, date, minorTask, group = "") => put(`worklogs/${id}`, {
    employeeId, date, time: "09:00", minorTask, comboGroupId: group, comment: id
  });
  const writes = [
    ...[staff, admin].map(person => put(`users/${person.id}`, {
      uid: person.id, role: person.role, active: true, displayName: person.name, email: email(person)
    })),
    log("qa-before-week", staff.id, shift(monday, -1), "Wifi"),
    log("qa-combo-1", staff.id, monday, "Wifi", "qa-group"),
    log("qa-combo-2", staff.id, monday, "Microsoft365", "qa-group"),
    log("qa-combo-3", staff.id, monday, "ยืมหูฟัง", "qa-group"),
    log("qa-admin", admin.id, monday, "เปิดห้องเรียนชั้น 4"),
    log("qa-unknown", "qa-historical-id", sunday, "Wifi"),
    log("qa-after-week", admin.id, shift(sunday, 1), "Wifi"),
    ...Array.from({ length: 1002 }, (_, index) => log(`qa-page-${String(index).padStart(4, "0")}`, staff.id, oldDate, "Wifi"))
  ];
  for (let offset = 0; offset < writes.length; offset += 400) {
    const batch = writes.slice(offset, offset + 400);
    const response = await json(`${api}:commit`, { writes: batch });
    assert.equal(response.writeResults.length, batch.length);
  }
}

async function readSource() {
  const docs = [];
  let page;
  do {
    const params = new URLSearchParams({ pageSize: 1000 });
    if (page?.nextPageToken) params.set("pageToken", page.nextPageToken);
    page = await json(`${api}/worklogs?${params}`);
    docs.push(...page.documents);
  } while (page.nextPageToken);
  assert.equal(docs.length, 1009);
  return docs.map(doc => Object.fromEntries(Object.entries(doc.fields).map(([key, value]) => [key, value.stringValue])));
}

async function signIn(browser, person, viewport, path) {
  const context = await browser.newContext({ viewport, serviceWorkers: "block", acceptDownloads: true });
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    const googleStaticScript = url.origin === "https://apis.google.com" && route.request().resourceType() === "script";
    return [origin, auth, firestore].includes(url.origin) || googleStaticScript || ["about:", "blob:", "data:"].includes(url.protocol)
      ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(14000);
  await page.goto(origin + path);
  const [popup] = await Promise.all([
    page.waitForEvent("popup", { timeout: 18000 }),
    page.getByRole("button", { name: "เข้าสู่ระบบด้วย Google", exact: true }).click()
  ]);
  await popup.waitForURL(auth + "/**");
  const addAccount = popup.getByRole("button", { name: "Add new account", exact: true });
  await addAccount.waitFor();
  const account = popup.getByText(email(person), { exact: true });
  if (await account.count()) await account.click();
  else {
    await addAccount.click();
    await popup.getByRole("textbox", { name: "Email", exact: true }).fill(email(person));
    await popup.getByRole("textbox", { name: "Display name", exact: true }).fill(person.name);
    await popup.getByRole("button", { name: "Sign in with Google.com", exact: true }).click();
  }
  const landingPath = person.role === "admin" ? "/admin/record" : "/worklogs/new";
  await page.waitForURL(origin + landingPath);
  if (page.url() !== origin + path) await page.goto(origin + path);
  return page;
}

async function count(page, n) {
  await page.waitForFunction(expected => document.querySelector("[data-loaded-count]")?.textContent.replace(/[^0-9]/g, "") === String(expected), n);
}

async function selectRange(page, mode, start, end) {
  await page.locator(".planning-period button").first().click();
  const dialog = page.getByRole("dialog", { name: "ช่วงข้อมูล" });
  await dialog.getByLabel("ช่วงเวลา", { exact: true }).selectOption(mode);
  if (mode === "custom") {
    await dialog.getByLabel("เริ่มวันที่").fill(start);
    await dialog.getByLabel("สิ้นสุดวันที่").fill(end);
  }
  await dialog.getByRole("button", { name: "ใช้ช่วงนี้" }).click();
  await dialog.waitFor({ state: "hidden" });
}

async function saveView(page, suffix) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "Horizontal document overflow");
  await page.screenshot({ path: join(out, suffix + ".png") });
}

(async () => {
  mkdirSync(out, { recursive: true });
  if (!process.argv.includes("--reuse-fixtures")) await seed();
  const source = await readSource();
  const weekly = source.filter(doc => doc.date >= monday && doc.date <= sunday);
  const own = weekly.filter(doc => doc.employeeId === staff.id);
  assert.equal(weekly.length, 5);
  assert.equal(own.length, 3);

  const browser = await chromium.launch({ headless: true, executablePath: process.argv[3] });
  try {
    if (process.argv.includes("--legacy")) {
      const page = await signIn(browser, admin, { width: 1440, height: 960 }, "/dashboard");
      const title = JSON.parse(readFileSync("frontend/messages/th.json", "utf8")).dashboard.title;
      await page.getByRole("heading", { name: title, exact: true }).waitFor();
      assert.equal(await page.locator("[data-planning-mode]").count(), 0);
      await page.goto(origin + "/admin/staff-analytics");
      await page.getByRole("heading", { name: "Staff Analytics", exact: true }).waitFor();
      assert.equal(await page.locator("[data-planning-mode]").count(), 0);
      const enabledReport = JSON.parse(readFileSync(join(out, "browser-report.json"), "utf8"));
      assert(enabledReport.passed);
      Object.assign(report, enabledReport, { flagOffLegacyRoutes: true });
      console.log("PASS both legacy Analytics routes with the workspace flag off");
      return;
    }
    const staffPage = await signIn(browser, staff, { width: 1440, height: 960 }, "/dashboard");
    await staffPage.getByRole("heading", { name: "ภาพรวมงาน", exact: true }).waitFor();
    await staffPage.getByRole("button", { name: "รายสัปดาห์", exact: true }).waitFor();
    await count(staffPage, own.length);
    await staffPage.getByRole("button", { name: `${monday} ${own.length} กิจกรรม`, exact: true }).click();
    const details = staffPage.getByRole("dialog");
    for (const row of own) await details.getByText(row.comment, { exact: true }).waitFor();
    assert.equal(await details.locator(".planning-source-record").count(), own.length);
    await staffPage.keyboard.press("Escape");
    await selectRange(staffPage, "custom", monday, monday);
    await count(staffPage, own.length);
    await staffPage.getByRole("button", { name: "สรุปแบบประเมิน" }).click();
    const assessment = staffPage.getByRole("dialog", { name: "สรุปประกอบแบบประเมิน" });
    await assessment.getByLabel("เริ่มวันที่").fill(shift(monday, -1));
    await assessment.getByRole("button", { name: "แสดงสรุป", exact: true }).click();
    await staffPage.waitForFunction(() => document.querySelector("[data-assessment-total]")?.textContent.startsWith("4 ครั้ง"));
    await staffPage.keyboard.press("Escape");
    await saveView(staffPage, "desktop-staff-overview");
    await staffPage.goto(origin + "/admin/staff-analytics");
    await staffPage.getByRole("heading", { name: "หน้านี้สำหรับผู้ดูแล", exact: true }).waitFor();
    assert.equal(await staffPage.locator("[data-loaded-count]").count(), 0);
    report.staff = { weekly: own.length, drillDown: own.length, assessmentIndependentRange: 4, staffAnalyticsBlocked: true };

    const adminPage = await signIn(browser, admin, { width: 390, height: 844 }, "/dashboard");
    await count(adminPage, weekly.length);
    await adminPage.getByRole("button", { name: "ระบุเจ้าหน้าที่ไม่ได้ 1 รายการ", exact: true }).click();
    await adminPage.getByRole("dialog").getByText("qa-unknown", { exact: true }).waitFor();
    await adminPage.keyboard.press("Escape");
    await adminPage.goto(origin + "/admin/staff-analytics");
    await adminPage.getByRole("heading", { name: "การกระจายงานของทีม" }).waitFor();
    await count(adminPage, weekly.length);
    await adminPage.getByRole("combobox", { name: "ผู้ปฏิบัติงาน", exact: true }).selectOption(staff.id);
    await count(adminPage, own.length);
    await saveView(adminPage, "mobile-admin-staff");
    const [csv] = await Promise.all([
      adminPage.waitForEvent("download"),
      adminPage.getByRole("button", { name: "ส่งออกข้อมูลที่แสดง", exact: true }).click()
    ]);
    const text = readFileSync(await csv.path(), "utf8");
    assert(text.includes(`"${monday}","${sunday}","ข้อมูลที่แสดง","QA Staff","3","3","1"`));
    assert(!text.includes("QA Admin"));
    await selectRange(adminPage, "fiscal");
    const fiscalStart = today.slice(5, 7) >= "10" ? today.slice(0, 4) + "-10-01" : Number(today.slice(0, 4)) - 1 + "-10-01";
    const fiscalEnd = Number(fiscalStart.slice(0, 4)) + 1 + "-09-30";
    const fiscalCount = source.filter(doc => doc.employeeId === staff.id && doc.date >= fiscalStart && doc.date <= fiscalEnd).length;
    await count(adminPage, fiscalCount);
    await selectRange(adminPage, "custom", oldDate, oldDate);
    await count(adminPage, 1000);
    await adminPage.getByText("กราฟและยอดรวมคำนวณจากรายการที่โหลดแล้ว", { exact: false }).waitFor();
    await adminPage.getByRole("button", { name: "โหลดเพิ่ม 1,000 รายการ" }).click();
    const full = source.filter(doc => doc.employeeId === staff.id && doc.date === oldDate).length;
    await count(adminPage, full);
    assert.equal(await adminPage.getByRole("button", { name: "โหลดเพิ่ม 1,000 รายการ" }).count(), 0);
    await adminPage.reload();
    await adminPage.getByRole("button", { name: "รายสัปดาห์", exact: true }).waitFor();
    await count(adminPage, weekly.length);
    report.admin = { weekly: weekly.length, unknown: 1, filteredCsv: own.length, fiscal: fiscalCount, cursor: [1000, full], reloadDefault: true };
    report.passed = true;
    console.log(JSON.stringify(report));
  } finally {
    if (!process.argv.includes("--legacy") || report.flagOffLegacyRoutes) {
      writeFileSync(join(out, "browser-report.json"), JSON.stringify(report, null, 2) + "\n");
    }
    await browser.close();
  }
})().catch(error => { console.error(error.message);process.exitCode = 1; });
