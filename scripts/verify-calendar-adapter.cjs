/* Real browser + anonymous document/OCR flows, using the offline adapter only. */
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const {
    chromium
  } = require(process.argv[2]),
  origin = process.argv[4] || 'http://127.0.0.1:4310',
  browserName = /chrome.exe$/i.test(process.argv[3]) ? 'chrome' : 'edge';
const out = path.resolve('output/playwright/calendar-data-adapter', origin.includes('127.0.0.1') ? 'local' : 'public', browserName);
fs.mkdirSync(out, {
  recursive: true
});
const report = {
  completed: false,
  checks: [],
  errors: [],
  externalOrigins: [],
  writeRequests: [],
  physicalIOS: false,
  productionConnected: false
};
async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.argv[3]
  });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({
        viewport: {
          width,
          height: 1000
        },
        isMobile: width < 760,
        hasTouch: width < 760,
        colorScheme: width < 760 ? 'dark' : 'light',
        serviceWorkers: 'block'
      });
      await context.route('**/*', r => {
        const req = r.request(),
          u = new URL(req.url());
        if (!['GET', 'HEAD'].includes(req.method())) report.writeRequests.push(u.pathname);
        if (u.origin === origin || ['blob:', 'data:'].includes(u.protocol)) return r.continue();
        report.externalOrigins.push(u.origin);
        return r.abort();
      });
      const p = await context.newPage();
      p.on('pageerror', e => report.errors.push(e.message));
      await p.goto(origin + '/dev/calendar', {
        timeout: 90000
      });
      await p.waitForFunction(() => document.documentElement.dataset.uiReady === 'true');
      const d = p.locator('dialog.cal-dialog[open]'),
        view = label => p.getByRole('group', {
          name: 'มุมมองปฏิทิน',
          exact: true
        }).getByRole('button', {
          name: label,
          exact: true
        }).click();
      const selectDate = async value => {
        await p.getByRole('button', {
          name: 'เลือกวันที่',
          exact: true
        }).click();
        await d.locator('input[type=date]').fill(value);
        await d.getByRole('button', {
          name: 'ไปยังวันที่นี้',
          exact: true
        }).click();
      };
      await p.getByRole('button', {
        name: 'ข้อมูลเดิมจำลอง',
        exact: true
      }).click();
      await p.locator('[data-adapter-loads]').waitFor({
        state: 'attached'
      });
      await selectDate('2026-11-03');
      await view('รายการ');
      assert.equal(await p.locator('.cal-agenda-event[data-kind=dl]').count(), 3); // Week includes the historic stored evening.
      const inspector = p.locator('.cal-inspector');
      await inspector.locator('summary').click();
      const check = inspector.getByRole('button', {
        name: 'ตรวจการแก้ไขกับรูปแบบข้อมูลเดิม',
        exact: true
      });
      await check.click();
      assert.ok((await inspector.locator('[data-contract-issues]').textContent()).includes('ผ่าน 0 คำสั่ง'));
      for (const label of ['วัน', 'สัปดาห์', 'เดือน', 'รายการ']) await view(label);
      assert.equal(await inspector.locator('[data-adapter-loads]').getAttribute('data-adapter-loads'), '1');
      await view('วัน');
      await p.locator('.cal-timed-event[data-kind=dl]').first().click();
      assert.ok((await d.textContent()).includes('09:00–10:30'));
      for (const n of [1, 2, 3]) assert.ok((await d.textContent()).includes('ผู้คุมจำลอง ' + n));
      await d.getByRole('button', {
        name: 'แก้ไขตาราง',
        exact: true
      }).click();
      await d.getByRole('button', {
        name: 'บันทึกตัวอย่าง',
        exact: true
      }).click();
      await check.click();
      assert.ok((await inspector.locator('[data-contract-issues]').textContent()).includes('ผ่าน 0 คำสั่ง'));
      await p.locator('.cal-timed-event[data-kind=dl]').first().click();
      await d.getByRole('button', {
        name: 'แก้ไขตาราง',
        exact: true
      }).click();
      await d.locator('[name=title]').fill('ตารางจาก adapter ที่แก้แล้ว');
      await d.getByRole('button', {
        name: 'บันทึกตัวอย่าง',
        exact: true
      }).click();
      await check.click();
      assert.ok((await inspector.locator('[data-contract-issues]').textContent()).includes('ผ่าน 1 คำสั่ง'));
      await p.locator('.cal-undo').getByRole('button', {
        name: 'เลิกทำ',
        exact: true
      }).click();
      await check.click();
      assert.ok((await inspector.locator('[data-contract-issues]').textContent()).includes('ผ่าน 0 คำสั่ง'));
      await selectDate('2026-11-04');
      await p.locator('.cal-timed-event[data-kind=dl]').click();
      assert.ok((await d.textContent()).includes('15:00–16:00'));
      await d.getByRole('button', {
        name: 'แก้ไขตาราง',
        exact: true
      }).click();
      assert.equal(await d.locator('[name=start]').inputValue(), '15:00');
      assert.equal(await d.locator('[name=end]').inputValue(), '16:00');
      await d.getByRole('button', {
        name: 'ยกเลิก',
        exact: true
      }).click();
      await selectDate('2026-11-03');
      const evening = p.locator('.cal-timed-event[data-kind=dl]').last();
      await evening.click();
      assert.ok((await d.textContent()).includes('17:00–18:30'));
      await p.keyboard.press('Escape');
      if (width === 1440) {
        await p.locator('a[href="/admin/record"]:visible').first().click();
        await p.waitForURL('**/dev/record');
        await p.locator('a[href="/calendar"]:visible').first().click();
        await p.waitForURL('**/dev/calendar');
        await p.locator('[data-adapter-loads]').waitFor({
          state: 'attached'
        });
        assert.equal(await p.locator('[data-adapter-loads]').getAttribute('data-adapter-loads'), '1');
        await p.locator('.cal-inspector>summary').click();
      }
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await p.screenshot({
        path: path.join(out, `calendar-${width}.png`)
      });
      await p.locator('.cal-dataset-switch').scrollIntoViewIfNeeded();
      assert.ok(await p.getByRole('group', {
        name: 'เลือกชุดข้อมูลปฏิทิน',
        exact: true
      }).getByRole('button', {
        name: 'ข้อมูลเดิมจำลอง',
        exact: true
      }).evaluate(n => n.scrollWidth <= n.clientWidth + 1));
      await p.screenshot({
        path: path.join(out, `source-controls-${width}.png`)
      });
      report.checks.push({
        name: `${width}px: legacy source/UIDs, explicit historical + current evening times, unchanged/edit/Undo dry-run, four views + client navigation use one cached load, no page overflow`,
        passed: true
      });
      const launch = async kind => {
        await p.getByRole('button', {
          name: 'นำเข้าตาราง',
          exact: true
        }).click();
        await d.getByRole('button', {
          name: kind,
          exact: true
        }).click();
      };
      await launch('ตารางเรียน · PDF');
      await d.locator('input[type=file]').setInputFiles(path.resolve('output/playwright/classroom-pdf-import/anonymous-timetable.pdf'));
      await d.getByRole('heading', {
        name: 'ตรวจรายการ · 2 รายการ',
        exact: true
      }).waitFor({
        timeout: 30000
      });
      assert.ok((await d.locator('.cal-import-dataset-note').textContent()).includes('ข้อมูลเดิมจำลอง'));
      await d.locator('.cal-import-term input[type=date]').nth(1).fill('2026-12-07');
      await d.getByRole('checkbox', {
        name: 'ตรวจเทียบ PDF และยืนยันชื่อ วัน เวลา ห้อง และช่วงภาคเรียนแล้ว'
      }).check();
      await d.getByRole('button', {
        name: 'เพิ่ม 2 ตาราง',
        exact: true
      }).click();
      await d.waitFor({
        state: 'hidden'
      });
      await p.locator('.cal-inspector').getByRole('button', {
        name: 'ตรวจการแก้ไขกับรูปแบบข้อมูลเดิม',
        exact: true
      }).click();
      assert.ok((await p.locator('[data-contract-issues]').textContent()).includes('ผ่าน 2 คำสั่ง'));
      await p.locator('.cal-undo').getByRole('button', {
        name: 'เลิกทำ',
        exact: true
      }).click();
      report.checks.push({
        name: `${width}px: actual self-hosted PDF import into adapted data, two valid create payloads, isolated Undo`,
        passed: true
      });
      await launch('ตารางสอบ DL · รูปภาพ');
      const buffer = Buffer.from(await p.evaluate(() => {
        const c = document.createElement('canvas');
        c.width = 900;
        c.height = 220;
        const g = c.getContext('2d');
        g.fillStyle = '#fff';
        g.fillRect(0, 0, 900, 220);
        g.strokeStyle = '#000';
        for (const y of [80, 112, 182]) {
          g.beginPath();
          g.moveTo(30, y);
          g.lineTo(870, y);
          g.stroke();
        }
        for (const x of [30, 330, 510, 690, 870]) {
          g.beginPath();
          g.moveTo(x, 112);
          g.lineTo(x, 182);
          g.stroke();
        }
        g.fillStyle = '#000';
        g.font = '17px Arial';
        g.fillText('24/11/69 09.00 - 10.30', 42, 137);
        g.fillText('24/11/69 17.00 - 18.30', 42, 165);
        for (let j = 0; j < 3; j++) g.fillText('Staff ' + String.fromCharCode(65 + j), 370 + j * 180, 151);
        return c.toDataURL('image/png').split(',')[1];
      }), 'base64');
      await d.getByLabel('เลือกรูปตารางสอบ DL', {
        exact: true
      }).setInputFiles({
        name: 'anonymous.png',
        mimeType: 'image/png',
        buffer
      });
      await d.getByRole('button', {
        name: 'อ่านตารางจากภาพ',
        exact: true
      }).click();
      await d.locator('.dl-import-found').waitFor({
        timeout: 150000
      });
      assert.ok((await d.locator('.cal-import-dataset-note').textContent()).includes('ข้อมูลเดิมจำลอง'));
      const cards = d.locator('[data-dl-map]');
      for (let i = 0; i < 3; i++) await cards.nth(i).locator('select').selectOption('directory-' + String.fromCharCode(97 + i));
      await cards.first().locator('input').fill('ผู้คุมทดลองชั่วคราว');
      await cards.first().getByRole('button', {
        name: 'ใช้ชื่อนี้ชั่วคราว',
        exact: true
      }).click();
      const options = await cards.first().locator('select option').evaluateAll(ns => ns.map(n => n.value));
      assert.equal(new Set(options).size, options.length);
      await d.locator('[name=dl-import-confirm]').check();
      await d.getByRole('button', {
        name: 'เพิ่ม 2 รอบสอบ',
        exact: true
      }).click();
      await d.waitFor({
        state: 'hidden'
      });
      await view('รายการ');
      assert.equal(await p.locator('.cal-agenda-event[data-kind=dl]').count(), 2);
      await p.locator('.cal-agenda-event[data-kind=dl]').first().click();
      assert.ok((await d.textContent()).includes('ผู้คุมทดลองชั่วคราว'));
      assert.ok((await d.textContent()).includes('ผู้คุมจำลอง 2'));
      await p.keyboard.press('Escape');
      await p.locator('.cal-inspector').getByRole('button', {
        name: 'ตรวจการแก้ไขกับรูปแบบข้อมูลเดิม',
        exact: true
      }).click();
      const result = p.locator('[data-contract-issues]');
      assert.notEqual(await result.getAttribute('data-contract-issues'), '0');
      assert.ok((await result.textContent()).includes('เลือก UID'));
      await result.scrollIntoViewIfNeeded();
      await p.screenshot({
        path: path.join(out, `temporary-identity-guard-${width}.png`)
      });
      await p.locator('.cal-undo').getByRole('button', {
        name: 'เลิกทำ',
        exact: true
      }).click();
      await p.locator('.cal-inspector').getByRole('button', {
        name: 'ตรวจการแก้ไขกับรูปแบบข้อมูลเดิม',
        exact: true
      }).click();
      assert.ok((await result.textContent()).includes('ผ่าน 0 คำสั่ง'));
      assert.equal(await p.locator('[data-adapter-loads]').getAttribute('data-adapter-loads'), '1');
      await p.locator('.cal-inspector select').selectOption('staff');
      assert.ok(await p.getByRole('button', {
        name: 'นำเข้าตาราง',
        exact: true
      }).isDisabled());
      assert.ok(await p.locator('.cal-inspector').getByRole('button', {
        name: 'ตรวจการแก้ไขกับรูปแบบข้อมูลเดิม',
        exact: true
      }).isDisabled());
      await p.getByRole('button', {
        name: 'พื้นที่ทดลองนำเข้า',
        exact: true
      }).click();
      assert.equal(await p.locator('.cal-agenda-event').count(), 0);
      report.checks.push({
        name: `${width}px: actual image OCR/temporary + directory identities, no duplicate options, local import/details, temporary UID blocked from document plan, Undo and Staff guard, dataset isolation`,
        passed: true
      });
      await context.close();
    }
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.externalOrigins, []);
    assert.deepEqual(report.writeRequests, []);
    report.completed = true;
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  }
  console.log('PASS calendar adapter: ' + report.checks.length + ' groups');
}
main().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
