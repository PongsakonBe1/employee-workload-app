/* Synthetic, anonymous ruled-image UI flows including actual OCR and cancellation. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.argv[2]),origin=process.argv[4]||'http://127.0.0.1:4310',name=/chrome.exe$/i.test(process.argv[3])?'chrome':'edge';
const out=path.resolve(process.argv[5]==='calendar-data-adapter'?'output/playwright/calendar-data-adapter/regression-dl':'output/playwright/dl-image-import/flows',origin.includes('127.0.0.1')?'local':'public',name);fs.mkdirSync(out,{recursive:true});
const report={completed:false,checks:[],errors:[],externalOrigins:[],writeRequests:[],physicalIOS:false};
async function main(){
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]});
 async function context(options={}){const ctx=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block',...options});await ctx.route('**/*',r=>{const req=r.request(),u=new URL(req.url());if(!['GET','HEAD'].includes(req.method()))report.writeRequests.push({method:req.method(),path:u.pathname});if(u.origin===origin||['blob:','data:'].includes(u.protocol))return r.continue();report.externalOrigins.push(u.origin);return r.abort();});return ctx;}
 const open=async page=>{page.on('pageerror',e=>report.errors.push(e.message));await page.goto(origin+'/dev/calendar',{timeout:90000});await page.waitForFunction(()=>document.documentElement.dataset.uiReady==='true');};
 const importDialog=page=>page.locator('dialog.cal-dialog[open]');
 const launch=async page=>{await page.getByRole('button',{name:'นำเข้าตาราง',exact:true}).click();await importDialog(page).getByRole('button',{name:'ตารางสอบ DL · รูปภาพ',exact:true}).click();};
 const fixture=async (page,count=2)=>({name:'dl-anonymous.png',mimeType:'image/png',buffer:Buffer.from(await page.evaluate(count=>{const c=document.createElement('canvas');c.width=900;c.height=140+count*70;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,900,c.height);g.strokeStyle='#000';g.lineWidth=1;for(const y of [80,112,...Array.from({length:count},(_,i)=>112+(i+1)*70)]){g.beginPath();g.moveTo(30,y);g.lineTo(870,y);g.stroke();}for(const x of [30,330,510,690,870]){g.beginPath();g.moveTo(x,112);g.lineTo(x,112+count*70);g.stroke();}g.fillStyle='#000';g.font='18px Arial';g.fillText('DL schedule - 75 participants per round',36,45);g.font='17px Arial';for(let i=0;i<count;i++){const y=112+i*70;g.fillText(`${count===2?24+i:i+1}/11/69 09.00 - 10.30`,42,y+25);g.fillText(`${count===2?24+i:i+1}/11/69 17.00 - 18.30`,42,y+53);for(let j=0;j<3;j++)g.fillText('Staff '+String.fromCharCode(65+j),370+j*180,y+39);}return c.toDataURL('image/png').split(',')[1];},count),'base64')});
 const read=async(page,file)=>{const d=importDialog(page);await d.getByLabel('เลือกรูปตารางสอบ DL',{exact:true}).setInputFiles(file);await d.getByRole('button',{name:'อ่านตารางจากภาพ',exact:true}).click();await d.locator('.dl-import-found').waitFor({timeout:150000});};
 const match=async page=>{const maps=importDialog(page).locator('[data-dl-map] select');assert.equal(await maps.count(),3);for(let i=0;i<3;i++)await maps.nth(i).selectOption('demo-'+String.fromCharCode(97+i));};
 try{
  const ctx=await context(),page=await ctx.newPage();await open(page);
  let ocrRequests=0;page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/dev-ocr/'))ocrRequests++;});
  await page.getByRole('button',{name:'เลือกวันที่',exact:true}).click();await importDialog(page).locator('input[type=date]').fill('2026-11-24');await importDialog(page).getByRole('button',{name:'ไปยังวันที่นี้',exact:true}).click();
  await page.getByRole('button',{name:'รายการ',exact:true}).click();const sampleCount=await page.locator('.cal-agenda-event').count();assert.ok(sampleCount>0);assert.equal(ocrRequests,0);
  await page.getByRole('button',{name:'พื้นที่ทดลองนำเข้า',exact:true}).click();await launch(page);const d=importDialog(page),file=await fixture(page);await read(page,file);assert.ok(ocrRequests>0);
  const rows=d.locator('[data-dl-row]');assert.equal(await rows.count(),4);assert.equal(await rows.locator('input[type=time]').evaluateAll(ns=>ns.filter(n=>n.value==='17:00').length),2);
  await d.getByRole('button',{name:/ตรวจ \d+ จุดที่ต้องแก้/}).click();assert.ok(await d.locator('[data-dl-map] select').first().evaluate(n=>n===document.activeElement));await match(page);
  const count=d.locator('[name=dl-import-participants]');await count.fill('0');await d.getByRole('button',{name:/ตรวจ \d+ จุด/}).click();assert.ok(await count.evaluate(n=>n===document.activeElement));await count.fill('75');
  const date=rows.first().locator('input[type=date]');await date.fill('');await d.getByRole('button',{name:/ตรวจ \d+ จุด/}).click();assert.ok(await date.evaluate(n=>n===document.activeElement));await date.fill('2026-11-24');
  await d.getByRole('button',{name:'ยืนยันการตรวจรายการ',exact:true}).click();assert.ok(await d.locator('[name=dl-import-confirm]').evaluate(n=>n===document.activeElement));await page.keyboard.press('Space');assert.ok(await d.getByRole('button',{name:'เพิ่ม 4 รอบสอบ',exact:true}).isVisible());
  await d.evaluate(n=>{n.querySelectorAll('details').forEach(x=>{x.open=false;});});await d.locator('.ui-dialog-body').evaluate(n=>n.scrollTop=0);await page.screenshot({path:path.join(out,'review-desktop-light.png')});
  await rows.first().scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'review-rows-desktop-light.png')});
  await d.getByRole('button',{name:'เพิ่ม 4 รอบสอบ',exact:true}).click();await d.waitFor({state:'hidden'});assert.equal(await page.locator('.cal-agenda-event[data-kind=dl]').count(),4);
  await page.locator('.cal-agenda-event[data-kind=dl]').first().click();assert.ok(await importDialog(page).getByText('75 คนต่อรอบ',{exact:false}).isVisible());await page.keyboard.press('Escape');
  report.checks.push({name:'lazy self-hosted real OCR of anonymous image; evening rounds, actionable focus, explicit review and four-round sandbox import',passed:true});
  await launch(page);await read(page,file);await match(page);await d.locator('[name=dl-import-confirm]').check();assert.equal(await d.getByRole('button',{name:'เพิ่ม 4 รอบสอบ',exact:true}).count(),0);assert.ok((await d.locator('.cal-form-error').allTextContents()).some(t=>t.includes('ซ้ำหรือชน')));await page.keyboard.press('Escape');assert.equal(await page.locator('.cal-agenda-event[data-kind=dl]').count(),4);
  await page.getByRole('button',{name:'เลิกทำ',exact:true}).click();await page.getByText('เลิกทำการเปลี่ยนแปลงล่าสุดแล้ว',{exact:true}).waitFor();assert.equal(await page.locator('.cal-agenda-event').count(),0);await page.getByRole('button',{name:'ชุดตัวอย่าง',exact:true}).click();assert.equal(await page.locator('.cal-agenda-event').count(),sampleCount);
  report.checks.push({name:'duplicate import blocked atomically; Undo preserves original sample dataset',passed:true});
  await page.locator('.cal-inspector>summary').click();await page.locator('.cal-inspector select').selectOption('staff');assert.ok(await page.getByRole('button',{name:'นำเข้าตาราง',exact:true}).isDisabled());report.checks.push({name:'Staff cannot import',passed:true});await ctx.close();

  for(const width of [390,768]){
   const mobile=await context({viewport:{width,height:900},isMobile:true,hasTouch:true,colorScheme:'dark'}),p=await mobile.newPage();await open(p);await p.getByRole('button',{name:'พื้นที่ทดลองนำเข้า',exact:true}).click();await launch(p);await read(p,await fixture(p));await match(p);const form=importDialog(p);
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.ok(await form.locator('input[type=date],input[type=time],select').evaluateAll(ns=>ns.every(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&parseFloat(getComputedStyle(n).fontSize)>=16;})));
   await form.locator('.ui-dialog-body').evaluate(n=>n.scrollTop=0);await p.screenshot({path:path.join(out,`review-${width}-dark.png`)});await form.locator('[data-dl-row]').first().scrollIntoViewIfNeeded();await p.screenshot({path:path.join(out,`review-rows-${width}-dark.png`)});await form.locator('[name=dl-import-confirm]').check();await form.getByRole('button',{name:'เพิ่ม 4 รอบสอบ',exact:true}).click();await form.waitFor({state:'hidden'});
   report.checks.push({name:`touch ${width}px real OCR review/import; date/time containment and 16px inputs`,passed:true});await mobile.close();
  }
  // Hold the API response to exercise cancellation before model initialization.
  const cancelling=await context(),p=await cancelling.newPage();await open(p);await launch(p);const f=await fixture(p);let release,requestedResolve;const requested=new Promise(resolve=>{requestedResolve=resolve;});
  await cancelling.route('**/dev-ocr/tesseract.esm.min.js',async r=>{requestedResolve();await new Promise(resolve=>{release=resolve;});await r.continue();});
  const form=importDialog(p);await form.getByLabel('เลือกรูปตารางสอบ DL',{exact:true}).setInputFiles(f);await form.getByRole('button',{name:'อ่านตารางจากภาพ',exact:true}).click();await requested;await form.getByRole('button',{name:'หยุดอ่านภาพ',exact:true}).click();await form.getByRole('button',{name:'อ่านตารางจากภาพ',exact:true}).waitFor();release();await p.waitForTimeout(200);assert.equal(await form.locator('[data-dl-row]').count(),0);
  await form.getByLabel('เลือกรูปตารางสอบ DL',{exact:true}).setInputFiles({name:'wrong.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-not-an-image')});await form.getByRole('alert').waitFor();assert.ok((await form.getByRole('alert').textContent()).includes('PNG/JPEG'));
  report.checks.push({name:'cancel during delayed startup leaves no stale results; wrong file rejected',passed:true});
  await cancelling.unroute('**/dev-ocr/tesseract.esm.min.js');
  await form.getByLabel('เลือกรูปตารางสอบ DL',{exact:true}).setInputFiles(await fixture(p,20));await form.getByRole('button',{name:'อ่านตารางจากภาพ',exact:true}).click();await form.getByText('กำลังอ่านวัน เวลา และผู้คุมสอบ…',{exact:true}).waitFor({timeout:30000});await form.getByRole('button',{name:'หยุดอ่านภาพ',exact:true}).click();await form.getByRole('button',{name:'อ่านตารางจากภาพ',exact:true}).waitFor();await p.waitForTimeout(300);assert.equal(await form.locator('[data-dl-row]').count(),0);
  await read(p,f);assert.equal(await form.locator('[data-dl-row]').count(),4);report.checks.push({name:'cancel during active recognition terminates worker; subsequent OCR succeeds without stale results',passed:true});await cancelling.close();
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalOrigins,[]);assert.deepEqual(report.writeRequests,[]);report.completed=true;
 }finally{await browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));}
 console.log('PASS DL image flows: '+report.checks.length+' groups');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
