/* Verify the isolated R07 UI with the existing browser runtime. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.argv[2]);
const out=path.resolve(__dirname,'../../../../output/playwright/ux-phase1/revision7');fs.mkdirSync(out,{recursive:true});
const results=[],errors=[];
async function main(){
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]});
 const page=await browser.newPage({viewport:{width:1440,height:1050}});page.setDefaultTimeout(10000);
 page.on('pageerror',e=>errors.push(e.message));
 const visit=async route=>{await page.goto('http://127.0.0.1:4197/#/'+route);await page.waitForFunction(()=>document.documentElement.dataset.reviewReady==='7');await settle();};
 const settle=()=>page.waitForFunction(()=>document.documentElement.dataset.motionReady==='true'&&document.getAnimations().every(a=>a.playState!=='running'));
 const act=name=>page.locator(`[data-action="${name}"]:visible`).first();
 const test=async(name,fn)=>{await fn();results.push({name,status:'passed'});console.log('PASS '+name);};
 try{
  await visit('record');const routes=await page.evaluate(()=>window.designReview.routes);
  if(!process.argv.includes('--interactions'))for(const [device,theme,width,height]of [['desktop','light',1440,1050],['desktop','dark',1440,1050],['mobile','light',390,844],['mobile','dark',390,844]]){
   await page.setViewportSize({width,height});
   for(const route of routes){await visit(route.id);await page.evaluate(t=>window.designReview.setTheme(t),theme);await settle();assert.ok(await page.locator('h1').count());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route.id+' overflow');await page.screenshot({path:path.join(out,`${route.id}-${device}-${theme}.png`),fullPage:true});}
   results.push({name:`30 views ${device}/${theme}`,status:'passed'});console.log('RENDER '+device+'/'+theme);
  }
  await page.setViewportSize({width:1440,height:1050});await page.goto('about:blank');await visit('record');
  await test('Sidebar disclosure and collapse preserve access to every role-aware destination',async()=>{
   assert.equal(await page.locator('#app-sidebar a[href="#/equipment"]').count(),0);await act('management7').click();assert.ok(await page.locator('#app-sidebar a[href="#/equipment"]').isVisible());await act('sidebar7').click();assert.equal(await page.locator('#app-sidebar').isVisible(),false);await act('sidebar7').click();assert.ok(await page.locator('#app-sidebar').isVisible());
  });
  await test('A room tap writes once, immediately closes the sheet, and offers persistent Undo',async()=>{
   const before=await page.evaluate(()=>({count:state.logs.length,inUse:f4.rooms.find(r=>r.floor==='3').inUse}));
   await page.locator('[data-action="template-run"][data-id="TPL-0"]').click();assert.ok(await act('room-instant7').isVisible());await act('room-instant7').click();await settle();
   const after=await page.evaluate(()=>({count:state.logs.length,inUse:f4.rooms.find(r=>r.floor==='3').inUse}));assert.equal(after.count,before.count+1);assert.equal(after.inUse,!before.inUse);assert.equal(await page.locator('#sheet').evaluate(d=>d.open),false);
   await page.waitForTimeout(4600);assert.ok(await act('undo-room7').isVisible());await act('undo-room7').click();assert.equal(await page.evaluate(()=>state.logs.length),before.count);assert.equal(await page.evaluate(()=>f4.rooms.find(r=>r.floor==='3').inUse),before.inUse);
  });
  await test('An intervening room update prevents Undo from overwriting newer state',async()=>{
   await page.locator('[data-action="template-run"][data-id="TPL-0"]').click();await act('room-instant7').click();
   const before=await page.evaluate(()=>{const u=ui7.undo.at(-1),r=f4.rooms.find(r=>r.id===u.room);r.reviewVersion7++;return {count:state.logs.length,value:r.inUse};});
   await act('undo-room7').click();assert.match(await page.locator('#toast').innerText(),/เปลี่ยนแปลงต่อ/);assert.equal(await page.evaluate(()=>state.logs.length),before.count);
  });
  await test('Offline room actions do not write or dismiss the picker',async()=>{
   await page.evaluate(()=>state.view='offline');const before=await page.evaluate(()=>state.logs.length);await page.locator('[data-action="template-run"][data-id="TPL-0"]').click();await act('room-instant7').click();assert.equal(await page.evaluate(()=>state.logs.length),before);assert.ok(await page.locator('#sheet').evaluate(d=>d.open));await page.keyboard.press('Escape');await page.evaluate(()=>state.view='normal');
  });
  await test('Manual input and keyboard segmented selection retain their focus',async()=>{
   await visit('record');await page.locator('[data-group="record-mode"][data-value="manual"]').click();assert.ok(await page.locator('[name="manual-recipient"]').isVisible());await page.locator('[name="manual-recipient"]').fill('ผู้รับบริการตัวอย่าง');await page.locator('[data-group="record-mode"][data-value="manual"]').focus();await page.keyboard.press('Home');assert.equal(await page.evaluate(()=>document.activeElement.dataset.value),'quick');
  });
  await test('Mobile has four stable destinations and secondary tools via account/search',async()=>{
   await page.setViewportSize({width:390,height:844});await visit('record');assert.equal(await page.locator('#mobile-nav .nav-item').count(),4);await act('account7').click();assert.ok(await page.locator('#sheet a[href="#/worklogs"]').isVisible());await page.keyboard.press('Escape');
   for(const button of await page.locator('#app-header .icon-btn:visible').all()){const r=await button.boundingBox();assert.ok(r.width>=44&&r.height>=44,'header touch target');}
  });
  await test('Symbol feedback is finite and Reduce Motion cancels active feedback',async()=>{
   await page.setViewportSize({width:1440,height:1050});await visit('record');await page.locator('.quick-card').first().hover();await page.waitForFunction(()=>document.querySelector('.quick-card .icon').getAnimations().some(a=>a.playState==='running'));await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>window.motionReview.active===0);await act('account7').click();assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);await page.keyboard.press('Escape');await page.emulateMedia({reducedMotion:'no-preference'});
  });
  await test('Calendar Today and filters remain available after layout changes',async()=>{
   await visit('classrooms');await act('schedule-today7').click();assert.equal(await page.evaluate(()=>ui6.scheduleDate), '2026-11-05');await page.locator('[name="schedule-kind6"]').selectOption('dl');assert.ok(await page.locator('.week-event').count());
  });
  await test('Combo selection retains required recipient and writes only selected tasks',async()=>{
   await page.goto('about:blank');await visit('record');const before=await page.evaluate(()=>state.logs.length);await page.locator('[data-action="template-run"][data-id="TPL-3"]').click();await act('combo-none').click();await act('combo-review').click();assert.match(await page.locator('#combo-error').innerText(),/อย่างน้อย/);await page.locator('.combo-check').first().check();await page.locator('[name="combo-recipient"]').fill('ผู้รับบริการตัวอย่าง');await act('combo-review').click();await act('combo-save').click();assert.equal(await page.evaluate(()=>state.logs.length),before+1);
  });
  await test('Import still blocks unreviewed rows and separates the six real seed conflicts',async()=>{
   await page.goto('about:blank');await visit('imports');await act('load-import5').click();await act('sample-period5').click();await act('review-import5').click();await act('import-summary5').click();assert.ok(await act('confirm-import5').isDisabled());await act('import-review-back5').click();
   const rows=await page.evaluate(()=>window.designReview.getSummary().importRows.filter(r=>r.needsReview&&!r.reviewed));for(const row of rows){await page.locator(`.import-queue6 [data-action="import-row5"][data-id="${row.id}"]`).click();await act('save-import-row5').click();}await act('import-summary5').click();const counts=await page.evaluate(()=>window.designReview.getSummary().importCounts);assert.equal(counts.ready,19);assert.equal(counts.conflict,6);assert.ok(await act('confirm-import5').isDisabled());await page.locator('[name="import-ack-conflicts6"]').check();await act('confirm-import5').click();assert.equal(await page.evaluate(()=>window.designReview.getSummary().importResult.added),19);
  });
  await test('Text zoom reflows the main flows at narrow widths',async()=>{
   await page.setViewportSize({width:375,height:844});for(const route of ['record','worklogs','classrooms']){await visit(route);await page.evaluate(()=>document.documentElement.style.fontSize='24px');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route);await page.evaluate(()=>document.documentElement.style.fontSize='');}
  });
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,process.argv.includes('--interactions')?'interactions.json':'report.json'),JSON.stringify({results,errors,renderedViews:process.argv.includes('--interactions')?0:120,limitations:['Synthetic prototype only','Native Safari/iPhone/Android UAT pending','Custom web icon vectors; no SF asset distribution']},null,2));
 }catch(e){fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({message:e.stack,results,errors},null,2));await page.screenshot({path:path.join(out,'failure.png'),fullPage:true});throw e;}finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
