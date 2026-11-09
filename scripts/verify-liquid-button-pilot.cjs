/* Native browser tests of the installed, pinned library and the app adapter. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require(process.argv[2]);
const origin = process.argv[4] || 'http://127.0.0.1:4310';
const name = origin.includes('trycloudflare') ? 'public' : process.argv[3].includes('Chrome') ? 'chrome' : 'edge';
const out = path.resolve(__dirname, '../output/playwright/liquid-glass-button-pilot', name);
fs.mkdirSync(out, { recursive: true });
const report = { completed: false, cases: [], errors: [], httpErrors: [], contrast: [], productionDataUsed: false, realDeviceUAT: false };
let browser;
const region = p => p.getByRole('region', { name: 'เปรียบเทียบวัสดุปุ่ม A/B', exact: true });
const side = (p, kind) => region(p).getByRole('region', { name: kind === 'zak' ? 'B · Liquid Glass ใหม่' : 'A · QuickLiquid เดิม', exact: true });
const save = (p, kind) => side(p, kind).getByRole('button', { name: 'บันทึกตัวอย่าง', exact: true });
const modal = p => p.locator('dialog[open]');
async function context(options = {}, failModule = false) {
  const c = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block', ...options });
  c.setDefaultTimeout(30000);
  await c.addInitScript(() => { window.__pilotVibrations = 0; Object.defineProperty(navigator, 'vibrate', { configurable: true, value: () => { window.__pilotVibrations++; return true; } }); });
  await c.route('**/*', r => { const u = new URL(r.request().url()); if (failModule && u.pathname.includes('zakisheriff') && r.request().resourceType() === 'script') { report.simulatedModuleAborts = (report.simulatedModuleAborts || 0) + 1; return r.abort(); } return u.origin === origin || ['data:', 'blob:'].includes(u.protocol) ? r.continue() : r.abort(); });
  c.on('page', p => p.on('pageerror', e => report.errors.push(e.stack || e.message)));
  c.on('response', r => { if (new URL(r.url()).origin === origin && r.status() >= 400 && ['script','stylesheet','document'].includes(r.request().resourceType())) report.httpErrors.push({ path: new URL(r.url()).pathname, status: r.status() }); });
  return c;
}
async function open(p, ready = true) {
  assert.equal((await p.goto(origin + '/dev/ui', { timeout: 90000 })).status(), 200);
  await p.waitForFunction(() => document.documentElement.dataset.uiReady === 'true');
  if (ready) await p.getByTestId('button-material-ready').filter({hasText:'พร้อมเปรียบเทียบ'}).waitFor();
}
async function appearance(p) { await p.locator('.ui-header button[aria-label="บัญชีและเครื่องมือ"]').click(); await modal(p).getByRole('button', { name: 'รูปแบบการแสดงผล', exact: true }).click(); }
async function test(label, fn) { try { await fn(); report.cases.push({label,passed:true}); console.log('PASS '+label); } catch(e) { report.cases.push({label,passed:false,error:e.stack}); console.log('FAIL '+label+' '+e.message); } }
const lum = c => c.map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((s,v,i) => s + v * [.2126,.7152,.0722][i], 0);
const ratio = (a,b) => (Math.max(lum(a),lum(b)) + .05) / (Math.min(lum(a),lum(b)) + .05);
async function colors(b, label) {
  const s = await b.evaluate(el => {
    const css = getComputedStyle(el), canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const rgb = value => { ctx.clearRect(0,0,1,1); ctx.fillStyle = value; ctx.fillRect(0,0,1,1); return [...ctx.getImageData(0,0,1,1).data].slice(0,3); };
    return { text: rgb(css.color), fill: rgb(css.getPropertyValue('--ui-button-fill')), start: parseFloat(css.getPropertyValue('--ui-button-tint-start'))/100, end: parseFloat(css.getPropertyValue('--ui-button-tint-end'))/100, zak: el.dataset.buttonEngine === 'zak', prominent: el.dataset.kind === 'prominent' };
  });
  for (const alpha of [s.start,s.end]) for (const bg of [0,255]) {
    let backdrop = s.fill.map(v => v * alpha + bg * (1-alpha));
    // Bound the candidate's remaining highlight over the label region, including release.
    if (s.zak) { const bloom = s.prominent ? .03 * .35 : .22 * .35; backdrop = backdrop.map(v => v * (1-bloom) + 255 * bloom); }
    const value = ratio(s.text,backdrop); assert.ok(value >= 4.5, label + ' contrast=' + value); report.contrast.push({ label, alpha, bg, ratio: value });
  }
}
(async () => {
  browser = await chromium.launch({ executablePath: process.argv[3], headless: true }); report.browserVersion = browser.version();
  try {
    await test('Pinned candidate and QuickLiquid coexist; real native validation, submit, disabled and icon-only controls remain usable', async () => {
      const c = await context(), p = await c.newPage(); try {
        await open(p); assert.equal(await save(p,'zak').getAttribute('data-button-engine'),'zak'); assert.equal(await save(p,'quick').getAttribute('data-button-engine'),'quick');
        await save(p,'zak').click(); assert.equal(await side(p,'zak').getByLabel('ผู้รับบริการตัวอย่าง').evaluate(el => el === document.activeElement),true);
        assert.match(await p.getByTestId('button-material-counts').innerText(),/บันทึกตัวอย่าง 0 ครั้ง/);
        await side(p,'quick').getByLabel('ผู้รับบริการตัวอย่าง').fill('บริการสังเคราะห์'); assert.equal(await side(p,'zak').getByLabel('ผู้รับบริการตัวอย่าง').inputValue(),'บริการสังเคราะห์');
        await save(p,'quick').click(); await save(p,'zak').click(); assert.match(await p.getByTestId('button-material-counts').innerText(),/บันทึกตัวอย่าง 2 ครั้ง/);
        assert.equal(await side(p,'zak').getByRole('button',{name:'ยังไม่พร้อมบันทึก',exact:true}).isDisabled(),true);
        const icon = side(p,'zak').getByRole('button',{name:'เพิ่มรายการตัวอย่าง',exact:true}), box = await icon.boundingBox(); assert.ok(box.width >= 44 && box.height >= 44); assert.equal(await icon.getAttribute('data-icon-only'),'');
      } finally { await c.close(); }
    });
    await test('Desktop spring/lighting is active; release outside does not submit; Enter and Space trigger one native action', async () => {
      const c = await context(), p = await c.newPage(); try {
        await open(p); await side(p,'zak').getByLabel('ผู้รับบริการตัวอย่าง').fill('ตัวอย่าง'); const b=save(p,'zak'); await b.scrollIntoViewIfNeeded();
        await b.hover(); await p.mouse.down(); await p.waitForTimeout(150); const scale=await b.evaluate(el=>parseFloat(getComputedStyle(el).scale)); assert.ok(scale>1 && scale<1.2,'vendor spring not active: '+scale);
        await p.mouse.move(0,0); await p.mouse.up(); await p.waitForTimeout(900); assert.match(await p.getByTestId('button-material-counts').innerText(),/บันทึกตัวอย่าง 0 ครั้ง/);
        await p.keyboard.press('Tab'); await b.focus(); assert.equal(await b.evaluate(el=>el.matches(':focus-visible')),true); await p.keyboard.press('Enter'); await p.keyboard.press('Space'); assert.match(await p.getByTestId('button-material-counts').innerText(),/บันทึกตัวอย่าง 2 ครั้ง/);
      } finally { await c.close(); }
    });
    await test('Touch pan starting on a candidate button scrolls instead of submitting or vibrating; the adapter leaves native zoom policy enabled', async () => {
      const c=await context({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),p=await c.newPage(); try {
        await open(p); const b=save(p,'zak'); await b.scrollIntoViewIfNeeded(); const box=await b.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2; const cdp=await c.newCDPSession(p), before=await p.evaluate(()=>scrollY);
        assert.equal(await b.evaluate(el=>getComputedStyle(el).touchAction),'manipulation');
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
        for(let i=1;i<=6;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*22}]});await p.waitForTimeout(30);}
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await p.waitForTimeout(300);
        const after=await p.evaluate(()=>scrollY); assert.ok(after>before+45,'touch scroll was blocked'); report.touchScroll={before,after};
        assert.match(await p.getByTestId('button-material-counts').innerText(),/บันทึกตัวอย่าง 0 ครั้ง/); assert.equal(await p.evaluate(()=>window.__pilotVibrations),0); assert.equal(await b.getAttribute('data-ui-touch-pressed'),null);
        await b.scrollIntoViewIfNeeded(); const target=await b.boundingBox(); await cdp.send('Input.synthesizePinchGesture',{x:target.x+target.width/2,y:target.y+target.height/2,scaleFactor:1.4,relativeSpeed:600,gestureSourceType:'touch'}); await p.waitForTimeout(250);
        const candidateScale=await p.evaluate(()=>visualViewport.scale);await cdp.send('Input.synthesizePinchGesture',{x:330,y:100,scaleFactor:1.4,relativeSpeed:600,gestureSourceType:'touch'});await p.waitForTimeout(250);const baselineScale=await p.evaluate(()=>visualViewport.scale);const viewport=await p.locator('meta[name=viewport]').getAttribute('content');assert.ok(!/user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(?:\s|,|$)/i.test(viewport));assert.ok(candidateScale>1.15||baselineScale<=1.15,'Pinch works on baseline but is blocked on the candidate');report.pinch={candidateScale,baselineScale,gestureVerified:candidateScale>1.15,policyEnabled:true,limitation:candidateScale<=1.15?'Headless CDP did not zoom either target; physical phone gesture UAT remains pending':null};
      } finally { await c.close(); }
    });
    await test('Light/dark A/B and tinted role colors preserve 4.5 contrast including the candidate highlight; 375–1440px layouts fit', async () => {
      for(const colorScheme of ['light','dark']) for(const width of (name==='public'?[390,1440]:[375,390,430,768,1440])){
        const c=await context({colorScheme,viewport:{width,height:1000},isMobile:width<500,hasTouch:width<500}),p=await c.newPage();try{
          await open(p); assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
          for(const kind of ['quick','zak']) for(const text of ['บันทึกตัวอย่าง','ลบตัวอย่าง']) await colors(side(p,kind).getByRole('button',{name:text,exact:true}),colorScheme+'/'+kind+'/'+width);
          assert.equal(await side(p,'zak').getByLabel('ผู้รับบริการตัวอย่าง').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16||innerWidth>760),true);
          if([390,1440].includes(width)) await region(p).screenshot({path:path.join(out,'ab-'+width+'-'+colorScheme+'.png')});
        }finally{await c.close();}
      }
    });
    await test('App and OS motion/transparency preferences, forced colors and unsupported backdrop use the existing controls', async () => {
      for(const sample of ['motion','solid','forced','unsupported']){
        const c=await context(sample==='forced'?{forcedColors:'active'}:{}),p=await c.newPage();try{
          if(sample==='unsupported')await c.addInitScript(()=>{const original=CSS.supports.bind(CSS);CSS.supports=(...args)=>args.some(x=>String(x).includes('backdrop-filter'))?false:original(...args);});
          if(['motion','solid'].includes(sample))await c.addInitScript(s=>localStorage.setItem('labboy.appearance.v1',JSON.stringify(s==='motion'?{motion:'reduce'}:{material:'solid'})),sample);
          await open(p); assert.equal(await p.locator('.ui-zak-button').count(),0); await side(p,'zak').getByLabel('ผู้รับบริการตัวอย่าง').fill('fallback');await save(p,'zak').click(); assert.match(await p.getByTestId('button-material-counts').innerText(),/บันทึกตัวอย่าง 1 ครั้ง/);
        }finally{await c.close();}
      }
      const c=await context({reducedMotion:'reduce'}),p=await c.newPage();try{await open(p);assert.equal(await p.locator('.ui-zak-button').count(),0);}finally{await c.close();}
      const ios=await context({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'}),ip=await ios.newPage();try{await open(ip);assert.ok(await ip.locator('.ui-zak-button').count()>0);assert.equal(await ip.locator('svg feDisplacementMap').count(),0);await side(ip,'zak').getByLabel('ผู้รับบริการตัวอย่าง').fill('iOS policy');await save(ip,'zak').tap();assert.match(await ip.getByTestId('button-material-counts').innerText(),/บันทึกตัวอย่าง 1 ครั้ง/);assert.equal(await ip.evaluate(()=>window.__pilotVibrations),0);report.iosUserAgentPolicyOnly=true;}finally{await ios.close();}
    });
    await test('A failed candidate chunk keeps working baseline controls and can select QuickLiquid without a blocked form', async () => {
      const c=await context({},true),p=await c.newPage();try{
        await open(p,false); await p.getByTestId('button-material-ready').filter({hasText:'ใช้วัสดุเดิมชั่วคราว'}).waitFor(); assert.ok(report.simulatedModuleAborts>0); assert.equal(await p.locator('.ui-zak-button').count(),0);
        await region(p).getByRole('button',{name:'QuickLiquid เดิม',exact:true}).click(); await side(p,'zak').getByLabel('ผู้รับบริการตัวอย่าง').fill('fallback');await save(p,'zak').click();assert.match(await p.getByTestId('button-material-counts').innerText(),/บันทึกตัวอย่าง 1 ครั้ง/);
      }finally{await c.close();}
    });
    await test('The selected engine and record drafts survive Next navigation; actual Combo review/save stays opt-in and idempotent', async () => {
      const c=await context(),p=await c.newPage();try{
        await open(p);await region(p).getByRole('button',{name:'QuickLiquid เดิม',exact:true}).click();await side(p,'quick').getByLabel('ผู้รับบริการตัวอย่าง').fill('ร่างเปรียบเทียบ');
        await region(p).getByRole('button',{name:'ทดลองกับหน้าบันทึกงาน',exact:true}).click();await p.waitForURL('**/dev/record');await p.locator('.record-mode').getByRole('button',{name:'กรอกเอง',exact:true}).click();await p.locator('[name=record-manual-notes]').fill('ร่างหลังสลับวัสดุ');assert.equal(await p.locator('.ui-zak-button').count(),0);
        await p.goBack();await region(p).waitFor();assert.equal(await region(p).getByRole('button',{name:'QuickLiquid เดิม',exact:true}).getAttribute('aria-pressed'),'true');await region(p).getByRole('button',{name:'Liquid Glass ใหม่',exact:true}).click();await region(p).getByRole('button',{name:'ทดลองกับหน้าบันทึกงาน',exact:true}).click();await p.waitForURL('**/dev/record');assert.equal(await p.locator('[name=record-manual-notes]').inputValue(),'ร่างหลังสลับวัสดุ');
        await p.locator('.record-mode').getByRole('button',{name:'บันทึกด่วน',exact:true}).click();await p.locator('.record-quick-grid').getByRole('button',{name:/เปิดใช้บัญชี/}).click();assert.equal(await modal(p).locator('input[type=checkbox]:checked').count(),0);await modal(p).getByRole('checkbox').first().check();await modal(p).locator('[name=record-combo-recipient]').fill('บริการทดสอบ');await modal(p).getByRole('button',{name:'ตรวจ 1 รายการ',exact:true}).click();assert.equal(await modal(p).getByRole('button',{name:'บันทึก 1 รายการ',exact:true}).getAttribute('data-button-engine'),'zak');await modal(p).getByRole('button',{name:'บันทึก 1 รายการ',exact:true}).click();await modal(p).waitFor({state:'hidden'});
      }finally{await c.close();}
    });
    await test('Dialog cancel/delete focus is preserved and repeated opens do not leave pressed buttons or hidden haptic inputs', async () => {
      const c=await context(),p=await c.newPage();try{
        await open(p); const trigger=side(p,'zak').getByRole('button',{name:'ลบตัวอย่าง',exact:true});
        for(let i=0;i<5;i++){await trigger.click();assert.equal(await modal(p).getByRole('button',{name:'ยืนยันลบ',exact:true}).getAttribute('data-kind'),'destructive');await p.keyboard.press('Escape');assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);}
        await trigger.click();await modal(p).getByRole('button',{name:'ยืนยันลบ',exact:true}).click();assert.match(await p.getByTestId('button-material-counts').innerText(),/ลบตัวอย่าง 1 ครั้ง/);assert.equal(await p.locator('[data-ui-touch-pressed=true]').count(),0);assert.equal(await p.locator('label[aria-hidden=true] input[switch]').count(),0);
      }finally{await c.close();}
    });
    assert.equal(report.cases.length,8);assert.ok(report.cases.every(x=>x.passed),'Acceptance failed');assert.deepEqual(report.errors,[]);assert.deepEqual(report.httpErrors,[]);report.completed=true;
  }catch(e){report.failure=e.stack;throw e;}finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
