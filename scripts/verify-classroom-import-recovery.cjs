// Local-only reproduction with an authorized PDF. Save numeric evidence only;
// never capture screenshots, DOM text, course labels, or instructor identities.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require(process.argv[2]);
const origin = 'http://127.0.0.1:4310';
const report = { completed: false, localOnly: true, screenshotsCaptured: false, identitiesSaved: false, cases: [] };
const output = path.resolve('output/playwright/classroom-pdf-import/real-file-recovery.json');
async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: process.argv[3] });
  try {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, isMobile: width === 390, hasTouch: width === 390, serviceWorkers: 'block' });
      let unexpectedRequests = 0, pageErrors = 0;
      await context.route('**/*', route => {
        const request = route.request(), url = new URL(request.url());
        if ((url.origin === origin && ['GET', 'HEAD'].includes(request.method())) || ['data:', 'blob:'].includes(url.protocol)) return route.continue();
        unexpectedRequests++;return route.abort();
      });
      const page = await context.newPage();page.on('pageerror', () => pageErrors++);
      await page.goto(origin + '/dev/calendar', { timeout: 90000 });
      await page.waitForFunction(() => document.documentElement.dataset.uiReady === 'true');
      const dialog = page.locator('dialog.cal-import-dialog[open]');
      const open = async () => {
        await page.getByRole('button', { name: 'นำเข้าตาราง', exact: true }).click();
        await dialog.locator('input[type=file]').setInputFiles(process.argv[4]);
        await dialog.getByRole('heading', { name: 'ตรวจรายการ · 25 รายการ', exact: true }).waitFor({ timeout: 45000 });
      };
      const setDates = async () => {
        // Explicit test dates. The higher-education end is not inferred from PDF.
        await dialog.locator('[data-term-group=vocational][data-term-field=start]').fill('2026-11-02');
        await dialog.locator('[data-term-group=vocational][data-term-field=end]').fill('2027-03-14');
        await dialog.locator('[data-term-group=higher][data-term-field=start]').fill('2026-11-23');
        await dialog.locator('[data-term-group=higher][data-term-field=end]').fill('2027-03-14');
      };
      await open();
      await dialog.locator('[name=import-confirm]').check();
      await dialog.getByRole('button', { name: 'กำหนดช่วงภาคเรียน', exact: true }).click();
      assert.equal(await dialog.locator('input[type=date]').evaluateAll(inputs => inputs.some(input => input === document.activeElement)), true);
      const focusVisible = await page.evaluate(() => { const bounds = document.activeElement.getBoundingClientRect(), body = document.querySelector('dialog[open] .ui-dialog-body').getBoundingClientRect();return bounds.top >= body.top && bounds.bottom <= body.bottom; });
      assert.equal(focusVisible, true);
      await setDates();
      await dialog.locator('.cal-import-room-filter select').selectOption('407');
      await dialog.getByRole('button', { name: 'ตรวจจุดที่ต้องแก้', exact: true }).click();
      assert.equal(await dialog.locator('.cal-import-room-filter select').inputValue(), 'all');
      assert.equal(await dialog.locator('.cal-import-row[data-issue=true]').first().evaluate(el => el === document.activeElement), true);
      const conflicts = await dialog.locator('.cal-import-row[data-issue=true]').count();
      assert.equal(conflicts, 4, 'Expected collisions with three synthetic classroom rules and one dated exam');
      for (let i = 0; i < conflicts; i++) await dialog.locator('.cal-import-row[data-issue=true]').first().getByRole('checkbox').uncheck();
      await dialog.locator('[name=import-confirm]').check();
      await dialog.getByRole('button', { name: 'เพิ่ม 21 ตาราง', exact: true }).click();
      await page.locator('.cal-undo').filter({ hasText: 'นำเข้า 21 ตารางรายสัปดาห์แล้ว' }).waitFor();
      await page.locator('.cal-undo').getByRole('button', { name: 'เลิกทำ', exact: true }).click();

      // Remove only synthetic fixture entries through the UI in this isolated tab,
      // then prove the whole real file can be imported without dropping courses.
      await page.getByRole('group', { name: 'มุมมองปฏิทิน', exact: true }).getByRole('button', { name: 'สัปดาห์', exact: true }).click();
      for (const title of ['ทักษะดิจิทัล', 'คอมพิวเตอร์พื้นฐาน', 'ห้องปฏิบัติการ', 'สอบรายวิชาตัวอย่าง']) {
        await page.locator('.cal-timed-event').filter({ hasText: title }).first().click();
        await page.locator('dialog[open]').getByRole('button', { name: 'ลบตาราง…', exact: true }).click();
        await page.locator('dialog[open]').getByRole('button', { name: 'ลบตารางตัวอย่าง', exact: true }).click();
      }
      await open();await setDates();
      assert.equal(await dialog.locator('.cal-import-row[data-issue=true]').count(), 0);
      await dialog.getByRole('button', { name: 'ยืนยันการตรวจรายการ', exact: true }).click();
      assert.equal(await dialog.locator('[name=import-confirm]').evaluate(el => el === document.activeElement), true);
      await dialog.locator('[name=import-confirm]').check();
      await dialog.getByRole('button', { name: 'เพิ่ม 25 ตาราง', exact: true }).click();
      await page.locator('.cal-undo').filter({ hasText: 'นำเข้า 25 ตารางรายสัปดาห์แล้ว' }).waitFor();
      await page.locator('.cal-undo').getByRole('button', { name: 'เลิกทำ', exact: true }).click();
      assert.equal(await page.locator('.cal-timed-event[data-kind=classroom]').count(), 0);
      assert.equal(unexpectedRequests, 0);assert.equal(pageErrors, 0);
      report.cases.push({ width, parsedRows: 25, focusedMissingDate: true, conflictsWithFixtures: conflicts, partialSelectionImported: 21, completeFileImportedWithoutFixtures: 25, undo: true, testDatesExplicit: true });
      await context.close();
    }
    report.completed = true;
  } finally { await browser.close();fs.writeFileSync(output, JSON.stringify(report, null, 2)); }
  console.log('PASS supplied PDF: 25 rows, exact missing-date focus, fixture conflicts, complete import and Undo at 390/1440');
}
main().catch(error => { console.error(error);process.exitCode = 1; });
