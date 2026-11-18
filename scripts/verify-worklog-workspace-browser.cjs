// Synthetic Staff, isolated browser profile and fixed loopback targets only.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.argv[2]);
const origin = "http://127.0.0.1:4318";
const emulatorAuth = "http://127.0.0.1:19218";
const localOrigins = [origin, emulatorAuth, "http://127.0.0.1:18218"];
const out = path.resolve("output/playwright/worklog-workspace-smoke");
const report = { productionMode: true, data: "demo-worklog-workspace", desktop: false, mobileViewport: false, physicalMobileTested: false };

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.argv[3] });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
    await context.route("**/*", route => {
      const url = new URL(route.request().url());
      const googleStaticScript = url.origin === "https://apis.google.com" && route.request().resourceType() === "script";
      return localOrigins.includes(url.origin) || googleStaticScript || ["about:", "blob:", "data:"].includes(url.protocol) ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    await page.goto(origin + "/worklogs/new");
    const [popup] = await Promise.all([
      page.waitForEvent("popup", { timeout: 15000 }),
      page.getByRole("button", { name: "เข้าสู่ระบบด้วย Google", exact: true }).click()
    ]);
    await popup.waitForURL(emulatorAuth + "/**");
    const existing = popup.getByText("qa-worklog-workspace@example.test", { exact: true });
    const addAccount = popup.getByRole("button", { name: "Add new account", exact: true });
    await addAccount.waitFor();
    if (await existing.count()) await existing.click();
    else {
      await addAccount.click();
      await popup.getByRole("textbox", { name: "Email", exact: true }).fill("qa-worklog-workspace@example.test");
      await popup.getByRole("textbox", { name: "Display name", exact: true }).fill("เจ้าหน้าที่ทดสอบ");
      await popup.getByRole("button", { name: "Sign in with Google.com", exact: true }).click();
    }
    await page.getByRole("heading", { name: "บันทึกงาน", exact: true }).waitFor({ timeout: 15000 });

    async function createWorklog(label) {
      await page.getByRole("button", { name: "กรอกเอง", exact: true }).click();
      await page.getByRole("button", { name: "เลือกหัวข้อรอง", exact: true }).click();
      const picker = page.getByRole("dialog", { name: "เลือกหัวข้อรอง", exact: true });
      await picker.getByRole("searchbox", { name: "ค้นหาหัวข้อรอง", exact: true }).fill("ติดตั้ง Software");
      await picker.getByRole("button", { name: "ติดตั้ง Software", exact: true }).click();
      const form = page.getByRole("form", { name: "กรอกบันทึกงาน", exact: true });
      await form.getByRole("textbox", { name: "รายละเอียด", exact: true }).fill(label);
      await form.getByRole("button", { name: "ตรวจรายการก่อนบันทึก" }).click();
      const review = page.getByRole("dialog", { name: "ตรวจรายการก่อนบันทึก", exact: true });
      await review.getByText(label, { exact: true }).waitFor();
      await review.getByRole("button", { name: "ยืนยันบันทึก", exact: true }).click();
      await review.waitFor({ state: "hidden" });
    }

    async function readBack(label, mobile) {
      await page.getByRole("button", { name: "ดูประวัติงาน", exact: true }).click();
      await page.waitForURL(origin + "/worklogs");
      const row = () => page.getByRole("button").filter({ hasText: label });
      await row().waitFor();
      await page.reload();
      try { await row().click(); }
      catch (error) {
        console.error("History after reload:", new URL(page.url()).pathname, (await page.locator("body").innerText()).split("\n").slice(0, 45).join(" | "));
        throw error;
      }
      const details = page.getByRole(mobile ? "dialog" : "complementary", { name: "รายละเอียดงาน", exact: true });
      await details.getByText(label, { exact: true }).waitFor();
      const width = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: window.innerWidth }));
      await page.screenshot({ path: path.join(out, mobile ? "mobile-history.jpg" : "desktop-history.jpg"), type: "jpeg" });
      if (width.document > width.viewport + 1) {
        const overflowing = await page.evaluate(() => Array.from(document.querySelectorAll("main *")).filter(el => el.getBoundingClientRect().right > window.innerWidth + 2).slice(0, 10).map(el => [el.tagName, String(el.className).slice(0, 100), Math.round(el.getBoundingClientRect().right)]));
        throw Error(`The worklog history overflows its viewport: ${JSON.stringify({ width, overflowing })}`);
      }
    }

    if (!process.argv.includes("--resume-desktop")) await createWorklog("QA-WORKLOG-DESKTOP");
    await readBack("QA-WORKLOG-DESKTOP", false);
    report.desktop = true;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "เพิ่มบันทึก", exact: true }).click();
    await page.waitForURL(origin + "/worklogs/new");
    if (!process.argv.includes("--resume-mobile")) await createWorklog("QA-WORKLOG-MOBILE");
    await readBack("QA-WORKLOG-MOBILE", true);
    report.mobileViewport = true;
    console.log("PASS desktop and 390px browser workflow: save → history → reload → details");
  } finally {
    fs.writeFileSync(path.join(out, "browser-report.json"), JSON.stringify(report, null, 2) + "\n");
    await browser.close();
  }
})().catch(error => { console.error(error.message);process.exitCode = 1; });
