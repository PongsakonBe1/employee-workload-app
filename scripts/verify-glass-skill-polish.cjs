/* Skill-guided polish, constrained by the independently rendered approved Review 10. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require(process.argv[2]), origin = process.argv[4] || 'http://127.0.0.1:4310';
const root = path.resolve(__dirname, '../output/playwright/glass-skill-polish'), out = origin.startsWith('http://127.0.0.1') ? root : path.join(root, 'public');fs.mkdirSync(out, { recursive: true });
const approved = JSON.parse(fs.readFileSync(path.join(root, 'before-fidelity.json'), 'utf8')).filter(row => row.approved);
const report = { completed: false, origin, checks: [], errors: [], geometry: [], motion: [], limitations: ['Chromium touch/iOS UA emulation is not physical Safari UAT', 'Sampled visual contracts and motion traces are not a native API/FPS certification'] };
async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: process.argv[3] });let page;
  const context = async options => { const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light', serviceWorkers: 'block', ...options });await ctx.route('**/*', r => new URL(r.request().url()).origin === origin || /^(data|blob):/.test(r.request().url()) ? r.continue() : r.abort());return ctx; };
  const open = async (target, route) => { const r = await target.goto(origin + route, { timeout: 90000 });assert.equal(r.status(), 200);await target.waitForFunction(() => document.documentElement.dataset.uiReady === 'true');target.on('pageerror', e => report.errors.push(e.message)); };
  const test = async (name, fn) => { await fn();report.checks.push({ name, status: 'passed' });console.log('PASS ' + name); };
  const shot = async (target, name) => { await target.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));await target.screenshot({ path: path.join(out, name + '.png'), fullPage: true }); };
  const appearance = async target => { await target.locator('.ui-header button[aria-label="บัญชีและเครื่องมือ"]').click();await target.locator('dialog[open]').getByRole('button', { name: 'รูปแบบการแสดงผล', exact: true }).click(); };
  const matchLens = async (target, selector) => {
    const group = target.locator(selector);await group.locator('.ui-control-indicator[data-ready=true]').waitFor();
    await target.waitForFunction(selector => document.querySelector(selector + ' .ui-control-indicator')?.dataset.moving === 'false', selector);
    const bounds = await group.evaluate(el => { const lens = el.querySelector('.ui-control-indicator').getBoundingClientRect(), button = el.querySelector('button[aria-pressed=true]').getBoundingClientRect();return { x: Math.abs(lens.x - button.x), y: Math.abs(lens.y - button.y), width: Math.abs(lens.width - button.width), height: Math.abs(lens.height - button.height), count: el.querySelectorAll('button[aria-pressed=true]').length }; });
    assert.equal(bounds.count, 1);assert.ok(Object.values(bounds).every(value => value <= 1), JSON.stringify(bounds));return bounds;
  };
  try {
    await test('Desktop and mobile Quick Log geometry, typography and icon color ramp match the approved Review 10', async () => {
      for (const mobile of [false, true]) {
        const ctx = await context({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile });page = await ctx.newPage();await open(page, '/dev/record');await matchLens(page, '.record-mode');
        const metrics = await page.evaluate(() => { const card = document.querySelector('.record-quick-card'), css = getComputedStyle(card), title = getComputedStyle(card.querySelector('strong')), icon = card.querySelector('.record-tile');return { card: { height: card.getBoundingClientRect().height, minHeight: css.minHeight, padding: css.padding, radius: css.borderRadius }, title: { fontSize: title.fontSize, lineHeight: title.lineHeight }, icon: { width: icon.getBoundingClientRect().width, height: icon.getBoundingClientRect().height, backgroundImage: getComputedStyle(icon).backgroundImage }, h1: getComputedStyle(document.querySelector('h1')).fontSize }; });
        const expected = approved.find(row => row.mobile === mobile);for (const key of ['card', 'title', 'icon', 'h1']) assert.deepEqual(metrics[key], expected[key]);report.geometry.push({ mobile, ...metrics });
        const caption = await page.locator('.record-quick-card small').first().evaluate(el => ({ fontSize: getComputedStyle(el).fontSize, lineHeight: getComputedStyle(el).lineHeight }));assert.deepEqual(caption, mobile ? { fontSize: '12px', lineHeight: '18px' } : { fontSize: '13px', lineHeight: '19.5px' });report.geometry.at(-1).caption = caption;
        assert.equal(await page.locator('.record-quick-card .ui-optical-layer').count(), 0);await shot(page, mobile ? 'record-mobile-light' : 'record-desktop-light');await ctx.close();
      }
    });
    const ctx = await context();page = await ctx.newPage();await open(page, '/dev/record');
    await test('A single group surface animates between native controls without remounting its engine', async () => {
      await matchLens(page, '.record-mode');await page.waitForFunction(() => globalThis.__QUICK_LIQUID__?.metrics().engineCount === 2);
      const ids = await page.evaluate(() => globalThis.__QUICK_LIQUID__.metrics().engines.map(e => e.id).sort());
      await page.evaluate(() => { const lens = document.querySelector('.record-mode .ui-control-indicator');globalThis.__polishTrace = { frames: [], done: false };const start = performance.now();function sample(now) { globalThis.__polishTrace.frames.push({ x: lens.getBoundingClientRect().x, moving: lens.dataset.moving });if (now - start < 700) requestAnimationFrame(sample);else globalThis.__polishTrace.done = true; }requestAnimationFrame(sample); });
      const manual = page.locator('.record-mode').getByRole('button', { name: 'กรอกเอง', exact: true });await manual.focus();await page.keyboard.press('Enter');await page.waitForFunction(() => globalThis.__polishTrace.done);
      const frames = await page.evaluate(() => globalThis.__polishTrace.frames);assert.ok(new Set(frames.map(f => f.x.toFixed(2))).size > 2);assert.ok(frames.some(f => f.moving === 'true'));report.motion.push({ surface: 'record-mode', sampledFrames: frames.length, distinctPositions: new Set(frames.map(f => f.x.toFixed(2))).size });await matchLens(page, '.record-mode');
      await page.locator('.record-mode').getByRole('button', { name: 'บันทึกด่วน', exact: true }).click();await matchLens(page, '.record-mode');await page.waitForFunction(() => globalThis.__QUICK_LIQUID__?.metrics().engineCount === 2);assert.deepEqual(await page.evaluate(() => globalThis.__QUICK_LIQUID__.metrics().engines.map(e => e.id).sort()), ids);
      assert.equal(await page.locator('.record-mode>[data-glass-surface=control-group]').count(), 1);assert.equal(await page.locator('.record-mode button .ui-optical-layer').count(), 0);
    });
    await test('Rapid calendar changes and resizing keep one selection aligned to the chosen native button', async () => {
      await open(page, '/dev/calendar');for (const label of ['วัน', 'เดือน', 'รายการ', 'สัปดาห์']) { await page.locator('.cal-view-controls').getByRole('button', { name: label, exact: true }).click(); }
      await matchLens(page, '.cal-view-controls');const engines = await page.evaluate(() => globalThis.__QUICK_LIQUID__.metrics().engineCount);
      for (const width of [1250, 980, 1440]) { await page.setViewportSize({ width, height: 1000 });await matchLens(page, '.cal-view-controls'); }
      await page.waitForFunction(n => globalThis.__QUICK_LIQUID__?.metrics().engineCount === n, engines);await shot(page, 'calendar-desktop-light');
    });
    await test('Passive sidebar keeps optics but receives no synthetic pointer feedback; interactive toolbar still does', async () => {
      await page.waitForSelector('[data-glass-surface="calendar-sidebar"][data-active=true]');await page.evaluate(() => { globalThis.__pointerProbe = { sidebar: 0, toolbar: 0 };for (const [name, selector] of [['sidebar', '.cal-sidebar>.ui-optical-layer'], ['toolbar', '.ui-header-actions>.ui-optical-layer']]) document.querySelector(selector).addEventListener('pointermove', () => globalThis.__pointerProbe[name]++); });
      const sidebar = await page.locator('.cal-sidebar').boundingBox(), toolbar = await page.locator('.ui-header-actions').boundingBox();await page.mouse.move(sidebar.x + 15, sidebar.y + 30, { steps: 4 });await page.mouse.move(sidebar.x + 80, sidebar.y + 100, { steps: 8 });await page.mouse.move(toolbar.x + 20, toolbar.y + 20, { steps: 6 });await page.mouse.move(toolbar.x + 70, toolbar.y + 20, { steps: 8 });const probe = await page.evaluate(() => globalThis.__pointerProbe);assert.equal(probe.sidebar, 0);assert.ok(probe.toolbar > 0);
    });
    await test('Reduced motion snaps selection, solid/CSS modes restore selected fills, and changing material preserves draft', async () => {
      await appearance(page);await page.locator('dialog[open]').getByRole('button', { name: 'มืด', exact: true }).click();await page.locator('dialog[open]').getByRole('checkbox', { name: /ลดการเคลื่อนไหว/ }).check();await page.keyboard.press('Escape');await page.locator('.cal-view-controls').getByRole('button', { name: 'เดือน', exact: true }).click();await matchLens(page, '.cal-view-controls');assert.equal(await page.locator('.cal-view-controls .ui-control-indicator').getAttribute('data-moving'), 'false');await shot(page, 'calendar-desktop-dark');
      await appearance(page);await page.locator('dialog[open]').getByRole('checkbox', { name: /ลดความโปร่งใส/ }).check();await page.keyboard.press('Escape');await page.waitForFunction(() => globalThis.__QUICK_LIQUID__.metrics().engineCount === 0);assert.equal(await page.locator('.cal-view-controls .ui-control-indicator').isVisible(), false);assert.notEqual(await page.locator('.cal-view-controls button[aria-pressed=true]').evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
      await appearance(page);await page.locator('dialog[open]').getByRole('checkbox', { name: /ลดความโปร่งใส/ }).uncheck();await page.keyboard.press('Escape');await page.locator('.ui-sidebar .ui-sidebar-link[href="/admin/record"]').click();await page.waitForURL('**/dev/record');await page.locator('.record-mode').getByRole('button', { name: 'กรอกเอง', exact: true }).click();await page.locator('[name=record-manual-notes]').fill('ร่างตรวจวัสดุและการเคลื่อนไหว');await page.locator('.record-inspector summary').click();await page.getByRole('button', { name: 'CSS เดิม', exact: true }).click();await page.waitForFunction(() => globalThis.__QUICK_LIQUID__.metrics().engineCount === 0);assert.equal(await page.locator('[name=record-manual-notes]').inputValue(), 'ร่างตรวจวัสดุและการเคลื่อนไหว');await page.getByRole('button', { name: 'QuickLiquid', exact: true }).click();await matchLens(page, '.record-mode');await shot(page, 'record-desktop-dark');
    });
    await ctx.close();
    await test('Touch controls retain hit targets and an explicit iOS CSS fallback without adding SVG filters', async () => {
      for (const ios of [false, true]) {
        const mobile = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ...(ios ? { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1' } : {}) });page = await mobile.newPage();await open(page, '/dev/calendar');await matchLens(page, '.cal-view-controls');for (const label of ['เดือน', 'รายการ', 'วัน']) { await page.locator('.cal-view-controls').getByRole('button', { name: label, exact: true }).tap();await matchLens(page, '.cal-view-controls'); }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));assert.ok(await page.locator('.cal-view-controls button').evaluateAll(nodes => nodes.every(node => node.getBoundingClientRect().height >= 44)));
        if (ios) { await page.waitForSelector('[data-glass-surface="control-group"][data-glass-phase=css]');assert.equal(await page.locator('svg feDisplacementMap').count(), 0); }
        await shot(page, ios ? 'calendar-ios-policy-fallback' : 'calendar-mobile-light');await mobile.close();
      }
    });
    assert.equal(report.errors.length, 0);report.completed = true;if (out === root) fs.writeFileSync(path.join(out, 'after-fidelity.json'), JSON.stringify(report.geometry, null, 2) + '\n');
  } catch (error) { report.failure = error.stack;try { if (page && !page.isClosed()) await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }); } catch { /* Preserve original. */ }throw error;
  } finally { fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');await browser.close(); }
}
main().catch(error => { console.error(error);process.exitCode = 1; });
