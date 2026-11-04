/* Tests only the approved, whitelisted localhost design prototype. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.argv[2]||'playwright');
const output=path.resolve(__dirname,'../../../../output/playwright/ux-phase1/revision5');fs.mkdirSync(output,{recursive:true});
const results=[],errors=[],network=[];
async function main(){
 const browser=await chromium.launch({headless:true,...(process.argv[3]?{executablePath:process.argv[3]}:{})});
 const page=await browser.newPage({viewport:{width:1440,height:1050},acceptDownloads:true});page.setDefaultTimeout(8000);
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
 const visit=async id=>{await page.goto('about:blank');await page.goto('http://127.0.0.1:4195/#/'+id,{waitUntil:'domcontentloaded'});try{await page.waitForFunction(()=>document.documentElement.dataset.reviewReady==='5',{timeout:8000});}catch(e){throw new Error('Design did not start: '+errors.join('; '));}};
 const go=async id=>{await page.evaluate(id=>location.hash='/'+id,id);await page.waitForFunction(id=>document.body.dataset.route===id,id);};
 const loc=n=>page.locator(`[name="${n}"]`),act=n=>page.locator(`[data-action="${n}"]`).first(),click=n=>act(n).click();
 const seg=(group,value)=>page.locator(`[data-group="${group}"][data-value="${value}"]`).click();
 const summary=()=>page.evaluate(()=>window.designReview.getSummary());
 const tpl=id=>page.locator(`[data-action="template-run"][data-id="TPL-${id}"]`).click();
 const role=async value=>{await page.locator('#review-controls').click();await loc('review-role').selectOption(value);await page.keyboard.press('Escape');};
 const check=async(name,fn)=>{await fn();results.push({name,status:'passed'});console.log('PASS '+name);};
 try{
  await visit('record');await page.evaluate(()=>document.fonts.ready);const routes=await page.evaluate(()=>window.designReview.routes);assert.equal(routes.length,30);
  const smoke=process.argv.includes('--smoke'),only=process.argv.includes('--interactions');
  if(!only)for(const [device,theme,width,height]of smoke?[['desktop','light',1440,1050]]:[['desktop','light',1440,1050],['desktop','dark',1440,1050],['mobile','light',390,844],['mobile','dark',390,844]]){
   await page.setViewportSize({width,height});
   for(const route of routes){await visit(route.id);await page.evaluate(t=>window.designReview.setTheme(t),theme);await page.waitForTimeout(45);const stats=await page.evaluate(()=>({h1:document.querySelector('h1')?.textContent,viewport:innerWidth,width:document.documentElement.scrollWidth,logo:[...document.images].every(i=>i.complete&&i.naturalWidth)}));assert.ok(stats.h1,route.id+' missing heading');assert.ok(stats.logo,route.id+' missing asset');assert.ok(stats.width<=stats.viewport+1,`${device}/${route.id} overflow ${stats.width}/${stats.viewport}`);await page.screenshot({path:path.join(output,`${route.id}-${device}-${theme}.png`),fullPage:true});results.push({name:`render ${route.id} ${device} ${theme}`,status:'passed'});}
   console.log(`PASS ${device}/${theme}: 30 views, heading, assets, document bounds`);
  }
  if(smoke){assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'smoke.json'),JSON.stringify({results,errors},null,2));return;}
  await page.setViewportSize({width:1440,height:1050});
  // Interaction scenarios are appended below; each starts from independent state.
  await check('Desktop sidebar groups tasks and hides authentication/design destinations',async()=>{
   await visit('record');assert.ok(await page.locator('#app-sidebar').isVisible());
   for(const id of ['login','pending','design','system'])assert.equal(await page.locator(`#app-sidebar a[href="#/${id}"]`).count(),id==='system'?1:0);
   await page.keyboard.press('Control+k');for(const id of ['login','pending','design'])assert.equal(await page.locator(`#sheet a[href="#/${id}"]`).count(),0);await page.keyboard.press('Escape');
  });
  await check('Quick Log actor picker, Account 5 and Software 6 retain selective batch behavior',async()=>{
   await visit('record');await click('staff-picker');await page.locator('[data-action="select-staff"][data-id="DEMO-3"]').click();assert.match(await page.locator('.identity-row').innerText(),/เจ้าหน้าที่ C/);
   await tpl(3);assert.equal(await page.locator('.combo-check').count(),5);await click('combo-none');await click('combo-review');assert.match(await page.locator('#combo-error').innerText(),/อย่างน้อย/);
   await page.locator('.combo-check').nth(0).check();await page.locator('.combo-check').nth(3).check();await loc('combo-recipient').fill('ผู้รับบริการตัวอย่าง');const before=(await summary()).logs;await click('combo-review');await click('combo-save');assert.equal((await summary()).logs,before+2);assert.equal((await summary()).logRows[0].person,'เจ้าหน้าที่ C');
   await tpl(4);assert.equal(await page.locator('.combo-check').count(),6);await page.screenshot({path:path.join(output,'combo-desktop-light.png'),fullPage:false});await page.keyboard.press('Escape');
  });
  await check('Template labels match rooms, account, software, power and USB tasks',async()=>{
   await visit('templates');const rows=(await summary()).templateRows;assert.equal(rows[0].minorTask,'เช็คอินห้องแลกเปลี่ยนความรู้');assert.equal(rows[4].minorTask,'ติดตั้ง Software');assert.equal(rows[6].minorTask,'ยืมปลั๊กไฟ');assert.equal(rows[7].minorTask,'ยืม USB');
   await page.locator('[data-action="template-detail5"][data-id="TPL-6"]').click();assert.match(await page.locator('.inspector').innerText(),/ยืมปลั๊กไฟ/);assert.ok(!/ยืมหูฟัง/.test(await page.locator('.inspector').innerText()));
  });
  await check('Manual worklog preserves the draft across task picker and preview',async()=>{
   await visit('new-log');await loc('manual-recipient').fill('ผู้รับบริการตัวอย่าง');await loc('manual-notes').fill('ร่างรายละเอียดที่ต้องคงไว้');await click('task-picker');await loc('task-query').fill('คุมสอบ');await click('choose-task');assert.equal(await loc('manual-recipient').inputValue(),'ผู้รับบริการตัวอย่าง');assert.equal(await loc('manual-notes').inputValue(),'ร่างรายละเอียดที่ต้องคงไว้');assert.equal(await loc('manual-main').inputValue(),'คุมสอบ DL');
   const n=(await summary()).logs;await click('manual-preview');await click('save-comment4');assert.equal((await summary()).logs,n+1);assert.equal((await summary()).logRows[0].task,'คุมสอบ DL');
  });
  await check('Smart room preview changes current status and supports closing',async()=>{
   await visit('record');for(const expected of [true,false]){await tpl(0);assert.ok(await act('room-review').isDisabled());await page.locator('[data-action="room-select"][data-room="303"]').click();await click('room-review');await click('save-room');assert.equal((await summary()).rooms.find(r=>r.id==='303').inUse,expected);}
  });
  await check('Registry move and activation immediately affect the borrow picker',async()=>{
   await visit('equipment');await click('edit-device');await loc('device-location').selectOption('Finn Space');await loc('device-barcode').fill('DEMO-BC-MOVED');await click('save-device');assert.match(await page.locator('.inspector').innerText(),/DEMO-BC-MOVED/);
   await go('record');await tpl(2);assert.match(await page.locator('[data-action="select-device"][data-id="HP-01"]').innerText(),/Finn Space/);await page.keyboard.press('Escape');
   await go('equipment');await click('add-device');await loc('device-name').fill('อุปกรณ์สาธิตเพิ่มเติม');await click('save-device');const id=(await summary()).devices.at(-1).id;
   await go('record');await tpl(2);assert.equal(await page.locator(`[data-action="select-device"][data-id="${id}"]`).count(),1);await page.keyboard.press('Escape');
   await go('equipment');await page.locator(`[data-action="device-detail5"][data-id="${id}"]`).click();await click('edit-device');await loc('device-active').uncheck();await click('save-device');await loc('registry-state').selectOption('inactive');assert.match(await page.locator('#content').innerText(),/อุปกรณ์สาธิตเพิ่มเติม/);
   await go('record');await tpl(2);assert.equal(await page.locator(`[data-action="select-device"][data-id="${id}"]`).count(),0);await page.keyboard.press('Escape');
  });
  await check('Damaged returns update condition history and exclude borrowing',async()=>{
   await visit('record');await tpl(2);await page.locator('[data-action="select-device"][data-id="HP-01"]').click();await click('confirm-device');await tpl(2);await page.locator('[data-action="select-device"][data-id="HP-01"]').click();await click('confirm-device');await loc('return-condition').selectOption('damaged');await click('finish-return');assert.equal((await summary()).devices.find(d=>d.id==='HP-01').condition,'damaged');
   await go('condition');await loc('condition5').selectOption('damaged');assert.match(await page.locator('table').innerText(),/HP-01/);assert.equal(await page.locator('.metric strong').nth(1).innerText(),'2');
  });
  await check('Worklog list uses readable mobile rows, detail, edit, multiselect, delete and undo',async()=>{
   await page.setViewportSize({width:390,height:844});await visit('worklogs');assert.ok(await page.locator('.worklog-mobile-list').isVisible());assert.equal(await page.locator('.worklog-desktop-table').isVisible(),false);assert.equal(await page.locator('.worklog-mobile-list .data-row').count(),8);
   await page.locator('.worklog-mobile-list [data-action="open-log5"]').first().click();assert.ok(await page.locator('#sheet').isVisible());await click('edit-log');await loc('edit-detail').fill('รายละเอียดที่แก้ไขในต้นแบบ');await click('save-log');assert.ok((await summary()).logRows.some(l=>l.detail==='รายละเอียดที่แก้ไขในต้นแบบ'));
   await click('select-mode5');await page.locator('.worklog-mobile-list input[data-log]').first().check();const n=(await summary()).logs;await click('delete-selected');await click('confirm-delete-logs');assert.equal((await summary()).logs,n-1);await click('undo-logs');assert.equal((await summary()).logs,n);
   await page.locator('.worklog-mobile-list [data-action="open-log5"]').first().click();await page.screenshot({path:path.join(output,'worklogs-mobile-detail.png'),fullPage:false});await page.keyboard.press('Escape');
  });
  await check('Worklog range rejects reversed dates and calendar navigates months',async()=>{
   await page.setViewportSize({width:1440,height:1050});await visit('worklogs');await click('log-range5');await loc('log5-start').fill('2026-11-20');await loc('log5-end').fill('2026-11-01');await click('apply-log-range5');assert.match(await page.locator('#log5-error').innerText(),/วันสิ้นสุด/);await loc('log5-start').fill('2026-11-03');await loc('log5-end').fill('2026-11-03');await click('apply-log-range5');assert.equal((await summary()).period.start,'2026-11-03');
   await seg('log-view','calendar');await page.locator('[data-action="log-month5"][data-dir="-1"]').click();assert.match(await page.locator('.calendar-title').innerText(),/ตุลาคม/);await page.locator('[data-action="log-month5"][data-dir="1"]').click();await page.locator('[data-action="log-day5"][data-date="2026-11-03"]').click();assert.equal(await page.locator('.worklog-desktop-table').isVisible(),true);
  });
  await check('Fiscal scope changes the underlying records and preserves Oct/Sep boundaries',async()=>{
   await visit('dashboard');const before=await page.locator('.metric strong').first().innerText();await loc('fiscal-year').selectOption('2569');assert.notEqual(await page.locator('.metric strong').first().innerText(),before);assert.equal(await page.locator('.metric strong').first().innerText(),'96');
   await go('staff');await loc('fiscal-month').selectOption('0');assert.match(await page.locator('.scope-period').innerText(),/ต.ค. 2568/);assert.match(await page.locator('#content .data-list').innerText(),/1\s+รายการ/);await loc('fiscal-month').selectOption('11');assert.match(await page.locator('.scope-period').innerText(),/ก.ย. 2569/);
   await loc('search').fill('เจ้าหน้าที่ C');assert.equal(await page.locator('#content .data-list .data-row').count(),1);await page.locator('[data-action="person-detail5"]').click();assert.match(await page.locator('.inspector').innerText(),/เจ้าหน้าที่ C/);
  });
  await check('Staff detail has six explainable metrics and Profile keeps eight minor-task axes',async()=>{
   await visit('staff');assert.equal(await page.locator('.people-stats>div').count(),6);await page.locator('details summary').click();assert.equal(await page.locator('svg[aria-label*="6 มิติ"] text').count(),6);await page.locator('[data-action="person-step5"][data-dir="1"]').click();assert.match(await page.locator('.inspector-heading').innerText(),/เจ้าหน้าที่ B/);
   await go('profile');assert.equal(await page.locator('svg[aria-label*="8 หัวข้อรอง"] text').count(),8);assert.equal(await loc('profile-fullname').count(),1);await loc('displayName').fill('ชื่อสาธิตใหม่');await loc('profile-fullname').fill('ชื่อเต็มสาธิต');await click('save-profile5');assert.match(await page.locator('#content').innerText(),/ชื่อสาธิตใหม่/);
  });
  await check('DL mobile defaults to agenda; evening, CEM, type and unique proctors are retained',async()=>{
   await page.setViewportSize({width:390,height:844});await visit('dl');assert.equal(await page.locator('.agenda-row').count(),18);assert.equal(await page.locator('.calendar-grid').count(),0);await click('add-exam');await loc('exam-count').fill('40');assert.match(await page.locator('#exam-rooms').innerText(),/ไม่เกิน 40/);await loc('exam-count').fill('75');await loc('exam-cem').check();await loc('exam-type').selectOption('บุคลากร');await loc('exam-proctor-1').selectOption('DEMO-1');await click('save-exam4');assert.match(await page.locator('#exam-validation').innerText(),/ไม่ซ้ำ/);await loc('exam-proctor-1').selectOption('DEMO-3');await click('save-exam4');assert.equal((await summary()).exams,19);assert.match(await page.locator('#content').innerText(),/17:00/);await page.locator('[data-action="exam-day5"][data-date="2026-11-24"]').click();assert.match(await page.locator('#sheet').innerText(),/CEM/);await page.locator('#sheet [data-action="edit-exam4"]').click();assert.equal(await loc('exam-start').inputValue(),'17:00');assert.equal(await loc('exam-end').inputValue(),'18:30');await page.keyboard.press('Escape');
  });
  await check('Class timetable includes Saturday and proportional time positions through 21:00',async()=>{
   await page.setViewportSize({width:1440,height:1050});await visit('classrooms');assert.match(await page.locator('.week-grid').innerText(),/เสาร์/);assert.match(await page.locator('.week-hours').innerText(),/21:00/);await click('add-class');await loc('class-day').selectOption('เสาร์');await loc('class-subject').fill('กิจกรรมวันเสาร์ตัวอย่าง');await loc('class-start').fill('19:00');await loc('class-end').fill('21:00');await click('save-class4');assert.ok((await summary()).classes.some(c=>c.day==='เสาร์'&&c.end==='21:00'));const box=await page.locator('.week-event').filter({hasText:'กิจกรรมวันเสาร์ตัวอย่าง'}).boundingBox();assert.ok(box.height>=95&&box.height<=101);
   await seg('class-view5','agenda');await page.locator('[data-class]').first().check();await page.locator('[data-action="bulk-class4"][data-active="false"]').click();assert.equal((await summary()).classes[0].active,false);
  });
  await check('Classroom overlap is rejected and copying semesters skips existing rows',async()=>{
   await visit('classrooms');await click('add-class');await loc('class-subject').fill('กิจกรรมทับเวลา');await click('save-class4');assert.match(await page.locator('#class-error').innerText(),/ซ้อน/);await page.keyboard.press('Escape');
   for(let i=0;i<2;i++){if(i)await loc('class-semester').selectOption('2/2569');await click('copy-classes4');await click('preview-copy4');await click('confirm-copy4');assert.equal((await summary()).classes.length,6);}
  });
  await check('Schedule import explicitly uses samples and validates its effective period',async()=>{
   await visit('imports');assert.match(await page.locator('#content').innerText(),/ยังไม่อ่านตารางจากไฟล์/);await click('load-import5');assert.equal((await summary()).importRows.length,25);await loc('import-start5').fill('2027-03-14');await loc('import-end5').fill('2026-11-02');await click('review-import5');assert.match(await page.locator('#import5-error').innerText(),/วันสิ้นสุด/);await click('sample-period5');await click('review-import5');assert.equal((await summary()).importStep,2);assert.match(await page.locator('.source-note').innerText(),/ไม่สร้างข้อห้าม/);
   await loc('import-row-subject5').fill('รายวิชาตัวอย่างที่ตรวจแล้ว');await click('save-import-row5');assert.equal((await summary()).importRows[0].subject,'รายวิชาตัวอย่างที่ตรวจแล้ว');await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,'import-review-desktop-light.png'),fullPage:true});
   await click('import-summary5');await click('confirm-import5');assert.equal((await summary()).importAdded,25);assert.equal((await summary()).classes.length,28);await go('classrooms');await click('add-class');await loc('class-day').selectOption('เสาร์');await loc('class-room').selectOption('401');await loc('class-start').fill('19:00');await loc('class-end').fill('20:00');await loc('class-subject').fill('เพิ่มเองหลังนำเข้า');await click('save-class4');assert.equal((await summary()).classes.length,29);
  });
  await check('Reimport skips identical rows and DL samples do not reinterpret old times',async()=>{
   await visit('imports');for(let i=0;i<2;i++){if(i)await click('restart-import5');await click('load-import5');await click('sample-period5');await click('review-import5');await click('import-summary5');await click('confirm-import5');assert.equal((await summary()).importAdded,i?0:25);assert.equal((await summary()).classes.length,28);}
   await click('restart-import5');await loc('import-type5').selectOption('dl');await click('load-import5');await click('sample-period5');await click('review-import5');await click('import-summary5');await click('confirm-import5');assert.equal((await summary()).importAdded,0);assert.equal((await summary()).exams,18);
  });
  await check('Template creation updates Quick Log and custom Combo preview',async()=>{
   await visit('templates');await click('new-template');await loc('tpl-name').fill('ชุดงานสาธิตใหม่');await loc('tpl-kind').selectOption('combo');for(let i=0;i<2;i++){await click('tpl-add-item');await loc('tpl-item-'+i).fill('งานสาธิต '+(i+1));}await click('save-template4');assert.equal((await summary()).templateCount,10);await go('record');await click('quick-next');await page.locator('[data-action="template-run"]').filter({hasText:'ชุดงานสาธิตใหม่'}).click();assert.equal(await page.locator('.combo-check').count(),2);await page.keyboard.press('Escape');
  });
  await check('Export rejection is red with a required reason, approval downloads only own rows',async()=>{
   await visit('export');await role('staff');await loc('export4-reason').fill('วางแผนงานสาธิต');await click('export4-review');await click('create-export-request');const request=(await summary()).requests[0];assert.equal(request.status,'pending');assert.equal(await page.locator('[data-action="approved-download"]').count(),0);
   await role('superadmin');await go('export-requests');await page.locator(`[data-action="request-detail5"][data-id="${request.id}"]`).click();await click('approval-review');await click('request-reject');assert.match(await page.locator('#approval-error').innerText(),/เหตุผล/);await loc('approval-note').fill('ปรับช่วงวันที่ก่อน');await click('request-reject');await seg('approval-tab','rejected');assert.ok(await page.locator('#content .tag.red').count());assert.equal(await page.locator('#content .tag.green').count(),0);
   await role('staff');await go('export');await loc('export4-reason').fill('วางแผนงานสาธิตฉบับแก้ไข');await click('export4-review');await click('create-export-request');const second=(await summary()).requests[0];await role('superadmin');await go('export-requests');await seg('approval-tab','pending');await page.locator(`[data-action="request-detail5"][data-id="${second.id}"]`).click();await click('approval-review');await click('request-approve');await role('staff');await go('export');const [download]=await Promise.all([page.waitForEvent('download'),click('approved-download')]);const csv=fs.readFileSync(await download.path(),'utf8');assert.ok(csv.includes('เจ้าหน้าที่ A'));assert.ok(!csv.includes('เจ้าหน้าที่ B'));
  });
  await check('User role changes show before/after and require confirmation',async()=>{
   await visit('users');await page.locator('[data-action="user-inspect5"][data-id="DEMO-3"]').click();await click('user-detail');await loc('user-role').selectOption('Admin');await click('review-user4');assert.match(await page.locator('.comparison').innerText(),/ก่อนเปลี่ยน/);assert.match(await page.locator('.comparison').innerText(),/Admin/);await click('save-user4');assert.match(await page.locator('.inspector').innerText(),/Admin/);
  });
  await check('Spreadsheet worklog import remains distinct and validates/deduplicates rows',async()=>{
   await visit('data-import');await loc('tsv-data').fill('2026-02-30\t09:00\tเจ้าหน้าที่ A\tคุมสอบ DL\tวันไม่ถูกต้อง');await click('validate-tsv');assert.match(await page.locator('#content').innerText(),/แถว 1/);await click('fill-tsv');await click('validate-tsv');const n=(await summary()).logs;for(let i=0;i<2;i++){await click('review-tsv');await click('import-tsv');assert.equal((await summary()).logs,n+2);}
  });
  await check('Broadcast preview follows the draft and displays audience/reach honestly',async()=>{
   await visit('broadcast');await loc('broadcast-title').fill('หัวข้อสาธิตใหม่');await loc('broadcast-message').fill('ข้อความที่เปลี่ยนแล้ว');assert.equal(await page.locator('#message-preview-title5').innerText(),'หัวข้อสาธิตใหม่');assert.equal(await page.locator('#message-preview-body5').innerText(),'ข้อความที่เปลี่ยนแล้ว');
   await page.locator('[data-action="broadcast-channel"][data-channel="inapp"]').click();await click('broadcast4-review');assert.match(await page.locator('#toast').innerText(),/หนึ่งช่องทาง/);await page.locator('[data-action="broadcast-channel"][data-channel="push"]').click();assert.equal(await loc('broadcast-title').inputValue(),'หัวข้อสาธิตใหม่');await loc('broadcast-audience').selectOption('staff');await click('broadcast4-review');assert.match(await page.locator('#sheet').innerText(),/6 ผู้รับ/);assert.match(await page.locator('#sheet').innerText(),/บนอุปกรณ์ 0/);await click('broadcast4-send');assert.match(await page.locator('#content').innerText(),/ในแอป 0 คน/);
  });
  await check('Read/dismiss notifications update the badge and local notification center',async()=>{
   await visit('record');assert.equal(await page.locator('#app-header .unread-dot').count(),1);await click('notifications');await click('read-notifications');assert.ok((await summary()).notifications.every(n=>n.read));assert.equal(await page.locator('#app-header .unread-dot').count(),0);await click('dismiss-notification');assert.equal((await summary()).notifications.length,1);await page.screenshot({path:path.join(output,'notifications-desktop-light.png'),fullPage:false});await page.keyboard.press('Escape');
  });
  await check('Settings mobile uses category drilldown and restores saved local fields',async()=>{
   await page.setViewportSize({width:390,height:844});await visit('settings');assert.ok(await page.locator('.settings-root').isVisible());await page.locator('[data-action="settings-tab"][data-tab="general"]').click();assert.ok(await page.locator('.settings-mobile-back').isVisible());await loc('pref-editDays').fill('5');await click('save-settings4');await click('settings-back5');await page.locator('[data-action="settings-tab"][data-tab="general"]').click();assert.equal(await loc('pref-editDays').inputValue(),'5');await click('settings-back5');await page.locator('[data-action="settings-tab"][data-tab="appearance"]').click();await loc('appearance').selectOption('dark');assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');await loc('material').selectOption('solid');assert.equal(await page.locator('html').getAttribute('data-material'),'solid');await page.locator('[data-key="motion"]').click();assert.equal(await page.locator('html').getAttribute('data-reduce-motion'),'true');
  });
  await check('Dashboard distribution and heatmap respect the same selected person',async()=>{
   await page.setViewportSize({width:1440,height:1050});await visit('dashboard');await loc('analytics-person').selectOption('DEMO-1');await click('work-distribution5');assert.match(await page.locator('#sheet').innerText(),/9 รายการ/);assert.match(await page.locator('#sheet').innerText(),/งานในหน้าที่หลัก/);assert.match(await page.locator('#sheet').innerText(),/หัวข้อรองทั้งหมด/);assert.ok(!/เจ้าหน้าที่ B/.test(await page.locator('#sheet').innerText()));await page.keyboard.press('Escape');await click('show-time-pattern5');assert.equal(await page.locator('.heatmap button').evaluateAll(nodes=>nodes.reduce((n,b)=>n+Number(b.textContent),0)),9);await page.keyboard.press('Escape');
  });
  await check('Heatmap keeps full-opacity text and mobile controls provide touch targets',async()=>{
   await page.setViewportSize({width:390,height:844});await visit('dashboard');await click('show-time-pattern5');assert.ok(await page.locator('.heatmap button').evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n).opacity==='1'&&n.getBoundingClientRect().width>=44&&n.getBoundingClientRect().height>=44)));await page.keyboard.press('Escape');await visit('record');assert.ok(await page.locator('.segment button').evaluateAll(nodes=>nodes.every(n=>n.getBoundingClientRect().height>=44)));
  });
  await check('Dialog keeps keyboard focus and content clears mobile navigation after scrolling',async()=>{
   await visit('record');await tpl(3);for(let i=0;i<17;i++){await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.querySelector('#sheet').contains(document.activeElement)));}await page.screenshot({path:path.join(output,'combo-mobile-light.png'),fullPage:false});await page.keyboard.press('Escape');await page.waitForFunction(()=>document.activeElement?.dataset.action==='template-run');await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));const b=await page.evaluate(()=>({last:Math.max(...[...document.querySelectorAll('#content>.workspace-split>div>.panel')].map(n=>n.getBoundingClientRect().bottom)),nav:document.querySelector('#mobile-nav').getBoundingClientRect().top}));assert.ok(b.last<b.nav-5);
  });
  await check('Offline blocks worklog mutations; empty/error/loading and retry remain visible',async()=>{
   await visit('record');await page.evaluate(()=>window.designReview.setState('offline'));const n=(await summary()).logs;await tpl(3);await loc('combo-recipient').fill('ผู้รับบริการตัวอย่าง');await click('combo-review');await click('combo-save');assert.equal((await summary()).logs,n);assert.match(await page.locator('#toast').innerText(),/ออฟไลน์/);await page.keyboard.press('Escape');for(const value of ['empty','error','loading']){await page.evaluate(v=>window.designReview.setState(v),value);assert.ok(await page.locator(value==='loading'?'[aria-busy="true"]':'.empty-state').count());}await page.evaluate(()=>window.designReview.setState('error'));await click('retry');assert.ok(await act('template-run').isVisible());
  });
  await check('Cleanup has explicit impact preview and reversible local result',async()=>{
   await visit('cleanup');await click('review-cleanup5');assert.match(await page.locator('#sheet').innerText(),/เก็บรายการ A/);await click('confirm-cleanup5');assert.match(await page.locator('#content').innerText(),/เก็บรายการที่เลือก/);await click('undo-cleanup5');assert.equal(await page.locator('.comparison>div').count(),2);
  });
  await check('Staff sees read-only timetables, own worklogs and personal settings',async()=>{
   await visit('record');await role('staff');assert.equal(await page.locator('#app-sidebar a[href="#/users"]').count(),0);await go('classrooms');assert.equal(await page.locator('[data-action="add-class"]').count(),0);await page.locator('[data-action="view-class5"]').first().click();assert.equal(await page.locator('#sheet [data-action="save-class4"]').count(),0);await page.keyboard.press('Escape');await go('settings');assert.equal(await page.locator('[data-action="settings-tab"][data-tab="security"]').count(),0);await go('users');assert.match(await page.locator('#content').innerText(),/ไม่มีสิทธิ์/);
  });
  await check('Authentication pages use their own shell and never show work navigation',async()=>{
   await visit('login');assert.equal(await page.locator('#app-sidebar').isVisible(),false);assert.equal(await page.locator('#mobile-nav').isVisible(),false);await visit('pending');assert.equal(await page.locator('#app-header').isVisible(),false);assert.match(await page.locator('h1').innerText(),/รออนุมัติ/);
  });
  await check('All thirty views fit 375, 760, 768 and 1024 pixel widths',async()=>{
   for(const width of [375,760,768,1024]){await page.setViewportSize({width,height:900});for(const route of routes){await visit(route.id);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}/${route.id} overflow`);}}
  });
  assert.deepEqual(errors,[],'browser runtime errors');assert.ok(network.every(u=>/^http:\/\/127\.0\.0\.1:4195\//.test(u)||/^https:\/\/(fonts.googleapis.com|fonts.gstatic.com)\//.test(u)),'unexpected external data request');
  const renderCount=results.filter(r=>r.name.startsWith('render ')).length;
  fs.writeFileSync(path.join(output,only?'interactions.json':'report.json'),JSON.stringify({date:'2026-11-04',revision:5,routeCount:30,renderCount,interactionCount:results.length-renderCount,results,errors,origins:[...new Set(network.map(u=>new URL(u).origin))],limitations:['Synthetic local UI prototype; no production writes or authentication','Import workflow uses explicit samples; no PDF/OCR extraction','Safari/iOS and screen-reader UAT pending','CSS materials approximate the design; native Apple rendering is not claimed']},null,2));
  console.log(`Verified ${renderCount} views and ${results.length-renderCount} interaction scenarios.`);
 }finally{await browser.close();}
}
main().catch(e=>{fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify({error:e.stack,errors,results},null,2));console.error(e);process.exitCode=1;});
