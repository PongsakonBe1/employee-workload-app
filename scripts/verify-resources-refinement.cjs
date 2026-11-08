/* UI refinement checks against real Next views and the shared synthetic ledger. No production I/O. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require(process.argv[2]);
const origin = process.argv[4] || 'http://127.0.0.1:4310';
const formOnly=process.argv[5]==='form-only';
const out = path.resolve(__dirname, process.argv[5]==='resource-detail-flow'?'../output/playwright/resource-detail-flow/regression':'../output/playwright/resources-ui-refinement', origin.startsWith('http://127.0.0.1') ? /Google[\\/]Chrome/i.test(process.argv[3]) ? 'chrome' : 'edge' : 'public', ...(formOnly?['form-only']:[]));
fs.mkdirSync(out, { recursive: true });
const report = { completed: false, origin, checks: [], errors: [], externalRequests: [], limitations: ['Synthetic adapter integration only, not Firebase/Auth/backend SIT', 'Automated acceptance checks are not human UAT or physical Safari/iPhone/scanner testing'] };
async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: process.argv[3] });
  report.browserVersion = browser.version();let page, activePage;
  const context = async options => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block', ...options });
    await ctx.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin === origin || ['data:', 'blob:'].includes(url.protocol)) return route.continue();
      report.externalRequests.push(url.origin);return route.abort();
    });return ctx;
  };
  const open = async (p, route) => {
    p.on('pageerror', error => report.errors.push(error.message));
    assert.equal((await p.goto(origin + route, { timeout: 90000 })).status(), 200);
    await p.waitForFunction(() => document.documentElement.dataset.uiReady === 'true');
  };
  const test = async (name, fn) => { if(formOnly&&!name.startsWith('Grouped form footer')) return;await fn();report.checks.push({ name, status: 'passed' });console.log('PASS ' + name); };
  const dialog = () => page.locator('dialog[open]');
  const nav = async (href, target) => { const link=page.locator(`.ui-sidebar a.ui-sidebar-link[href="${href}"]`);if (!(await link.isVisible())) await page.locator(".ui-tools-disclosure").click();await link.click();await page.waitForURL('**' + target);await page.locator('h1').waitFor(); };
  const role = async value => {
    await page.locator('.resource-test-controls summary').click();await page.getByLabel('บทบาทตัวอย่าง', { exact: true }).selectOption(value);
  };
  const shot = async (p, name) => {
    const buffer = await p.screenshot({ fullPage: !(await p.locator('dialog[open]').count()) });
    const target = path.join(out, name + '.png');
    for (let attempt = 0; ; attempt++) {
      try { fs.writeFileSync(target, buffer);return; }
      catch (error) { if (attempt === 3) throw error;await new Promise(resolve => setTimeout(resolve, 250)); }
    }
  };
  const bounds = async p => {
    const result = await p.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, controls: [...document.querySelectorAll('dialog[open] input, dialog[open] select')].filter(e => e.getClientRects().length).map(e => ({ size: parseFloat(getComputedStyle(e).fontSize), right: e.getBoundingClientRect().right, left: e.getBoundingClientRect().left })) }));
    assert.ok(result.scroll <= result.width + 1, JSON.stringify(result));
    for (const item of result.controls) { assert.ok(item.left >= 0 && item.right <= result.width + 1);assert.ok(item.size >= 16); }
  };
  try {
    const ctx = await context();page = await ctx.newPage();await open(page, '/dev/equipment');
    await test('Staff registry is restricted; Admin can add and validation focuses duplicate asset code', async () => {
      assert.equal(await page.getByRole('heading', { name: 'หน้านี้สำหรับผู้ดูแล' }).count(), 1);
      assert.equal(await page.getByRole('button', { name: 'เพิ่มอุปกรณ์', exact: true }).count(), 0);
      await role('admin');await page.getByRole('button', { name: 'เพิ่มอุปกรณ์', exact: true }).click();
      await dialog().getByLabel('ชื่ออุปกรณ์', { exact: true }).fill('หูฟังทดสอบ QC');await dialog().getByLabel('รหัสอุปกรณ์', { exact: true }).fill('demo-h1');
      await dialog().getByRole('button', { name: 'เพิ่มอุปกรณ์', exact: true }).click();
      assert.match(await dialog().getByRole('alert').innerText(), /ทะเบียนแล้ว/);assert.equal(await page.evaluate(() => document.activeElement.name), 'assetCode');
      await dialog().getByLabel('รหัสอุปกรณ์', { exact: true }).fill('QC-NEW');await dialog().locator('.equipment-advanced summary').click();await dialog().getByLabel('บาร์โค้ด (ถ้ามี)', { exact: true }).fill('QC-BAR');
      await dialog().getByLabel('สภาพล่าสุดที่ทราบ', { exact: true }).selectOption('normal');await shot(page, 'registry-add-desktop');
      await page.keyboard.press('Escape');await page.getByRole('button', { name: 'จำลองบันทึกไม่สำเร็จครั้งถัดไป' }).click();
      await page.getByRole('button', { name: 'เพิ่มอุปกรณ์', exact: true }).click();
      await dialog().getByLabel('ชื่ออุปกรณ์', { exact: true }).fill('หูฟังทดสอบ QC');await dialog().getByLabel('รหัสอุปกรณ์', { exact: true }).fill('QC-NEW');
      await dialog().locator('.equipment-advanced summary').click();await dialog().getByLabel('บาร์โค้ด (ถ้ามี)', { exact: true }).fill('QC-BAR');await dialog().getByLabel('สภาพล่าสุดที่ทราบ', { exact: true }).selectOption('normal');
      await dialog().getByRole('button', { name: 'เพิ่มอุปกรณ์', exact: true }).click();assert.match(await dialog().getByRole('alert').innerText(), /ไม่สำเร็จ/);
      assert.equal(await dialog().getByLabel('รหัสอุปกรณ์', { exact: true }).inputValue(), 'QC-NEW');
      await dialog().getByRole('button', { name: 'เพิ่มอุปกรณ์', exact: true }).click();await dialog().waitFor({ state: 'hidden' });
      assert.equal(await page.locator('.equipment-row').filter({ hasText: 'QC-NEW' }).count(), 1);await shot(page, 'registry-desktop-light');
    });
    await test('New equipment appears immediately in Quick Log; resources shares ASCII13 validation and borrower', async () => {
      await nav('/admin/record', '/dev/record');await page.locator('.record-quick-grid').getByRole('button', { name: 'ยืม / คืนหูฟัง' }).click();
      assert.equal(await dialog().getByRole('button', { name: /หูฟังทดสอบ QC/ }).count(), 1);await page.keyboard.press('Escape');
      await nav('/resources', '/dev/resources');await page.getByRole('button', { name: 'อุปกรณ์', exact: true }).click();
      await page.locator('.resource-card').filter({ hasText: 'QC-NEW' }).click();assert.equal(await dialog().count(),0);await page.getByRole('complementary',{name:'รายละเอียดทรัพยากร'}).getByRole('button',{name:'ยืมรายการนี้',exact:true}).click();await dialog().getByRole('button', { name: 'บันทึกยืม' }).click();
      assert.equal(await page.evaluate(() => document.activeElement.name), 'record-student');
      await dialog().locator('[name=record-student]').fill('๑๒๓๔๕๖๗๘๙๐๑๒๓');assert.equal(await dialog().locator('[name=record-student]').inputValue(), '');
      await dialog().locator('[name=record-student]').fill('0000000000000');await shot(page, 'borrow-desktop');
      await dialog().getByRole('button', { name: 'บันทึกยืม' }).click();await dialog().waitFor({ state: 'hidden' });
      assert.match(await page.locator('.resource-card').filter({ hasText: 'QC-NEW' }).innerText(), /กำลังยืม/);
    });
    await test('Rename/move keeps borrower and historical location; inactive loans can still return through Quick Log', async () => {
      await nav('/admin/equipment-items', '/dev/equipment');await page.locator('.equipment-row').filter({ hasText: 'QC-NEW' }).locator('.equipment-row-name').click();await page.getByRole('complementary', {name:'รายละเอียดอุปกรณ์'}).getByRole('button', {name:'แก้ไขทะเบียน',exact:true}).click();
      assert.equal(await dialog().getByLabel('ประเภทอุปกรณ์ในทะเบียน').isDisabled(), true);
      await dialog().getByLabel('ชื่ออุปกรณ์', { exact: true }).fill('หูฟังย้ายสังกัด QC');await dialog().getByLabel('สังกัดปัจจุบัน', { exact: true }).fill('Finn Space');
      await dialog().getByRole('button', { name: 'บันทึกการแก้ไข' }).click();await dialog().waitFor({ state: 'hidden' });
      await page.getByRole('complementary',{name:'รายละเอียดอุปกรณ์'}).getByLabel('แสดงในบันทึกด่วน QC-NEW', { exact: true }).uncheck();
      await nav('/admin/record', '/dev/record');await page.locator('.record-quick-grid').getByRole('button', { name: 'ยืม / คืนหูฟัง' }).click();
      await dialog().getByRole('button', { name: /หูฟังย้ายสังกัด QC/ }).click();assert.match(await dialog().innerText(), /Finn Space/);
      assert.equal(await dialog().locator('[name=record-student]').inputValue(), '0000000000000');assert.equal(await dialog().locator('[name=record-student]').getAttribute('readonly'), '');
      assert.equal(await dialog().getByLabel('สภาพตอนคืน', { exact: true }).inputValue(), 'unknown');await shot(page, 'moved-return-desktop');
      await dialog().getByRole('button', { name: 'บันทึกคืน' }).click();await dialog().waitFor({ state: 'hidden' });
      await page.locator('.record-quick-grid').getByRole('button', { name: 'ยืม / คืนหูฟัง' }).click();assert.equal(await dialog().getByRole('button', { name: /หูฟังย้ายสังกัด QC/ }).count(), 0);await page.keyboard.press('Escape');
    });
    await test('Usage reconciles counts, keeps current location distinct from event location and links exact asset history', async () => {
      await nav('/admin/equipment-health', '/dev/equipment/usage');
      await page.getByLabel('ผู้ปฏิบัติงานในข้อมูลอุปกรณ์').selectOption('fixture-b');assert.equal((await page.locator('[data-metric="ครั้งยืมที่บันทึก"]').innerText()).trim(),'0');assert.equal((await page.locator('[data-metric="กำลังยืมตอนนี้"]').innerText()).trim(),'1');await page.getByLabel('ผู้ปฏิบัติงานในข้อมูลอุปกรณ์').selectOption('all');
      await page.getByLabel('สังกัดปัจจุบัน', { exact: true }).selectOption('Finn Space');
      await page.locator('.equipment-usage-list button').filter({ hasText: 'QC-NEW' }).click();
      assert.match(await dialog().innerText(), /2 เหตุการณ์/);assert.match(await dialog().innerText(), /ขณะทำรายการ: ชั้น 3/);assert.match(await dialog().innerText(), /ขณะทำรายการ: Finn Space/);
      await dialog().getByRole('button', { name: 'เปิดประวัติงานของอุปกรณ์นี้' }).click();await page.waitForURL('**/dev/history?**');
      await page.getByTestId('history-asset-filter').waitFor();assert.match(await page.getByTestId('history-asset-filter').innerText(), /QC-NEW/);
      assert.equal(await page.locator('.history-row').count(), 2);await shot(page, 'asset-history-desktop');
      await nav('/admin/equipment-health', '/dev/equipment/usage');await page.getByRole('button', { name: 'สภาพตอนคืน', exact: true }).click();
      assert.equal((await page.locator('[data-metric="ยังไม่ระบุสภาพ"]').innerText()).trim(), '1');assert.equal((await page.locator('[data-metric="คืนสมบูรณ์"]').innerText()).trim(), '0');
      await page.getByLabel('สภาพที่บันทึกตอนคืน', { exact: true }).selectOption('damaged');assert.equal(await page.getByText('ไม่พบเหตุการณ์คืนตามช่วงวันที่และสภาพที่เลือก').count(), 1);
      await page.getByLabel('สภาพที่บันทึกตอนคืน', { exact: true }).selectOption('all');await shot(page, 'condition-desktop-light');
    });
    await test('Date presets and invalid custom ranges preserve the current range', async () => {
      await page.getByLabel('ช่วงข้อมูลอุปกรณ์').selectOption('fiscal');assert.match(await page.locator('.resource-result-count').innerText(), /2570/);
      await page.getByLabel('ช่วงข้อมูลอุปกรณ์').selectOption('custom');await dialog().getByLabel('จากวันที่').fill('2026-12-01');await dialog().getByLabel('ถึงวันที่').fill('2026-11-01');
      await dialog().getByRole('button', { name: 'ใช้ช่วงวันที่' }).click();assert.match(await dialog().getByRole('alert').innerText(), /ถูกต้อง/);await page.keyboard.press('Escape');
      assert.equal(await page.getByLabel('ช่วงข้อมูลอุปกรณ์').inputValue(), 'fiscal');await page.getByLabel('ช่วงข้อมูลอุปกรณ์').selectOption('week');
    });
    await test('Registry Undo restores metadata and active state without changing past event data', async () => {
      await nav('/admin/equipment-items', '/dev/equipment');await page.getByRole('complementary',{name:'รายละเอียดอุปกรณ์'}).getByLabel('แสดงในบันทึกด่วน QC-NEW', { exact: true }).check();
      await page.getByRole('region', { name: 'เลิกทำรายการล่าสุด' }).getByRole('button', { name: 'เลิกทำ', exact: true }).click();
      assert.equal(await page.getByRole('complementary',{name:'รายละเอียดอุปกรณ์'}).getByLabel('แสดงในบันทึกด่วน QC-NEW', { exact: true }).isChecked(), false);
      await page.locator('.equipment-row').filter({ hasText: 'QC-NEW' }).locator('.equipment-row-name').click();await page.getByRole('complementary', {name:'รายละเอียดอุปกรณ์'}).getByRole('button', {name:'แก้ไขทะเบียน',exact:true}).click();await dialog().getByLabel('สังกัดปัจจุบัน', { exact: true }).fill('สังกัดทดสอบ');
      await dialog().getByRole('button', { name: 'บันทึกการแก้ไข' }).click();await dialog().waitFor({ state: 'hidden' });
      await page.getByRole('region', { name: 'เลิกทำรายการล่าสุด' }).getByRole('button', { name: 'เลิกทำ', exact: true }).click();assert.match(await page.locator('.equipment-row').filter({ hasText: 'QC-NEW' }).innerText(), /Finn Space/);
    });
    await test('Room action creates shared worklog and Undo restores the status', async () => {
      await nav('/resources', '/dev/resources');await page.getByRole('button', { name: 'ห้องบริการ', exact: true }).click();const card = page.locator('[data-room="303"]');const before = await card.innerText();
      await card.click();assert.equal(await dialog().count(),0);await page.getByRole('complementary',{name:'รายละเอียดทรัพยากร'}).getByRole('button',{name:'เปิดห้อง',exact:true}).click();await dialog().getByRole('button', { name: 'เปิดห้อง', exact: true }).click();await dialog().waitFor({ state: 'hidden' });assert.match(await card.innerText(), /เปิดอยู่/);
      await page.getByRole('region', { name: 'เลิกทำรายการล่าสุด' }).getByRole('button', { name: 'เลิกทำ', exact: true }).click();assert.equal(await card.innerText(), before);await shot(page, 'resources-desktop-light');
      const boxes = await page.locator('.resource-room-grid').first().locator('button').evaluateAll(items => items.map(e => e.getBoundingClientRect().y));assert.equal(new Set(boxes).size, 4);assert.equal(await page.getByRole('complementary',{name:'รายละเอียดทรัพยากร'}).isVisible(),true);
    });
    await test('All three views and condition tab fit 375/390/430/768px in light/dark and 16px form inputs', async () => {
      for (const colorScheme of ['light', 'dark']) for (const width of [375, 390, 430, 768]) {
        const mobile = await context({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, colorScheme });const p = await mobile.newPage();activePage=p;console.log(`MOBILE ${width} ${colorScheme}`);await open(p, '/dev/resources');await bounds(p);
        if (width === 390) await shot(p, `resources-mobile-${colorScheme}`);
        await p.locator('[data-room="303"]').click();await bounds(p);await p.keyboard.press('Escape');
        await open(p, '/dev/equipment');await p.locator('.resource-test-controls summary').click();await p.getByLabel('บทบาทตัวอย่าง', { exact: true }).selectOption('admin');await bounds(p);
        await p.getByRole('button', { name: 'เพิ่มอุปกรณ์', exact: true }).click();await bounds(p);if (width === 390) await shot(p, `registry-form-mobile-${colorScheme}`);await p.keyboard.press('Escape');await p.locator('.equipment-row-name').first().click();await p.locator('dialog[open]').getByRole('button',{name:'แก้ไขทะเบียน',exact:true}).click();await bounds(p);await p.locator('dialog[open]').getByRole('button',{name:'บันทึกการแก้ไข',exact:true}).scrollIntoViewIfNeeded();assert.equal(await p.locator('dialog[open]').getByRole('button',{name:'บันทึกการแก้ไข',exact:true}).isVisible(),true);await p.keyboard.press('Escape');
        await open(p, '/dev/equipment/usage');await p.locator('.resource-test-controls summary').click();await p.getByLabel('บทบาทตัวอย่าง', { exact: true }).selectOption('admin');await bounds(p);if (width === 390) await shot(p, `usage-mobile-${colorScheme}`);
        await p.getByRole('button', { name: 'สภาพตอนคืน', exact: true }).click();await bounds(p);if (width === 390) await shot(p, `condition-mobile-${colorScheme}`);await mobile.close();
      }
    });
    await test('Reduced motion, solid materials and forced colors remain operable', async () => {
      const accessible = await context({ reducedMotion: 'reduce', forcedColors: 'active' });const p = await accessible.newPage();await open(p, '/dev/resources');await bounds(p);
      assert.equal(await p.locator('html').getAttribute('data-ui-motion'), 'reduce');await p.locator('[data-room="303"]').focus();await p.keyboard.press('Enter');assert.equal(await p.locator('dialog[open]').count(),0);await p.getByRole('complementary',{name:'รายละเอียดทรัพยากร'}).getByRole('button',{name:'เปิดห้อง',exact:true}).focus();await p.keyboard.press('Enter');await p.locator('dialog[open]').waitFor();await p.keyboard.press('Escape');
      await p.evaluate(() => { document.documentElement.dataset.uiMaterial = 'solid'; });await shot(p, 'resources-forced-colors');await accessible.close();
    });
    await test('Mobile selection labels stay above the lens in loading and active phases with sufficient selected contrast', async () => {
      const samples = [];
      for (const colorScheme of ['light','dark']) {
        const mobile = await context({ viewport:{width:390,height:844},isMobile:true,hasTouch:true,colorScheme });const p=await mobile.newPage();activePage=p;await open(p,'/dev/resources');
        for (const active of ['false','true']) {
          const state=await p.locator('.ui-mobile-nav').evaluate((nav,active) => {
            nav.querySelector('.ui-optical-layer').dataset.active=active;
            const current=nav.querySelector('a[aria-current]'),lens=nav.querySelector('.ui-glass-indicator'),style=getComputedStyle(current),indicator=getComputedStyle(lens),root=getComputedStyle(document.documentElement);
            return {color:style.color,opacity:style.opacity,labelZ:Number(style.zIndex),lensZ:Number(indicator.zIndex),surface:root.getPropertyValue('--ui-surface').trim(),label:current.textContent,active};
          },active);
          assert.ok(state.labelZ>state.lensZ,JSON.stringify(state));assert.equal(state.opacity,'1');
          const rgb=text=>text.match(/\d+(?:\.\d+)?/g).slice(0,3).map(Number),hex=text=>text.length===4?[...text.slice(1)].map(c=>parseInt(c+c,16)):text.slice(1).match(/../g).map(c=>parseInt(c,16));
          const lum=channels=>channels.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);
          const ink=lum(rgb(state.color)),background=lum(hex(state.surface));state.contrast=(Math.max(ink,background)+.05)/(Math.min(ink,background)+.05);assert.ok(state.contrast>=4.5,JSON.stringify(state));samples.push({...state,colorScheme});
        }
        await shot(p,'navigation-'+colorScheme);await mobile.close();
      }
      report.selectionContrast=samples;
    });
    await test('Room list, inspector, resource dialog and Quick Log share one status meaning',async()=>{
      await nav('/resources','/dev/resources');await page.getByRole('button',{name:'ห้องบริการ',exact:true}).click();
      for (const id of ['303','304']) {
        const row=page.locator('[data-room="'+id+'"]');const expected=await row.locator('.record-badge').getAttribute('data-tone'),label=await row.locator('.record-badge').innerText();
        await row.click();assert.equal(await dialog().count(),0);await page.getByRole('complementary',{name:'รายละเอียดทรัพยากร'}).getByRole('button',{name:label==='เปิดอยู่'?'ปิดห้อง':'เปิดห้อง',exact:true}).click();assert.equal(await dialog().locator('.record-badge').getAttribute('data-tone'),expected);assert.equal(await dialog().locator('.record-badge').innerText(),label);await page.keyboard.press('Escape');
        assert.equal(await page.getByRole('complementary',{name:'รายละเอียดทรัพยากร'}).locator('.record-badge').getAttribute('data-tone'),expected);
        await nav('/admin/record','/dev/record');await page.locator('.record-quick-grid').getByRole('button',{name:/ห้องแลกเปลี่ยนความรู้/}).click();
        assert.equal(await dialog().locator('.record-resource-tile').filter({hasText:'ห้อง '+id}).locator('.record-badge').getAttribute('data-tone'),expected);await page.keyboard.press('Escape');await nav('/resources','/dev/resources');
      }
    });
    await test('Mobile filters collapse without resetting choices; first metrics appear before 500px',async()=>{
      const mobile=await context({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await mobile.newPage();activePage=p;await open(p,'/dev/equipment/usage');await p.locator('.resource-test-controls summary').click();await p.getByLabel('บทบาทตัวอย่าง',{exact:true}).selectOption('admin');
      const buttons=await p.locator('.resource-analysis-controls .ui-glass-controls>button').evaluateAll(items=>items.map(e=>({height:e.offsetHeight,nowrap:getComputedStyle(e).whiteSpace})));assert.ok(buttons.every(item=>item.height<=48&&item.nowrap==='nowrap'));
      const filters=p.locator('.resource-more-filters');assert.equal(await filters.getAttribute('open'),null);const top=await p.locator('.equipment-metrics').first().evaluate(el=>el.getBoundingClientRect().top+scrollY);report.mobileMetricsTop=top;assert.ok(top<500,String(top));
      await filters.locator('summary').click();await p.getByLabel('สังกัดปัจจุบัน',{exact:true}).selectOption('Finn Space');await filters.locator('summary').click();assert.equal(await filters.getByLabel('สังกัดปัจจุบัน',{exact:true}).isVisible(),false);assert.match(await filters.locator('summary').innerText(),/1/);
      await filters.locator('summary').click();assert.equal(await p.getByLabel('สังกัดปัจจุบัน',{exact:true}).inputValue(),'Finn Space');await filters.locator('summary').click();await shot(p,'usage-filters-mobile');await mobile.close();
    });
    await test('Grouped form footer remains visible while body scrolls, validates advanced fields and preserves cancellation',async()=>{
      for (const width of [375,390,430,768]) {
        const mobile=await context({viewport:{width,height:700},isMobile:true,hasTouch:true});const p=await mobile.newPage();activePage=p;await open(p,'/dev/equipment');await p.locator('.resource-test-controls summary').click();await p.getByLabel('บทบาทตัวอย่าง',{exact:true}).selectOption('admin');const rows=await p.locator('.equipment-row').count();
        await p.getByRole('button',{name:'เพิ่มอุปกรณ์',exact:true}).click();const modal=p.locator('dialog[open]');assert.equal(await modal.locator('fieldset').count(),2);assert.equal(await modal.locator('.equipment-advanced').getAttribute('open'),null);
        const save=modal.getByRole('button',{name:'เพิ่มอุปกรณ์',exact:true}),before=await save.boundingBox();assert.ok(before.y>=0&&before.y+before.height<=700);await modal.getByLabel('ชื่ออุปกรณ์',{exact:true}).fill('ตัวอย่างฟอร์ม');await modal.getByLabel('รหัสอุปกรณ์',{exact:true}).fill('FORM-'+width);await modal.locator('.equipment-advanced summary').click();await modal.getByLabel('ลำดับแสดงผล',{exact:true}).fill('-1');await modal.locator('.equipment-advanced summary').click();await save.click();
        await p.waitForFunction(()=>document.activeElement?.name==='order');const errorBox=await modal.getByRole('alert').boundingBox();assert.ok(errorBox&&errorBox.y>=0&&errorBox.y+errorBox.height<=700);assert.match(await modal.getByRole('alert').innerText(),/ลำดับ/);assert.notEqual(await modal.locator('.equipment-advanced').getAttribute('open'),null);await modal.locator('.equipment-advanced').evaluate(el=>el.scrollIntoView({block:'end'}));
        const after=await save.boundingBox();assert.ok(Math.abs(after.y-before.y)<2);await bounds(p);if(width===390)await shot(p,'form-footer-mobile');await modal.getByRole('button',{name:'ยกเลิก',exact:true}).click();assert.equal(await p.locator('.equipment-row').count(),rows);await mobile.close();
      }
    });
    assert.deepEqual(report.errors, []);assert.deepEqual(report.externalRequests, []);report.completed = true;
  } catch (error) { report.failure = error.stack;if ((activePage || page) && !(activePage || page).isClosed()) await shot(activePage || page, 'failure').catch(() => {});throw error; }
  finally { fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));await browser.close(); }
}
main().catch(error => { console.error(error);process.exitCode = 1; });
