// Actual OCR -> review -> isolated writer emulator. Synthetic images/identities only.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.argv[2]);
const origin = 'http://127.0.0.1:4310';
const out = path.resolve('output/playwright/dl-staging-import-uat');
fs.mkdirSync(out, { recursive: true });
const report = { completed: false, cloudUsed: false, emulatorReset: false, cases: [], errors: [], outsideOrigins: [], limitations: ['Synthetic ruled image; no real personnel image or Google session', 'Chromium touch emulation; physical-device and cloud UAT remain pending'] };
const dialog = page => page.locator('dialog.cal-dialog[open]');
const source = page => page.getByRole('region', { name: 'เชื่อม Emulator เพิ่มตาราง', exact: true });
async function view(page, name) {
  await page.getByRole('group', { name: 'มุมมองปฏิทิน', exact: true }).getByRole('button', { name, exact: true }).click();
  await page.waitForTimeout(100);await loaded(page);
}
async function loaded(page) {
  await source(page).getByRole('status').filter({ hasText: 'อ่านสำเร็จ' }).waitFor({ timeout: 30000 });
}
async function login(page, account = 'directory-a') {
  await source(page).getByRole('combobox', { name: 'บัญชีทดสอบ', exact: true }).selectOption(account);
  await source(page).getByRole('button', { name: 'เข้าสู่ระบบจำลอง', exact: true }).click();
  await loaded(page);
}
async function selectDate(page, date) {
  await page.getByRole('button', { name: 'เลือกวันที่', exact: true }).click();
  await dialog(page).locator('input[type=date]').fill(date);
  await dialog(page).getByRole('button', { name: 'ไปยังวันที่นี้', exact: true }).click();
  // Allow the range effect to start before observing the reader status.
  await page.waitForTimeout(100);
  await loaded(page);
}
async function allSemesters(page) {
  const mobile = page.getByRole('button', { name: 'ตัวกรอง', exact: true });
  if (await mobile.isVisible()) await mobile.click();
  else await page.getByRole('button', { name: 'ค้นหาหรือกรองตาราง', exact: true }).click();
  await dialog(page).locator('#cal-dialog-semester').selectOption('all');
  await dialog(page).getByRole('button', { name: 'ใช้ตัวกรอง', exact: true }).click();
}
async function emptyMonth(page, width) {
  await allSemesters(page);await view(page, 'เดือน');
  for (let offset = 0; offset < 12; offset++) {
    const date = new Date(Date.UTC(2027, (width === 1440 ? 5 : 7) + offset, 10));
    const iso = date.toISOString().slice(0, 10);
    await selectDate(page, iso);
    if (await page.locator('.cal-month-event').count() === 0) return [iso, new Date(date.getTime() + 86400000).toISOString().slice(0, 10)];
  }
  throw new Error('No empty synthetic calendar month found; existing emulator data was preserved');
}
async function imageFixture(page, dates) {
  const base64 = await page.evaluate(dates => {
    const canvas = document.createElement('canvas');canvas.width = 900;canvas.height = 280;
    const g = canvas.getContext('2d');g.fillStyle = '#fff';g.fillRect(0, 0, 900, 280);
    g.strokeStyle = '#000';g.lineWidth = 1;
    for (const y of [80, 112, 182, 252]) { g.beginPath();g.moveTo(30, y);g.lineTo(870, y);g.stroke(); }
    for (const x of [30, 330, 510, 690, 870]) { g.beginPath();g.moveTo(x, 112);g.lineTo(x, 252);g.stroke(); }
    g.fillStyle = '#000';g.font = '18px Arial';g.fillText('DL schedule - 75 participants per round', 36, 45);g.font = '17px Arial';
    dates.forEach((date, i) => {
      const [year, month, day] = date.split('-').map(Number), stamp = `${day}/${month}/${String(year + 543).slice(-2)}`;
      g.fillText(`${stamp} 09.00 - 10.30`, 42, 112 + i * 70 + 25);
      g.fillText(`${stamp} 17.00 - 18.30`, 42, 112 + i * 70 + 53);
      for (let j = 0; j < 3; j++) g.fillText('Staff ' + String.fromCharCode(65 + j), 370 + j * 180, 112 + i * 70 + 39);
    });
    return canvas.toDataURL('image/png').split(',')[1];
  }, dates);
  return { name: 'dl-anonymous-emulator.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') };
}
async function read(page, file) {
  await page.getByRole('button', { name: 'นำเข้าตาราง', exact: true }).click();
  await dialog(page).getByRole('button', { name: 'ตารางสอบ DL · รูปภาพ', exact: true }).click();
  await dialog(page).getByLabel('เลือกรูปตารางสอบ DL', { exact: true }).setInputFiles(file);
  await dialog(page).getByRole('button', { name: 'อ่านตารางจากภาพ', exact: true }).click();
  await dialog(page).locator('.dl-import-found').waitFor({ timeout: 150000 });
}
async function mapPeople(page) {
  const cards = dialog(page).locator('[data-dl-map]');assert.equal(await cards.count(), 3);
  // Review against the known fixture columns. OCR spelling must never become an account ID.
  const reviewedAssignments = ['directory-a', 'directory-b', 'directory-c'];
  for (const [index, card] of (await cards.all()).entries()) {
    assert.ok((await card.locator('p').first().textContent()).includes('Staff'));
    await card.getByRole('combobox').selectOption(reviewedAssignments[index]);
  }
}
async function screenshot(page, name) {
  await dialog(page).locator('.ui-dialog-body').evaluate(element => { element.scrollTop = 0; });
  await page.screenshot({ path: path.join(out, name + '.png') });
}
async function main() {
  const browser = await chromium.launch({ executablePath: process.argv[3], headless: true });let activePage;
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, isMobile: width < 760, hasTouch: width < 760, serviceWorkers: 'block' });
      await context.addInitScript(theme => localStorage.setItem('labboy.appearance.v1', JSON.stringify({ theme, navigation: 'sidebar' })), width === 1440 ? 'light' : 'dark');
      let ocrRequests = 0, commitRequests = 0;
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.pathname.includes('/dev-ocr/')) ocrRequests++;
        if (url.origin === 'http://127.0.0.1:18080' && /:commit$|:batchWrite$|\/(Commit|Write)(\/|\?|$)/.test(url.pathname)) commitRequests++;
        if ([origin, 'http://127.0.0.1:18080', 'http://127.0.0.1:19099'].includes(url.origin) || ['blob:', 'data:'].includes(url.protocol)) return route.continue();
        report.outsideOrigins.push(url.origin);return route.abort();
      });
      const page = activePage = await context.newPage();page.setDefaultTimeout(20000);
      page.on('pageerror', error => report.errors.push(error.message));
      await page.goto(origin + '/dev/calendar-write', { timeout: 90000 });
      await page.waitForFunction(() => document.documentElement.dataset.uiReady === 'true');
      await login(page);const dates = await emptyMonth(page, width), file = await imageFixture(page, dates);
      console.log(`CHECK ${width}px: selected an empty emulator month; reading synthetic image`);
      const commitsBeforeReview = commitRequests;
      await read(page, file);assert.ok(ocrRequests > 0);
      const form = dialog(page), rows = form.locator('[data-dl-row]');
      assert.equal(await rows.count(), 4);
      assert.deepEqual(await rows.locator('input[type=date]').evaluateAll(inputs => inputs.map(input => input.value)), [dates[0], dates[0], dates[1], dates[1]]);
      assert.deepEqual(await rows.locator('input[type=time]').evaluateAll(inputs => inputs.map(input => input.value)), ['09:00', '10:30', '17:00', '18:30', '09:00', '10:30', '17:00', '18:30']);
      assert.equal(await form.getByRole('button', { name: 'ใช้ชื่อนี้ชั่วคราว', exact: true }).count(), 0);
      assert.equal(await form.locator('[name^=dl-preview-name-]').count(), 0);
      assert.ok((await form.locator('.dl-import-mappings').textContent()).includes('เลือกผู้คุมจากรายชื่อในระบบ'));
      await form.getByRole('button', { name: /ตรวจ \d+ จุดที่ต้องแก้/ }).click();
      assert.ok(await form.locator('[data-dl-map] select').first().evaluate(element => element === document.activeElement));
      await mapPeople(page);
      await form.locator('.dl-import-mappings').evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
      await page.screenshot({ path: path.join(out, 'mapping-' + width + '.png') });
      await form.locator('[name=dl-import-semester]').fill('2/2570');
      const firstMap = form.locator('[data-dl-map] select').first(), secondMap = form.locator('[data-dl-map] select').nth(1);
      const secondValue = await secondMap.inputValue();await secondMap.selectOption(await firstMap.inputValue());
      assert.ok((await form.locator('.cal-form-error').allTextContents()).some(text => text.includes('ชื่อผู้คุมซ้ำ')));
      await secondMap.selectOption(secondValue);
      await rows.nth(1).locator('input[type=time]').first().fill('10:00');
      assert.ok((await form.locator('.cal-form-error').allTextContents()).some(text => text.includes('ซ้ำหรือชน')));
      assert.equal(await form.getByRole('button', { name: 'เพิ่ม 4 รอบสอบ', exact: true }).count(), 0);
      await rows.nth(1).locator('input[type=time]').first().fill('17:00');
      assert.equal(commitRequests, commitsBeforeReview, 'OCR/review/validation must not write');
      assert.ok((await form.locator('.cal-import-summary').textContent()).includes('ห้อง 406 + 407'));
      if (width < 760) {
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        assert.ok(await form.locator('input[type=date],input[type=time],select').evaluateAll(inputs => inputs.every(input => {
          const box = input.getBoundingClientRect();return box.left >= 0 && box.right <= innerWidth + 1 && parseFloat(getComputedStyle(input).fontSize) >= 16;
        })));
      }
      await screenshot(page, 'review-' + width);
      await form.locator('[name=dl-import-confirm]').check();
      await form.getByRole('button', { name: 'เพิ่ม 4 รอบสอบ', exact: true }).click();
      await form.getByRole('alert').filter({ hasText: 'เลือกประเภทผู้เข้าสอบ' }).waitFor();
      assert.equal(commitRequests, commitsBeforeReview);
      await form.getByRole('combobox', { name: 'ประเภทผู้เข้าสอบ', exact: true }).selectOption('student');
      assert.equal(await form.locator('[name=dl-import-confirm]').isChecked(), false);
      await form.locator('[name=dl-import-confirm]').check();
      await form.getByRole('button', { name: 'เพิ่ม 4 รอบสอบ', exact: true }).click();
      await form.waitFor({ state: 'hidden', timeout: 30000 });await loaded(page);
      assert.equal(await page.locator('.cal-month-event').count(), 4);
      assert.ok(commitRequests > commitsBeforeReview);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.documentElement.dataset.uiReady === 'true');
      await login(page);await allSemesters(page);await view(page, 'เดือน');await selectDate(page, dates[0]);
      assert.equal(await page.locator('.cal-month-event').count(), 4, 'Imported rounds survive a full reload and fresh emulator sign-in');
      if (width < 760) await page.locator('.cal-month-selection .cal-agenda-event').first().click();
      else await page.locator('.cal-month-event').first().click();
      const detail = await dialog(page).textContent();
      for (const label of ['75 คนต่อรอบ', 'Admin จำลอง', 'Staff จำลอง', 'Superadmin จำลอง']) assert.ok(detail.includes(label));
      assert.deepEqual(await dialog(page).locator('.cal-room-label').allTextContents(), ['406', '407']);
      await page.keyboard.press('Escape');
      const beforeDuplicate = commitRequests;
      await read(page, file);await mapPeople(page);
      await dialog(page).locator('[name=dl-import-semester]').fill('2/2570');
      await dialog(page).getByRole('combobox', { name: 'ประเภทผู้เข้าสอบ', exact: true }).selectOption('student');
      assert.ok((await dialog(page).locator('.cal-form-error').allTextContents()).some(text => text.includes('ซ้ำหรือชน')));
      assert.equal(await dialog(page).getByRole('button', { name: 'เพิ่ม 4 รอบสอบ', exact: true }).count(), 0);
      assert.equal(commitRequests, beforeDuplicate);
      await page.keyboard.press('Escape');
      await source(page).getByRole('button', { name: 'ออกจากระบบจำลอง', exact: true }).click();
      await login(page, 'directory-b');
      assert.ok(await page.getByRole('button', { name: 'นำเข้าตาราง', exact: true }).isDisabled());
      report.cases.push({ width, dates, actualOcr: true, ocrNameSpellingRequiresReview: true, reviewedFixtureColumnMapping: true, rounds: 4, directoryOnly: true, unmappedFocus: true, duplicateProctorsRejected: true, roomOverlapRejected: true, explicitExamType: true, noWritesBeforeReview: true, persistedAfterReloadAndLogin: true, rooms: ['406', '407'], participantsPerRound: 75, duplicateImportNoWrite: true, staffDenied: true });
      console.log(`PASS DL OCR -> directory mapping -> Emulator -> reload/login -> duplicate guard at ${width}px`);
      await context.close();
    }
    assert.deepEqual(report.errors, []);assert.deepEqual(report.outsideOrigins, []);report.completed = true;
  } catch (error) {
    report.failure = error.stack;
    if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {});
    throw error;
  } finally { fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));await browser.close(); }
}
module.exports = { imageFixture, read, mapPeople, login };
if (require.main === module) main().catch(error => { console.error(error);process.exitCode = 1; });
