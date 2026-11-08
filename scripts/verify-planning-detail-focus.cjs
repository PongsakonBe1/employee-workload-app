const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require(process.argv[2]);
const origin = process.argv[4] || 'http://127.0.0.1:4310';
const name = origin.includes('trycloudflare') ? 'public' : process.argv[3].includes('Chrome') ? 'chrome' : 'edge';
const output = path.resolve(__dirname, '../output/playwright/dashboard-staff', name);
const report = { passed: false, errors: [], productionDataUsed: false };
(async () => {
  const browser = await chromium.launch({ executablePath: process.argv[3] });
  try {
    const context = await browser.newContext({ serviceWorkers: 'block' }); context.setDefaultTimeout(60000);
    await context.route('**/*', r => { const url = new URL(r.request().url()); return url.origin === origin || ['data:', 'blob:'].includes(url.protocol) ? r.continue() : r.abort(); });
    const page = await context.newPage(); page.on('pageerror', e => report.errors.push(e.message));
    assert.equal((await page.goto(origin + '/dev/staff')).status(), 200);
    await page.locator('.planning-test-controls summary').click(); await page.getByLabel('บทบาทตัวอย่าง', { exact: true }).selectOption('admin');
    const trigger = page.getByRole('button', { name: 'รายละเอียด เจ้าหน้าที่ A (เอ)', exact: true });
    await trigger.focus(); await page.keyboard.press('Enter');
    const dialog = page.locator('dialog[open]'); const task = dialog.locator('.planning-bar').first(); const title = await task.locator('span').innerText();
    await task.focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => !!document.activeElement.closest('dialog[open]'));
    assert.equal(await dialog.locator('h2').innerText(), title); assert.equal(await dialog.locator('.planning-source-record').count(), 1);
    const back = dialog.getByRole('button', { name: 'กลับรายละเอียดเจ้าหน้าที่', exact: true }); await back.focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => !!document.activeElement.closest('dialog[open]'));
    assert.equal(await dialog.locator('h2').innerText(), 'เจ้าหน้าที่ A (เอ)'); assert.equal(await dialog.locator('.planning-source-record').count(), 2);
    await page.keyboard.press('Escape'); assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
    // A second drill transition (hour → source) also keeps focus in the new sheet.
    await page.locator('.ui-sidebar').getByRole('link', { name: 'ภาพรวม', exact: true }).click(); await page.waitForURL('**/dev/dashboard');
    await page.locator('.planning-context summary').click(); await page.getByRole('button', { name: 'รูปแบบช่วงเวลา', exact: true }).click();
    await dialog.locator('.planning-bar').first().focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => !!document.activeElement.closest('dialog[open]')); assert.ok(await dialog.locator('.planning-source-record').count() > 0);
    assert.deepEqual(report.errors, []); report.passed = true;
    console.log('PASS nested person/task/back/Escape and hour/source keyboard focus');
  } finally { fs.mkdirSync(output, { recursive: true }); fs.writeFileSync(path.join(output, 'detail-focus-report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
