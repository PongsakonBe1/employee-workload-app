// Real SDK popup smoke test in an isolated, signed-out browser. No credentials entered.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium } = require(process.argv[2]);
const origin = process.argv[4] || "http://127.0.0.1:4310";
const output = path.resolve("output/playwright/calendar-staging-readonly", origin.includes("127.0.0.1") ? "local" : "public");
const report = { completed: false, checks: [], credentialsEntered: false, authenticatedReadsTested: false };

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.argv[3] });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, hasTouch: width < 760, isMobile: width < 760, serviceWorkers: "block" });
      try {
        const page = await context.newPage();
        await page.goto(origin + "/dev/calendar-staging", { timeout: 60000 });
        const login = page.getByRole("button", { name: "เข้าสู่ staging ด้วย Google", exact: true });
        await page.waitForFunction(() => !Array.from(document.querySelectorAll("button")).find(button => button.textContent === "เข้าสู่ staging ด้วย Google")?.disabled);
        const popupPromise = page.waitForEvent("popup", { timeout: 20000 });
        await login.click();
        const popup = await popupPromise;
        // Do not record the OAuth URL or network payloads: they can contain sensitive state.
        await popup.waitForURL(url => url.hostname === "accounts.google.com", { timeout: 30000, waitUntil: "domcontentloaded" });
        const oauthError = await popup.locator("body").innerText();
        assert.ok(!/redirect_uri_mismatch|invalid_client|access blocked/i.test(oauthError), "OAuth provider rejected the staging client");
        await popup.close();
        await page.getByRole("alert").filter({ hasText: "auth/popup-closed-by-user" }).waitFor({ timeout: 15000 });
        assert.ok(await page.getByRole("button", { name: "เพิ่มตาราง", exact: true }).isDisabled());
        assert.ok(await page.getByRole("button", { name: "นำเข้าตาราง", exact: true }).isDisabled());
        report.checks.push({ width, googlePopupReached: true, cancellationRecoverable: true, mutationsDisabled: true });
      } finally {
        await context.close();
      }
    }
    report.completed = true;
  } finally {
    await browser.close();
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, "popup-report.json"), JSON.stringify(report, null, 2));
  }
  console.log("PASS staging Google popup and cancellation: 2 viewports");
})().catch(() => {
  // Avoid printing OAuth URLs, request bodies or a provider error containing account details.
  console.error("Staging popup smoke test failed; inspect the isolated browser without copying credentials or OAuth URLs");
  process.exitCode = 1;
});
