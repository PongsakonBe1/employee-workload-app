/* Review 10 migration checks against real Next components and synthetic local state. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require(process.argv[2]);
const origin = process.argv[4] || 'http://127.0.0.1:4310';
const out = path.resolve(__dirname, process.argv[5]==='templates-combo'?'../output/playwright/templates-combo/regression-record':'../output/playwright/record-liquid-glass', origin.startsWith('http://127.0.0.1') ? '' : 'public');
fs.mkdirSync(out, { recursive: true });
const report = { url: origin + '/dev/record', completed: false, checks: [], errors: [], blockedOrigins: [], limitations: ['Synthetic in-memory transactions only', 'Chromium touch emulation is not physical Safari/iPhone or Android UAT'] };
async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: process.argv[3] });
  let page;
  const context = async options => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block', ...options });
    await ctx.route('**/*', route => { const url = new URL(route.request().url());if (url.origin === origin || ['data:', 'blob:'].includes(url.protocol)) return route.continue();report.blockedOrigins.push(url.origin);return route.abort(); });
    return ctx;
  };
  const open = async target => {
    const response = await target.goto(report.url, { timeout: 90000 });assert.equal(response.status(), 200);
    await target.waitForFunction(() => document.documentElement.dataset.uiReady === 'true');
    target.on('pageerror', error => report.errors.push(error.message));
    await target.locator('.record-mode button').first().waitFor();
  };
  const test = async (name, fn) => { await fn();report.checks.push({ name, status: 'passed' });console.log('PASS ' + name); };
  const dialog = target => target.locator('dialog.record-dialog[open]');
  const quick = (target, name) => target.locator('.record-quick-grid').getByRole('button', { name });
  const close = target => target.keyboard.press('Escape');
  const shot = async (target, name) => {
    await target.evaluate(async () => { await Promise.all(document.getAnimations().filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {}))); });
    const modal = await target.locator('dialog[open]').count();
    if (!modal) await target.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await target.screenshot({ path: path.join(out, name + '.png'), fullPage: !modal });
  };
  const engineCount = (target, count) => target.waitForFunction(n => (globalThis.__QUICK_LIQUID__?.metrics().engineCount || 0) === n, count);
  const appearance = async target => { await target.locator('.ui-header button[aria-label="บัญชีและเครื่องมือ"]').click();await target.locator('dialog[open]').getByRole('button', { name: 'รูปแบบการแสดงผล', exact: true }).click(); };
  function rgb(value) { const hex = value.trim().slice(1);return (hex.length === 3 ? hex.split('').map(x => x + x).join('') : hex).match(/../g).map(x => parseInt(x, 16)); }
  function luminance(values) { return values.map(x => x / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((sum, x, i) => sum + x * [.2126, .7152, .0722][i], 0); }
  function contrast(a, b) { const x = luminance(a), y = luminance(b);return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
  try {
    const ctx = await context();page = await ctx.newPage();await open(page);
    await test('Review 10 content hierarchy, six Quick Logs and opt-in decorative controls', async () => {
      assert.equal(await page.locator('.record-quick-card').count(), 6);
      const y = await page.locator('.record-quick-card').evaluateAll(nodes => nodes.slice(0, 3).map(n => n.getBoundingClientRect().y));assert.ok(y.every(v => v === y[0]));
      assert.equal(await page.locator('.record-mode button[aria-pressed=true]').textContent(), 'บันทึกด่วน');
      await engineCount(page, 2);assert.equal(await page.locator('.ui-optical-layer button,.ui-optical-layer input').count(), 0);
      await shot(page, 'record-desktop-light');
    });
    await test('Both room floors use four desktop columns, distinct state labels, immediate save and persistent Undo', async () => {
      for (const [name, room] of [['ห้องแลกเปลี่ยนความรู้', '303'], ['ห้องเรียน ชั้น 4', '401']]) {
        await quick(page, new RegExp(name)).click();
        const tiles = dialog(page).locator('.record-room-grid>button');assert.equal(await tiles.count(), 4);
        const ys = await tiles.evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().y));assert.ok(ys.every(y => y === ys[0]));
        const target = tiles.filter({ hasText: 'ห้อง ' + room });assert.equal(await target.getAttribute('data-state'), 'closed');
        await shot(page, 'rooms-' + room + '-desktop');await target.click();await dialog(page).waitFor({ state: 'hidden' });
        assert.ok((await page.locator('.record-recent').textContent()).includes('เปิดห้อง ' + room));
        await quick(page, new RegExp(name)).click();assert.equal(await dialog(page).locator('.record-resource-tile').filter({ hasText: 'ห้อง ' + room }).getAttribute('data-state'), 'open');await close(page);
        await page.getByRole('region', { name: 'เลิกทำรายการล่าสุด' }).getByRole('button', { name: 'เลิกทำ', exact: true }).click();
        await quick(page, new RegExp(name)).click();assert.equal(await dialog(page).locator('.record-resource-tile').filter({ hasText: 'ห้อง ' + room }).getAttribute('data-state'), 'closed');await close(page);
      }
    });
    await test('Combo starts empty, supports Space, focuses missing recipient, preserves review choices and saves only selected tasks', async () => {
      await quick(page, /เปิดใช้บัญชี/).click();assert.equal(await dialog(page).locator('input:checked').count(), 0);
      await dialog(page).getByRole('button', { name: 'ตรวจ 0 รายการ', exact: true }).click();await page.waitForFunction(() => document.activeElement?.type === 'checkbox');await page.keyboard.press('Space');
      await dialog(page).getByRole('button', { name: 'ตรวจ 1 รายการ', exact: true }).click();await page.waitForFunction(() => document.activeElement?.name === 'record-combo-recipient');
      await page.locator('[name="record-combo-recipient"]').fill('ผู้รับบริการตัวอย่าง');await dialog(page).getByRole('button', { name: 'ตรวจ 1 รายการ', exact: true }).click();
      assert.equal(await dialog(page).locator('.record-review-list li').count(), 1);await shot(page, 'combo-review-desktop');
      await dialog(page).getByRole('button', { name: 'แก้ไขรายการ', exact: true }).click();assert.equal(await dialog(page).locator('input:checked').count(), 1);
      await dialog(page).getByRole('button', { name: 'ตรวจ 1 รายการ', exact: true }).click();await dialog(page).getByRole('button', { name: 'บันทึก 1 รายการ', exact: true }).click();
      assert.ok((await page.locator('.record-recent').textContent()).includes('เปิดใช้ Microsoft Authenticator'));
      await quick(page, /เปิดใช้บัญชี/).click();assert.equal(await dialog(page).locator('input:checked').count(), 0);await close(page);
      await page.getByRole('region', { name: 'เลิกทำรายการล่าสุด' }).getByRole('button', { name: 'เลิกทำ', exact: true }).click();
    });
    await test('Borrow validates exactly 13 ASCII digits without truncation; return retains borrower and Undo restores status', async () => {
      await quick(page, /ยืม \/ คืนหูฟัง/).click();assert.equal(await dialog(page).locator('button:disabled').count(), 1);
      await dialog(page).getByRole('button', { name: /หูฟังตัวอย่าง 01/ }).click();
      await dialog(page).getByRole('button', { name: 'บันทึกยืม', exact: true }).click();await page.waitForFunction(() => document.activeElement?.name === 'record-student');
      const student = page.locator('[name="record-student"]');await student.fill('ภาษาไทย');assert.equal(await student.inputValue(), '');
      await student.fill('00000000000001');await dialog(page).getByRole('button', { name: 'บันทึกยืม', exact: true }).click();assert.equal(await student.inputValue(), '00000000000001');assert.equal(await student.getAttribute('aria-invalid'), 'true');
      await student.fill('0000000000001');await dialog(page).getByRole('button', { name: 'บันทึกยืม', exact: true }).click();
      await quick(page, /ยืม \/ คืนหูฟัง/).click();const borrowed = dialog(page).getByRole('button', { name: /หูฟังตัวอย่าง 01/ });assert.equal(await borrowed.getAttribute('data-state'), 'borrowed');await borrowed.click();
      assert.equal(await student.inputValue(), '0000000000001');assert.equal(await student.getAttribute('readonly'), '');await shot(page, 'equipment-return-desktop');await dialog(page).getByRole('button', { name: 'บันทึกคืน', exact: true }).click();
      await quick(page, /ยืม \/ คืนหูฟัง/).click();assert.equal(await dialog(page).getByRole('button', { name: /หูฟังตัวอย่าง 01/ }).getAttribute('data-state'), 'ready');await close(page);
      await page.getByRole('region', { name: 'เลิกทำรายการล่าสุด' }).getByRole('button', { name: 'เลิกทำ', exact: true }).click();
      await quick(page, /ยืม \/ คืนหูฟัง/).click();assert.equal(await dialog(page).getByRole('button', { name: /หูฟังตัวอย่าง 01/ }).getAttribute('data-state'), 'borrowed');await close(page);
    });
    await test('Manual draft survives centered task selection, suggestions, date changes and CSS/QuickLiquid switching', async () => {
      await page.locator('.record-mode').getByRole('button', { name: 'กรอกเอง', exact: true }).click();
      const notes = page.locator('[name="record-manual-notes"]');await notes.fill('ร่างทดสอบ');await page.locator('.record-task-picker').click();
      const box = await dialog(page).boundingBox();assert.ok(Math.abs(box.x + box.width / 2 - 720) < 3);
      await page.waitForFunction(() => document.activeElement?.type === 'search');await dialog(page).getByRole('searchbox').fill('Digital');await dialog(page).locator('.record-task-results button').click();
      assert.equal(await notes.inputValue(), 'ร่างทดสอบ');await page.getByRole('group', { name: 'ข้อความแนะนำ' }).getByRole('button', { name: 'เช้า', exact: true }).click();assert.equal(await notes.inputValue(), 'เช้า');
      await page.getByRole('button', { name: 'เปลี่ยนวันที่และเวลา' }).click();await dialog(page).locator('input[type=time]').fill('17:00');await dialog(page).getByRole('button', { name: 'ใช้วันที่และเวลานี้', exact: true }).click();
      await page.locator('.record-inspector summary').click();await page.getByRole('button', { name: 'CSS เดิม', exact: true }).click();await engineCount(page, 0);assert.equal(await notes.inputValue(), 'เช้า');
      await page.getByRole('button', { name: 'QuickLiquid', exact: true }).click();await page.waitForSelector('.record-form .ui-optical-layer[data-active=true]');
      await page.waitForSelector('.record-form [data-glass-surface="button"][data-glass-phase="svg"]');assert.equal(await page.locator('.record-form [data-glass-surface="button"]').evaluate(element => element.tagName), 'SPAN');
      await shot(page, 'manual-desktop-light');await page.locator('form[aria-label="กรอกบันทึกงาน"]').getByRole('button', { name: 'ตรวจรายการก่อนบันทึก', exact: true }).click();await dialog(page).getByRole('button', { name: 'ยืนยันบันทึก', exact: true }).click();
      assert.ok((await page.locator('.record-recent').textContent()).includes('17:00'));await page.locator('.record-mode').getByRole('button', { name: 'บันทึกด่วน', exact: true }).click();await page.locator('.record-inspector summary').click();
    });
    await test('Second Quick Log page keeps plug/USB inventory and phone entry usable without changing the layout', async () => {
      await page.getByRole('button', { name: 'ถัดไป', exact: true }).click();assert.equal(await page.locator('.record-quick-card').count(), 3);
      for (const name of [/ยืม \/ คืนปลั๊กไฟ/, /ยืม \/ คืน USB/]) {
        await quick(page, name).click();assert.equal(await dialog(page).locator('.record-resource-tile').count(), 1);await dialog(page).locator('.record-resource-tile').click();assert.equal(await page.locator('[name="record-student"]').getAttribute('inputmode'), 'numeric');await close(page);
      }
      await page.getByRole('button', { name: 'ก่อนหน้า', exact: true }).click();await quick(page, /รับสายโทรศัพท์/).click();await dialog(page).getByRole('button', { name: 'บันทึกงาน', exact: true }).click();
      await page.waitForFunction(() => document.activeElement?.name === 'record-phone-recipient');await page.locator('[name=record-phone-recipient]').fill('หน่วยงานตัวอย่าง');await page.locator('[name=record-phone-notes]').fill('แนะนำการใช้งานตัวอย่าง');await dialog(page).getByRole('button', { name: 'บันทึกงาน', exact: true }).click();assert.ok((await page.locator('.record-recent').textContent()).includes('รับแจ้งและแก้ปัญหาทางโทรศัพท์'));
    });
    await test('Selected date filters both daily counts and agenda instead of repeating the previous date', async () => {
      await page.getByRole('button', { name: 'เปลี่ยนวันที่และเวลา' }).click();await dialog(page).locator('input[type=date]').fill('2026-11-07');await dialog(page).getByRole('button', { name: 'ใช้วันที่และเวลานี้', exact: true }).click();
      assert.equal(await page.locator('.record-context-count>strong').textContent(), '0');assert.ok((await page.locator('.record-context').textContent()).includes('ไม่มีตารางตัวอย่างในวันที่เลือก'));
      await page.getByRole('button', { name: 'เปลี่ยนวันที่และเวลา' }).click();await dialog(page).locator('input[type=date]').fill('2026-11-06');await dialog(page).getByRole('button', { name: 'ใช้วันที่และเวลานี้', exact: true }).click();assert.equal(await page.locator('.record-context .record-agenda').count(), 2);
    });
    await test('Sampled semantic status and primary tint colors maintain text contrast in both themes', async () => {
      report.contrast = [];
      for (const theme of ['สว่าง', 'มืด']) {
        await appearance(page);await page.locator('dialog[open]').getByRole('button', { name: theme, exact: true }).click();await close(page);
        const colors = await page.evaluate(() => { const css = getComputedStyle(document.documentElement);return Object.fromEntries(['accent', 'accent-ink', 'blue', 'blue-ink', 'green', 'green-ink', 'amber', 'amber-ink', 'sub', 'soft'].map(key => [key, css.getPropertyValue('--ui-' + key)])); });
        for (const [foreground, background] of [['blue-ink', 'blue'], ['green-ink', 'green'], ['amber-ink', 'amber'], ['sub', 'soft']]) {
          const ratio = contrast(rgb(colors[foreground]), rgb(colors[background]));assert.ok(ratio >= 4.5, theme + ' ' + foreground + ' contrast=' + ratio);report.contrast.push({ theme, foreground, background, ratio });
        }
        for (const backdrop of [0, 255]) {
          const tinted = rgb(colors.accent).map(channel => channel * .88 + backdrop * .12), ratio = contrast(rgb(colors['accent-ink']), tinted);assert.ok(ratio >= 4.5, 'Primary text must survive the minimum tint over black and white');report.contrast.push({ theme, primaryOver: backdrop === 0 ? 'black' : 'white', ratio });
        }
      }
    });
    await test('Explicit app dark theme, reduced motion, solid surfaces and forced colors remain functional', async () => {
      await appearance(page);await page.locator('dialog[open]').getByRole('button', { name: 'มืด', exact: true }).click();await close(page);await shot(page, 'record-desktop-dark');
      await quick(page, /เปิดใช้บัญชี/).click();await dialog(page).getByRole('checkbox').first().check();await shot(page, 'combo-desktop-dark');await close(page);
      await appearance(page);await page.locator('dialog[open]').getByRole('checkbox', { name: /ลดการเคลื่อนไหว/ }).check();await close(page);
      assert.equal(await page.locator('.record-quick-card').first().evaluate(e => getComputedStyle(e).transitionDuration), '0s');
      await appearance(page);await page.locator('dialog[open]').getByRole('checkbox', { name: /ลดความโปร่งใส/ }).check();await close(page);await engineCount(page, 0);
      await appearance(page);await page.locator('dialog[open]').getByRole('checkbox', { name: /ลดความโปร่งใส/ }).uncheck();await close(page);
      await page.emulateMedia({ forcedColors: 'active' });await engineCount(page, 0);await quick(page, /เปิดใช้บัญชี/).click();
      assert.equal(await dialog(page).getByRole('checkbox').first().evaluate(e => getComputedStyle(e).appearance), 'auto');await close(page);await page.emulateMedia({ forcedColors: 'none' });
    });
    await ctx.close();
    await test('Mobile layouts 375/390/430/768 keep controls, date inputs and room sheets inside the viewport', async () => {
      for (const width of [375, 390, 430, 768]) {
        const mobile = await context({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });page = await mobile.newPage();await open(page);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        if (width === 390) await shot(page, 'record-mobile-light');
        await page.getByRole('button', { name: 'เปลี่ยนวันที่และเวลา' }).click();
        const inputs = await dialog(page).locator('input').evaluateAll(nodes => nodes.map(e => ({ font: parseFloat(getComputedStyle(e).fontSize), left: e.getBoundingClientRect().left, right: e.getBoundingClientRect().right })));
        assert.ok(inputs.every(e => e.font >= 16 && e.left >= 0 && e.right <= width + 1));if (width === 390) await shot(page, 'date-mobile-light');await close(page);
        await quick(page, /ห้องแลกเปลี่ยนความรู้/).click();const roomBoxes = await dialog(page).locator('.record-room-grid>button').evaluateAll(nodes => nodes.map(e => ({ x: e.getBoundingClientRect().x, y: e.getBoundingClientRect().y })));
        assert.equal(roomBoxes[0].y, roomBoxes[1].y);assert.ok(roomBoxes[2].y > roomBoxes[0].y);if (width === 390) await shot(page, 'rooms-mobile-light');await close(page);
        await quick(page, /เปิดใช้บัญชี/).click();await dialog(page).getByRole('checkbox').first().check();await dialog(page).getByRole('button', { name: 'ตรวจ 1 รายการ', exact: true }).click();await page.waitForFunction(() => document.activeElement?.name === 'record-combo-recipient');await close(page);
        if (width === 390) {
          await appearance(page);await page.locator('dialog[open]').getByRole('button', { name: 'มืด', exact: true }).click();await close(page);await shot(page, 'record-mobile-dark');
          await page.locator('.record-mode').getByRole('button', { name: 'กรอกเอง', exact: true }).click();await shot(page, 'manual-mobile-dark');
        }
        await mobile.close();
      }
    });
    await test('Keyboard Escape restores focus, selected person uses ID and original display label', async () => {
      const keyboard = await context();page = await keyboard.newPage();await open(page);
      const room = quick(page, /ห้องแลกเปลี่ยนความรู้/);await room.focus();await page.keyboard.press('Enter');await close(page);assert.equal(await room.evaluate(e => e === document.activeElement), true);
      await page.locator('.record-inspector summary').click();await page.locator('.record-inspector select').selectOption('admin');await page.getByRole('button', { name: 'ผู้ปฏิบัติงาน', exact: true }).click();
      await dialog(page).getByRole('button', { name: /เจ้าหน้าที่ B \(บี\)/ }).click();assert.ok((await page.locator('.record-person').textContent()).includes('เจ้าหน้าที่ B (บี)'));
      await keyboard.close();
    });
    assert.equal(report.errors.length, 0);assert.equal(report.blockedOrigins.length, 0);report.completed = true;
  } catch (error) {
    report.failure = error.stack;try { if (page && !page.isClosed()) await shot(page, 'failure'); } catch { /* Preserve the original error. */ }throw error;
  } finally {
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');await browser.close();
  }
}
main().catch(error => { console.error(error);process.exitCode = 1; });
