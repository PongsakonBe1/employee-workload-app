/* Browser checks for the isolated design prototype, never the production app. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.argv[2] || 'playwright');

async function main() {
  const output = path.resolve(__dirname, '../../../output/playwright/ux-phase1');
  fs.mkdirSync(output, { recursive: true });
  const executablePath = process.argv[3];
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, acceptDownloads: true });
  const errors = [];
  const network = [];
  const results = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => { if (/^https?:/.test(request.url())) network.push(request.url()); });
  const check = async (name, fn) => { await fn(); results.push({ name, status: 'passed' }); console.log(`PASS ${name}`); };
  const url = pathToFileURL(path.join(__dirname, 'prototype.html')).href;
  const navigate = async (hash) => { await page.goto(`${url}#${hash}`); await page.locator('h1').waitFor(); };
  try {
    await navigate('equipment');
    await page.locator('#theme').selectOption('light');
    await page.screenshot({ path: path.join(output, 'equipment-light.png'), fullPage: true });
    await check('Equipment move updates Quick Log and preserves historical location', async () => {
      const card = page.locator('.equipment-card').filter({ hasText: 'DEMO-001' });
      await card.getByRole('button', { name: 'จัดการ หูฟัง 01', exact: true }).click();
      await page.locator('[name="location"]').selectOption('Finn Space');
      await page.getByRole('button', { name: 'บันทึกในต้นแบบ', exact: true }).click();
      assert.match(await card.innerText(), /Finn Space/);
      await card.getByRole('button', { name: 'ยืม', exact: true }).click();
      assert.match(await card.innerText(), /กำลังยืม/);
      await card.getByRole('button', { name: 'คืน', exact: true }).click();
      assert.match(await card.innerText(), /พร้อมใช้/);
      await page.locator('[data-page="usage"]').click();
      await page.locator('#usage-location').selectOption('ชั้น 3');
      const row = page.locator('tbody tr').filter({ hasText: 'DEMO-001' });
      assert.match(await row.innerText(), /Finn Space/);
      assert.equal(await row.locator('td').nth(3).innerText(), '64');
      await page.locator('#usage-location').selectOption('Finn Space');
      assert.equal(await row.locator('td').nth(3).innerText(), '1');
    });
    await check('New item is available and inactive item blocks new borrowing', async () => {
      await page.locator('[data-page="equipment"]').click();
      await page.getByRole('button', { name: 'เพิ่มอุปกรณ์', exact: false }).click();
      await page.locator('[name="name"]').fill('อุปกรณ์สังเคราะห์เพิ่ม');
      await page.locator('[name="type"]').selectOption('USB');
      await page.locator('[name="location"]').selectOption('Finn Space');
      await page.getByRole('button', { name: 'บันทึกในต้นแบบ', exact: true }).click();
      const card = page.locator('.equipment-card').filter({ hasText: 'DEMO-007' });
      assert.match(await card.innerText(), /อุปกรณ์สังเคราะห์เพิ่ม/);
      await card.getByRole('button', { name: 'จัดการ อุปกรณ์สังเคราะห์เพิ่ม', exact: true }).click();
      await page.locator('[name="active"]').uncheck();
      await page.getByRole('button', { name: 'บันทึกในต้นแบบ', exact: true }).click();
      assert.equal(await card.getByRole('button', { name: 'ยืม', exact: true }).isDisabled(), true);
    });
    await navigate('usage');
    await page.locator('#theme').selectOption('dark');
    await page.screenshot({ path: path.join(output, 'usage-dark.png'), fullPage: true });
    await navigate('schedules');
    await page.locator('#theme').selectOption('light');
    await check('Image preview is local; draft requires matching, review, and valid count', async () => {
      await page.getByRole('button', { name: 'นำเข้าตารางจากรูป', exact: false }).first().click();
      await page.locator('#source-file').setInputFiles({ name: 'synthetic.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3v8AAAAASUVORK5CYII=', 'base64') });
      assert.match(await page.locator('#source-preview').getAttribute('src'), /^blob:/);
      assert.equal(await page.locator('#confirm-import').isDisabled(), true);
      await page.getByRole('button', { name: 'ใช้ตารางตัวอย่าง', exact: true }).click();
      assert.equal(await page.locator('.draft-table tbody tr').count(), 18);
      assert.equal(await page.locator('#confirm-import').isDisabled(), true);
      await page.locator('#proctor-match').selectOption('staff-3');
      await page.locator('#draft-reviewed').check();
      assert.equal(await page.locator('#confirm-import').isEnabled(), true);
      const firstCount = page.locator('[data-draft-index="0"]');
      await firstCount.fill('0');
      assert.equal(await page.locator('#confirm-import').isDisabled(), true);
      await firstCount.fill('40');
      assert.equal(await page.locator('#draft-room-0').innerText(), '406');
      await firstCount.fill('75');
      assert.equal(await page.locator('#draft-room-0').innerText(), '406 + 407');
      await page.screenshot({ path: path.join(output, 'schedule-import-light.png'), fullPage: true });
      await page.locator('#confirm-import').click();
      assert.equal(await page.locator('.day-card').count(), 9);
      assert.equal(await page.locator('.event').count(), 18);
      assert.equal(await page.locator('.event').filter({ hasText: '75 คน' }).count(), 18);
      assert.equal(await page.locator('.event').filter({ hasText: '406 + 407' }).count(), 18);
    });
    await check('Evening round is 17:00–18:30 and repeated actions do not duplicate', async () => {
      await page.getByRole('button', { name: 'รอบเย็นตัวอย่าง', exact: false }).click();
      await page.getByRole('button', { name: 'รอบเย็นตัวอย่าง', exact: false }).click();
      assert.equal(await page.locator('.event').count(), 19);
      assert.equal(await page.locator('.event').filter({ hasText: '17:00–18:30' }).count(), 1);
      await page.getByRole('button', { name: 'นำเข้าตารางจากรูป', exact: false }).first().click();
      await page.getByRole('button', { name: 'ใช้ตารางตัวอย่าง', exact: true }).click();
      await page.locator('#proctor-match').selectOption('staff-3');
      await page.locator('#draft-reviewed').check();
      assert.equal(await page.locator('#confirm-import').isDisabled(), true);
      assert.match(await page.locator('#draft-summary').innerText(), /ซ้ำ 18/);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('dialog').isVisible(), false);
    });
    await page.screenshot({ path: path.join(output, 'schedule-confirmed.png'), fullPage: true });
    await navigate('staff');
    await check('Fiscal year/month filters, chart, and CSV have matching ranges and totals', async () => {
      assert.match(await page.locator('#staff-period').innerText(), /2026-10-01 ถึง 2027-09-30/);
      await page.locator('#fiscal-year').selectOption('2569');
      assert.match(await page.locator('#staff-period').innerText(), /2025-10-01 ถึง 2026-09-30/);
      await page.locator('#fiscal-month').selectOption('2025-11');
      assert.match(await page.locator('#staff-period').innerText(), /2025-11-01 ถึง 2025-11-30/);
      const displayed = Number((await page.locator('.stat .value').first().innerText()).split('\n')[0].replace(/[^0-9]/g, ''));
      const tableSum = (await page.locator('main tbody tr td:nth-child(2)').allInnerTexts()).reduce((sum, value) => sum + Number(value), 0);
      assert.equal(displayed, tableSum);
      assert.equal(await page.locator('.trend-col').count(), 1);
      assert.equal(Number(await page.locator('.trend-col strong').innerText()), tableSum);
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'CSV ตัวอย่าง', exact: false }).click();
      const download = await downloadPromise;
      const csv = await fs.promises.readFile(await download.path(), 'utf8');
      assert.match(csv, /2025-11-01/);
      assert.match(csv, /2025-11-30/);
      const csvSum = csv.trim().split(/\r?\n/).slice(1).reduce((sum, line) => sum + Number(line.split(',').at(-1).replaceAll('"', '')), 0);
      assert.equal(csvSum, tableSum);
      await page.locator('#fiscal-year').selectOption('2570');
      assert.equal(await page.locator('#fiscal-month').inputValue(), 'all');
      await page.locator('#theme').selectOption('dark');
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
      await page.locator('#toast').evaluate((element) => { element.hidden = true; });
      await page.screenshot({ path: path.join(output, 'staff-dark.png'), fullPage: true });
    });
    await check('All four pages fit desktop and mobile; System theme follows browser', async () => {
      await page.locator('#theme').selectOption('system');
      await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
      await page.emulateMedia({ colorScheme: 'light' });
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
      for (const width of [1440, 1024, 768, 390, 375]) {
        await page.setViewportSize({ width, height: 900 });
        for (const section of ['equipment', 'usage', 'schedules', 'staff']) {
          await navigate(section);
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
          assert.equal(overflow, false, `${section} overflows at ${width}px`);
        }
      }
      await page.locator('[data-page="equipment"]').click();
      await page.setViewportSize({ width: 390, height: 900 });
      await page.screenshot({ path: path.join(output, 'equipment-mobile.png'), fullPage: true });
      await page.locator('[data-page="schedules"]').click();
      await page.getByRole('button', { name: 'นำเข้าตารางจากรูป', exact: false }).first().click();
      await page.getByRole('button', { name: 'ใช้ตารางตัวอย่าง', exact: true }).click();
      assert.equal(await page.evaluate(() => document.querySelector('dialog').getBoundingClientRect().width <= innerWidth), true);
      await page.screenshot({ path: path.join(output, 'import-mobile.png'), fullPage: false });
      await page.keyboard.press('Escape');
    });
    await check('Semantic text tokens meet 4.5:1 and native dialog contains keyboard focus', async () => {
      for (const theme of ['light', 'dark']) {
        await page.locator('#theme').selectOption(theme);
        const contrasts = await page.evaluate(() => {
          const style = getComputedStyle(document.documentElement);
          const luminance = (variable) => {
            const raw = style.getPropertyValue(variable).trim().slice(1);
            const hex = raw.length === 3 ? [...raw].map((char) => char + char).join('') : raw;
            const values = [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255).map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
            return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
          };
          return [['--text', '--surface'], ['--muted', '--surface'], ['--muted', '--soft'], ['--accent', '--accent-soft'], ['--on-accent', '--accent'], ['--good', '--good-bg'], ['--warn', '--warn-bg'], ['--bad', '--bad-bg']].map(([foreground, background]) => {
            const a = luminance(foreground), b = luminance(background);
            return { foreground, background, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
          });
        });
        contrasts.forEach((pair) => assert.ok(pair.ratio >= 4.5, `${theme} ${pair.foreground}/${pair.background}: ${pair.ratio}`));
      }
      await page.locator('[data-page="equipment"]').click();
      await page.locator('[data-action="edit-equipment"]').first().click();
      for (let index = 0; index < 12; index++) {
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.querySelector('dialog').contains(document.activeElement)), true);
      }
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('dialog').isVisible(), false);
    });
    await check('No runtime JavaScript errors and no HTTP requests', async () => {
      assert.deepEqual(errors, []);
      assert.deepEqual(network, []);
    });
  } finally {
    const report = { browser: 'Chromium/Edge headless', prototype: 'phase1', results, errors, externalRequests: network, screenshots: fs.readdirSync(output).filter((name) => name.endsWith('.png')) };
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
  console.log(`${results.length} browser scenarios passed`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
