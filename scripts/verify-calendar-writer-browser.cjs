// Real browser -> isolated demo writer. Only synthetic PDF/data; no cloud credentials.
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const {
    chromium
  } = require(process.argv[2]),
  origin = 'http://127.0.0.1:4310';
const out = path.resolve('output/playwright/calendar-staging-import/browser');
fs.mkdirSync(out, {
  recursive: true
});
const report = {
  completed: false,
  checks: [],
  errors: [],
  outsideOrigins: [],
  cloudUsed: false
};
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.argv[3]
  });
  try {
    for (const width of [1440, 390]) {
      const ctx = await browser.newContext({
        viewport: {
          width,
          height: 1000
        },
        isMobile: width < 760,
        hasTouch: width < 760,
        colorScheme: width < 760 ? 'dark' : 'light',
        serviceWorkers: 'block'
      });
      await ctx.route('**/*', r => {
        const u = new URL(r.request().url());
        if ([origin, 'http://127.0.0.1:18080', 'http://127.0.0.1:19099'].includes(u.origin) || ['blob:', 'data:'].includes(u.protocol)) return r.continue();
        report.outsideOrigins.push(u.origin);
        return r.abort();
      });
      const p = await ctx.newPage();
      p.on('pageerror', e => report.errors.push(e.message));
      await p.goto(origin + '/dev/calendar-write', {
        timeout: 90000
      });
      const source = p.getByRole('region', {
          name: 'เชื่อม Emulator เพิ่มตาราง'
        }),
        dialog = p.locator('dialog[open]');
      const login = async id => {
        await source.getByRole('combobox', {
          name: 'บัญชีทดสอบ'
        }).selectOption(id);
        await source.getByRole('button', {
          name: 'เข้าสู่ระบบจำลอง',
          exact: true
        }).click();
        await source.getByRole('status').filter({
          hasText: 'อ่านสำเร็จ'
        }).waitFor({
          timeout: 20000
        });
      };
      const created = async () => {
        try {
          await dialog.waitFor({
            state: 'hidden',
            timeout: 25000
          });
        } catch (error) {
          report.failure = await dialog.innerText();
          await p.screenshot({
            path: path.join(out, 'failure.png')
          });
          throw error;
        }
        await source.getByRole('status').filter({
          hasText: 'อ่านสำเร็จ'
        }).waitFor({
          timeout: 20000
        });
      };
      await login('directory-a');
      assert.ok(await p.getByRole('button', {
        name: 'เพิ่มตาราง',
        exact: true
      }).isEnabled());
      const date = width === 1440 ? '2026-11-20' : '2026-12-11';
      let releaseCommit, signalCommit;
      const reachedCommit = new Promise(resolve => {
        signalCommit = resolve;
      });
      const heldCommit = new Promise(resolve => {
        releaseCommit = resolve;
      });
      const commitRoute = async route => {
        if (new URL(route.request().url()).pathname.endsWith(':commit')) {
          signalCommit();
          await heldCommit;
        }
        return route.continue();
      };
      await ctx.route('http://127.0.0.1:18080/**', commitRoute);
      await p.getByRole('button', {
        name: 'เพิ่มตาราง',
        exact: true
      }).click();
      await dialog.locator('input[name=title]').fill('Synthetic UI ' + width);
      await dialog.locator('input[name=date]').fill(date);
      await dialog.locator('input[name=validTo]').fill(date);
      await dialog.getByRole('button', {
        name: 'บันทึกไปยัง Emulator',
        exact: true
      }).click();
      await reachedCommit;
      assert.equal(await dialog.getAttribute('aria-busy'), 'true');
      assert.ok(await dialog.getByRole('button', {
        name: 'ปิดหน้าต่าง',
        exact: true
      }).isDisabled());
      assert.equal(await dialog.locator('.ui-dialog-body[inert]').count(), 1);
      await p.keyboard.press('Escape');
      assert.ok(await dialog.isVisible());
      releaseCommit();
      await created();
      await ctx.unroute('http://127.0.0.1:18080/**', commitRoute);
      assert.equal(await p.locator('.cal-undo').count(), 0);
      await p.reload();
      await login('directory-a');
      await p.getByRole('button', {
        name: 'เลือกวันที่',
        exact: true
      }).click();
      await dialog.locator('input[type=date]').fill(date);
      await dialog.getByRole('button', {
        name: 'ไปยังวันที่นี้',
        exact: true
      }).click();
      await source.getByRole('status').filter({
        hasText: 'อ่านสำเร็จ'
      }).waitFor();
      assert.ok((await p.getByText('Synthetic UI ' + width, {
        exact: true
      }).count()) > 0);
      await p.getByRole('button', {
        name: 'นำเข้าตาราง',
        exact: true
      }).click();
      await dialog.getByLabel('เลือกไฟล์ PDF ตารางเรียน', {
        exact: true
      }).setInputFiles(path.resolve('output/playwright/classroom-pdf-import/anonymous-timetable.pdf'));
      await dialog.getByRole('heading', {
        name: 'ตรวจรายการ · 2 รายการ',
        exact: true
      }).waitFor({
        timeout: 20000
      });
      const dates = dialog.locator('.cal-import-term input[type=date]');
      await dates.nth(0).fill(width === 1440 ? '2026-11-23' : '2026-12-14');
      await dates.nth(1).fill(width === 1440 ? '2026-12-07' : '2026-12-28');
      await dialog.locator('input[name=import-confirm]').check();
      await dialog.getByRole('button', {
        name: 'เพิ่ม 2 ตาราง',
        exact: true
      }).click();
      await created();
      await p.getByRole('button', {
        name: 'เพิ่มตาราง',
        exact: true
      }).click();
      await dialog.locator('select[name=kind]').selectOption('dl');
      await dialog.locator('input[name=title]').fill('Synthetic evening DL UI ' + width);
      await dialog.locator('input[name=date]').fill(width === 1440 ? '2026-11-24' : '2026-12-15');
      await dialog.locator('select[name=examType]').selectOption('student');
      await dialog.getByRole('combobox', {
        name: 'รอบสอบ',
        exact: true
      }).selectOption('2');
      await dialog.getByRole('checkbox', {
        name: 'Admin จำลอง',
        exact: true
      }).check();
      await dialog.getByRole('button', {
        name: 'บันทึกไปยัง Emulator',
        exact: true
      }).click();
      await created();
      await p.getByRole('button', {
        name: 'นำเข้าตาราง',
        exact: true
      }).click();
      await dialog.getByRole('button', {
        name: 'ตารางสอบ DL · รูปภาพ',
        exact: true
      }).click();
      await dialog.getByRole('combobox', {
        name: 'ประเภทผู้เข้าสอบ',
        exact: true
      }).selectOption('student');
      await dialog.getByRole('button', {
        name: 'เพิ่มรายการเอง',
        exact: true
      }).click();
      const row = dialog.locator('[data-dl-row]').first();
      await row.locator('input[type=date]').fill(width === 1440 ? '2026-11-25' : '2026-12-16');
      await row.locator('input[type=time]').nth(0).fill('13:30');
      await row.locator('input[type=time]').nth(1).fill('15:00');
      if (!(await row.locator('details').evaluate(node => node.open))) await row.locator('details summary').click();
      await row.getByRole('combobox').nth(0).selectOption('directory-a');
      await row.getByRole('combobox').nth(1).selectOption('none');
      await row.getByRole('combobox').nth(2).selectOption('none');
      await dialog.locator('input[name=dl-import-confirm]').check();
      await dialog.getByRole('button', {
        name: 'เพิ่ม 1 รอบสอบ',
        exact: true
      }).click();
      await created();
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await p.screenshot({
        path: path.join(out, 'writer-' + width + '.png')
      });
      await source.getByRole('button', {
        name: 'ออกจากระบบจำลอง',
        exact: true
      }).click();
      await source.getByText('ยังไม่เข้าสู่ระบบจำลอง', {
        exact: true
      }).waitFor();
      await login('directory-b');
      assert.ok(await p.getByRole('button', {
        name: 'เพิ่มตาราง',
        exact: true
      }).isDisabled());
      assert.ok(await p.getByRole('button', {
        name: 'นำเข้าตาราง',
        exact: true
      }).isDisabled());
      report.checks.push({
        width,
        passed: true,
        manualPersistedAfterReload: true,
        pdfReviewedAndCommitted: true,
        eveningDlCommitted: true,
        dlReviewCommitted: true,
        staffDenied: true
      });
      await ctx.close();
    }
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.outsideOrigins, []);
    report.completed = true;
  } finally {
    await browser.close();
    fs.writeFileSync(out + '/report.json', JSON.stringify(report, null, 2));
  }
  console.log('PASS writer UI: manual/reload, PDF, evening DL, DL review and staff guard at 2 viewports');
})().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
