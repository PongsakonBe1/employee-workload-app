// Verify actual Emulator-backed UI roles; no localStorage role is trusted as authorization.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require(process.argv[2]);
const origin = 'http://127.0.0.1:4310', out = path.resolve('output/playwright/calendar-role-concurrency-qa');
fs.mkdirSync(out, { recursive: true });
const report = { completed: false, cloudUsed: false, cases: [], errors: [], outsideOrigins: [], firestoreWrites: 0, physicalDeviceTested: false };
const actors = [
  { id: null, label: 'anonymous', read: false, write: false },
  { id: 'directory-a', label: 'Admin', read: true, write: true },
  { id: 'directory-c', label: 'Superadmin', read: true, write: true },
  { id: 'directory-b', label: 'Staff', read: true, write: false },
  { id: 'pending-user', label: 'pending', read: false, write: false },
  { id: 'inactive-user', label: 'inactive', read: false, write: false },
];
async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: process.argv[3] });let activePage;
  try {
    for (const width of [1440, 390]) for (const actor of actors) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, isMobile: width < 760, hasTouch: width < 760, serviceWorkers: 'block' });
      await context.addInitScript(theme => {
        localStorage.setItem('labboy.appearance.v1', JSON.stringify({ theme, navigation: 'sidebar' }));
        localStorage.setItem('icit_user', JSON.stringify({ uid: 'synthetic-ui-claim', displayName: 'Synthetic claim', role: 'superadmin' }));
      }, width < 760 ? 'dark' : 'light');
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin === 'http://127.0.0.1:18080' && /:commit$|:batchWrite$|\/(Commit|Write)(\/|\?|$)/.test(url.pathname)) report.firestoreWrites++;
        if ([origin, 'http://127.0.0.1:18080', 'http://127.0.0.1:19099'].includes(url.origin) || ['data:', 'blob:'].includes(url.protocol)) return route.continue();
        report.outsideOrigins.push(url.origin);return route.abort();
      });
      const page = activePage = await context.newPage();page.setDefaultTimeout(20000);
      page.on('pageerror', error => report.errors.push(error.message));
      await page.goto(origin + '/dev/calendar-write', { timeout: 90000 });
      await page.waitForFunction(() => document.documentElement.dataset.uiReady === 'true');
      const source = page.getByRole('region', { name: 'เชื่อม Emulator เพิ่มตาราง', exact: true });
      if (actor.id) {
        await source.getByRole('combobox', { name: 'บัญชีทดสอบ', exact: true }).selectOption(actor.id);
        await source.getByRole('button', { name: 'เข้าสู่ระบบจำลอง', exact: true }).click();
        if (actor.read) await source.getByRole('status').filter({ hasText: 'อ่านสำเร็จ' }).waitFor({ timeout: 30000 });
        else await source.getByRole('alert').filter({ hasText: 'ไม่มีสิทธิ์อ่านปฏิทิน' }).waitFor();
      }
      for (const label of ['เพิ่มตาราง', 'นำเข้าตาราง']) assert.equal(await page.getByRole('button', { name: label, exact: true }).isDisabled(), !actor.write);
      if (actor.read) {
        await page.getByRole('group', { name: 'มุมมองปฏิทิน', exact: true }).getByRole('button', { name: 'สัปดาห์', exact: true }).click();
        await page.waitForTimeout(100);await source.getByRole('status').filter({ hasText: 'อ่านสำเร็จ' }).waitFor();
        assert.ok(await page.locator('.cal-timed-event').count() > 0);
        await page.locator('.cal-timed-event').first().click();
        const detail = page.locator('dialog.cal-dialog[open]');
        assert.equal(await detail.getByRole('button', { name: 'แก้ไขตาราง', exact: true }).count(), 0);
        assert.equal(await detail.getByRole('button', { name: 'ลบตาราง…', exact: true }).count(), 0);
        await page.keyboard.press('Escape');
        if (actor.write) {
          await page.getByRole('button', { name: 'เพิ่มตาราง', exact: true }).click();
          const entry = page.locator('dialog.cal-dialog[open]');
          assert.equal(await entry.locator('[name=kind] option[value=exam]').count(), 0);
          assert.equal(await entry.getByRole('button', { name: 'บันทึกไปยัง Emulator', exact: true }).count(), 1);
          await page.keyboard.press('Escape');
        }
      } else assert.equal(await page.locator('.cal-timed-event,.cal-agenda-event,.cal-month-event').count(), 0);
      if (['Admin', 'Staff', 'Superadmin'].includes(actor.label)) {
        await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
        await page.screenshot({ path: path.join(out, `role-${actor.label.toLowerCase()}-${width}.png`) });
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      report.cases.push({ width, role: actor.label, readAllowed: actor.read, createImportEnabled: actor.write, legacyLocalStorageClaimIgnored: true, editDeleteNotExposed: true });
      console.log(`PASS ${width}px ${actor.label}`);await context.close();
    }
    assert.deepEqual(report.errors, []);assert.deepEqual(report.outsideOrigins, []);assert.equal(report.firestoreWrites, 0);report.completed = true;
  } catch (error) {
    report.failure = error.stack;
    if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: path.join(out, 'ui-failure.png') }).catch(() => {});
    throw error;
  } finally { fs.writeFileSync(path.join(out, 'ui-report.json'), JSON.stringify(report, null, 2));await browser.close(); }
}
main().catch(error => { console.error(error);process.exitCode = 1; });
