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
      const confirmedDates = async () => {
        for (const [group, field, value] of [['vocational','start','2026-11-02'],['vocational','end','2027-03-14'],['higher','start','2026-11-23'],['higher','end','2027-03-14']])
          assert.equal(await dialog.locator(`[data-term-group=${group}][data-term-field=${field}]`).inputValue(), value);
      };
      await open();
      await confirmedDates();
      assert.equal(await dialog.locator('.cal-import-row[data-issue=true]').filter({hasText:'ทักษะดิจิทัล'}).count(),1);
      await dialog.locator('.cal-import-room-filter select').selectOption('407');
      const conflicts = await dialog.locator('.cal-import-row[data-issue=true]').count();
      assert.equal(conflicts, 4, 'Expected collisions with three synthetic classroom rules and one dated exam');
      await dialog.locator('.cal-import-actions').getByRole('button',{name:'ใช้พื้นที่ทดลองแยก',exact:true}).click();
      await confirmedDates();assert.equal(await dialog.locator('.cal-import-row').count(),25);
      assert.equal(await dialog.locator('.cal-import-row[data-issue=true]').count(), 0);
      await dialog.getByRole('button', { name: 'ยืนยันการตรวจรายการ', exact: true }).click();
      assert.equal(await dialog.locator('[name=import-confirm]').evaluate(el => el === document.activeElement), true);
      await dialog.locator('[name=import-confirm]').check();
      await dialog.getByRole('button', { name: 'เพิ่ม 25 ตาราง', exact: true }).click();
      await page.locator('.cal-undo').filter({ hasText: 'นำเข้า 25 ตารางรายสัปดาห์แล้ว' }).waitFor();
      const datasets=page.getByRole('group',{name:'เลือกชุดข้อมูลปฏิทิน',exact:true});
      await datasets.getByRole('button',{name:'ชุดตัวอย่าง',exact:true}).click();
      assert.equal(await page.locator('.cal-undo').count(),0);
      await page.getByRole('group',{name:'มุมมองปฏิทิน',exact:true}).getByRole('button',{name:'สัปดาห์',exact:true}).click();
      for(const title of ['ทักษะดิจิทัล','คอมพิวเตอร์พื้นฐาน','ห้องปฏิบัติการ','สอบรายวิชาตัวอย่าง'])assert.equal(await page.locator('.cal-timed-event').filter({hasText:title}).count(),1);
      await datasets.getByRole('button',{name:'พื้นที่ทดลองนำเข้า',exact:true}).click();
      await page.locator('.cal-undo').filter({hasText:'นำเข้า 25 ตารางรายสัปดาห์แล้ว'}).waitFor();
      await open();await confirmedDates();assert.equal(await dialog.locator('.cal-import-row[data-issue=true]').count(),25);
      assert.equal(await dialog.getByRole('button',{name:'เพิ่ม 25 ตาราง',exact:true}).count(),0);
      await dialog.getByRole('button',{name:'ยกเลิก',exact:true}).click();
      await page.locator('.cal-undo').getByRole('button', { name: 'เลิกทำ', exact: true }).click();
      assert.equal(await page.locator('.cal-timed-event[data-kind=classroom]').count(), 0);
      await datasets.getByRole('button',{name:'ชุดตัวอย่าง',exact:true}).click();
      assert.equal(await page.locator('.cal-timed-event[data-kind=classroom]').count(),3);
      assert.equal(unexpectedRequests, 0);assert.equal(pageErrors, 0);
      report.cases.push({ width, parsedRows:25, confirmedSemesterDates:true, conflictsNamed:true, conflictsWithFixtures:conflicts, sandboxImport:25, duplicateBlocked:25, fixtureRecordsPreserved:4, independentUndo:true, noCoursesDropped:true });
      await context.close();
    }
    report.completed = true;
  } finally { await browser.close();fs.writeFileSync(output, JSON.stringify(report, null, 2)); }
  console.log('PASS supplied PDF: 25 rows imported in isolated sandbox, confirmed dates, named conflicts, duplicate prevention, separate Undo and original fixtures retained at 390/1440');
}
main().catch(error => { console.error(error);process.exitCode = 1; });
