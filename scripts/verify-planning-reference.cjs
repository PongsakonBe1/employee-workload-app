/* Compare composition and click destinations with the approved Review 10, not its demo numbers. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require(process.argv[2]);
const output = path.resolve(__dirname, '../output/playwright/dashboard-staff/reference'); fs.mkdirSync(output, { recursive: true });
const report = { approvedReview: 10, cases: [], errors: [], differences: ['Shared runtime uses functional QuickLiquid controls and the current approved shell', 'Runtime uses the existing two-person ledger, not the prototype six-month demo series', 'JD weights start unconfigured because no real weights were verified'], productionDataUsed: false };
async function main() {
  const browser = await chromium.launch({ executablePath: process.argv[3], headless: true });
  try {
    for (const width of [390, 900, 1440]) {
      const ctx = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' }); ctx.setDefaultTimeout(20000);
      try {
        await ctx.route('**/*', r => { const u = new URL(r.request().url()); return ['http://127.0.0.1:4310', 'http://127.0.0.1:4197'].includes(u.origin) || ['data:', 'blob:'].includes(u.protocol) ? r.continue() : r.abort(); });
        const reference = await ctx.newPage(), runtime = await ctx.newPage();
        for (const page of [reference, runtime]) page.on('pageerror', e => report.errors.push(e.message));
        await reference.goto('http://127.0.0.1:4197/#/dashboard'); await reference.waitForFunction(() => document.documentElement.dataset.refinementsEReady === 'true');
        await runtime.goto('http://127.0.0.1:4310/dev/dashboard'); await runtime.locator('[data-planning-mode]').waitFor();
        await runtime.locator('.planning-test-controls summary').click(); await runtime.getByLabel('บทบาทตัวอย่าง', { exact: true }).selectOption('admin'); await runtime.locator('.planning-test-controls summary').click();
        assert.equal(await runtime.locator('h1').innerText(), await reference.locator('#content h1').innerText());
        for (const title of ['แนวโน้มกิจกรรม', 'หัวข้อรองที่มีบันทึกบ่อย', 'บันทึกของทีม']) {
          assert.ok(await runtime.getByRole('heading', { name: title, exact: true }).count()); assert.ok(await reference.getByRole('heading', { name: title, exact: true }).count());
        }
        const composition = await runtime.locator('.planning-detail-grid').evaluate(el => ({ columns: getComputedStyle(el).gridTemplateColumns.split(' ').length, width: el.getBoundingClientRect().width }));
        assert.equal(composition.columns, width <= 760 ? 1 : 2);
        await runtime.evaluate(() => scrollTo(0,0)); await runtime.mouse.move(0,0); await runtime.screenshot({ path: path.join(output, `runtime-dashboard-${width}.png`) });
        await reference.screenshot({ path: path.join(output, `approved-dashboard-${width}.png`) });
        await runtime.locator('.planning-period').getByRole('button', { name: 'รายสัปดาห์', exact: true }).click(); await reference.locator('[data-action="planning-range-d"]').click();
        const actualModes = await runtime.locator('dialog[open] select[aria-label="ช่วงเวลา"] option').allTextContents();
        const referenceModes = await reference.locator('[name="planning-mode-d"] option').allTextContents(); assert.deepEqual(actualModes, referenceModes);
        await runtime.locator('dialog[open]').getByRole('button', { name: 'ปิดหน้าต่าง', exact: true }).click();
        await reference.locator('dialog[open] [data-action="close-sheet"][aria-label]').click(); await reference.goto('http://127.0.0.1:4197/#/staff'); await reference.waitForFunction(() => window.designReview.getSummary().route === 'staff');
        await runtime.goto('http://127.0.0.1:4310/dev/staff'); await runtime.locator('.planning-test-controls summary').click(); await runtime.getByLabel('บทบาทตัวอย่าง', { exact: true }).selectOption('admin'); await runtime.locator('.planning-test-controls summary').click();
        assert.equal(await runtime.locator('h1').innerText(), await reference.locator('#content h1').innerText());
        await runtime.getByRole('button', { name: 'รายละเอียด เจ้าหน้าที่ A (เอ)', exact: true }).click();
        await reference.locator('[data-action="planning-person-d"]:visible').first().click();
        assert.ok(await runtime.locator('dialog[open] .planning-source-record').count() > 0); assert.ok(await reference.locator('dialog[open]').count());
        await runtime.screenshot({ path: path.join(output, `runtime-person-${width}.png`) }); await reference.screenshot({ path: path.join(output, `approved-person-${width}.png`) });
        report.cases.push({ width, composition, modeOptionsMatch: true, dashboardCompositionMatch: true, staffPersonDestinationMatch: true });
        console.log('PASS approved Review 10 composition and routes at ' + width);
      } finally { await ctx.close(); }
    }
    assert.deepEqual(report.errors, []);
  } finally { report.completed = report.cases.length === 3 && !report.errors.length; fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
