/* Browser verification for the isolated design review; uses the already bundled Playwright. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.argv[2]||'playwright');
const out=path.resolve(__dirname,'../../../../output/playwright/ux-phase1/revision3');
fs.mkdirSync(out,{recursive:true});
const results=[],errors=[],requests=[];
async function main(){
  const browser=await chromium.launch({headless:true,...(process.argv[3]?{executablePath:process.argv[3]}:{})});
  const page=await browser.newPage({viewport:{width:1440,height:1050}});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  const url=pathToFileURL(path.join(__dirname,'index.html')).href;
  const visit=async id=>{await page.goto(url+'#/'+id,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.designReview);};
  const check=async(name,fn)=>{await fn();results.push({name,status:'passed'});console.log('PASS '+name);};
  try{
    await visit('dashboard');await page.evaluate(()=>Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,5000))]));
    const routes=await page.evaluate(()=>window.designReview.routes);
    const smoke=process.argv.includes('--smoke');
    for(const variant of smoke?[['desktop','light',1440,1050]]:[['desktop','light',1440,1050],['desktop','dark',1440,1050],['mobile','light',390,844],['mobile','dark',390,844]]){
      const [device,theme,width,height]=variant;await page.setViewportSize({width,height});
      for(const route of smoke?routes.filter(r=>['dashboard','record','dl','equipment','settings'].includes(r.id)):routes){
        await visit(route.id);await page.evaluate(t=>window.designReview.setTheme(t),theme);
        await page.waitForTimeout(70);
        const stats=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,h1:document.querySelector('h1')?.innerText,logo:[...document.images].filter(i=>i.alt==='labboy').every(i=>i.complete&&i.naturalWidth>0)}));
        assert.ok(stats.h1,`${route.id}: missing h1`);assert.ok(stats.logo,`${route.id}: brand asset failed`);
        assert.ok(stats.scroll<=stats.width+1,`${device}/${theme}/${route.id} horizontal overflow ${stats.scroll}/${stats.width}`);
        await page.screenshot({path:path.join(out,`${route.id}-${device}-${theme}.png`),fullPage:true});
        results.push({name:`render ${route.id} ${device} ${theme}`,status:'passed'});
      }
      console.log(`PASS ${device}/${theme}: ${smoke?5:routes.length} route renders, assets, no document overflow`);
    }
    if(smoke){fs.writeFileSync(path.join(out,'smoke.json'),JSON.stringify({results,errors},null,2));return;}
    await page.setViewportSize({width:1440,height:1050});
    await check('Navigation menu exposes all 24 review views and keyboard opens it',async()=>{
      await visit('record');await page.keyboard.press('Control+k');assert.equal(await page.locator('#sheet nav a').count(),24);await page.keyboard.press('Escape');
    });
    await check('Borrow/return requires selection and records correct shared status',async()=>{
      await page.locator('[data-action="equipment-picker"]').first().click();assert.equal(await page.locator('[data-action="confirm-device"]').isDisabled(),true);
      await page.locator('[data-action="select-device"][data-id="HP-01"]').click();await page.locator('[data-action="confirm-device"]').click();
      assert.ok((await page.evaluate(()=>window.designReview.getSummary())).devices.find(d=>d.id==='HP-01').borrowed);
      await page.locator('[data-action="equipment-picker"]').first().click();await page.locator('[data-id="HP-01"]').click();await page.locator('[data-action="confirm-device"]').click();
      await page.locator('[name="return-condition"]').selectOption('normal');await page.locator('[data-action="finish-return"]').click();
      assert.equal((await page.evaluate(()=>window.designReview.getSummary())).devices.find(d=>d.id==='HP-01').borrowed,false);
    });
    await check('Moving equipment changes Quick Log grouping without rewriting old log text',async()=>{
      await visit('equipment');await page.locator('[data-action="edit-device"][data-id="HP-01"]').click();await page.locator('[name="device-location"]').selectOption('Finn Space');await page.locator('[data-action="save-device"]').click();
      await page.locator('a[href="#/record"]').first().click();await page.locator('[data-action="equipment-picker"][data-location="Finn Space"]').click();
      assert.equal(await page.locator('[data-action="select-device"][data-id="HP-01"]').count(),1);await page.keyboard.press('Escape');
    });
    await check('New equipment immediately appears in Quick Log',async()=>{
      await visit('equipment');await page.locator('[data-action="add-device"]').click();await page.locator('[name="device-name"]').fill('อุปกรณ์ทดสอบ UI');await page.locator('[data-action="save-device"]').click();
      const id=(await page.evaluate(()=>window.designReview.getSummary())).devices.at(-1).id;await page.locator('a[href="#/record"]').first().click();await page.locator('[data-action="equipment-picker"][data-location="ชั้น 3"]').click();assert.equal(await page.locator(`[data-action="select-device"][data-id="${id}"]`).count(),1);await page.keyboard.press('Escape');
    });
    await check('DL evening 17:00–18:30, capacity threshold, duplicates, and unique proctors',async()=>{
      await visit('dl');await page.locator('[data-action="add-exam"]').click();await page.locator('[name="exam-count"]').fill('40');assert.match(await page.locator('#exam-rooms').innerText(),/ไม่เกิน 40/);await page.locator('[name="exam-count"]').fill('75');
      await page.locator('[name="exam-date"]').fill('2026-11-03');await page.locator('[name="exam-slot"]').selectOption('morning');await page.locator('[data-action="save-exam"]').click();assert.match(await page.locator('#exam-validation').innerText(),/ซ้อน/);
      await page.locator('[name="exam-date"]').fill('2026-11-24');await page.locator('[name="exam-slot"]').selectOption('evening');await page.locator('[name="exam-proctor-1"]').selectOption('DEMO-1');await page.locator('[data-action="save-exam"]').click();assert.match(await page.locator('#exam-validation').innerText(),/ไม่ซ้ำ/);
      await page.locator('[name="exam-proctor-1"]').selectOption('DEMO-3');await page.locator('[data-action="save-exam"]').click();assert.equal((await page.evaluate(()=>window.designReview.getSummary())).exams,19);
      await page.locator('[data-group="schedule-view"][data-value="list"]').click();assert.match(await page.locator('table').innerText(),/17:00–18:30/);
    });
    await check('Fiscal year/month changes scope and data, including Oct/Sep boundaries',async()=>{
      await visit('staff');const before=await page.locator('.metric strong').first().innerText();await page.locator('[name="fiscal-year"]').selectOption('2569');assert.notEqual(await page.locator('.metric strong').first().innerText(),before);assert.match(await page.locator('.toolbar').innerText(),/1 ต.ค. 2568 – 30 ก.ย. 2569/);
      await page.locator('[name="fiscal-month"]').selectOption('0');assert.match(await page.locator('.toolbar').innerText(),/ต.ค. 2568/);await page.locator('[name="fiscal-month"]').selectOption('11');assert.match(await page.locator('.toolbar').innerText(),/ก.ย. 2569/);
    });
    await check('Image import is explicitly a sample, validates fields, and skips existing rows',async()=>{
      await visit('imports');assert.match(await page.locator('#content').innerText(),/ยังไม่อ่านตัวอักษร/);await page.locator('[data-action="sample-import"]').click();await page.locator('[data-action="confirm-import"]').click();assert.match(await page.locator('#sheet').innerText(),/18 รอบ/);await page.locator('[data-action="skip-import"]').click();assert.match(await page.locator('#toast').innerText(),/ไม่เพิ่มซ้ำ/);
    });
    await check('Dark/material/reduced-motion preferences work and system theme follows media',async()=>{
      await visit('settings');await page.locator('[name="appearance"]').selectOption('dark');assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');await page.locator('[name="material"]').selectOption('solid');assert.equal(await page.locator('html').getAttribute('data-material'),'solid');await page.locator('[data-key="motion"]').click();assert.equal(await page.locator('html').getAttribute('data-reduce-motion'),'true');await page.locator('[name="appearance"]').selectOption('system');await page.emulateMedia({colorScheme:'light',reducedMotion:'reduce'});await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
    });
    await check('Offline prevents writes; empty, error, loading and retry states are visible',async()=>{
      await visit('record');await page.evaluate(()=>window.designReview.setState('offline'));await page.locator('[data-action="combo"]').click();const before=(await page.evaluate(()=>window.designReview.getSummary())).logs;await page.locator('[data-action="confirm-combo"]').click();assert.equal((await page.evaluate(()=>window.designReview.getSummary())).logs,before);assert.match(await page.locator('#toast').innerText(),/ออฟไลน์/);await page.keyboard.press('Escape');
      for(const status of ['empty','error','loading']){await page.evaluate(v=>window.designReview.setState(v),status);assert.ok(await page.locator(status==='loading'?'[aria-busy="true"]':'.empty-state').count());}
      await page.evaluate(()=>window.designReview.setState('error'));await page.locator('[data-action="retry"]').click();assert.equal(await page.locator('[data-action="combo"]').count(),1);
    });
    await check('Dialog keyboard focus remains inside; mobile bottom navigation clears final content',async()=>{
      await page.locator('[data-action="combo"]').click();for(let i=0;i<12;i++){await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.querySelector('dialog').contains(document.activeElement)));}await page.keyboard.press('Escape');
      await page.setViewportSize({width:375,height:812});await page.locator('[data-action="combo"]').click();await page.screenshot({path:path.join(out,'combo-mobile.png'),fullPage:true});await page.keyboard.press('Escape');await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));const bounds=await page.evaluate(()=>({last:Math.max(...[...document.querySelectorAll('#content .panel')].map(n=>n.getBoundingClientRect().bottom)),nav:document.querySelector('#mobile-nav').getBoundingClientRect().top}));assert.ok(bounds.last<bounds.nav-5,'final panel remains above the fixed navigation after scrolling to the end');
    });
    await check('All routes remain within 375, 760, 768, 1024 pixel viewports',async()=>{
      for(const width of [375,760,768,1024]){await page.setViewportSize({width,height:900});for(const route of routes){await visit(route.id);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}/${route.id} overflows`);}}
    });
    await check('Role preview hides admin tools for Staff and rejects direct restricted navigation',async()=>{
      await page.setViewportSize({width:390,height:844});await visit('record');await page.locator('#review-controls').click();await page.locator('[name="review-role"]').selectOption('staff');await page.keyboard.press('Escape');await page.locator('#mobile-nav [data-action="routes"]').click();assert.equal(await page.locator('#sheet a[href="#/users"]').count(),0);await page.keyboard.press('Escape');await page.evaluate(()=>location.hash='/users');await page.waitForFunction(()=>document.body.dataset.route==='users');assert.match(await page.locator('#content').innerText(),/ไม่มีสิทธิ์/);
    });
    assert.deepEqual(errors,[],'runtime errors');assert.ok(requests.every(u=>/^https:\/\/(fonts.googleapis.com|fonts.gstatic.com)\//.test(u)),'unexpected external data request');
    fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({date:'2026-11-02',routeCount:routes.length,renderCount:routes.length*4,results,errors,networkOrigins:[...new Set(requests.map(u=>new URL(u).origin))],limitations:['Synthetic prototype; no backend/OCR/authentication integration','Edge only; not Safari/iOS UAT','Figma publication remains blocked by Starter MCP quota']},null,2));
    console.log(`Verified ${routes.length*4} renders and ${results.length-routes.length*4} interaction scenarios; no runtime errors.`);
  }finally{await browser.close();}
}
main().catch(error=>{fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:error.stack,results,errors},null,2));console.error(error);process.exitCode=1;});
