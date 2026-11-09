/* Browser verification against loopback emulators; synthetic accounts only. */
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const {
    chromium
  } = require(process.argv[2]),
  origin = process.argv[4] || 'http://127.0.0.1:4310';
const publicPreview = !origin.includes('127.0.0.1'),
  out = path.resolve('output/playwright/calendar-emulator-readonly', publicPreview ? 'public' : 'local');
fs.mkdirSync(out, {
  recursive: true
});
const report = {
  completed: false,
  checks: [],
  errors: [],
  externalOrigins: [],
  firestoreWriteRPCs: [],
  legacyLoginWrites: [],
  physicalIOS: false
};
async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.argv[3]
  });
  try {
    for (const width of publicPreview ? [390] : [1440, 390]) {
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
      await ctx.addInitScript(() => localStorage.setItem('icit_user', JSON.stringify({
        uid: 'legacy-fixture',
        displayName: 'Legacy fixture',
        role: 'superadmin'
      })));
      await ctx.route('**/*', r => {
        const u = new URL(r.request().url());
        if (/\/(?:Commit|Write|BatchWrite)(?:\/|\?|$)/.test(u.pathname)) report.firestoreWriteRPCs.push(u.pathname);
        if (u.pathname.includes('accounts:signUp') || u.pathname.includes('accounts:update')) report.legacyLoginWrites.push(u.pathname);
        if (u.origin === origin || ['blob:', 'data:'].includes(u.protocol) || !publicPreview && ['http://127.0.0.1:18080', 'http://127.0.0.1:19099'].includes(u.origin)) return r.continue();
        report.externalOrigins.push(u.origin);
        return r.abort();
      });
      const p = await ctx.newPage();
      p.on('pageerror', e => report.errors.push(e.message));
      await p.goto(origin + '/dev/calendar-readonly', {
        timeout: 90000
      });
      await p.waitForFunction(() => document.documentElement.dataset.uiReady === 'true');
      const source = p.getByRole('region', {
          name: 'เชื่อม Emulator อ่านอย่างเดียว'
        }),
        dialog = p.locator('dialog.cal-dialog[open]');
      assert.ok(await p.getByRole('button', {
        name: 'นำเข้าตาราง',
        exact: true
      }).isDisabled());
      assert.ok(await p.getByRole('button', {
        name: 'เพิ่มตาราง',
        exact: true
      }).isDisabled());
      assert.equal(await p.locator('.cal-inspector').count(), 0);
      if (publicPreview) {
        await source.getByText('โหมดนี้ใช้ได้เฉพาะ localhost บนเครื่องพัฒนา ลิงก์ภายนอกยังใช้ปฏิทินตัวอย่างเดิมได้', {
          exact: true
        }).waitFor();
        assert.equal(await source.getByRole('button', {
          name: 'เข้าสู่ระบบจำลอง',
          exact: true
        }).count(), 0);
        report.checks.push({
          name: 'public HTTPS preview blocks emulator initialization and login; no loopback connection',
          passed: true
        });
        await ctx.close();
        continue;
      }
      const date = async value => {
        await p.getByRole('button', {
          name: 'เลือกวันที่',
          exact: true
        }).click();
        await dialog.locator('input[type=date]').fill(value);
        await dialog.getByRole('button', {
          name: 'ไปยังวันที่นี้',
          exact: true
        }).click();
      };
      const view = label => p.getByRole('group', {
        name: 'มุมมองปฏิทิน',
        exact: true
      }).getByRole('button', {
        name: label,
        exact: true
      }).click();
      const login = async id => {
        await source.getByRole('combobox', {
          name: 'บัญชีทดสอบ',
          exact: true
        }).selectOption(id);
        await source.getByRole('button', {
          name: 'เข้าสู่ระบบจำลอง',
          exact: true
        }).click();
      };
      const loaded = () => source.getByRole('status').filter({
        hasText: 'อ่านสำเร็จ'
      }).waitFor({
        timeout: 20000
      });
      await date('2026-11-03');
      await login('directory-a');
      await loaded();
      await view('วัน');
      await loaded();
      assert.equal(await p.locator('.cal-timed-event[data-kind=dl]').count(), 2);
      assert.equal(await source.locator('[data-read-queries]').getAttribute('data-read-queries'), '4');
      await p.locator('.cal-timed-event[data-kind=dl]').last().click();
      assert.ok((await dialog.textContent()).includes('17:00–18:30'));
      assert.ok((await dialog.textContent()).includes('Admin จำลอง'));
      assert.equal(await dialog.getByRole('button', {
        name: 'แก้ไขตาราง',
        exact: true
      }).count(), 0);
      await p.keyboard.press('Escape');
      await view('สัปดาห์');
      await loaded();
      await view('รายการ');
      await loaded();
      assert.equal(await p.locator('.cal-agenda-event[data-kind=dl]').count(), 3);
      assert.equal(await source.locator('[data-read-queries]').getAttribute('data-read-queries'), '4');
      await view('เดือน');
      await loaded();
      assert.equal(await source.locator('[data-read-queries]').getAttribute('data-read-queries'), '6');
      await view('รายการ');
      await loaded();
      assert.equal(await source.locator('[data-read-queries]').getAttribute('data-read-queries'), '6');
      await source.scrollIntoViewIfNeeded();
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      if (width < 760) assert.ok(await source.locator('select').evaluate(n => parseFloat(getComputedStyle(n).fontSize) >= 16));
      await p.screenshot({
        path: path.join(out, `readonly-${width}.png`)
      });
      await p.locator('.cal-agenda-event[data-kind=dl]').first().click();
      await p.keyboard.press('Escape');
      await source.getByRole('button', {
        name: 'ออกจากระบบจำลอง',
        exact: true
      }).click();
      await source.getByText('ยังไม่เข้าสู่ระบบจำลอง', {
        exact: true
      }).waitFor();
      assert.equal(await p.locator('.cal-agenda-event').count(), 0);
      assert.equal(await p.locator('dialog[open]').count(), 0);
      assert.ok((await p.evaluate(() => localStorage.getItem('icit_user'))).includes('legacy-fixture'));
      await login('pending-user');
      await source.getByRole('alert').filter({
        hasText: 'ไม่มีสิทธิ์'
      }).waitFor({
        timeout: 20000
      });
      assert.equal(await p.locator('.cal-agenda-event').count(), 0);
      await source.getByRole('button', {
        name: 'ออกจากระบบจำลอง',
        exact: true
      }).click();
      await login('inactive-user');
      await source.getByRole('alert').filter({
        hasText: 'ไม่มีสิทธิ์'
      }).waitFor({
        timeout: 20000
      });
      await source.getByRole('button', {
        name: 'ออกจากระบบจำลอง',
        exact: true
      }).click();
      await login('directory-b');
      await loaded();
      assert.equal(await p.locator('.cal-agenda-event[data-kind=dl]').count(), 3);
      assert.equal(await source.locator('[data-read-queries]').getAttribute('data-read-queries'), '4');
      report.checks.push({
        name: `${width}px: real Emulator Auth/query/adapter/details, all edits disabled, bounded month cache reuse, logout clears UI, pending/inactive denied, account isolation and legacy AuthProvider bypass`,
        passed: true
      });
      if (width === 1440) {
        await ctx.route('http://127.0.0.1:18080/**', r => r.abort());
        await source.getByRole('button', {
          name: 'โหลดข้อมูลใหม่',
          exact: true
        }).click();
        await source.getByRole('alert').filter({
          hasText: 'อ่าน Emulator ไม่สำเร็จ'
        }).waitFor({
          timeout: 15000
        });
        assert.equal(await p.locator('.cal-agenda-event').count(), 0);
        await ctx.unroute('http://127.0.0.1:18080/**');
        await login('directory-b');
        await loaded();
        assert.equal(await p.locator('.cal-agenda-event[data-kind=dl]').count(), 3);
        report.checks.push({
          name: 'connection failure times out, removes stale rows and recovers with a fresh session',
          passed: true
        });
      }
      const storage = await p.evaluate(() => JSON.stringify({
        local: {
          ...localStorage
        },
        session: {
          ...sessionStorage
        }
      }));
      assert.ok(!storage.includes('directory-'));
      assert.ok(!storage.includes('Synthetic-fixture-only'));
      await ctx.close();
    }
    if (!publicPreview) {
      const routes = [];
      function walk(directory, segments = []) {
        for (const entry of fs.readdirSync(directory, {
          withFileTypes: true
        })) {
          if (entry.isDirectory() && entry.name !== 'dev') walk(path.join(directory, entry.name), [...segments, entry.name]);else if (entry.isFile() && entry.name === 'page.js') {
            const route = '/' + segments.join('/');
            if (!['/', '/login', '/pending'].includes(route)) routes.push(route);
          }
        }
      }
      walk(path.resolve('frontend/app'));
      const guards = await browser.newContext({
        serviceWorkers: 'block'
      });
      await guards.route('**/*', r => new URL(r.request().url()).origin === origin ? r.continue() : r.abort());
      const page = await guards.newPage();
      for (const route of routes) {
        await page.goto(origin + route, {
          timeout: 90000
        });
        await page.waitForURL('**/login', {
          timeout: 10000
        });
      }
      report.checks.push({
        name: 'legacy anonymous routes still redirect to login after development Auth isolation',
        routes: routes.length,
        passed: true
      });
      await guards.close();
    }
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.externalOrigins, []);
    assert.deepEqual(report.firestoreWriteRPCs, []);
    assert.deepEqual(report.legacyLoginWrites, []);
    report.completed = true;
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  }
  console.log('PASS readonly browser: ' + report.checks.length + ' groups');
}
main().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
