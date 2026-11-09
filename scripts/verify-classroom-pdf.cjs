/* Real browser/file/worker verification, with anonymous PDF inputs only. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.argv[2]),origin=process.argv[4]||'http://127.0.0.1:4310';
const runtimePdf=process.argv[5];
const browserName=/chrome.exe$/i.test(process.argv[3])?'chrome':'edge';
const out=path.resolve('output/playwright/classroom-pdf-import',origin.includes('127.0.0.1')?'browser':'public',browserName);fs.mkdirSync(out,{recursive:true});
const report={completed:false,browser:browserName,checks:[],errors:[],httpErrors:[],readerSource:runtimePdf?'Bundled test tool PDF.js 5.6.205; installed application dependency still requires approval':'Application self-hosted PDF.js',externalRequests:[]};
async function main(){
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]});
 try {
  for(const width of [1440,390])for(const theme of ['light','dark']){
   const ctx=await browser.newContext({viewport:{width,height:1000},isMobile:width===390,hasTouch:width===390,colorScheme:theme,serviceWorkers:'block'});
   let holdReader=false,releaseReader,readerRequested=()=>{},workerRequests=0;
   await ctx.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/dev-pdfjs/pdf.mjs'&&holdReader){readerRequested();await new Promise(resolve=>{releaseReader=resolve;});}
    if(url.pathname==='/dev-pdfjs/pdf.worker.min.mjs')workerRequests++;
    if(runtimePdf&&url.pathname.startsWith('/dev-pdfjs/')){
      const file=path.basename(url.pathname);if(!['pdf.mjs','pdf.worker.min.mjs'].includes(file))return route.abort();
      return route.fulfill({path:path.join(runtimePdf,'build',file),contentType:'text/javascript'});
    }
    if(url.origin===origin||['data:','blob:'].includes(url.protocol))return route.continue();report.externalRequests.push(url.origin);return route.abort();
   });
   const page=await ctx.newPage();page.on('pageerror',error=>report.errors.push(error.message));
   page.on('response',response=>{if(response.status()>=400&&['script','stylesheet','document'].includes(response.request().resourceType()))report.httpErrors.push({status:response.status(),path:new URL(response.url()).pathname});});
   page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
   await page.goto(origin+'/dev/calendar',{timeout:90000});await page.waitForFunction(()=>document.documentElement.dataset.uiReady==='true');
   await page.getByRole('group',{name:'เลือกชุดข้อมูลปฏิทิน',exact:true}).getByRole('button',{name:'พื้นที่ทดลองนำเข้า',exact:true}).click();
   const dialog=page.locator('dialog.cal-import-dialog[open]');
   const open=()=>page.getByRole('button',{name:'นำเข้าตาราง',exact:true}).click();
   const upload=()=>dialog.locator('input[type=file]').setInputFiles(path.resolve('output/playwright/classroom-pdf-import/anonymous-timetable.pdf'));
   await open();await dialog.locator('input[type=file]').setInputFiles({name:'wrong.pdf',mimeType:'application/pdf',buffer:Buffer.from('not a pdf')});await dialog.getByRole('alert').filter({hasText:'ไม่ใช่ PDF'}).waitFor();await dialog.getByRole('button',{name:'ยกเลิก',exact:true}).click();assert.equal(await page.locator('.cal-undo').count(),0);
   await open();holdReader=true;const loading=new Promise(resolve=>{readerRequested=resolve;});await upload();await loading;await dialog.getByRole('button',{name:'ยกเลิก',exact:true}).click();holdReader=false;releaseReader();await page.waitForTimeout(300);assert.equal(workerRequests,0,'Cancel during module loading must not start a PDF worker');assert.equal(await page.locator('.cal-undo').count(),0);
   await open();await upload();try {await dialog.getByRole('heading',{name:'ตรวจรายการ · 2 รายการ',exact:true}).waitFor({timeout:20000});}catch(error){report.failure=await dialog.innerText();await page.screenshot({path:path.join(out,'failure.png')});throw error;}
   const terms=dialog.locator('.cal-import-term');
   assert.equal(await terms.locator('input[type=date]').nth(0).inputValue(),'2026-11-23');assert.equal(await terms.locator('input[type=date]').nth(1).inputValue(),'2027-03-14');
   await terms.locator('input[type=date]').nth(0).fill('');await terms.locator('input[type=date]').nth(1).fill('');
   const confirm=dialog.getByRole('checkbox',{name:'ตรวจเทียบ PDF และยืนยันชื่อ วัน เวลา ห้อง และช่วงภาคเรียนแล้ว'});
   await confirm.check();
   await dialog.getByRole('button',{name:'กำหนดช่วงภาคเรียน',exact:true}).click();
   assert.equal(await terms.locator('input[type=date]').nth(0).evaluate(el=>el===document.activeElement),true);
   await terms.locator('input[type=date]').nth(0).fill('2026-11-23');
   await dialog.getByRole('button',{name:'กำหนดช่วงภาคเรียน',exact:true}).click();
   assert.equal(await terms.locator('input[type=date]').nth(1).evaluate(el=>el===document.activeElement),true);
   await page.screenshot({path:path.join(out,`missing-date-${width}-${theme}.png`)});
   await terms.locator('input[type=date]').nth(1).fill('2026-12-07');
   assert.equal(await dialog.locator('.cal-import-row').count(),2);assert.equal(await dialog.locator('.cal-import-row').first().locator('input[type=time]').nth(0).inputValue(),'17:00');assert.equal(await dialog.locator('.cal-import-row').last().locator('input[type=time]').nth(1).inputValue(),'21:00');
   await dialog.getByRole('button',{name:'ยืนยันการตรวจรายการ',exact:true}).click();assert.equal(await confirm.evaluate(el=>el===document.activeElement),true);
   const save=dialog.getByRole('button',{name:'เพิ่ม 2 ตาราง',exact:true});
   await dialog.locator('.cal-import-row').first().getByLabel('ชื่อวิชา / รายละเอียด',{exact:true}).fill('วิชาทดสอบแก้ไข');
   await confirm.check();assert.equal(await save.isEnabled(),true);
   const bounds=await dialog.evaluate(el=>({width:el.getBoundingClientRect().width,viewport:innerWidth,scroll:el.scrollWidth,client:el.clientWidth,theme:document.documentElement.dataset.uiTheme}));assert.ok(bounds.width<=width);assert.ok(bounds.scroll<=bounds.client+1);assert.equal(bounds.theme,theme);
   if(width===390)for(const input of await dialog.locator('input[type=date],input[type=time]').all()) assert.ok(await input.evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16));
   await dialog.locator('.cal-import-rows').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,`preview-${width}-${theme}.png`)});
   await save.click();await page.locator('.cal-undo').filter({hasText:'นำเข้า 2 ตารางรายสัปดาห์แล้ว'}).waitFor();
   await open();await upload();await dialog.getByRole('heading',{name:'ตรวจรายการ · 2 รายการ',exact:true}).waitFor();await terms.locator('input[type=date]').nth(0).fill('2026-11-23');await terms.locator('input[type=date]').nth(1).fill('2026-12-07');await dialog.locator('.cal-form-error').filter({hasText:/เวลาชนกับ|มีรายการซ้ำกับ/}).first().waitFor();await dialog.getByRole('button',{name:'ตรวจจุดที่ต้องแก้',exact:true}).click();assert.equal(await dialog.locator('.cal-import-row[data-issue=true]').first().evaluate(el=>el===document.activeElement),true);assert.equal(await dialog.getByRole('button',{name:'เพิ่ม 2 ตาราง',exact:true}).count(),0);await dialog.getByRole('button',{name:'ยกเลิก',exact:true}).click();
   await page.locator('.cal-undo').getByRole('button',{name:'เลิกทำ',exact:true}).click();assert.equal(await page.locator('.cal-undo').count(),0);
   await open();await upload();await dialog.getByRole('heading',{name:'ตรวจรายการ · 2 รายการ',exact:true}).waitFor();await terms.locator('input[type=date]').nth(0).fill('2026-11-23');await terms.locator('input[type=date]').nth(1).fill('2026-12-07');assert.equal(await dialog.locator('.cal-form-error').count(),0);await page.keyboard.press('Escape');
   await page.locator('.cal-inspector summary').click();await page.locator('.cal-inspector select').selectOption('staff');assert.equal(await page.getByRole('button',{name:'นำเข้าตาราง',exact:true}).isDisabled(),true);
   report.checks.push({width,theme,status:'passed',tests:['invalid signature/cancel','cancel during deferred reader load','real PDF worker and merged slots','gray annotation ignored','missing-date action scrolls/focuses exact start/end','confirmation action focuses checkbox','edit/explicit dates/confirm','atomic commit','duplicate prevention with actionable focus','Undo restores importability','staff guard','input 16px and no overflow']});await ctx.close();
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);assert.deepEqual(report.httpErrors,[]);report.completed=true;
 }finally{await browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));}
 console.log(`PASS ${report.checks.length} viewport/theme cases; PDF worker, review, duplicates, cancel and Undo`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
