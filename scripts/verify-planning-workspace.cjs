/* Browser flows against isolated synthetic development pages; no production services. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.argv[2]);
const executablePath = process.argv[3];
const origin = process.argv[4] || 'http://127.0.0.1:4310';
const browserName = executablePath.toLowerCase().includes('edge') ? 'edge' : 'chrome';
const output = path.resolve(__dirname, process.argv[5] === 'assessment-summary' ? '../output/playwright/assessment-summary/regression' : '../output/playwright/dashboard-staff', origin.includes('trycloudflare') ? 'public' : browserName, ...(process.argv[5] === 'accessibility' ? ['accessibility'] : []));
fs.mkdirSync(output, { recursive: true });
const report = { origin, cases: [], errors: [], externalRequests: [], networkFailures: [], responseErrors: [], productionDataUsed: false, realDeviceUAT: false };
let browser, currentPage;
async function context(options = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block', ...options });
  ctx.setDefaultTimeout(20000); ctx.setDefaultNavigationTimeout(90000);
  await ctx.route('**/*', route => { const url = new URL(route.request().url()); if (url.origin === origin || ['data:', 'blob:'].includes(url.protocol)) return route.continue(); report.externalRequests.push(url.origin); return route.abort(); });
  ctx.on('response', response => { const request = response.request(), url = new URL(response.url()); if (url.origin === origin && ['script','stylesheet','document'].includes(request.resourceType()) && response.status() >= 400) report.responseErrors.push({path:url.pathname,status:response.status()}); });
  ctx.on('requestfailed', request => { const url = new URL(request.url()), error = request.failure()?.errorText || ''; if (url.origin === origin && ['script','stylesheet','document'].includes(request.resourceType()) && !error.includes('ABORTED')) report.networkFailures.push({path:url.pathname,error}); });
  ctx.on('page', page => { currentPage = page; page.on('pageerror', error => report.errors.push(error.message)); });
  return ctx;
}
async function open(page, route = '/dev/dashboard') {
  const response = await page.goto(origin + route); assert.equal(response.status(), 200);
  await page.locator('[data-planning-mode]').waitFor(); await page.waitForFunction(() => document.documentElement.dataset.uiReady === 'true', null, {timeout: origin.includes('trycloudflare') ? 60000 : 20000});
}
const modal = page => page.locator('dialog[open]');
async function close(page) { await modal(page).getByRole('button', { name: 'ปิดหน้าต่าง', exact: true }).click(); await modal(page).waitFor({ state: 'hidden' }); }
async function controls(page, action) { const summary = page.locator('.planning-test-controls summary'); await summary.click(); await action(); await summary.click(); }
async function staffNav(page) { const link = page.locator('.ui-sidebar').getByRole('link', { name: 'วิเคราะห์บุคลากร', exact: true }); if (!await link.isVisible()) await page.locator('.ui-sidebar .ui-tools-disclosure').click(); await link.click(); }
async function role(page, value) { await controls(page, () => page.getByLabel('บทบาทตัวอย่าง', { exact: true }).selectOption(value)); }
async function shot(page, name) { await page.evaluate(() => scrollTo(0, 0)); await page.mouse.move(0, 0); await page.waitForTimeout(250); await page.screenshot({ path: path.join(output, name + '.png'), fullPage: await modal(page).count() === 0 }); }
async function bounds(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Page must not overflow horizontally');
  const dialog = modal(page); if (await dialog.count()) {
    const rect = await dialog.boundingBox(), viewport = page.viewportSize();
    assert.ok(rect.x >= -1 && rect.x + rect.width <= viewport.width + 1, 'Dialog must fit viewport');
    const outside = await dialog.locator('input,select').evaluateAll(inputs => inputs.filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.x < 0 || r.right > innerWidth + 1); }).length);
    assert.equal(outside, 0, 'Inputs must fit dialog');
  }
}
async function period(page, mode, values = {}) {
  await page.locator('.planning-period').getByRole('button', { name: /รายวัน|รายสัปดาห์|รายเดือน|ไตรมาส|ปีงบประมาณ|กำหนดช่วงเอง/, exact: true }).click();
  await modal(page).getByLabel('ช่วงเวลา', { exact: true }).selectOption(mode);
  if (values.year) await modal(page).getByLabel('ปีงบประมาณ', { exact: true }).fill(String(values.year));
  if (values.start) await modal(page).getByLabel('เริ่มวันที่', { exact: true }).fill(values.start);
  if (values.end) await modal(page).getByLabel('สิ้นสุดวันที่', { exact: true }).fill(values.end);
  await modal(page).getByRole('button', { name: 'ใช้ช่วงนี้', exact: true }).click();
  await modal(page).waitFor({ state: 'hidden' });
}
async function test(name, action) { if (process.argv[5] === 'accessibility' && !name.startsWith('Reduced motion')) return; const start = Date.now(); try { await action(); report.cases.push({ name, passed: true, ms: Date.now() - start }); console.log('PASS ' + name); } catch (error) { report.cases.push({ name, passed: false, error: error.message }); if (currentPage && !currentPage.isClosed()) await currentPage.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {}); throw error; } }
async function main() {
  browser = await chromium.launch({ executablePath, headless: true }); report.browserVersion = browser.version();
  try {
    await test('Weekly default, exact staff scope, admin totals, source count reconciliation and focused filter layout', async () => {
      const ctx = await context(), p = await ctx.newPage(); try {
        await open(p); assert.equal(await p.locator('[data-metric=activities]').innerText(), '2รายการ');
        assert.equal(await p.getByLabel('ผู้ปฏิบัติงาน', { exact: true }).count(), 0);
        assert.match(await p.locator('[data-range-label]').innerText(), /2 พ.ย. 2569.*8 พ.ย. 2569/);
        await role(p, 'admin'); assert.equal(await p.locator('[data-metric=activities]').innerText(), '3รายการ');
        assert.match(await p.locator('[data-metric=people]').innerText(), /^2\s*คนที่ระบุได้$/);
        assert.ok((await p.getByLabel('ผู้ปฏิบัติงาน', { exact: true }).boundingBox()).width > 100);
        await shot(p, 'dashboard-light');
        await p.getByRole('button', { name: '2026-11-06 3 กิจกรรม', exact: true }).click();
        assert.match(await modal(p).innerText(), /3 กิจกรรม/); assert.equal(await modal(p).locator('.planning-source-record').count(), 3); await bounds(p); await close(p);
        await p.locator('.planning-bars').getByRole('button', { name: /ยืมหูฟัง/ }).click(); assert.equal(await modal(p).locator('.planning-source-record').count(), 1); await close(p);
        await p.getByRole('button', { name: 'วิธีนับและขอบเขตข้อมูล', exact: true }).click(); assert.match(await modal(p).innerText(), /ไม่มีการอ่าน cloud/); assert.match(await modal(p).innerText(), /0 ชุด/); await close(p);
        await p.locator('.planning-context summary').click(); await p.getByRole('button', { name: 'รูปแบบช่วงเวลา', exact: true }).click(); await modal(p).locator('.planning-bar').first().click(); assert.ok(await modal(p).locator('.planning-source-record').count() > 0); await close(p);
        await bounds(p);
      } finally { await ctx.close(); }
    });
    await test('Day/month/quarter/fiscal/custom ranges, previous/next, invalid range and keyboard Escape return focus', async () => {
      const ctx = await context(), p = await ctx.newPage(); try {
        await open(p); await role(p, 'admin');
        for (const mode of ['day', 'month', 'quarter']) { await period(p, mode); assert.equal(await p.locator('[data-metric=activities]').innerText(), '3รายการ'); await bounds(p); }
        await period(p, 'fiscal', { year: 2569 }); assert.equal(await p.locator('[data-metric=activities]').innerText(), '0รายการ'); assert.match(await p.locator('[data-range-label]').innerText(), /1 ต.ค. 2568.*30 ก.ย. 2569/);
        await p.getByRole('button', { name: 'ช่วงข้อมูลถัดไป', exact: true }).click(); assert.equal(await p.locator('[data-metric=activities]').innerText(), '3รายการ');
        await p.getByRole('button', { name: 'ช่วงข้อมูลก่อนหน้า', exact: true }).click(); assert.equal(await p.locator('[data-metric=activities]').innerText(), '0รายการ');
        await period(p, 'custom', { start: '2026-11-06', end: '2026-11-06' }); assert.equal(await p.locator('[data-metric=activities]').innerText(), '3รายการ');
        const rangeButton = p.locator('.planning-period').getByRole('button', { name: 'กำหนดช่วงเอง', exact: true });
        await rangeButton.click(); await modal(p).getByLabel('เริ่มวันที่', { exact: true }).fill('2026-11-09'); await modal(p).getByRole('button', { name: 'ใช้ช่วงนี้', exact: true }).click(); assert.match(await modal(p).getByRole('alert').innerText(), /เลือกช่วงวันที่/); await p.keyboard.press('Escape'); assert.equal(await rangeButton.evaluate(el => el === document.activeElement), true);
        await p.getByRole('button', { name: 'ช่วงข้อมูลถัดไป', exact: true }).click(); assert.equal(await p.locator('[data-metric=activities]').innerText(), '0รายการ');
      } finally { await ctx.close(); }
    });
    await test('Staff access guard, roster search, person filters, actual CSV and recoverable export failure', async () => {
      const ctx = await context(), p = await ctx.newPage(); try {
        await open(p, '/dev/staff'); assert.match(await p.locator('.planning-workspace').innerText(), /หน้านี้สำหรับผู้ดูแล/); assert.equal(await p.locator('.planning-staff-row').count(), 0);
        await role(p, 'admin'); assert.equal(await p.locator('.planning-staff-row').count(), 2); await shot(p, 'staff-light');
        await p.getByRole('searchbox', { name: 'ค้นหาเจ้าหน้าที่', exact: true }).fill('(บี)'); assert.equal(await p.locator('.planning-staff-row').count(), 1);
        const downloading = p.waitForEvent('download'); await p.getByRole('button', { name: 'ส่งออกข้อมูลที่แสดง', exact: true }).click(); const download = await downloading; const file = path.join(output, 'staff-filtered.csv'); await download.saveAs(file); const csv = fs.readFileSync(file, 'utf8'); assert.ok(csv.startsWith('\ufeff')); assert.match(csv, /เจ้าหน้าที่ B \(บี\)/); assert.doesNotMatch(csv, /เจ้าหน้าที่ A/); assert.match(csv, /"1","1","1"/);
        await p.evaluate(() => { const create = URL.createObjectURL.bind(URL); URL.createObjectURL = blob => { if (blob.type.startsWith('text/csv')) throw Error('simulated CSV failure'); return create(blob); }; }); await p.getByRole('button', { name: 'ส่งออกข้อมูลที่แสดง', exact: true }).click(); await p.getByRole('status').filter({ hasText: 'สร้างไฟล์ CSV ไม่สำเร็จ' }).waitFor();
        await p.getByRole('searchbox', { name: 'ค้นหาเจ้าหน้าที่', exact: true }).fill('no-match'); assert.match(await p.locator('.planning-staff-table').innerText(), /ไม่พบเจ้าหน้าที่/);
        await p.getByRole('searchbox', { name: 'ค้นหาเจ้าหน้าที่', exact: true }).fill(''); await p.getByLabel('ผู้ปฏิบัติงาน', { exact: true }).selectOption('fixture-b'); assert.equal(await p.locator('.planning-staff-row').count(), 1); await p.getByRole('button', { name: 'รายละเอียด เจ้าหน้าที่ B (บี)', exact: true }).click(); assert.equal(await modal(p).locator('.planning-source-record').count(), 1); assert.doesNotMatch(await modal(p).innerText(), /เจ้าหน้าที่ A/); await close(p);
        await role(p, 'staff'); await p.getByRole('button', { name: 'เปิดภาพรวมงาน', exact: true }).click(); await p.waitForURL('**/dev/dashboard'); assert.equal(await p.locator('[data-metric=activities]').innerText(), '2รายการ');
      } finally { await ctx.close(); }
    });
    await test('Explicit partial totals, load more, chart/task reconciliation, partial CSV and scope resets', async () => {
      const ctx = await context(), p = await ctx.newPage(); try {
        await open(p); await role(p, 'admin'); await controls(p, () => p.getByLabel('ชุดทดสอบ 1,005 กิจกรรม (6 พ.ย. 2569)', { exact: true }).check());
        assert.equal(await p.locator('[data-loaded-count]').innerText(), '1,000'); assert.match(await p.locator('.planning-warning').innerText(), /ยังใช้เป็นยอดครบทั้งช่วงไม่ได้/);
        await p.locator('.ui-sidebar .ui-sidebar-link[aria-label="วิเคราะห์บุคลากร"]').isVisible().then(async visible => { if (!visible) await p.locator('.ui-sidebar .ui-tools-disclosure').click(); });
        await staffNav(p); await p.waitForURL('**/dev/staff');
        const pending = p.waitForEvent('download'); await p.getByRole('button', { name: 'ส่งออกข้อมูลที่แสดง', exact: true }).click(); const partialDownload = await pending; const partialFile = path.join(output, 'staff-partial.csv'); await partialDownload.saveAs(partialFile); const partialCSV = fs.readFileSync(partialFile, 'utf8'); assert.match(partialCSV, /ยังโหลดไม่ครบช่วง/); assert.equal(await p.locator('[data-loaded-count]').innerText(), '1,000');
        await p.locator('.ui-sidebar').getByRole('link', { name: 'ภาพรวม', exact: true }).click(); await p.waitForURL('**/dev/dashboard');
        // Search and export use the currently displayed snapshot, with no implicit load-all.
        await p.getByRole('button', { name: 'โหลดเพิ่ม 1,000 รายการ', exact: true }).click(); assert.equal(await p.locator('[data-loaded-count]').innerText(), '1,005'); assert.equal(await p.locator('.planning-warning').count(), 0);
        await p.getByRole('button', { name: '2026-11-06 1005 กิจกรรม', exact: true }).click(); assert.match(await modal(p).innerText(), /1005 กิจกรรม/); assert.equal(await modal(p).locator('.planning-source-record').count(), 100); await modal(p).getByRole('button', { name: 'แสดงเพิ่ม 100 รายการ', exact: true }).click(); assert.equal(await modal(p).locator('.planning-source-record').count(), 200); await close(p);
        await p.getByRole('button', { name: /ดูหัวข้อรองทั้งหมด/, exact: false }).click(); const taskSum = await modal(p).locator('.planning-bar>strong').evaluateAll(elements => elements.reduce((sum, el) => sum + Number(el.textContent), 0)); assert.equal(taskSum, 1005); await close(p);
        await p.getByLabel('ผู้ปฏิบัติงาน', { exact: true }).selectOption('fixture-a'); assert.equal(await p.locator('[data-loaded-count]').innerText(), '503'); await p.getByLabel('ผู้ปฏิบัติงาน', { exact: true }).selectOption('all'); assert.equal(await p.locator('[data-loaded-count]').innerText(), '1,000');
        await shot(p, 'dashboard-partial');
      } finally { await ctx.close(); }
    });
    await test('Team-wide fiscal JD requires 100%, counts unmapped tasks, survives navigation and never inherits across years', async () => {
      const ctx = await context(), p = await ctx.newPage(); try {
        await open(p, '/dev/staff'); await role(p, 'superadmin'); await p.getByRole('button', { name: 'กำหนด JD กลาง', exact: true }).click();
        const inputs = modal(p).locator('.planning-form-grid input'); for (let i = 0; i < 8; i++) await inputs.nth(i).fill(i === 0 ? '10' : '0');
        await modal(p).getByRole('button', { name: 'ใช้ชุดกลางนี้ในต้นแบบ', exact: true }).click(); assert.match(await modal(p).getByRole('alert').innerText(), /100%/);
        await inputs.first().fill('100'); await modal(p).locator('.planning-mapping summary').click();
        await modal(p).locator('.planning-mapping label').filter({ hasText: /^ยืมหูฟัง/ }).locator('select').selectOption('rooms');
        await modal(p).getByRole('button', { name: 'ใช้ชุดกลางนี้ในต้นแบบ', exact: true }).click(); await modal(p).waitFor({ state: 'hidden' });
        const jd = p.locator('.planning-jd-table'); assert.match(await jd.innerText(), /100%/); assert.match(await jd.locator('button').last().innerText(), /2$/);
        await jd.locator('button').first().click(); assert.equal(await modal(p).locator('.planning-source-record').count(), 1); await close(p);
        await p.locator('.ui-sidebar').getByRole('link', { name: 'ภาพรวม', exact: true }).click(); await p.waitForURL('**/dev/dashboard');
        await p.locator('.planning-context summary').click(); await p.getByRole('button', { name: 'ดูบริบท JD', exact: true }).click(); assert.equal(await modal(p).locator('.planning-form-grid input').first().inputValue(), '100'); await close(p);
        await staffNav(p); await p.waitForURL('**/dev/staff'); assert.match(await p.locator('.planning-jd-table').innerText(), /100%/);
        await period(p, 'fiscal', { year: 2571 }); assert.equal(await p.locator('.planning-jd-table').count(), 0); assert.match(await p.locator('.planning-workspace').innerText(), /ยังไม่ได้กำหนดชุดกลางสำหรับปีงบ 2571/);
      } finally { await ctx.close(); }
    });
    await test('Shared ledger: room Quick Log changes overview/staff totals once; Undo restores counts across navigation', async () => {
      const ctx = await context(), p = await ctx.newPage(); try {
        await open(p); await role(p, 'admin'); await p.getByRole('button', { name: 'บันทึกงาน', exact: true }).click(); await p.waitForURL('**/dev/record');
        await p.locator('.record-quick-grid').getByRole('button', { name: /ห้องแลกเปลี่ยน/ }).click(); await modal(p).locator('.record-resource-tile').filter({ hasText: 'ห้อง 303' }).click(); await modal(p).waitFor({ state: 'hidden' });
        await p.locator('.ui-sidebar').getByRole('link', { name: 'ภาพรวม', exact: true }).click(); await p.waitForURL('**/dev/dashboard'); assert.equal(await p.locator('[data-metric=activities]').innerText(), '4รายการ');
        await p.getByRole('button', { name: '2026-11-06 4 กิจกรรม', exact: true }).click(); assert.equal(await modal(p).locator('.planning-source-record').count(), 4); await close(p);
        await p.getByRole('button', { name: 'บันทึกงาน', exact: true }).click(); await p.waitForURL('**/dev/record'); await p.getByRole('region', { name: 'เลิกทำรายการล่าสุด', exact: true }).getByRole('button', { name: 'เลิกทำ', exact: true }).click();
        await p.locator('.ui-sidebar').getByRole('link', { name: 'ภาพรวม', exact: true }).click(); await p.waitForURL('**/dev/dashboard'); assert.equal(await p.locator('[data-metric=activities]').innerText(), '3รายการ');
      } finally { await ctx.close(); }
    });
    await test('Light/dark desktop and mobile matrix: period forms, date sizing, staff cards, drill sheets and keyboard', async () => {
      for (const colorScheme of ['light', 'dark']) for (const width of [375, 390, 430, 768, 900, 1000, 1440]) {
        const ctx = await context({ colorScheme, viewport: { width, height: width <= 430 ? 844 : 1000 }, isMobile: width <= 430, hasTouch: width <= 430 }), p = await ctx.newPage();
        try {
          await open(p); await role(p, 'admin'); await bounds(p); if ([390,1440].includes(width)) await shot(p, `dashboard-${width}-${colorScheme}`);
          await p.locator('.planning-period').getByRole('button', { name: 'รายสัปดาห์', exact: true }).click(); await bounds(p);
          if (width <= 430) assert.ok(await modal(p).locator('input').evaluateAll(nodes => nodes.every(el => parseFloat(getComputedStyle(el).fontSize) >= 16)));
          if (width === 390) await shot(p, `range-${colorScheme}`); await close(p);
          await p.getByRole('button', { name: '2026-11-06 3 กิจกรรม', exact: true }).click(); await bounds(p); if (width === 390) await shot(p, `source-${colorScheme}`); await close(p);
          await open(p, '/dev/staff'); await role(p, 'admin'); await bounds(p); if ([390,1440].includes(width)) await shot(p, `staff-${width}-${colorScheme}`);
          await p.getByRole('button', { name: 'รายละเอียด เจ้าหน้าที่ A (เอ)', exact: true }).click(); await bounds(p); await close(p);
        } finally { await ctx.close(); }
      }
    });
    await test('Reduced motion, solid materials and forced colors retain interactive and readable chart data', async () => {
      const ctx = await context({ reducedMotion: 'reduce', forcedColors: 'active' }), p = await ctx.newPage(); try {
        await ctx.addInitScript(() => localStorage.setItem('labboy.appearance.v1', JSON.stringify({ material: 'solid' }))); await open(p); assert.equal(await p.evaluate(() => document.documentElement.dataset.uiMaterial), 'solid'); assert.equal(await p.evaluate(() => document.documentElement.dataset.uiMotion), 'reduce');
        await p.locator('.planning-context summary').click(); assert.equal(await p.locator('.planning-context summary').evaluate(el => getComputedStyle(el, '::after').transitionDuration), '0s');
        const bar = p.getByRole('button', { name: '2026-11-06 2 กิจกรรม', exact: true }); await p.getByRole('button', { name: '2026-11-05 0 กิจกรรม', exact: true }).focus(); await p.keyboard.press('Tab'); assert.equal(await bar.evaluate(el => el.matches(':focus-visible')), true); await p.keyboard.press('Enter'); assert.equal(await modal(p).locator('.planning-source-record').count(), 2); await close(p); await bounds(p);
      } finally { await ctx.close(); }
    });
    assert.deepEqual(report.errors, []); assert.deepEqual(report.networkFailures, []); assert.deepEqual(report.responseErrors, []); assert.ok(report.externalRequests.every(url => /firebase|googleapis|gstatic/.test(url)), 'Unexpected external request');
  } finally { report.completed = report.cases.length === (process.argv[5] === 'accessibility' ? 1 : 8) && report.cases.every(item => item.passed) && !report.errors.length && !report.networkFailures.length && !report.responseErrors.length; fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser?.close(); }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
