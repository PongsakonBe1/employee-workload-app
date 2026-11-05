/* Browser verification of the approved calendar, material and shared symbol phase. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.argv[2]),out=path.resolve(__dirname,'../../../../output/playwright/ux-phase1/phase-b');
fs.mkdirSync(out,{recursive:true});
async function main(){
 const results=[],errors=[],contrasts=[],report={completed:false,results,errors,contrasts,limitations:['Headless Edge with touch emulation; physical Safari/iPhone and scanner UAT remain pending','Web materials/custom vectors, not native Apple framework rendering','Public holiday snapshot; university closure days are not inferred']};
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]});let page;
 const settle=()=>page.waitForFunction(()=>document.documentElement.dataset.batchBReady==='true'&&document.documentElement.dataset.calendarReady==='true'&&document.getAnimations().every(a=>a.playState!=='running'));
 const visit=async route=>{await page.goto('http://127.0.0.1:4197/#/'+route);await settle();};
 const act=name=>page.locator(`[data-action="${name}"]:visible`).first();
 const mode=async value=>{await page.locator(`[data-group="schedule-mode6"][data-value="${value}"]`).click();await settle();};
 const test=async(name,fn)=>{await fn();results.push({name,status:'passed'});console.log('PASS '+name);};
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1050}});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  for(const [device,width,height]of [['desktop',1440,1050],['mobile',390,844]])for(const theme of ['light','dark']){
   await page.setViewportSize({width,height});await visit('classrooms');await page.evaluate(theme=>window.designReview.setTheme(theme),theme);await settle();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,device+' overflow');
   await page.screenshot({path:path.join(out,`schedule-${device}-${theme}.png`),fullPage:true});
  }
  if(process.argv.includes('--screens')){
   await page.setViewportSize({width:1440,height:1050});await visit('classrooms');
   for(const theme of ['light','dark']){await page.evaluate(theme=>{ui6.scheduleDate='2026-12-05';ui6.scheduleMode='month';window.designReview.setTheme(theme);render();},theme);await settle();await page.screenshot({path:path.join(out,`month-desktop-${theme}.png`),fullPage:true});}
   await page.setViewportSize({width:390,height:844});await page.evaluate(()=>render());await settle();await page.screenshot({path:path.join(out,'month-mobile-dark.png'),fullPage:true});
   await page.evaluate(()=>{ui6.scheduleDate='2026-11-03';ui6.scheduleMode='agenda';render();});await settle();await page.screenshot({path:path.join(out,'agenda-mobile.png'),fullPage:true});
   await visit('record');for(const theme of ['light','dark']){await page.evaluate(theme=>window.designReview.setTheme(theme),theme);await settle();await page.screenshot({path:path.join(out,`record-mobile-${theme}.png`),fullPage:true});}
   await visit('worklogs');await page.evaluate(()=>{f4.logView='calendar';ui5.logMonth='2026-12';render();});await settle();await page.screenshot({path:path.join(out,'worklogs-holidays-mobile.png'),fullPage:true});
   report.completed=true;report.screensOnly=true;return;
  }
  if(process.argv.includes('--smoke'))return;
  await page.setViewportSize({width:1440,height:1050});await visit('classrooms');
  await test('Four calendar views retain anchor, semester, room and activity filters',async()=>{
   await act('calendar-filters-b').click();await page.locator('[name="cal-room-b"]').selectOption('402');await page.locator('[name="cal-kind-b"]').selectOption('classroom');await act('calendar-apply-b').click();await settle();
   const before=await page.evaluate(()=>({date:ui6.scheduleDate,room:state.room,kind:ui6.scheduleKind,semester:f4.semester}));
   for(const value of ['month','day','week','agenda']){await mode(value);assert.deepEqual(await page.evaluate(()=>({date:ui6.scheduleDate,room:state.room,kind:ui6.scheduleKind,semester:f4.semester})),before);assert.equal(await page.evaluate(()=>scheduleRowsB().every(row=>row.kind==='classroom'&&row.room==='402')),true);}
   await act('calendar-filters-b').click();await act('calendar-reset-b').click();await settle();
  });
  await test('Navigation advances a day, week or calendar month without changing the chosen view',async()=>{
   for(const [value,date,expected]of [['day','2026-12-31','2027-01-01'],['week','2026-12-31','2027-01-07'],['month','2026-01-31','2026-02-28']]){
    await page.evaluate(({value,date})=>{ui6.scheduleMode=value;ui6.scheduleDate=date;render();},{value,date});await settle();if(value==='week'){const label=await page.locator('.cal-date-label-b').innerText();assert.match(label,/2569/);assert.match(label,/2570/);}await page.locator('[data-action="schedule-nav-b"][data-dir="1"]').click();await settle();assert.equal(await page.evaluate(()=>ui6.scheduleDate),expected);assert.equal(await page.evaluate(()=>scheduleModeB()),value);
   }
  });
  await test('Month occurrences respect valid dates, preserve identity and show the clicked occurrence date',async()=>{
   await page.evaluate(()=>{ui6.scheduleDate='2026-11-03';ui6.scheduleMode='month';f4.classes.push({id:'CLASS-B-TEST',subject:'วิชาสังเคราะห์',teacher:'ผู้สอนตัวอย่าง',day:'จันทร์',room:'401',start:'08:00',end:'10:00',semester:f4.semester,active:true,validFrom:'2026-11-09',validTo:'2026-11-23'});render();});await settle();
   assert.deepEqual(await page.evaluate(()=>scheduleRowsB().filter(row=>row.id==='CLASS-B-TEST').map(row=>row.date)),['2026-11-09','2026-11-16','2026-11-23']);
   const last=page.locator('[data-action="schedule-detail-b"][data-id="CLASS-B-TEST"][data-date="2026-11-23"]');await last.click();await settle();assert.match(await page.locator('#sheet-content').innerText(),/23 พฤศจิกายน 2569/);
   const box=await page.locator('#sheet').boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=1441&&box.y+box.height<=1051);
   await page.keyboard.press('Escape');await settle();assert.equal(await page.evaluate(()=>scheduleModeB()),'month');
   await page.evaluate(()=>{f4.classes=f4.classes.filter(row=>row.id!=='CLASS-B-TEST');});
  });
  await test('Public holidays are shared with work history, observances are opt-in and toggles never remove schedules',async()=>{
   const holiday=await page.evaluate(()=>uiB.holidays.events.find(row=>row.kind==='public'&&row.start.startsWith('2026-12')));
   const sourceBefore=await page.evaluate(()=>JSON.stringify({classes:f4.classes,exams:state.exams,logs:state.logs}));
   await page.evaluate(date=>{ui6.scheduleDate=date;ui6.scheduleMode='month';render();},holiday.start);await settle();assert.ok(await page.getByRole('button',{name:holiday.title,exact:true}).isVisible());
   await page.screenshot({path:path.join(out,'month-desktop-holidays.png'),fullPage:true});
   await visit('worklogs');await page.evaluate(date=>{ui5.logMonth=date.slice(0,7);f4.logView='calendar';render();},holiday.start);await settle();assert.ok(await page.locator('.holiday-marker-b').filter({hasText:holiday.title}).count());
   await page.locator(`[data-action="log-day5"][data-date="${holiday.start}"]`).click();assert.ok(await page.locator('.holiday-day-b').filter({hasText:holiday.title}).count());await page.keyboard.press('Escape');await settle();
   await act('holiday-options-b').click();await page.locator('[name="cal-public-b"]').uncheck();await act('calendar-apply-b').click();await settle();assert.equal(await page.locator('.holiday-marker-b').count(),0);
   const observance=await page.evaluate(()=>uiB.holidays.events.find(row=>row.kind==='observance'&&row.start.startsWith('2026')));
   await page.evaluate(date=>{ui5.logMonth=date.slice(0,7);render();},observance.start);await settle();assert.equal(await page.locator('.holiday-marker-b[data-holiday-kind="observance"]').count(),0);
   await act('holiday-options-b').click();await page.locator('[name="cal-public-b"]').check();await page.locator('[name="cal-observance-b"]').check();await act('calendar-apply-b').click();await settle();assert.ok(await page.locator('.holiday-marker-b').filter({hasText:observance.title}).count());
   assert.equal(await page.evaluate(()=>JSON.stringify({classes:f4.classes,exams:state.exams,logs:state.logs})),sourceBefore);
   await page.evaluate(()=>{uiB.observances=false;});
  });
  await test('Each event kind has readable light/dark text and a dark surface in dark mode',async()=>{
   await visit('classrooms');await page.evaluate(()=>{ui6.scheduleDate='2026-11-03';ui6.scheduleMode='week';ui5.examImports=[...(ui5.examImports||[]),{id:'EXAM-B-TEST',date:'2026-11-03',room:'401',start:'15:00',end:'17:00',subject:'สอบสังเคราะห์'}];render();});
   for(const theme of ['light','dark']){
    await page.evaluate(theme=>window.designReview.setTheme(theme),theme);await settle();
    for(const kind of ['classroom','dl','exam']){
     const colors=await page.locator(`.cal-event-b[data-kind="${kind}"]`).first().evaluate(e=>({fg:getComputedStyle(e).color,bg:getComputedStyle(e).backgroundColor}));
     const ratio=contrast(colors.fg,colors.bg);contrasts.push({theme,kind,...colors,ratio});assert.ok(ratio>=4.5,JSON.stringify({theme,kind,colors,ratio}));if(theme==='dark')assert.ok(luminance(colors.bg)<.12,'Dark calendar reverted to a pale fill');
    }
   }
   await page.evaluate(()=>{ui5.examImports=ui5.examImports.filter(row=>row.id!=='EXAM-B-TEST');});
  });
  await test('Staff sees all views and holiday controls without admin edit/import actions',async()=>{
   await visit('classrooms');await page.evaluate(()=>{state.role='staff';render();});await settle();assert.equal(await page.locator('[data-action="new-schedule6"]').count(),0);assert.equal(await page.locator('[data-action="calendar-tools-b"]').count(),0);
   assert.equal(await page.locator('[data-group="schedule-mode6"]').count(),4);await act('calendar-filters-b').click();assert.ok(await page.locator('[name="cal-public-b"]').isVisible());await page.keyboard.press('Escape');
   await page.evaluate(()=>{state.role='superadmin';});
  });
  await test('Solid and increased-contrast settings remove glass; reduced motion cancels feedback',async()=>{
   await visit('record');await page.evaluate(()=>{state.material='solid';document.documentElement.dataset.material='solid';render();});await settle();assert.equal(await page.locator('#app-header').evaluate(e=>getComputedStyle(e).backdropFilter),'none');
   await page.evaluate(()=>{state.material='regular';document.documentElement.dataset.material='regular';render();});await settle();await page.emulateMedia({contrast:'more'});assert.equal(await page.locator('#app-sidebar').evaluate(e=>getComputedStyle(e).backdropFilter),'none');await page.emulateMedia({contrast:'no-preference',reducedMotion:'reduce'});
   await act('account7').click();await settle();assert.equal(await page.evaluate(()=>window.motionReview.active),0);await page.keyboard.press('Escape');await page.emulateMedia({reducedMotion:'no-preference'});
   assert.ok(await page.locator('#app-sidebar .nav-symbol-b').count()>3);
  });
  await test('Unavailable holiday data is explicit, schedules remain usable and retry restores the layer',async()=>{
   await page.route('**/holidays.json',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}));await page.goto('about:blank');await visit('classrooms');
   assert.equal(await page.evaluate(()=>uiB.holidayError),true);assert.match(await page.locator('.calendar-source-b').innerText(),/โหลดข้อมูลวันหยุดไม่ได้/);assert.ok(await page.locator('.cal-event-b').count());
   await page.unroute('**/holidays.json');await act('holiday-options-b').click();await act('reload-holidays-b').click();await page.waitForFunction(()=>uiB.holidays&&uiB.holidayError===false);await settle();assert.ok(await page.evaluate(()=>uiB.holidays.events.length)>0);
  });
  await context.close();
  for(const width of [375,390,430,768]){
   const mobile=await browser.newContext({viewport:{width,height:844},hasTouch:true,isMobile:width<761});page=await mobile.newPage();page.on('pageerror',e=>errors.push(e.message));await visit('classrooms');
   await test(`${width}px: calendar controls and every view reflow with touch targets`,async()=>{
    if(width<761)assert.equal(await page.evaluate(()=>scheduleModeB()),'day');
    const contentTop=await page.locator('.calendar-content-b').boundingBox();if(width<761)assert.ok(contentTop.y<400,'Mobile toolbar pushes calendar below the fold');
    for(const value of ['day','week','month','agenda']){
     await mode(value);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,value+' overflow');
     for(const button of await page.locator('.cal-toolbar-b button:visible,.cal-title-actions-b button:visible').all()){
      const r=await button.boundingBox();assert.ok(r.width>=43.5&&r.height>=43.5,JSON.stringify(r));
     }
     if(value==='month'&&width<761){for(const button of await page.locator('.month-mobile-day-b:visible').all()){const rect=await button.boundingBox();assert.ok(rect.width>=43.5&&rect.height>=44);}await page.locator('.month-mobile-day-b').first().click();await settle();assert.ok(await page.locator('#sheet').evaluate(e=>e.open));await page.keyboard.press('Escape');await settle();assert.equal(await page.evaluate(()=>scheduleModeB()),'month');}
    }
    await mode('day');await page.evaluate(()=>document.documentElement.style.fontSize='24px');await settle();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Text enlargement overflow');await page.evaluate(()=>document.documentElement.style.fontSize='');
   });
   if(width===390){
    await page.evaluate(()=>{ui6.scheduleDate='2026-12-05';ui6.scheduleMode='month';window.designReview.setTheme('dark');render();});await settle();await page.screenshot({path:path.join(out,'month-mobile-dark.png'),fullPage:true});
    await page.evaluate(()=>{ui6.scheduleDate='2026-11-03';ui6.scheduleMode='agenda';render();});await settle();await page.screenshot({path:path.join(out,'agenda-mobile.png'),fullPage:true});
   }
   await mobile.close();
  }
  assert.deepEqual(errors,[]);report.completed=true;
 }catch(error){report.error=error.stack;if(page&&!page.isClosed())await page.screenshot({path:path.join(out,'failure.png'),fullPage:true});throw error;}
 finally{fs.writeFileSync(path.join(out,process.argv.includes('--screens')?'screens-report.json':process.argv.includes('--smoke')?'smoke-report.json':'report.json'),JSON.stringify(report,null,2));await browser.close();}
}
function rgb(value){return value.match(/[\d.]+/g).slice(0,3).map(Number);}
function luminance(value){const c=rgb(value).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
main().catch(error=>{console.error(error);process.exitCode=1;});
