/* Actual shared controls and synthetic flows. No credentials, Firebase or production writes. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require(process.argv[2]);
const origin = process.argv[4] || 'http://127.0.0.1:4310';
const name = origin.includes('trycloudflare') ? 'public' : process.argv[3].includes('Chrome') ? 'chrome' : 'edge';
const out = path.resolve(__dirname, '../output/playwright/glass-button-roles', name);
fs.mkdirSync(out, { recursive: true });
const report = { completed: false, checks: [], contrast: [], errors: [], httpErrors: [], productionDataUsed: false, realDeviceUAT: false };
const luminance = rgb => rgb.map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
const contrast = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
let browser;
async function context(options = {}) {
  const c = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block', ...options });
  c.setDefaultTimeout(30000);
  await c.route('**/*', r => { const u = new URL(r.request().url()); return u.origin === origin || ['data:', 'blob:'].includes(u.protocol) ? r.continue() : r.abort(); });
  c.on('page', p => p.on('pageerror', e => report.errors.push(e.stack || e.message)));
  c.on('response', r => { const u = new URL(r.url()); if (u.origin === origin && r.status() >= 400 && ['document', 'script', 'stylesheet'].includes(r.request().resourceType())) report.httpErrors.push({ path: u.pathname, status: r.status() }); });
  return c;
}
async function open(p, route = '/dev/ui') {
  assert.equal((await p.goto(origin + route, { timeout: 90000 })).status(), 200);
  await p.waitForFunction(() => document.documentElement.dataset.uiReady === 'true');
}
async function bounds(p) { assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'root overflow'); }
const modal = p => p.locator('dialog[open]');
const demo = p => p.getByRole('region', { name: 'สีและบทบาทของปุ่ม', exact: true });
async function appearance(p) {
  await p.locator('.ui-header button[aria-label="บัญชีและเครื่องมือ"]').click();
  await modal(p).getByRole('button', { name: 'รูปแบบการแสดงผล', exact: true }).click();
}
async function colors(button, label) {
  const s = await button.evaluate(el => {
    const css = getComputedStyle(el), canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const rgb = color => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3); };
    return { text: rgb(css.color), fill: rgb(css.getPropertyValue('--ui-button-fill').trim()), start: parseFloat(css.getPropertyValue('--ui-button-tint-start')) / 100, end: parseFloat(css.getPropertyValue('--ui-button-tint-end')) / 100, gradient: css.backgroundImage, opticalGradient: getComputedStyle(el, '::after').backgroundImage };
  });
  assert.ok(s.gradient.includes('gradient') || s.opticalGradient.includes('gradient'));
  for (const alpha of [s.start, s.end]) for (const background of [0, 255]) {
    const ratio = contrast(s.text, s.fill.map(v => v * alpha + background * (1 - alpha)));
    assert.ok(ratio >= 4.5, label + ' contrast=' + ratio);
    report.contrast.push({ label, alpha, background, ratio });
  }
}
async function test(label, fn) { await fn(); report.checks.push({ label, passed: true }); console.log('PASS ' + label); }
(async () => {
  browser = await chromium.launch({ headless: true, executablePath: process.argv[3] });
  report.browserVersion = browser.version();
  try {
    await test('Primary/destructive glass labels meet 4.5:1 at idle, hover and pressed over black/white; CSS and QuickLiquid in both themes', async () => {
      for (const colorScheme of ['light', 'dark']) for (const mode of ['css', 'quick']) {
        const c = await context({ colorScheme }), p = await c.newPage();
        try {
          await open(p); await p.getByRole('button', { name: mode === 'css' ? 'CSS เดิม' : 'QuickLiquid', exact: true }).click();
          if (mode === 'quick') await demo(p).locator('.ui-glass-button[data-kind=prominent]>.ui-optical-layer[data-active=true]').waitFor();
          const primary = demo(p).getByRole('button', { name: 'บันทึกตัวอย่าง', exact: true });
          const danger = demo(p).getByRole('button', { name: 'ลบตัวอย่าง', exact: true });
          for (const b of [primary, danger]) {
            await p.mouse.move(0, 0); await colors(b, colorScheme + '/' + mode + '/idle');
            await b.hover(); await colors(b, colorScheme + '/' + mode + '/hover');
            await p.mouse.down(); await p.waitForTimeout(170); await colors(b, colorScheme + '/' + mode + '/pressed'); await p.mouse.up();
          }
          assert.equal(await demo(p).getByRole('button', { name: 'ยกเลิกตัวอย่าง', exact: true }).getAttribute('data-kind'), 'regular');
          assert.equal(await demo(p).getByRole('button', { name: 'ปฏิเสธตัวอย่าง', exact: true }).getAttribute('data-kind'), 'destructive');
          assert.equal(await demo(p).getByRole('button', { name: 'หยุดใช้ตัวอย่าง', exact: true }).getAttribute('data-kind'), 'regular');
          await p.mouse.move(0, 0); await bounds(p);
          await demo(p).screenshot({ path: path.join(out, 'buttons-1440-' + colorScheme + '-' + mode + '.png') });
        } finally { await c.close(); }
      }
    });
    await test('Touch layouts retain labels and 44px targets; active status is separate from the neutral stop/reactivate command', async () => {
      for (const colorScheme of ['light', 'dark']) for (const width of (name === 'public' ? [390] : [375, 390, 430, 768])) {
        const c = await context({ colorScheme, viewport: { width, height: 844 }, isMobile: true, hasTouch: true }), p = await c.newPage();
        try {
          await open(p); await bounds(p);
          for (const b of await demo(p).getByRole('button').all()) {
            const box = await b.boundingBox(); assert.ok(box.height >= 44 && box.x >= 0 && box.x + box.width <= width + 1);
          }
          await demo(p).getByRole('button', { name: 'หยุดใช้ตัวอย่าง', exact: true }).click();
          assert.equal(await demo(p).locator('.ui-button-demo-status').getAttribute('data-active'), 'false');
          await demo(p).getByRole('button', { name: 'เปิดใช้ตัวอย่าง', exact: true }).click();
          assert.equal(await demo(p).locator('.ui-button-demo-status').getAttribute('data-active'), 'true');
          if (width === 390) await demo(p).screenshot({ path: path.join(out, 'buttons-390-' + colorScheme + '.png') });
        } finally { await c.close(); }
      }
    });
    await test('Keyboard activation, visible focus and disabled semantics remain native; color is accompanied by labels and icons', async () => {
      const c = await context(), p = await c.newPage();
      try {
        await open(p); const reject = demo(p).getByRole('button', { name: 'ปฏิเสธตัวอย่าง', exact: true });
        await reject.focus(); assert.equal(await reject.evaluate(el => el.matches(':focus-visible')), true);
        assert.notEqual(await reject.evaluate(el => getComputedStyle(el).outlineStyle), 'none');
        await p.keyboard.press('Enter'); assert.match(await p.locator('[role=status]').last().innerText(), /ไม่มีคำขอจริง/);
        assert.equal(await demo(p).getByRole('button', { name: 'ลบไม่ได้', exact: true }).isDisabled(), true);
        assert.equal(await reject.locator('svg[aria-hidden=true]').count(), 1);
      } finally { await c.close(); }
    });
    await test('Reduce Transparency, reduced motion and forced colors keep actions readable without the optical engine', async () => {
      const c = await context({ reducedMotion: 'reduce', colorScheme: 'dark' }), p = await c.newPage();
      try {
        await open(p); await appearance(p); await modal(p).getByRole('checkbox', { name: /ลดความโปร่งใส/ }).check(); await p.keyboard.press('Escape');
        const danger = demo(p).getByRole('button', { name: 'ลบตัวอย่าง', exact: true });
        assert.equal(await danger.evaluate(el => getComputedStyle(el).backdropFilter), 'none');
        assert.equal(await danger.evaluate(el => getComputedStyle(el).transitionDuration), '0s');
        assert.equal(await danger.locator('.ui-optical-layer[data-active=true]').count(), 0);
        await p.emulateMedia({ forcedColors: 'active' });
        assert.equal(await danger.evaluate(el => getComputedStyle(el, '::after').display), 'none');
        await danger.focus(); await p.keyboard.press('Space'); assert.match(await p.locator('[role=status]').last().innerText(), /ไม่มีการลบข้อมูล/);
        await bounds(p);
      } finally { await c.close(); }
    });
    await test('Template deactivation is neutral and reversible; removing a draft Combo item is destructive and Cancel preserves the catalog', async () => {
      const c = await context(), p = await c.newPage();
      try {
        await open(p, '/dev/templates'); await p.locator('.template-test-controls summary').click(); await p.getByLabel('บทบาทตัวอย่าง', { exact: true }).selectOption('admin'); await p.locator('.template-test-controls summary').click();
        await p.locator('[data-template=account]').click(); const detail = p.getByRole('complementary', { name: 'รายละเอียดเทมเพลต', exact: true });
        const stop = detail.getByRole('button', { name: 'หยุดใช้', exact: true }); assert.equal(await stop.getAttribute('data-kind'), 'regular'); await stop.click();
        assert.equal(await detail.getByRole('button', { name: 'เปิดใช้อีกครั้ง', exact: true }).getAttribute('data-kind'), 'regular');
        await p.getByRole('region', { name: 'เลิกทำรายการเทมเพลตล่าสุด', exact: true }).getByRole('button', { name: 'เลิกทำ', exact: true }).click();
        await detail.getByRole('button', { name: 'แก้ไขเทมเพลต', exact: true }).click(); const remove = modal(p).getByRole('button', { name: 'เอางาน 1 ออก', exact: true });
        assert.equal(await remove.getAttribute('data-kind'), 'destructive'); await remove.click(); assert.equal(await modal(p).locator('.template-combo-item').count(), 4);
        await modal(p).getByRole('button', { name: 'ยกเลิก', exact: true }).click(); assert.match(await detail.innerText(), /5 งาน/);
      } finally { await c.close(); }
    });
    await test('History delete and confirmation are destructive; Cancel is neutral, deletion changes the ledger once and Undo restores it', async () => {
      const c = await context({ colorScheme: 'dark' }), p = await c.newPage();
      try {
        await open(p, '/dev/history'); await p.locator('.history-test-controls summary').click(); await p.getByLabel('บทบาทตัวอย่าง', { exact: true }).selectOption('admin'); await p.locator('.history-test-controls summary').click();
        const before = await p.locator('.history-row').count(); await p.locator('.history-row-open').first().click();
        const remove = p.getByTestId('history-details').getByRole('button', { name: 'ลบรายการ', exact: true }); assert.equal(await remove.getAttribute('data-kind'), 'destructive'); await remove.click();
        assert.equal(await modal(p).getByRole('button', { name: 'ยืนยันลบ', exact: true }).getAttribute('data-kind'), 'destructive');
        assert.equal(await modal(p).getByRole('button', { name: 'ยกเลิก', exact: true }).getAttribute('data-kind'), 'regular');
        await modal(p).screenshot({ path: path.join(out, 'history-delete-dark.png') });
        await modal(p).getByRole('button', { name: 'ยกเลิก', exact: true }).click(); assert.equal(await p.locator('.history-row').count(), before);
        await remove.click(); await modal(p).getByRole('button', { name: 'ยืนยันลบ', exact: true }).click(); assert.equal(await p.locator('.history-row').count(), before - 1);
        await p.getByRole('region', { name: 'เลิกทำรายการล่าสุด', exact: true }).getByRole('button', { name: 'เลิกทำ', exact: true }).click(); assert.equal(await p.locator('.history-row').count(), before);
      } finally { await c.close(); }
    });
    await test('Sampled migrated pages retain responsive light/dark layouts with the shared action palette', async () => {
      const routes = name === 'edge' ? ['/dev/record','/dev/history','/dev/calendar','/dev/resources','/dev/equipment','/dev/equipment/usage','/dev/dashboard','/dev/staff','/dev/templates'] : ['/dev/record','/dev/history','/dev/calendar','/dev/templates'];
      report.sampledRoutes = routes;
      for (const colorScheme of ['light', 'dark']) for (const width of [390, 1440]) {
        const c = await context({ colorScheme, viewport: { width, height: 1000 }, isMobile: width === 390, hasTouch: width === 390 }), p = await c.newPage();
        try { for (const route of routes) { await open(p, route); await bounds(p); } } finally { await c.close(); }
      }
    });
    assert.deepEqual(report.errors, []); assert.deepEqual(report.httpErrors, []);
    report.completed = true;
  } catch (e) { report.failure = e.stack; throw e; }
  finally { fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
