/* Functional checks for the approved control/form polish; synthetic data only. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.argv[2]);
const out=path.resolve(__dirname,'../../../../output/playwright/ux-phase1/polish-c');fs.mkdirSync(out,{recursive:true});
const report={completed:false,results:[],errors:[],limitations:['Edge viewport/touch emulation; physical iPhone/Safari, Android and scanner UAT still required','Prototype labels only; production identity imports and legacy name-based queries are unchanged']};
async function main(){
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]});let page;
 const settle=()=>page.waitForFunction(()=>document.documentElement.dataset.polishCReady==='true'&&document.documentElement.dataset.calendarReady==='true'&&document.getAnimations().every(a=>a.playState!=='running'));
 const visit=async route=>{await page.goto('http://127.0.0.1:4197/#/'+route);await settle();};
 const reset=async()=>{await page.goto('about:blank');await visit('record');};
 const act=action=>page.locator(`[data-action="${action}"]:visible`).first();
 const close=async()=>{await page.keyboard.press('Escape');await settle();};
 const test=async(name,fn)=>{await fn();report.results.push({name,status:'passed'});console.log('PASS '+name);};
 const shot=async name=>{await settle();await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});};
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1050}});page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));await visit('record');
  await test('Both room floors use one desktop row and every state has a distinct symbol, fill and label',async()=>{
   for(const floor of ['3','4'])for(const theme of ['light','dark']){
    await page.evaluate(({floor,theme})=>{window.designReview.setTheme(theme);smartRoom(floor);},{floor,theme});await settle();
    const boxes=await page.locator('.room-option8').evaluateAll(elements=>elements.map(element=>{const rect=element.getBoundingClientRect();return {x:rect.x,y:rect.y,width:rect.width};}));assert.equal(boxes.length,4);assert.ok(boxes.every(box=>Math.abs(box.y-boxes[0].y)<2));
    assert.equal(await page.locator('.room-option8 .tag .icon').count(),4);
    const states=await page.locator('.room-option8').evaluateAll(elements=>elements.map(element=>({state:element.dataset.statusC,fill:getComputedStyle(element).backgroundColor})));if(new Set(states.map(state=>state.state)).size>1)assert.ok(new Set(states.map(state=>state.fill)).size>1);
    await shot(`rooms-${floor}-desktop-${theme}`);await close();
   }
  });
  await test('Opening and closing a room updates the badge after reopening; Undo restores the original state',async()=>{
   await reset();const before=await page.evaluate(()=>({room:f4.rooms[0].id,open:f4.rooms[0].inUse,logs:state.logs.length}));
   await page.locator('[data-action="template-run"][data-id="TPL-0"]').click();await page.locator(`[data-room="${before.room}"]`).click();await settle();
   assert.equal(await page.evaluate(()=>state.logs.length),before.logs+1);
   await page.locator('[data-action="template-run"][data-id="TPL-0"]').click();assert.equal(await page.locator(`[data-room="${before.room}"]`).getAttribute('data-status-c'),before.open?'closed':'open');await close();
   await act('undo-room7').click();await settle();assert.equal(await page.evaluate(()=>f4.rooms[0].inUse),before.open);
  });
  await test('Borrow and return update the actual device status, stored borrower, command and visual state',async()=>{
   await reset();const device=await page.evaluate(()=>state.devices.find(device=>device.active&&!device.borrowed&&device.condition==='normal'&&device.type==='headphones'));
   await page.evaluate(()=>equipmentPicker('headphones','ทั้งหมด'));const button=page.locator(`[data-action="select-device"][data-id="${device.id}"]`);
   assert.equal(await button.getAttribute('data-status-c'),'ready');await button.click();await page.locator('#device-recipient').fill('0000000000042');await act('confirm-device').click();await settle();
   await page.evaluate(()=>equipmentPicker('headphones','ทั้งหมด'));assert.equal(await button.getAttribute('data-status-c'),'borrowed');assert.match(await button.innerText(),/คืนรายการนี้/);await button.click();assert.equal(await page.locator('#device-recipient').inputValue(),'0000000000042');assert.equal(await page.locator('#device-recipient').evaluate(element=>element.readOnly),true);await shot('equipment-return-desktop');
   await act('confirm-device').click();await act('finish-return').click();await settle();await page.evaluate(()=>equipmentPicker('headphones','ทั้งหมด'));assert.equal(await button.getAttribute('data-status-c'),'ready');assert.match(await button.innerText(),/ยืมรายการนี้/);await close();
  });
  await test('Combo checkboxes start empty, support Space, count chosen work and preserve numeric-ID validation',async()=>{
   await page.evaluate(()=>window.designReview.setTheme('dark'));
   await page.locator('[data-action="template-run"][data-id="TPL-3"]').click();assert.equal(await page.locator('.checkbox-c:checked').count(),0);const input=page.locator('.combo-check').first();await input.focus();await page.keyboard.press('Space');assert.equal(await input.isChecked(),true);assert.match(await act('combo-review').innerText(),/1/);await shot('combo-desktop-dark');await page.keyboard.press('Space');assert.equal(await input.isChecked(),false);await close();
  });
  await test('Template grouped forms preserve values when adding/removing items and save into Quick Log',async()=>{
   await page.evaluate(()=>window.designReview.setTheme('dark'));
   await visit('templates');await act('new-template').click();assert.equal(await page.locator('#template4 fieldset.form-section-c').count(),3);
   await page.locator('[name="tpl-name"]').fill('ชุดงานสังเคราะห์ C');await page.locator('[name="tpl-kind"]').selectOption('combo');await act('tpl-add-item').click();await page.locator('[name="tpl-item-0"]').fill('รายการทดสอบหนึ่ง');await act('tpl-add-item').click();await page.locator('[name="tpl-item-1"]').fill('รายการทดสอบสอง');await page.locator('[data-action="tpl-remove-item"][data-index="1"]').click();assert.equal(await page.locator('[name="tpl-item-0"]').inputValue(),'รายการทดสอบหนึ่ง');assert.equal(await page.locator('[name="tpl-name"]').inputValue(),'ชุดงานสังเคราะห์ C');await shot('template-desktop-dark');await act('save-template4').click();await settle();
   const template=await page.evaluate(()=>f4.templateRows.find(template=>template.name==='ชุดงานสังเคราะห์ C'));assert.equal(template.kind,'combo');assert.deepEqual(template.items,['รายการทดสอบหนึ่ง']);assert.equal(template.checkbox,true);
   await visit('record');await page.evaluate(id=>{state.quickPage=1;f4.quickPage=1;f4.runningTemplate=f4.templateRows.find(template=>template.id===id);comboDialog('account');},template.id);assert.equal(await page.locator('.combo-check').count(),1);assert.equal(await page.locator('.combo-check:checked').count(),0);await close();
  });
  await test('Duplicate-looking names keep Admin labels and full-name search selects the exact ID',async()=>{
   await reset();await page.evaluate(()=>{people[0].displayName='เจ้าหน้าที่ตัวอย่าง (เอ)';people[1].displayName='เจ้าหน้าที่ตัวอย่าง (บี)';people[0].fullName='เจ้าหน้าที่ตัวอย่าง คนแรก';people[1].fullName='เจ้าหน้าที่ตัวอย่าง คนที่สอง';render();});await act('staff-picker').click();assert.match(await page.locator('#staff-results-c').innerText(),/\(เอ\)/);assert.match(await page.locator('#staff-results-c').innerText(),/\(บี\)/);await page.locator('[name="staff-search-c"]').fill('คนที่สอง');assert.equal(await page.locator('.person-row-c').count(),1);await shot('staff-picker-desktop');await page.locator('.person-row-c').click();await settle();assert.equal(await page.evaluate(()=>state.staff),'DEMO-2');assert.equal(await page.locator('.record-panel-title .staff-picker strong').innerText(),'เจ้าหน้าที่ตัวอย่าง (บี)');
  });
  await test('Plain/ambient backgrounds survive theme and route changes without losing manual drafts',async()=>{
   await page.locator('[data-group="record-mode"][data-value="manual"]').click();await page.locator('[name="manual-notes"]').fill('ร่างสังเคราะห์คงเดิม');await page.evaluate(()=>{stashManual5();appearanceSheet();});await page.locator('[data-action="background-c"][data-value="plain"]:visible').click();assert.equal(await page.locator('html').getAttribute('data-background'),'plain');await close();assert.equal(await page.locator('[name="manual-notes"]').inputValue(),'ร่างสังเคราะห์คงเดิม');await visit('settings');await page.evaluate(()=>{state.settingsTab='appearance';render();});assert.equal(await page.locator('[data-action="background-c"][data-value="plain"]:visible').getAttribute('aria-pressed'),'true');await page.locator('[data-action="background-c"][data-value="ambient"]:visible').click();await page.evaluate(()=>window.designReview.setTheme('light'));assert.equal(await page.locator('html').getAttribute('data-background'),'ambient');
  });
  await test('Reduced motion and solid controls keep focus visible and remove decorative transitions',async()=>{
   await visit('templates');await act('new-template').click();await page.emulateMedia({reducedMotion:'reduce'});const duration=await page.locator('[name="tpl-name"]').evaluate(element=>getComputedStyle(element).transitionDuration);assert.equal(duration,'0s');await page.evaluate(()=>{state.material='solid';document.documentElement.dataset.material='solid';});assert.equal(await page.locator('#sheet').evaluate(element=>getComputedStyle(element).backdropFilter),'none');await close();await page.emulateMedia({reducedMotion:'no-preference'});
  });
  await test('Both themes keep readable status/input text, checkbox boundaries and keyboard focus indicators',async()=>{
   for(const theme of ['light','dark']){
    await page.evaluate(theme=>{window.designReview.setTheme(theme);equipmentPicker('headphones','ทั้งหมด');},theme);await settle();
    const pairs=await page.locator('#sheet .tag,#device-recipient').evaluateAll(elements=>elements.map(element=>{const style=getComputedStyle(element);return {fg:style.color,bg:style.backgroundColor};}));for(const pair of pairs)assert.ok(contrastC(pair.fg,pair.bg)>=4.5,JSON.stringify({theme,pair}));await close();
    await page.evaluate(()=>{f4.runningTemplate=f4.templateRows.find(template=>template.id==='TPL-3');comboDialog('account');});const input=page.locator('.combo-check').first();await input.focus();
    const colors=await input.evaluate(element=>{const style=getComputedStyle(element);return{border:style.borderColor,bg:style.backgroundColor,focus:style.outlineColor,outline:parseFloat(style.outlineWidth)};});assert.ok(contrastC(colors.border,colors.bg)>=3);assert.ok(colors.outline>=2);assert.ok(contrastC(colors.focus,colors.bg)>=3);await close();
   }
  });
  await context.close();
  for(const width of [375,390,430,768]){
   const mobile=await browser.newContext({viewport:{width,height:844},hasTouch:true,isMobile:width<761});page=await mobile.newPage();page.on('pageerror',error=>report.errors.push(error.message));await visit('record');
   await test(`${width}px: room, device, Combo and Template dialogs stay inside the screen in both themes`,async()=>{
    for(const theme of ['light','dark']){
     await page.evaluate(theme=>window.designReview.setTheme(theme),theme);
     for(const name of ['rooms','equipment','combo','template']){
      await page.evaluate(name=>{if(name==='rooms')smartRoom('3');if(name==='equipment')equipmentPicker('headphones','ทั้งหมด');if(name==='combo'){f4.runningTemplate=f4.templateRows.find(template=>template.id==='TPL-3');comboDialog('account');}if(name==='template')templateEditor('TPL-3');},name);await settle();
      const geometry=await page.locator('#sheet').evaluate(dialog=>{const box=dialog.getBoundingClientRect();return{left:box.left,right:box.right,top:box.top,bottom:box.bottom,overflow:dialog.scrollWidth>dialog.clientWidth+1};});assert.ok(geometry.left>=-1&&geometry.right<=width+1&&geometry.top>=-1&&geometry.bottom<=845&&!geometry.overflow,JSON.stringify({width,name,geometry}));
      const small=await page.locator('.form-control-c:visible').evaluateAll(elements=>elements.filter(element=>parseFloat(getComputedStyle(element).fontSize)<16).length);assert.equal(small,0);
      if(width===390)await shot(`${name}-mobile-${theme}`);await close();
     }
    }
   });await mobile.close();
  }
  assert.deepEqual(report.errors,[]);report.completed=true;
 }catch(error){report.error=error.stack;if(page&&!page.isClosed())await page.screenshot({path:path.join(out,'failure.png'),fullPage:true});throw error;}
 finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
function contrastC(a,b){const luminance=color=>{const parts=color.match(/[\d.]+/g).slice(0,3).map(Number),channels=color.startsWith('color(')?parts:parts.map(value=>value/255);const linear=channels.map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);return linear[0]*.2126+linear[1]*.7152+linear[2]*.0722;};const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
