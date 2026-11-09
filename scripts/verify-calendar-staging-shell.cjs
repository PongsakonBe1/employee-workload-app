/* Unauthenticated staging UI only. Does not click Google or inspect real credentials. */
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const {
    chromium
  } = require(process.argv[2]),
  origin = process.argv[4] || 'http://127.0.0.1:4310';
const out = path.resolve('output/playwright/calendar-staging-readonly', origin.includes('127.0.0.1') ? 'local' : 'public');
fs.mkdirSync(out, {
  recursive: true
});
const report = {
  completed: false,
  checks: [],
  errors: [],
  unexpectedOrigins: [],
  googleLoginAttempted: false
};
(async () => {
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
        hasTouch: width < 760,
        isMobile: width < 760,
        colorScheme: width < 760 ? 'dark' : 'light',
        serviceWorkers: 'block'
      });
      await context.route('**/*', r => {
        const u = new URL(r.request().url());
        if (u.origin === origin || ['data:', 'blob:'].includes(u.protocol)) return r.continue();
        report.unexpectedOrigins.push(u.origin);
        return r.abort();
      });
      const page = await context.newPage();
      page.on('pageerror', e => report.errors.push(e.message));
      await page.goto(origin + '/dev/calendar-staging', {
        timeout: 90000
      });
      await page.waitForFunction(() => document.documentElement.dataset.uiReady === 'true');
      const source = page.getByRole('region', {
        name: 'เชื่อม staging อ่านอย่างเดียว'
      });
      await source.getByRole('button', {
        name: 'เข้าสู่ staging ด้วย Google',
        exact: true
      }).waitFor();
      await page.waitForFunction(() => !Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'เข้าสู่ staging ด้วย Google')?.disabled);
      assert.ok(await page.getByRole('button', {
        name: 'นำเข้าตาราง',
        exact: true
      }).isDisabled());
      assert.ok(await page.getByRole('button', {
        name: 'เพิ่มตาราง',
        exact: true
      }).isDisabled());
      assert.equal(await page.locator('.cal-inspector').count(), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({
        path: path.join(out, `signed-out-${width}.png`)
      });
      report.checks.push({
        width,
        passed: true,
        configurationLoaded: true,
        mutationsDisabled: true
      });
      await context.close();
    }
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.unexpectedOrigins, []);
    report.completed = true;
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(out, 'shell-report.json'), JSON.stringify(report, null, 2));
  }
  console.log('PASS staging signed-out shell: 2 viewports');
})().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
