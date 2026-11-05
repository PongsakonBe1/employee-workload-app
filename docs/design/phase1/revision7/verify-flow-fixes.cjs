/* Behavioral regression coverage for Review 08 batch 1; synthetic data only. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.argv[2]);
const out=path.resolve(__dirname,'../../../../output/playwright/ux-phase1/revision8');
const results=[],errors=[];
fs.mkdirSync(out,{recursive:true});
async function main(){
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]});
 let page;
 const report={completed:false,results,errors,limitations:['Chromium touch/viewport emulation only; native iOS date/time, keyboard and focus zoom require device UAT','Student ID validation checks format only, not identity or enrollment','Prototype only; no production writes']};
 fs.writeFileSync(path.join(out,'flow-report.json'),JSON.stringify(report,null,2));
 const test=async(name,fn)=>{await fn();results.push({name,status:'passed'});console.log('PASS '+name);};
 const settle=()=>page.waitForFunction(()=>document.documentElement.dataset.usabilityReady==='8'&&document.getAnimations().every(a=>a.playState!=='running'));
 const visit=async route=>{await page.goto('http://127.0.0.1:4197/#/'+route);await settle();};
 const act=name=>page.locator(`[data-action="${name}"]:visible`).first();
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1050}});page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await visit('record');
  await test('Manual task picker centers on desktop, searches first, and preserves entered draft',async()=>{
   await page.locator('[data-group="record-mode"][data-value="manual"]').click();
   await page.locator('[name="manual-recipient"]').fill('ผู้รับบริการตัวอย่าง');
   await page.locator('[name="manual-notes"]').fill('ข้อมูลสังเคราะห์สำหรับตรวจการคงร่าง');
   await act('task-picker').click();await settle();
   const box=await page.locator('#sheet').boundingBox();assert.ok(Math.abs(box.x+box.width/2-720)<3);
   assert.equal(await page.locator('[name="task-query"]').evaluate(e=>e===document.activeElement),true);
   await page.screenshot({path:path.join(out,'task-picker-desktop.png'),fullPage:true});
   await page.locator('[name="task-query"]').fill('USB');
   await page.locator('[data-action="choose-task"]').first().click();await settle();
   assert.equal(await page.locator('[name="manual-recipient"]').inputValue(),'ผู้รับบริการตัวอย่าง');
   assert.match(await page.locator('[name="manual-notes"]').inputValue(),/ข้อมูลสังเคราะห์/);
   await page.screenshot({path:path.join(out,'manual-desktop.png'),fullPage:true});
  });
  await page.goto('about:blank');await visit('record');
  await test('All Combo templates open empty, including legacy whole-set configuration',async()=>{
   const combos=await page.evaluate(()=>f4.templateRows.filter(t=>t.kind==='combo').map(t=>({id:t.id,kind:t.action==='combo-software'?'software':'account'})));
   assert.ok(combos.length>=2);
   for(const t of combos){
    await page.evaluate(t=>{f4.runningTemplate=f4.templateRows.find(r=>r.id===t.id);f4.runningTemplate.checkbox=false;comboDialog(t.kind);},t);
    assert.equal(await page.locator('.combo-check:checked').count(),0);assert.equal(await page.locator('.combo-check:disabled').count(),0);
    assert.match(await act('combo-review').innerText(),/0/);
    await act('combo-all').click();assert.ok(await page.locator('.combo-check:checked').count()>0);
    await act('combo-none').click();assert.equal(await page.locator('.combo-check:checked').count(),0);
    await page.keyboard.press('Escape');await settle();
   }
  });
  await test('Combo blocks empty choice and whitespace recipient, focuses missing field, writes only chosen items',async()=>{
   await page.locator('[data-action="template-run"][data-id="TPL-3"]').click();
   const count=await page.evaluate(()=>state.logs.length);
   await act('combo-review').click();assert.equal(await page.locator('.combo-check').first().evaluate(e=>e===document.activeElement),true);
   await page.locator('.combo-check').first().check();await page.locator('[name="combo-recipient"]').fill('   ');
   await act('combo-review').click();assert.equal(await page.locator('[name="combo-recipient"]').evaluate(e=>e===document.activeElement),true);
   assert.equal(await page.evaluate(()=>state.logs.length),count);
   await page.locator('[name="combo-recipient"]').fill('ผู้รับบริการตัวอย่าง');
   await act('combo-review').click();await act('combo-save').click();await settle();
   assert.equal(await page.evaluate(()=>state.logs.length),count+1);
   await page.locator('[data-action="template-run"][data-id="TPL-3"]').click();assert.equal(await page.locator('.combo-check:checked').count(),0);
   await page.keyboard.press('Escape');await settle();
  });
  await test('Calendar day and work detail retain calendar, month, date range, search and staff scope',async()=>{
   await visit('worklogs');
   const seed=await page.evaluate(()=>{const log=state.logs.find(l=>l.date.startsWith('2026-11'));ui5.logMonth=log.date.slice(0,7);state.search=log.task;f4.logView='calendar';render();return{day:log.date,id:log.id,start:f4.start,end:f4.end,month:ui5.logMonth,search:state.search};});
   await page.locator(`[data-action="log-day5"][data-date="${seed.day}"]`).click();assert.ok(await page.locator('.day-log8').count());await settle();
   await page.screenshot({path:path.join(out,'calendar-day-desktop.png'),fullPage:true});
   await act('day-log-detail8').click();assert.match(await page.locator('#sheet-content').innerText(),/รายละเอียดงาน/);
   await act('day-log-back8').click();assert.ok(await page.locator('.day-log8').count());
   await page.keyboard.press('Escape');await settle();
   assert.deepEqual(await page.evaluate(()=>({start:f4.start,end:f4.end,month:ui5.logMonth,search:state.search,view:f4.logView})),{start:seed.start,end:seed.end,month:seed.month,search:seed.search,view:'calendar'});
   await page.screenshot({path:path.join(out,'calendar-desktop.png'),fullPage:true});
   await page.evaluate(()=>{state.role='staff';state.search='';render();});
   await page.locator(`[data-action="log-day5"][data-date="${seed.day}"]`).click();
   assert.equal(await page.evaluate(()=>dayLogs8().every(l=>l.person===people[0].name)),true);
   await page.keyboard.press('Escape');
   await page.evaluate(()=>{state.role='superadmin';state.search='';});
  });
  await visit('record');
  await test('Room cards on both floors cancel safely and preserve immediate single write plus Undo',async()=>{
   for(const floor of ['3','4']){
    const before=await page.evaluate(()=>state.logs.length);
    await page.evaluate(f=>smartRoom(f),floor);assert.ok(await page.locator('.device-picker.room-picker8').isVisible());
    assert.equal(await page.locator('.room-option8').count(),await page.evaluate(f=>f4.rooms.filter(r=>r.floor===f).length,floor));
    await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>state.logs.length),before);
    await page.evaluate(f=>smartRoom(f),floor);await act('room-instant7').click();await settle();
    assert.equal(await page.evaluate(()=>state.logs.length),before+1);assert.equal(await page.locator('#sheet').evaluate(e=>e.open),false);
    await page.locator('[data-action="undo-room7"]').last().click();assert.equal(await page.evaluate(()=>state.logs.length),before);
   }
  });
  for(const type of ['headphones','plug','usb'])await test(`${type}: reject invalid 13-digit scans without mutation; preserve zeroes through borrow and return`,async()=>{
   await page.goto('about:blank');await visit('record');
   const device=await page.evaluate(type=>state.devices.find(d=>d.type===type&&d.active&&!d.borrowed&&d.condition==='normal'),type);
   assert.ok(device,'Available synthetic device for '+type);
   await page.evaluate(type=>equipmentPicker(type,'ทั้งหมด'),type);await settle();
   await page.locator(`[data-action="select-device"][data-id="${device.id}"]`).click();
   const input=page.locator('#device-recipient');
   assert.equal(await input.getAttribute('type'),'text');assert.equal(await input.getAttribute('inputmode'),'numeric');
   assert.equal(await input.getAttribute('maxlength'),null);
   await input.fill('000000000000ก');assert.equal(await input.getAttribute('aria-invalid'),'true');
   const before=await page.evaluate(id=>({logs:state.logs.length,device:{...state.devices.find(d=>d.id===id)},returns:f4.conditionHistory.length}),device.id);
   const unchanged=async()=>assert.deepEqual(await page.evaluate(id=>({logs:state.logs.length,device:{...state.devices.find(d=>d.id===id)},returns:f4.conditionHistory.length}),device.id),before);
   for(const invalid of ['', '000000000001','00000000000001','000000000000A','000000000000ก','๐๐๐๐๐๐๐๐๐๐๐๐๑','1.23456789e12',' 0000000000001']){
    await input.fill(invalid);await act('confirm-device').click();
    assert.equal(await input.inputValue(),invalid,'Do not silently change invalid scan');
    assert.equal(await input.evaluate(e=>document.activeElement===e),true);assert.ok(await page.locator('#student-id-error8').innerText());await unchanged();
   }
   if(type==='headphones')await page.screenshot({path:path.join(out,'student-id-error-desktop.png'),fullPage:true});
   const id='0000000000001';await input.fill(id);await act('confirm-device').click();await settle();
   assert.equal(await page.evaluate(()=>state.logs[0].recipient),id);assert.equal(await page.evaluate(()=>state.logs.length),before.logs+1);
   await page.evaluate(type=>equipmentPicker(type,'ทั้งหมด'),type);await page.locator(`[data-action="select-device"][data-id="${device.id}"]`).click();
   await page.locator('#device-recipient').fill('000000000001');await act('confirm-device').click();
   assert.equal(await page.locator('[name="return-condition"]').count(),0);assert.equal(await page.evaluate(()=>state.logs.length),before.logs+1);
   await page.locator('#device-recipient').fill(id);await act('confirm-device').click();
   assert.ok(await page.locator('[name="return-condition"]').isVisible());
   await page.keyboard.press('Escape');await settle();assert.equal(await page.evaluate(()=>state.logs.length),before.logs+1);
   assert.equal(await page.evaluate(id=>state.devices.find(d=>d.id===id).borrowed,device.id),true);
   await page.evaluate(type=>equipmentPicker(type,'ทั้งหมด'),type);await page.locator(`[data-action="select-device"][data-id="${device.id}"]`).click();
   await page.locator('#device-recipient').fill(id);await act('confirm-device').click();await act('finish-return').click();await settle();
   assert.equal(await page.evaluate(()=>state.logs.length),before.logs+2);assert.equal(await page.evaluate(()=>state.logs[0].recipient),id);
   assert.equal(await page.evaluate(id=>state.devices.find(d=>d.id===id).borrowed,device.id),false);
  });
  await context.close();
  for(const [name,width,touch]of [['desktop',1440,false],['tablet',768,true],['mobile',390,true],['small',375,true],['large-phone',430,true]]){
   const mobile=await browser.newContext({viewport:{width,height:844},hasTouch:touch,isMobile:width<761});page=await mobile.newPage();page.on('pageerror',e=>errors.push(e.message));
   await visit('record');
   await test(`${name}: both themes keep editable date/time and text fields inside form and viewport`,async()=>{
    for(const theme of ['light','dark']){
     await page.evaluate(t=>window.designReview.setTheme(t),theme);
     await page.locator('[data-group="record-mode"][data-value="manual"]').click();await settle();
     const inputs=await page.locator('#manual4 input,#manual4 textarea').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect(),p=e.closest('.field').getBoundingClientRect();return{type:e.type,font:parseFloat(getComputedStyle(e).fontSize),left:r.left,right:r.right,parentRight:p.right,width:innerWidth};}));
     for(const input of inputs){assert.ok(input.left>=-1&&input.right<=input.width+1&&input.right<=input.parentRight+1,JSON.stringify(input));if(touch)assert.ok(input.font>=16,JSON.stringify(input));}
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
     if(width===390)await page.screenshot({path:path.join(out,`manual-mobile-${theme}.png`),fullPage:true});
    }
   });
   if(width===390)await test('Mobile student ID uses numeric keyboard hint, keeps scan text visible and requires explicit confirmation',async()=>{
    await page.evaluate(()=>equipmentPicker('headphones','ทั้งหมด'));await settle();
    const input=page.locator('#device-recipient');
    await input.fill('000000000000ก');await settle();
    const before=await page.evaluate(()=>state.logs.length);
    const stats=await input.evaluate(e=>{const r=e.getBoundingClientRect();return{font:parseFloat(getComputedStyle(e).fontSize),left:r.left,right:r.right,width:innerWidth};});
    assert.ok(stats.font>=16&&stats.left>=0&&stats.right<=stats.width);
    assert.equal(await input.getAttribute('aria-invalid'),'true');
    const errorBox=await page.locator('#student-id-error8').boundingBox(),bodyBox=await page.locator('#sheet .sheet-body').boundingBox();
    assert.ok(errorBox.y+errorBox.height<=bodyBox.y+bodyBox.height+1,'Validation explanation stays above the sticky actions');
    await page.screenshot({path:path.join(out,'student-id-mobile.png'),fullPage:true});
    await input.fill('0000000000001');await input.press('Enter');
    assert.equal(await page.evaluate(()=>state.logs.length),before);assert.equal(await input.getAttribute('aria-invalid'),null);
    await page.keyboard.press('Escape');await settle();
   });
   if(width===390)await test('Mobile missing Quick Log recipient scrolls and focuses the field; optional recipient remains optional',async()=>{
    await page.evaluate(()=>{f4.runningTemplate={requireRecipient:true,requireComment:true};commentDialog('งานบริการตัวอย่าง');});
    await page.locator('[name="detail"]').fill('รายละเอียดสังเคราะห์');await act('comment-save').click();
    const target=await page.locator('[name="recipient"]').evaluate(e=>{const r=e.getBoundingClientRect();return{focus:document.activeElement===e,invalid:e.getAttribute('aria-invalid'),top:r.top,bottom:r.bottom,height:innerHeight};});
    assert.equal(target.focus,true);assert.equal(target.invalid,'true');assert.ok(target.top>=0&&target.bottom<=target.height);
    await page.screenshot({path:path.join(out,'recipient-mobile.png'),fullPage:true});
    await page.locator('[name="recipient"]').fill('ผู้รับบริการตัวอย่าง');await act('comment-save').click();assert.match(await page.locator('#sheet-title').innerText(),/ตรวจบันทึก/);
    await page.keyboard.press('Escape');await settle();
    await page.evaluate(()=>{f4.runningTemplate={requireRecipient:false,requireComment:true};commentDialog('งานบริการตัวอย่าง');});
    await page.locator('[name="detail"]').fill('รายละเอียดสังเคราะห์');await act('comment-save').click();assert.match(await page.locator('#sheet-title').innerText(),/ตรวจบันทึก/);
    await page.keyboard.press('Escape');await settle();
    await page.evaluate(()=>smartRoom('4'));await settle();await page.screenshot({path:path.join(out,'rooms-mobile.png'),fullPage:true});
   });
   await mobile.close();
  }
  assert.deepEqual(errors,[]);report.completed=true;
 }catch(error){report.error=error.stack;if(page&&!page.isClosed())await page.screenshot({path:path.join(out,'failure.png'),fullPage:true});throw error;}
 finally{fs.writeFileSync(path.join(out,'flow-report.json'),JSON.stringify(report,null,2));await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
