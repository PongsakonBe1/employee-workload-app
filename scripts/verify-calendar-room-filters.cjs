// Synthetic browser verification. Never signs in or reads staging/production data.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.argv[2]);
const origin = process.argv[4] || 'http://127.0.0.1:4310';
const out = path.resolve('output/playwright/calendar-room-filters');
fs.mkdirSync(out, { recursive: true });
const report = { completed: false, checks: [], errors: [], unexpectedOrigins: [], limitations: ['Synthetic preview only; no cloud sign-in or writes', 'Chromium emulation; physical Safari/iPhone UAT pending'] };
const dialog = page => page.locator('dialog.cal-dialog[open]');
const chips = page => page.getByRole('group', { name: 'กรองห้องที่มีคาบ', exact: true });
const view = (page, name) => page.getByRole('group', { name: 'มุมมองปฏิทิน', exact: true }).getByRole('button', { name, exact: true }).click();
const selectedChipColors = page => chips(page).locator('[aria-pressed=true]').evaluate(async element => {
  // Sample the final palette, not a frame within the CSS selection transition.
  getComputedStyle(element).backgroundColor;
  await Promise.all(element.getAnimations().map(animation => animation.finished.catch(() => {})));
  return { background: getComputedStyle(element).backgroundColor, color: getComputedStyle(element).color };
});
async function date(page, value) {
  await page.getByRole('button', { name: 'เลือกวันที่', exact: true }).click();
  await dialog(page).locator('input[type=date]').fill(value);
  await dialog(page).getByRole('button', { name: 'ไปยังวันที่นี้', exact: true }).click();
}
async function openFilters(page) {
  // Use the persistent filter control. The anchored More menu dismisses on page scroll.
  const mobile = page.getByRole('button', { name: 'ตัวกรอง', exact: true });
  if (await mobile.isVisible()) await mobile.click();
  else await page.getByRole('button', { name: 'ค้นหาหรือกรองตาราง', exact: true }).click();
  await dialog(page).waitFor();
}
async function shot(page, name) {
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: path.join(out, name + '.png') });
}
function contrast(foreground, background) {
  const luminance = value => {
    const rgb = value.match(/[\d.]+/g).slice(0, 3).map(Number).map(channel => channel / 255).map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  };
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: process.argv[3] });
  try {
    for (const width of [375, 390, 768, 1440]) for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, isMobile: width < 800, hasTouch: width < 800, serviceWorkers: 'block' });
      await context.addInitScript(preferences => localStorage.setItem('labboy.appearance.v1', JSON.stringify(preferences)), { theme, navigation: 'sidebar' });
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin === origin || ['data:', 'blob:'].includes(url.protocol)) return route.continue();
        report.unexpectedOrigins.push(url.origin);return route.abort();
      });
      const page = await context.newPage();page.setDefaultTimeout(20000);
      page.on('pageerror', error => report.errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
      await page.goto(origin + '/dev/calendar', { timeout: 90000 });
      await page.waitForFunction(() => document.documentElement.dataset.uiReady === 'true');
      await view(page, 'สัปดาห์');
      assert.equal(await page.locator('#cal-color-by').inputValue(), 'room');
      assert.equal(await page.locator('.cal-sidebar .cal-filter-check[data-kind]>i').count(), 0);
      assert.equal(await chips(page).locator('button>i').count(), 4);
      assert.equal(await page.locator('.cal-timed-event[data-room-color=blue]').count(), 2);
      assert.equal(await page.locator('.cal-timed-event[data-room-color=amber]').count(), 2);
      assert.equal(await page.locator('.cal-timed-event[data-room-color=shared]').count(), 7);
      if (width === 1440) {
        const titleFits = await page.locator('.cal-timed-event[data-kind=dl]').first().locator('strong').evaluate(element => element.getBoundingClientRect().height >= parseFloat(getComputedStyle(element).lineHeight) - 1);
        assert.ok(titleFits, 'Overlapping DL card retains at least one complete title line');
      }
      assert.deepEqual(await page.locator('.cal-legend [data-room-color]').allTextContents(), ['ห้อง 401', 'ห้อง 402', 'ห้อง 406', 'ห้อง 407']);
      if ([390, 1440].includes(width)) {
        if (width === 390) await view(page, 'วัน');
        await shot(page, `rooms-${width}-${theme}`);
        await view(page, 'สัปดาห์');
      }
      const hits = await chips(page).getByRole('button').evaluateAll(buttons => buttons.map(button => ({ width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })));
      assert.ok(hits.every(hit => hit.width >= 44 && hit.height >= 44));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const palette = [];
      for (const room of ['401', '402', '406', '407']) {
        const button = chips(page).getByRole('button', { name: `ห้อง ${room}`, exact: true });
        await button.focus();await page.keyboard.press('Enter');
        assert.equal(await button.getAttribute('aria-pressed'), 'true');
        assert.ok((await page.locator('.cal-timed-event').count()) > 0);
        for (const labels of await page.locator('.cal-timed-event .cal-room-labels').allTextContents()) assert.ok(labels.includes(room));
        const colors = await button.evaluate(element => ({ foreground: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor }));
        assert.ok(contrast(colors.foreground, colors.background) >= 4.5, `${room} ${theme} selected chip contrast`);
        palette.push(colors.background);
      }
      assert.equal(new Set(palette).size, 4);
      assert.equal(await page.locator('.cal-timed-event[data-room-color=green]').count(), 7);
      assert.ok((await page.locator('.cal-timed-event').first().getByLabel('ห้อง 406 + 407', { exact: true }).isVisible()));
      await page.locator('#cal-color-by').selectOption('kind');
      assert.equal(await page.locator('.cal-timed-event[data-room-color]').count(), 0);
      assert.equal(await page.locator('.cal-legend [data-kind=dl]').textContent(), 'Digital Literacy');
      assert.equal(await page.locator('.cal-sidebar .cal-filter-check[data-kind]>i').count(), 3);
      assert.equal(await chips(page).locator('button>i,button[data-room-color]').count(), 0);
      assert.equal(await page.locator('.cal-room-label:not([data-room-color=shared]),.cal-room-label>i').count(), 0);
      const neutral = await selectedChipColors(page);
      await chips(page).getByRole('button', { name: 'ห้อง 406', exact: true }).click();
      assert.deepEqual(await selectedChipColors(page), neutral);
      await chips(page).getByRole('button', { name: 'ห้อง 407', exact: true }).click();
      await page.locator('.cal-timed-event').first().click();
      assert.equal(await dialog(page).locator('.cal-kind-badge').getAttribute('data-room-color'), null);
      assert.equal(await dialog(page).locator('.cal-room-label:not([data-room-color=shared]),.cal-room-label>i').count(), 0);
      await page.keyboard.press('Escape');
      await openFilters(page);
      assert.equal(await dialog(page).locator('.cal-filter-check[data-kind]>i').count(), 3);
      await dialog(page).getByRole('checkbox', { name: 'Digital Literacy', exact: true }).uncheck();
      await dialog(page).getByRole('button', { name: 'ยกเลิก', exact: true }).click();
      assert.equal(await page.locator('.cal-timed-event').count(), 7);
      await page.locator('#cal-color-by').selectOption('room');
      assert.equal(await page.locator('.cal-sidebar .cal-filter-check[data-kind]>i').count(), 0);
      await page.locator('.cal-timed-event').first().click();
      assert.equal(await dialog(page).locator('.cal-kind-badge').getAttribute('data-room-color'), 'shared');
      assert.deepEqual(await dialog(page).locator('.cal-room-label').evaluateAll(elements => elements.map(element => element.dataset.roomColor)), ['purple', 'green']);
      await page.keyboard.press('Escape');
      await chips(page).getByRole('button', { name: 'ทุกห้อง', exact: true }).click();
      if ([390, 1440].includes(width)) {
        await page.locator('#cal-color-by').selectOption('kind');
        if (width === 390) await view(page, 'วัน');
        await shot(page, `kinds-${width}-${theme}`);
        await view(page, 'สัปดาห์');
        await page.locator('#cal-color-by').selectOption('room');
      }
      for (const name of ['วัน', 'เดือน', 'รายการ', 'สัปดาห์']) {
        await view(page, name);
        const event = page.locator(name === 'รายการ' ? '.cal-agenda-event' : name === 'เดือน' ? '.cal-month-event' : '.cal-timed-event').first();
        assert.ok(await event.getAttribute('data-room-color'));
        await page.locator('#cal-color-by').selectOption('kind');
        assert.equal(await event.getAttribute('data-room-color'), null);
        assert.equal(await page.locator('.cal-room-label:not([data-room-color=shared]),.cal-room-label>i').count(), 0);
        await page.locator('#cal-color-by').selectOption('room');
      }
      await openFilters(page);
      assert.equal(await dialog(page).locator('.cal-filter-check[data-kind]>i').count(), 0);
      await dialog(page).locator('#cal-dialog-room').selectOption('402');
      await dialog(page).getByRole('button', { name: 'ยกเลิก', exact: true }).click();
      assert.equal(await chips(page).getByRole('button', { name: 'ทุกห้อง', exact: true }).getAttribute('aria-pressed'), 'true');
      if (width === 1440) {
        await page.locator('#cal-side-room').selectOption('402');
        assert.equal(await chips(page).getByRole('button', { name: 'ห้อง 402', exact: true }).getAttribute('aria-pressed'), 'true');
        await chips(page).getByRole('button', { name: 'ห้อง 401', exact: true }).click();
        assert.equal(await page.locator('#cal-side-room').inputValue(), '401');
        await chips(page).getByRole('button', { name: 'ทุกห้อง', exact: true }).click();
        // Create one dated exam with a known term in the in-memory preview only.
        await date(page, '2026-11-06');
        await page.getByRole('button', { name: 'เพิ่มตาราง', exact: true }).click();
        await dialog(page).getByLabel(/ภาคเรียน/).selectOption('1/2570');
        await dialog(page).locator('[name=kind]').selectOption('dl');
        await dialog(page).locator('[name=title]').fill('Synthetic next-term exam');
        await dialog(page).getByRole('checkbox', { name: 'เจ้าหน้าที่ตัวอย่าง A', exact: true }).check();
        await dialog(page).getByRole('button', { name: 'บันทึกตัวอย่าง', exact: true }).click();
        assert.equal(await page.locator('.cal-timed-event[aria-label^="Synthetic next-term exam "]').count(), 0);
        await page.locator('#cal-side-semester').selectOption('1/2570');
        assert.equal(await page.locator('.cal-timed-event[aria-label^="Synthetic next-term exam "]').count(), 1);
        assert.equal(await page.locator('.cal-timed-event[data-kind=classroom]').count(), 0);
        assert.equal(await page.locator('.cal-timed-event[data-kind=dl]').count(), 8);
        await page.locator('#cal-side-semester').selectOption('all');
        assert.equal(await page.locator('.cal-timed-event[data-kind=classroom]').count(), 3);
        await page.locator('.cal-sidebar').getByRole('button', { name: 'ล้างตัวกรอง', exact: true }).click();
        assert.equal(await page.locator('#cal-side-semester').inputValue(), '2/2569');
        assert.equal(await chips(page).getByRole('button', { name: 'ทุกห้อง', exact: true }).getAttribute('aria-pressed'), 'true');
      }
      await page.emulateMedia({ forcedColors: 'active' });
      assert.equal(await chips(page).locator('[aria-pressed=true]').evaluate(element => getComputedStyle(element).outlineStyle), 'solid');
      await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'reduce' });
      assert.equal(await chips(page).getByRole('button').first().evaluate(element => getComputedStyle(element).transitionDuration), '0s');
      report.checks.push({ width, theme, roomFilter: true, sharedRooms: true, fourViews: true, cancelDraft: true, minimumHitTarget44: true, noHorizontalOverflow: true, selectedPaletteContrastAA: true, exclusiveColorEncoding: true, filterDialogColorMode: true, detailColorMode: true, forcedColors: true, reducedMotion: true, semesterCreateFilter: width === 1440 });
      console.log(`PASS ${width} ${theme}`);
      await context.close();
    }
    if (process.argv.includes('--emulator')) {
      assert.equal(origin, 'http://127.0.0.1:4310', 'Emulator verification must stay on loopback');
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
      await context.addInitScript(() => localStorage.setItem('labboy.appearance.v1', JSON.stringify({ navigation: 'sidebar' })));
      let firestoreRequests = 0, firestoreWrites = 0;
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin === 'http://127.0.0.1:18080') {
          firestoreRequests++;
          if (/\/(Commit|Write|BatchWrite)(\/|\?|$)/.test(url.pathname)) firestoreWrites++;
        }
        if ([origin, 'http://127.0.0.1:18080', 'http://127.0.0.1:19099'].includes(url.origin) || ['data:', 'blob:'].includes(url.protocol)) return route.continue();
        report.unexpectedOrigins.push(url.origin);return route.abort();
      });
      const page = await context.newPage();
      page.on('pageerror', error => report.errors.push(error.message));
      await page.goto(origin + '/dev/calendar-readonly', { timeout: 90000 });
      await page.waitForFunction(() => document.documentElement.dataset.uiReady === 'true');
      const source = page.getByRole('region', { name: 'เชื่อม Emulator อ่านอย่างเดียว', exact: true });
      await date(page, '2026-11-03');
      await source.getByRole('combobox', { name: 'บัญชีทดสอบ', exact: true }).selectOption('directory-a');
      await source.getByRole('button', { name: 'เข้าสู่ระบบจำลอง', exact: true }).click();
      await source.getByRole('status').filter({ hasText: 'อ่านสำเร็จ' }).waitFor({ timeout: 20000 });
      const queriesBefore = await source.locator('[data-read-queries]').getAttribute('data-read-queries');
      const requestsBefore = firestoreRequests;
      for (const room of ['401', '402', '406', '407', 'all']) await chips(page).getByRole('button', { name: room === 'all' ? 'ทุกห้อง' : `ห้อง ${room}`, exact: true }).click();
      await page.locator('#cal-color-by').selectOption('kind');
      await page.locator('#cal-color-by').selectOption('room');
      await page.locator('#cal-side-semester').selectOption('all');
      await page.locator('#cal-side-semester').selectOption('2/2569');
      await page.locator('.cal-sidebar').getByRole('checkbox', { name: 'ตารางเรียน', exact: true }).uncheck();
      await page.locator('.cal-sidebar').getByRole('checkbox', { name: 'ตารางเรียน', exact: true }).check();
      await page.waitForTimeout(300);
      assert.equal(await source.locator('[data-read-queries]').getAttribute('data-read-queries'), queriesBefore);
      assert.equal(firestoreRequests, requestsBefore);
      assert.equal(firestoreWrites, 0);
      assert.ok(Number(queriesBefore) >= 4);
      report.emulator = { syntheticOnly: true, queriesBefore: Number(queriesBefore), queriesAfter: Number(queriesBefore), additionalFirestoreRequests: 0, firestoreWrites: 0 };
      console.log('PASS Emulator: room, color, semester and kind filters reuse loaded data without reads/writes');
      await context.close();
    }
    assert.deepEqual(report.errors, []);assert.deepEqual(report.unexpectedOrigins, []);report.completed = true;
  } catch (error) { report.failure = error.stack;throw error; }
  finally { fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));await browser.close(); }
}
main().catch(error => { console.error(error);process.exitCode = 1; });
