/* E2E against real Next components with an isolated synthetic adapter. Not human UAT. */
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const {
    chromium
  } = require(process.argv[2]),
  origin = process.argv[4] || 'http://127.0.0.1:4310';
const out = path.resolve(__dirname, '../output/playwright/ui-coverage-history', origin.startsWith('http://127.0.0.1') ? /Google[\\/]Chrome/i.test(process.argv[3]) ? 'chrome' : 'e2e' : 'public');
fs.mkdirSync(out, {
  recursive: true
});
const report = {
  browserExecutable: process.argv[3],
  origin,
  completed: false,
  checks: [],
  errors: [],
  externalRequests: [],
  limitations: ['Synthetic adapter only; no Firebase/Auth/backend SIT', 'Automated acceptance scenarios are not user UAT or physical iOS/Safari/scanner verification']
};
async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.argv[3]
  });
  report.browserVersion = browser.version();
  let page;
  const context = async options => {
    const ctx = await browser.newContext({
      viewport: {
        width: 1440,
        height: 1000
      },
      serviceWorkers: 'block',
      ...options
    });
    await ctx.route('**/*', r => {
      const url = new URL(r.request().url());
      if (url.origin === origin || /^(data|blob):/.test(url.protocol)) return r.continue();
      report.externalRequests.push(url.origin);
      return r.abort();
    });
    return ctx;
  };
  const open = async (p, route = '/dev/record') => {
    p.on('pageerror', e => report.errors.push(e.message));
    assert.equal((await p.goto(origin + route, {
      timeout: 90000
    })).status(), 200);
    await p.waitForFunction(() => document.documentElement.dataset.uiReady === 'true');
  };
  const test = async (name, fn) => {
    await fn();
    report.checks.push({
      name,
      status: 'passed'
    });
    console.log('PASS ' + name);
  };
  const dialog = () => page.locator('dialog[open]');
  const history = async () => {
    await page.locator('.ui-sidebar a[href="/worklogs"]').click();
    await page.waitForURL('**/dev/history');
  };
  const record = async () => {
    await page.locator('.ui-sidebar a.ui-sidebar-link[href="/admin/record"],.ui-sidebar a.ui-sidebar-link[href="/worklogs/new"]').click();
    await page.waitForURL('**/dev/record');
  };
  const search = async value => page.getByRole('searchbox', {
    name: 'ค้นหางาน ผู้รับบริการ หรือเจ้าหน้าที่'
  }).fill(value);
  const shot = async name => {
    await page.evaluate(() => {
      document.activeElement?.blur();
      scrollTo({
        top: 0,
        behavior: 'instant'
      });
    });
    await page.screenshot({
      path: path.join(out, name + '.png'),
      fullPage: true
    });
  };
  const historyRole = async role => {
    if ((await page.locator('.history-test-controls').getAttribute('open')) === null) await page.locator('.history-test-controls summary').click();
    await page.getByLabel('บทบาทตัวอย่าง', {
      exact: true
    }).selectOption(role);
  };
  const appearance = async () => {
    await page.locator('.ui-header button[aria-label="บัญชีและเครื่องมือ"]').click();
    await dialog().getByRole('button', {
      name: 'รูปแบบการแสดงผล',
      exact: true
    }).click();
  };
  try {
    const ctx = await context();
    page = await ctx.newPage();
    await open(page);
    await test('A simulated write failure retains draft; retry commits once and real navigation opens the shared history page', async () => {
      await page.locator('.record-mode').getByRole('button', {
        name: 'กรอกเอง',
        exact: true
      }).click();
      await page.locator('[name=record-manual-recipient]').fill('หน่วยงาน QC');
      await page.locator('[name=record-manual-notes]').fill('QC ตรวจการเชื่อมประวัติ');
      await page.locator('.record-inspector summary').click();
      await page.getByRole('button', {
        name: 'จำลองบันทึกไม่สำเร็จครั้งถัดไป',
        exact: true
      }).click();
      await page.locator('.record-form').getByRole('button', {
        name: 'ตรวจรายการก่อนบันทึก',
        exact: true
      }).click();
      await dialog().getByRole('button', {
        name: 'ยืนยันบันทึก',
        exact: true
      }).click();
      await dialog().getByRole('alert').filter({
        hasText: 'จำลองบันทึกไม่สำเร็จ'
      }).waitFor();
      assert.equal(await page.locator('[name=record-manual-notes]').inputValue(), 'QC ตรวจการเชื่อมประวัติ');
      await dialog().getByRole('button', {
        name: 'ยืนยันบันทึก',
        exact: true
      }).click();
      await history();
      await search('QC ตรวจการเชื่อมประวัติ');
      assert.equal(await page.locator('.history-row').count(), 1);
      await page.locator('.history-row-open').click();
      assert.match(await page.locator('.history-inspector').textContent(), /หน่วยงาน QC/);
      await shot('history-desktop-light');
    });
    await test('Calendar day to detail to back keeps calendar mode; holidays stay visible without becoming worklogs', async () => {
      await page.getByRole('group', {
        name: 'มุมมองประวัติงาน'
      }).getByRole('button', {
        name: 'ปฏิทิน',
        exact: true
      }).click();
      await page.locator('[data-day="2026-11-06"]').click();
      await dialog().locator('.history-day-row').click();
      assert.match(await dialog().textContent(), /QC ตรวจการเชื่อมประวัติ/);
      await dialog().getByRole('button', {
        name: 'กลับรายการวันที่',
        exact: true
      }).click();
      assert.equal(await dialog().locator('.history-day-row').count(), 1);
      await page.keyboard.press('Escape');
      assert.equal(await page.getByRole('button', {
        name: 'ปฏิทิน',
        exact: true
      }).getAttribute('aria-pressed'), 'true');
      await page.getByRole('button', {
        name: 'เดือนถัดไป',
        exact: true
      }).click();
      assert.ok((await page.locator('[data-day="2026-12-05"]').textContent()).length > 1);
      assert.ok(await page.locator('[data-day="2026-12-05"] .history-holiday').count());
      assert.equal(await page.locator('[data-day="2026-12-05"]>span').count(), 0);
      assert.ok((await page.locator('[data-day="2026-12-05"]').boundingBox()).height < 150);
      await shot('history-holiday-calendar');
      await page.getByRole('button', {
        name: 'ล้างตัวกรอง',
        exact: true
      }).click();
      await page.getByRole('button', {
        name: 'รายการ',
        exact: true
      }).click();
    });
    await test('Date filter validation, cancel, account scope and CSV operate on the same filtered snapshot', async () => {
      const before = await page.locator('.history-summary').textContent();
      await page.getByRole('button', {
        name: 'ช่วงวันที่',
        exact: true
      }).click();
      await dialog().getByLabel('จากวันที่', {
        exact: true
      }).fill('2026-11-20');
      await dialog().getByRole('button', {
        name: 'ใช้ตัวกรอง',
        exact: true
      }).click();
      await dialog().getByRole('alert').waitFor();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.history-summary').textContent(), before);
      await historyRole('admin');
      await page.getByRole('button', {
        name: 'ช่วงวันที่',
        exact: true
      }).click();
      await dialog().getByLabel('ผู้ปฏิบัติงาน', {
        exact: true
      }).selectOption('fixture-b');
      await dialog().getByRole('button', {
        name: 'ใช้ตัวกรอง',
        exact: true
      }).click();
      assert.equal(await page.locator('.history-row').count(), 1);
      await historyRole('staff');
      assert.equal(await page.locator('.history-row').count(), 3);
      await search('QC ตรวจการเชื่อมประวัติ');
      const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', {
        name: 'CSV',
        exact: true
      }).click()]);
      const file = path.join(out, 'history-filtered.csv');
      await download.saveAs(file);
      const text = fs.readFileSync(file, 'utf8');
      assert.match(text, /QC ตรวจการเชื่อมประวัติ/);
      assert.doesNotMatch(text, /เจ้าหน้าที่ B/);
      assert.equal(text.split('\r\n').length, 2);
    });
    await test('Admin detail edits are shared, Undo restores original fields, and Staff cannot edit locked fixture history', async () => {
      await page.locator('.history-row-open').click();
      assert.equal(await page.locator('.history-inspector').getByRole('button', {
        name: 'แก้ไขรายละเอียด',
        exact: true
      }).isDisabled(), true);
      await historyRole('admin');
      await page.getByRole('button', {
        name: 'ล้างตัวกรอง',
        exact: true
      }).click();
      await search('QC ตรวจการเชื่อมประวัติ');
      await page.locator('.history-row-open').click();
      await page.locator('.history-inspector').getByRole('button', {
        name: 'แก้ไขรายละเอียด',
        exact: true
      }).click();
      await dialog().getByLabel('รายละเอียด', {
        exact: true
      }).fill('QC แก้รายละเอียดแล้ว');
      await dialog().getByRole('button', {
        name: 'บันทึกการแก้ไข',
        exact: true
      }).click();
      assert.match(await page.locator('.history-inspector').textContent(), /QC แก้รายละเอียดแล้ว/);
      await page.getByRole('region', {
        name: 'เลิกทำรายการล่าสุด'
      }).getByRole('button', {
        name: 'เลิกทำ',
        exact: true
      }).click();
      assert.match(await page.locator('.history-inspector').textContent(), /QC ตรวจการเชื่อมประวัติ/);
    });
    await test('Selected Combo entries have canonical tasks, bulk delete is confirmed, and Undo restores the complete batch', async () => {
      await record();
      await page.locator('.record-mode').getByRole('button', {
        name: 'บันทึกด่วน',
        exact: true
      }).click();
      await page.locator('.record-quick-grid').getByRole('button', {
        name: /เปิดใช้บัญชี/
      }).click();
      await dialog().getByRole('checkbox').nth(0).check();
      await dialog().getByRole('checkbox').nth(1).check();
      await page.locator('[name=record-combo-recipient]').fill('QC Combo ชุดทดสอบ');
      await dialog().getByRole('button', {
        name: 'ตรวจ 2 รายการ',
        exact: true
      }).click();
      await dialog().getByRole('button', {
        name: 'บันทึก 2 รายการ',
        exact: true
      }).click();
      await history();
      await page.getByRole('button', {
        name: 'ล้างตัวกรอง',
        exact: true
      }).click();
      await search('QC Combo ชุดทดสอบ');
      assert.equal(await page.locator('.history-row').count(), 2);
      await page.locator('.history-row-open').filter({
        hasText: 'เปิดใช้ Microsoft Authenticator'
      }).click();
      assert.match(await page.locator('.history-inspector').textContent(), /Microsoft Authenticator/);
      await page.getByRole('button', {
        name: 'เลือกหลายรายการ',
        exact: true
      }).click();
      await page.getByRole('button', {
        name: 'เลือกทั้งหน้า',
        exact: true
      }).click();
      assert.equal(await page.locator('.history-row input:checked').count(), 2);
      await page.getByRole('button', {
        name: 'ลบรายการที่เลือก',
        exact: true
      }).click();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.history-row').count(), 2);
      await page.getByRole('button', {
        name: 'ลบรายการที่เลือก',
        exact: true
      }).click();
      await dialog().getByRole('button', {
        name: 'ยืนยันลบ',
        exact: true
      }).click();
      assert.equal(await page.locator('.history-row').count(), 0);
      await page.getByRole('region', {
        name: 'เลิกทำรายการล่าสุด'
      }).getByRole('button', {
        name: 'เลิกทำ',
        exact: true
      }).click();
      assert.equal(await page.locator('.history-row').count(), 2);
    });
    await test('Deleting a new device event updates the shared equipment projection; cross-page Undo restores its borrower', async () => {
      await record();
      await page.locator('.record-quick-grid').getByRole('button', {
        name: /ยืม \/ คืนหูฟัง/
      }).click();
      await dialog().getByRole('button', {
        name: /หูฟังตัวอย่าง 01/
      }).click();
      await page.locator('[name=record-student]').fill('0000000000000');
      await dialog().getByRole('button', {
        name: 'บันทึกยืม',
        exact: true
      }).click();
      await history();
      await page.getByRole('button', {
        name: 'ล้างตัวกรอง',
        exact: true
      }).click();
      await search('หูฟังตัวอย่าง 01');
      assert.equal(await page.locator('.history-row').count(), 1);
      await page.locator('.history-row-open').click();
      await page.locator('.history-inspector').getByRole('button', {
        name: 'ลบรายการ',
        exact: true
      }).click();
      await dialog().getByRole('button', {
        name: 'ยืนยันลบ',
        exact: true
      }).click();
      await record();
      await page.locator('.record-quick-grid').getByRole('button', {
        name: /ยืม \/ คืนหูฟัง/
      }).click();
      assert.match(await dialog().getByRole('button', {
        name: /หูฟังตัวอย่าง 01/
      }).textContent(), /พร้อมยืม/);
      await page.keyboard.press('Escape');
      await page.getByRole('region', {
        name: 'เลิกทำรายการล่าสุด'
      }).getByRole('button', {
        name: 'เลิกทำ',
        exact: true
      }).click();
      await page.locator('.record-quick-grid').getByRole('button', {
        name: /ยืม \/ คืนหูฟัง/
      }).click();
      assert.match(await dialog().getByRole('button', {
        name: /หูฟังตัวอย่าง 01/
      }).textContent(), /กำลังยืม/);
      await page.keyboard.press('Escape');
    });
    await test('All nine reference Quick Logs are present; assigned work requires detail and appears in history', async () => {
      await page.getByRole('button', {
        name: 'ถัดไป',
        exact: true
      }).click();
      assert.equal(await page.locator('.record-quick-card').count(), 3);
      await page.locator('.record-quick-grid').getByRole('button', {
        name: /งานที่ได้รับมอบหมาย/
      }).click();
      await dialog().getByRole('button', {
        name: 'บันทึกงาน',
        exact: true
      }).click();
      await page.waitForFunction(() => document.activeElement?.name === 'record-phone-notes');
      await page.locator('[name=record-phone-notes]').fill('QC งานที่ได้รับมอบหมาย');
      await dialog().getByRole('button', {
        name: 'บันทึกงาน',
        exact: true
      }).click();
      await history();
      await page.getByRole('button', {
        name: 'ล้างตัวกรอง',
        exact: true
      }).click();
      await search('QC งานที่ได้รับมอบหมาย');
      assert.equal(await page.locator('.history-row').count(), 1);
      await record();
      await page.getByRole('button', {
        name: 'ก่อนหน้า',
        exact: true
      }).click();
    });
    await test('History in dark/solid/reduced motion retains records and filters; calendar navigation preserves the record draft', async () => {
      await page.locator('.record-mode').getByRole('button', {
        name: 'กรอกเอง',
        exact: true
      }).click();
      await page.locator('[name=record-manual-notes]').fill('ร่างยังอยู่หลังดูประวัติ');
      await history();
      await appearance();
      await dialog().getByRole('button', {
        name: 'มืด',
        exact: true
      }).click();
      await dialog().getByRole('checkbox', {
        name: /ลดการเคลื่อนไหว/
      }).check();
      await dialog().getByRole('checkbox', {
        name: /ลดความโปร่งใส/
      }).check();
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => globalThis.__QUICK_LIQUID__.metrics().engineCount === 0);
      await shot('history-desktop-dark-solid');
      await page.locator('.ui-sidebar a[href="/calendar"]').click();
      await page.waitForURL('**/dev/calendar');
      await history();
      await record();
      assert.equal(await page.locator('[name=record-manual-notes]').inputValue(), 'ร่างยังอยู่หลังดูประวัติ');
    });
    await ctx.close();
    await test('Mobile list/calendar/detail preserve mode at 375/390/430/768px in both themes with iOS policy and keyboard close', async () => {
      for (const width of [375, 390, 430, 768]) for (const dark of [false, true]) {
        const mobile = await context({
          viewport: {
            width,
            height: 844
          },
          isMobile: true,
          hasTouch: true,
          ...(width === 390 ? {
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'
          } : {})
        });
        page = await mobile.newPage();
        await open(page, '/dev/history');
        assert.equal(await page.locator('.ui-mobile-nav a[aria-current=location]').count(), 1);
        if (dark) {
          await appearance();
          await dialog().getByRole('button', {
            name: 'มืด',
            exact: true
          }).click();
          await page.keyboard.press('Escape');
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.locator('.history-row-open').first().tap();
        assert.ok(await dialog().locator('[data-testid=history-details]').isVisible());
        await page.keyboard.press('Escape');
        await page.getByRole('button', {
          name: 'ปฏิทิน',
          exact: true
        }).tap();
        assert.ok((await page.locator('[data-day="2026-12-05"]').boundingBox()).height < 120);
        await page.locator('[data-day="2026-11-06"]').tap();
        await dialog().locator('.history-day-row').first().tap();
        await dialog().getByRole('button', {
          name: 'กลับรายการวันที่',
          exact: true
        }).tap();
        await page.keyboard.press('Escape');
        assert.equal(await page.getByRole('button', {
          name: 'ปฏิทิน',
          exact: true
        }).getAttribute('aria-pressed'), 'true');
        await page.getByRole('button', {
          name: 'ช่วงวันที่',
          exact: true
        }).tap();
        assert.ok(await dialog().locator('input').evaluateAll(nodes => nodes.every(n => parseFloat(getComputedStyle(n).fontSize) >= 16 && n.getBoundingClientRect().right <= innerWidth)));
        await page.keyboard.press('Escape');
        if (width === 390) {
          assert.equal(await page.locator('svg feDisplacementMap').count(), 0);
          await shot(dark ? 'history-mobile-dark' : 'history-mobile-light');
        }
        await mobile.close();
      }
    });
    assert.deepEqual(report.errors, []);
    report.completed = true;
  } catch (error) {
    report.failure = error.stack;
    if (page && !page.isClosed()) await page.screenshot({
      path: path.join(out, 'failure.png'),
      fullPage: true
    }).catch(() => {});
    throw error;
  } finally {
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    await browser.close();
  }
}
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
