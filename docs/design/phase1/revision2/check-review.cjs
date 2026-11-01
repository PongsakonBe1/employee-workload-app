/* Isolated browser checks for design revision 2; never runs against production. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.argv[2] || 'playwright');

async function main() {
  const dir = path.resolve(__dirname, '../../../../output/playwright/ux-phase1/revision2');
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.argv[3] ? { executablePath: process.argv[3] } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const errors = [];
  const results = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const check = async (name, fn) => { await fn(); results.push({ name, status: 'passed' }); console.log(`PASS ${name}`); };
  try {
    const url = pathToFileURL(path.join(__dirname, 'index.html')).href;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 4000))]));
    await page.locator('#theme').selectOption('light');
    await page.screenshot({ path: path.join(dir, 'record-light.png'), fullPage: true });
    await page.locator('#theme').selectOption('dark');
    await page.screenshot({ path: path.join(dir, 'record-dark.png'), fullPage: true });
    await check('Brand asset and complete morning, afternoon, evening schedule render', async () => {
      assert.equal(await page.locator('.brand img').evaluate((image) => image.complete && image.naturalWidth > 0), true);
      assert.equal(await page.locator('.event').count(), 3);
      assert.match(await page.locator('.event.purple').innerText(), /17:00–18:30/);
      await page.locator('[data-event="1"]').click();
      assert.match(await page.locator('#sheet').innerText(), /75 คน/);
      await page.keyboard.press('Escape');
    });
    await check('Equipment selection requires explicit confirmation; borrow/return updates shared counts', async () => {
      await page.locator('[data-equipment="floor3"]').click();
      assert.equal(await page.locator('#confirm-device').isEnabled(), false);
      await page.locator('[data-device="DEMO-01"]').click();
      assert.equal(await page.locator('#confirm-device').innerText(), 'ยืนยันยืม');
      await page.locator('#confirm-device').click();
      assert.match(await page.locator('[data-equipment="floor3"] small').innerText(), /1 จาก 3/);
      assert.match(await page.locator('.recent-row').first().innerText(), /ยืมหูฟัง 01/);
      await page.locator('[data-equipment="floor3"]').click();
      await page.locator('[data-device="DEMO-01"]').click();
      assert.equal(await page.locator('#confirm-device').innerText(), 'ยืนยันคืน');
      await page.locator('#confirm-device').click();
      assert.match(await page.locator('[data-equipment="floor3"] small').innerText(), /2 จาก 3/);
    });
    await check('Combo preview shows all three tasks and cancellation creates no record', async () => {
      const count = await page.locator('#recent-count').innerText();
      await page.locator('[data-service="account"]').click();
      assert.equal(await page.locator('.combo-preview > span').count(), 3);
      await page.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
      assert.equal(await page.locator('#recent-count').innerText(), count);
      await page.locator('[data-service="account"]').click();
      await page.getByRole('button', { name: 'ยืนยันบันทึก', exact: true }).click();
      assert.match(await page.locator('.recent-row').first().innerText(), /3 รายการ/);
    });
    await check('Manual form retains selected staff and previews task and business date', async () => {
      await page.locator('#staff').selectOption({ label: 'ช่างตัวอย่าง 3' });
      await page.locator('[data-mode="manual"]').click();
      await page.locator('[name="task"]').selectOption({ label: 'คุมสอบ DL' });
      await page.locator('[name="recipient"]').fill('ผู้รับบริการตัวอย่าง');
      await page.locator('[name="notes"]').fill('รายละเอียดสังเคราะห์สำหรับตรวจ preview');
      await page.locator('#manual-form button[type="submit"]').click();
      assert.match(await page.locator('#sheet').innerText(), /ช่างตัวอย่าง 3/);
      assert.match(await page.locator('.combo-preview').innerText(), /2026-11-03/);
      assert.equal(await page.locator('#service-recipient').inputValue(), 'ผู้รับบริการตัวอย่าง');
      assert.match(await page.locator('#notes-preview').innerText(), /รายละเอียดสังเคราะห์/);
      await page.keyboard.press('Escape');
      await page.locator('[data-mode="quick"]').click();
    });
    await check('Calendar navigation, resource summary, keyboard loop, and System theme', async () => {
      await page.locator('[data-day="6"]').click();
      assert.match(await page.locator('#event-count').innerText(), /0 กิจกรรม/);
      await page.locator('[data-action="today"]').click();
      assert.match(await page.locator('#event-count').innerText(), /3 กิจกรรม/);
      await page.locator('[data-action="resource-status"]').click();
      assert.equal(await page.locator('.resource-summary-row').count(), 4);
      for (let index = 0; index < 8; index++) {
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.querySelector('dialog').contains(document.activeElement)), true);
      }
      await page.keyboard.press('Escape');
      await page.locator('#theme').selectOption('system');
      await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
      await page.emulateMedia({ colorScheme: 'light' });
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
    });
    await check('Responsive layout, mobile task order, and visible bottom navigation', async () => {
      for (const width of [1440, 1024, 768, 760, 390, 375]) {
        await page.setViewportSize({ width, height: 900 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}px overflow`);
      }
      const record = await page.locator('#record-panel').boundingBox();
      const calendar = await page.locator('#calendar-panel').boundingBox();
      assert.ok(record.y < calendar.y);
      assert.equal(await page.locator('.mobile-tabs').isVisible(), true);
      await page.setViewportSize({ width: 390, height: 900 });
      await page.locator('#staff').selectOption({ label: 'ช่างตัวอย่าง 1' });
      await page.locator('#toast').evaluate((element) => { element.hidden = true; });
      await page.locator('body').click({ position: { x: 5, y: 5 } });
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: path.join(dir, 'record-mobile.png'), fullPage: false });
      await page.locator('[data-equipment="finn"]').click();
      await page.locator('[data-device="DEMO-04"]').click();
      await page.screenshot({ path: path.join(dir, 'equipment-sheet-mobile.png'), fullPage: false });
      await page.keyboard.press('Escape');
    });
    await check('Semantic text/control token contrast and zero runtime errors', async () => {
      for (const theme of ['light', 'dark']) {
        await page.locator('#theme').selectOption(theme);
        const pairs = await page.evaluate(() => {
          const style = getComputedStyle(document.documentElement);
          const lum = (token) => {
            let value = style.getPropertyValue(token).trim().slice(1);
            if (value.length === 3) value = [...value].map((v) => v + v).join('');
            const [r, g, b] = [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16) / 255).map((v) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
            return .2126 * r + .7152 * g + .0722 * b;
          };
          return [['--ink', '--paper'], ['--sub', '--paper'], ['--sub', '--soft'], ['--blue-ink', '--blue'], ['--green-ink', '--green'], ['--purple-ink', '--purple'], ['--amber-ink', '--amber'], ['--on', '--accent']].map(([fg, bg]) => ({ fg, bg, contrast: (Math.max(lum(fg), lum(bg)) + .05) / (Math.min(lum(fg), lum(bg)) + .05) }));
        });
        pairs.forEach((pair) => assert.ok(pair.contrast >= 4.5, `${theme} ${pair.fg}/${pair.bg} ${pair.contrast}`));
      }
      assert.deepEqual(errors, []);
    });
  } finally {
    fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify({ results, runtimeErrors: errors }, null, 2));
    await browser.close();
  }
  console.log(`${results.length} review scenarios passed`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
