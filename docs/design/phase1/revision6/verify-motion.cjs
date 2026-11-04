/* Exercise rendered motion, interruption, accessibility, optics and new review flows. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium,webkit}=require(process.argv[2]||'playwright');
const output=path.resolve(__dirname,'../../../../output/playwright/ux-phase1/revision6');fs.mkdirSync(output,{recursive:true});
const results=[],errors=[],requests=[];
async function main(){
 const browser=await chromium.launch({headless:true,...(process.argv[3]?{executablePath:process.argv[3]}:{})});
 const page=await browser.newPage({viewport:{width:1440,height:1050}});page.setDefaultTimeout(10000);
 page.on('pageerror',e=>errors.push(e.stack));page.on('request',r=>{if(r.url().startsWith('http'))requests.push(r.url());});
 const loc=name=>page.locator(`[name="${name}"]`),act=name=>page.locator(`[data-action="${name}"]`).first(),click=name=>act(name).click();
 const settle=()=>page.waitForFunction(()=>document.documentElement.dataset.motionReady==='true'&&document.getAnimations().every(a=>a.playState!=='running'||a.effect.getTiming().iterations===Infinity));
 const visit=async route=>{await page.goto('about:blank');await page.goto('http://127.0.0.1:4196/#/'+route);await page.waitForFunction(()=>document.documentElement.dataset.reviewReady==='6');await settle();};
 const summary=()=>page.evaluate(()=>window.designReview.getSummary());
 const seg=(group,value)=>page.locator(`[data-group="${group}"][data-value="${value}"]`).click();
 const go=async route=>{await page.evaluate(route=>location.hash='/'+route,route);await page.waitForFunction(route=>document.body.dataset.route===route,route);await settle();};
 const check=async(name,fn)=>{await fn();results.push({name,status:'passed'});console.log('PASS '+name);};
 const openImport=async type=>{await visit('imports');if(type)await loc('import-type5').selectOption(type);await click('load-import5');await click('sample-period5');await click('review-import5');await settle();};
 const reviewRows=async()=>{for(const r of (await summary()).importRows.filter(r=>r.needsReview&&!r.reviewed)){await page.locator(`.import-queue6 [data-action="import-row5"][data-id="${r.id}"]`).click();await click('save-import-row5');}};
 try{
  await check('Optical rim changes rendered pixels, rather than only declaring a filter',async()=>{
   await visit('record');assert.equal(await page.locator('#app-header').getAttribute('data-optics'),'rim-refraction');assert.equal(await page.evaluate(()=>document.styleSheets[0].cssRules[0].selectorText),':root','sanitizing the font import must preserve the base stylesheet');
   const rect=await page.locator('#app-header').boundingBox();
   await page.evaluate(rect=>{const pattern=document.createElement('div');pattern.id='material-test-pattern';pattern.setAttribute('aria-hidden','true');pattern.style.cssText=`position:fixed;left:${rect.x}px;top:${rect.y}px;width:${rect.width}px;height:${rect.height}px;z-index:0;background:repeating-linear-gradient(135deg,#72b4d8 0 8px,#fbfeff 8px 16px)`;document.body.append(pattern);},rect);
   await settle();const a=await page.screenshot({clip:rect}),stable=await page.screenshot({clip:rect});assert.ok(a.equals(stable),'material must be stationary at rest');
   await page.locator('#app-header').evaluate(el=>el.style.setProperty('--optical-filter','blur(0px)'));
   const frosted=await page.screenshot({clip:rect});assert.ok(!a.equals(frosted),'rim filter must change painted output');
   await page.screenshot({path:path.join(output,'optics-fallback-test.png'),clip:rect});
   await page.evaluate(()=>document.querySelector('#material-test-pattern').remove());await go('design');
  });
  await check('Selection lens moves continuously and reaches the selected control after rapid input',async()=>{
   await visit('record');const before=await page.locator('.record-meta .selection-lens').boundingBox();await seg('record-mode','manual');
   await page.waitForFunction(()=>[...document.querySelectorAll('.selection-lens')].some(el=>el.getAnimations().some(a=>a.playState==='running')));
   await page.waitForTimeout(65);const middle=await page.locator('.record-meta .selection-lens').boundingBox(),target=await page.locator('[data-group="record-mode"][data-value="manual"]').boundingBox();assert.ok(middle.x>before.x+2&&middle.x<target.x-1,'selection should have a visible intermediate position');
   for(let i=0;i<8;i++)await seg('record-mode',i%2?'manual':'quick');await settle();assert.ok(await loc('manual-date').isVisible());
   const lens=await page.locator('.record-meta .selection-lens').boundingBox(),active=await page.locator('[data-group="record-mode"][aria-pressed="true"]').boundingBox();assert.ok(Math.abs(lens.x-active.x)<1&&Math.abs(lens.width-active.width)<1);assert.equal(await page.locator('.record-meta .selection-lens').count(),1);assert.equal(await page.evaluate(()=>document.activeElement.dataset.value),'manual');await page.keyboard.press('Home');assert.equal(await page.evaluate(()=>document.activeElement.dataset.value),'quick');await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>document.activeElement.dataset.value),'manual');assert.ok(await loc('manual-date').isVisible());
  });
  await check('Page changes animate once while the destination is immediately usable',async()=>{
   await visit('record');await page.locator('#app-sidebar a[href="#/classrooms"]').click();await page.waitForFunction(()=>document.body.dataset.route==='classrooms');
   await page.waitForFunction(()=>document.querySelector('.page-heading')?.getAnimations().some(a=>a.playState==='running'));
   assert.ok(await act('new-schedule6').isEnabled());await settle();assert.equal(await page.locator('#content h1').innerText(),'ตารางและการใช้ห้อง');
  });
  await check('Desktop menu grows beside its opener and dismisses without a stale input blocker',async()=>{
   await visit('record');const opener=await act('notifications').boundingBox();await click('notifications');await settle();assert.equal(await page.locator('#sheet').getAttribute('data-motion'),'anchored-menu');
   const menu=await page.locator('#sheet').boundingBox();assert.ok(Math.abs(menu.x+menu.width-opener.x-opener.width)<3);assert.ok(menu.y>=opener.y+opener.height+8);
   await page.keyboard.press('Escape');assert.equal(await page.locator('#sheet').evaluate(el=>el.open),false);assert.ok(await act('notifications').isEnabled());
   await click('appearance');await settle();assert.equal(await page.locator('dialog[open]').count(),1);assert.equal(await page.locator('.closing-dialog6').count(),0);await page.keyboard.press('Escape');await settle();assert.equal(await page.locator('.closing-dialog6,.closing-backdrop6').count(),0);
  });
  await check('Mobile sheet settles above the safe inset and returns focus to the original tile',async()=>{
   await page.setViewportSize({width:390,height:844});await visit('record');await page.locator('[data-action="template-run"][data-id="TPL-3"]').click();await settle();
   assert.equal(await page.locator('#sheet').getAttribute('data-motion'),'bottom-sheet');const rect=await page.locator('#sheet').boundingBox();assert.ok(Math.abs(rect.y+rect.height-836)<2);
   for(let i=0;i<15;i++){await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.querySelector('#sheet').contains(document.activeElement)));}
   await page.screenshot({path:path.join(output,'motion-sheet-mobile-light.png'),fullPage:false});await page.keyboard.press('Escape');await page.waitForFunction(()=>document.activeElement?.dataset.id==='TPL-3');await settle();assert.equal(await page.locator('.closing-dialog6').count(),0);
  });
  await check('OS Reduce Motion cancels an in-flight transition without closing or disabling the sheet',async()=>{
   await visit('record');await page.locator('[data-action="template-run"][data-id="TPL-3"]').click();await page.waitForFunction(()=>document.querySelector('#sheet').getAnimations().some(a=>a.playState==='running'));
   await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>window.motionReview.reduced&&window.motionReview.active===0);assert.ok(await page.locator('#sheet').isVisible());
   await page.keyboard.press('Escape');await go('classrooms');await click('new-schedule6');assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);await page.keyboard.press('Escape');await page.emulateMedia({reducedMotion:'no-preference'});
  });
  await check('App Reduce Motion is respected by controls, routes, dialogs and toast',async()=>{
   await visit('design');await page.getByRole('switch',{name:'ลดการเคลื่อนไหว',exact:true}).click();await page.waitForFunction(()=>window.motionReview.reduced);await click('motion-dialog6');await settle();assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);await page.keyboard.press('Escape');await click('motion-toast6');await settle();assert.equal(await page.evaluate(()=>window.motionReview.active),0);await go('record');await seg('record-mode','manual');await settle();assert.equal(await page.locator('.record-meta .selection-lens').evaluate(el=>getComputedStyle(el).transform),'none');
  });
  await check('Solid material removes optical and backdrop filters while preserving the controls',async()=>{
   await visit('design');await loc('material').selectOption('solid');await settle();assert.equal(await page.locator('#app-header').evaluate(el=>getComputedStyle(el).backdropFilter),'none');await click('motion-dialog6');assert.ok(await page.locator('#sheet').isVisible());await page.keyboard.press('Escape');await loc('material').selectOption('regular');await settle();assert.notEqual(await page.locator('#app-header').evaluate(el=>getComputedStyle(el).backdropFilter),'none');
  });
  await check('Every fiscal month sums to the KPI and zero-series chart coordinates stay finite',async()=>{
   await page.setViewportSize({width:1440,height:1050});await visit('dashboard');await loc('fiscal-year').selectOption('2569');
   for(let month=0;month<12;month++){await loc('fiscal-month').selectOption(String(month));assert.equal(await page.locator('.metric strong').first().innerText(),'8');assert.equal(await page.locator('svg.chart').getAttribute('data-total'),'8');assert.ok(!/NaN|Infinity/.test(await page.locator('svg.chart polyline').getAttribute('points')));}
   const zero=await page.evaluate(()=>new DOMParser().parseFromString(lineChart(Array(12).fill(0),months),'text/html').querySelector('polyline').getAttribute('points'));assert.ok(!/NaN|Infinity/.test(zero));
   await loc('fiscal-year').selectOption('2570');await loc('fiscal-month').selectOption('all');assert.equal(await page.locator('svg.chart').getAttribute('data-total'),'19');assert.equal(await page.locator('svg.chart circle').count(),2);
  });
  await check('Sunday classes remain visible in both week and agenda and time collisions cross event types',async()=>{
   await visit('classrooms');await click('new-schedule6');await click('add-class');await loc('class-day').selectOption('อาทิตย์');await loc('class-subject').fill('กิจกรรมวันอาทิตย์ตัวอย่าง');await click('save-class4');await settle();assert.match(await page.locator('.week-grid').innerText(),/อาทิตย์/);assert.ok(await page.locator('.week-event').filter({hasText:'กิจกรรมวันอาทิตย์ตัวอย่าง'}).isVisible());
   await seg('schedule-mode6','agenda');assert.ok(await page.locator('.schedule-event-row').filter({hasText:'กิจกรรมวันอาทิตย์ตัวอย่าง'}).isVisible());
   await click('new-schedule6');await click('add-class');await loc('class-day').selectOption('อังคาร');await loc('class-room').selectOption('406');await loc('class-start').fill('09:00');await loc('class-end').fill('10:00');await loc('class-subject').fill('กิจกรรมที่ชน DL');await click('save-class4');assert.match(await page.locator('#class-error').innerText(),/ตารางสอบ/);await page.keyboard.press('Escape');
  });
  await check('Chained overlaps use consistent lanes and adjacent events share the full column',async()=>{
   const result=await page.evaluate(()=>({chain:layoutWeekDay6([{id:'A',start:'08:00',end:'10:00'},{id:'B',start:'09:00',end:'11:00'},{id:'C',start:'10:30',end:'12:00'}]).map(r=>[r.id,r.lane,r.lanes]),adjacent:layoutWeekDay6([{id:'A',start:'08:00',end:'10:00'},{id:'B',start:'10:00',end:'12:00'}]).map(r=>[r.lane,r.lanes])}));assert.deepEqual(result.chain,[['A',0,2],['B',1,2],['C',0,2]]);assert.deepEqual(result.adjacent,[[0,1],[0,1]]);
  });
  await check('Import row drafts and linked source selection survive navigation without a separate save click',async()=>{
   await openImport();await loc('import-row-subject5').fill('ร่างที่ยังไม่ได้กดบันทึก');await page.locator('.import-queue6 [data-action="import-row5"][data-id="IMPORT5-1"]').click();await page.locator('.import-queue6 [data-action="import-row5"][data-id="IMPORT5-0"]').click();assert.equal(await loc('import-row-subject5').inputValue(),'ร่างที่ยังไม่ได้กดบันทึก');assert.equal(await page.locator('.source-block6.active').getAttribute('data-id'),'IMPORT5-0');
   await loc('import-row-start5').fill('20:00');await page.locator('.import-queue6 [data-action="import-row5"][data-id="IMPORT5-1"]').click();assert.match(await page.locator('#import-row-error5').innerText(),/เวลา/);assert.equal((await summary()).importRows[0].id,'IMPORT5-0');await loc('import-row-start5').fill('08:00');await click('save-import-row5');await click('import-summary5');assert.equal(await act('confirm-import5').isDisabled(),true);
  });
  await check('Imported DL uses the edited date, evening times and matched proctor IDs',async()=>{
   await openImport('dl');await loc('import-row-date5').fill('2026-11-24');await loc('import-row-start5').fill('17:00');await loc('import-row-end5').fill('18:30');for(const [i,id]of ['DEMO-2','DEMO-4','DEMO-6'].entries())await loc('import-proctor-'+i).selectOption(id);await click('save-import-row5');await reviewRows();await click('import-summary5');assert.equal((await summary()).importCounts.ready,1);await click('confirm-import5');assert.equal((await summary()).importAdded,1);await go('classrooms');assert.match(await page.locator('#content').innerText(),/24|พ.ย./);assert.ok((await summary()).scheduleRows.some(r=>r.kind==='dl'&&r.date==='2026-11-24'&&r.start==='17:00'&&r.end==='18:30'&&r.proctorIds.join(',')==='DEMO-2,DEMO-4,DEMO-6'));
  });
  await check('Review flags and six actual seed conflicts must be acknowledged before the valid subset is added',async()=>{
   await openImport();await reviewRows();await click('import-summary5');const s=await summary();assert.equal(s.importCounts.ready,19);assert.equal(s.importCounts.conflict,6);assert.equal(await act('confirm-import5').isDisabled(),true);await loc('import-ack-conflicts6').check();await click('confirm-import5');const result=(await summary()).importResult;assert.equal(result.added,19);assert.deepEqual(result.held.map(r=>r.id).sort(),['IMPORT5-0','IMPORT5-10','IMPORT5-20','IMPORT5-21','IMPORT5-22','IMPORT5-23'].sort());assert.match(await page.locator('#content').innerText(),/พักไว้ 6/);
  });
  await check('Damaged and borrowed seed statuses agree between registry, details and quick picker',async()=>{
   await visit('equipment');const damaged=page.locator('.data-row').filter({has:page.locator('[data-id="PW-02"]')});assert.match(await damaged.innerText(),/ชำรุด/);await page.locator('[data-action="device-detail5"][data-id="PW-02"]').click();assert.match(await page.locator('.inspector').innerText(),/ชำรุด/);const borrowed=page.locator('.data-row').filter({has:page.locator('[data-id="HP-03"]')});assert.ok(await borrowed.locator('.tag.blue').count());await go('record');await click('quick-next');await page.locator('[data-action="template-run"][data-id="TPL-6"]').click();assert.equal(await page.locator('[data-action="select-device"][data-id="PW-02"]').isDisabled(),true);await page.keyboard.press('Escape');
  });
  await check('Repeated open-close interruption leaves one dialog and a bounded optical cache',async()=>{
   await visit('record');for(let i=0;i<12;i++){await click(i%2?'appearance':'notifications');await page.keyboard.press('Escape');}await settle();assert.equal(await page.locator('dialog').count(),1);assert.equal(await page.locator('dialog[open],.closing-dialog6,.closing-backdrop6').count(),0);assert.ok(await page.evaluate(()=>window.motionReview.opticalMaps<=40));assert.ok(await act('notifications').isEnabled());
  });
  assert.deepEqual(errors,[]);assert.ok(requests.every(u=>u.startsWith('http://127.0.0.1:4196/')),'prototype must not request external data or fonts');
  fs.writeFileSync(path.join(output,'motion-report.json'),JSON.stringify({date:'2026-11-05',revision:6,scenarios:results.length,results,errors,origins:[...new Set(requests.map(u=>new URL(u).origin))],limitations:['Edge/Chromium verification; real Safari/iOS UAT pending','Synthetic import review; no PDF extraction or production writes','Custom SVG/CSS material, not native Apple rendering or a Glisse package installation']},null,2));
  console.log(`Verified ${results.length} motion, accessibility, optics and correctness scenarios.`);
 }finally{await browser.close();}
}
main().catch(e=>{fs.writeFileSync(path.join(output,'motion-failure.json'),JSON.stringify({error:e.stack,results,errors},null,2));console.error(e);process.exitCode=1;});
