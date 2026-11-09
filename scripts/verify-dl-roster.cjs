/* Anonymous local OCR and tab-local reviewed roster integration checks. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.argv[2]),origin=process.argv[4]||'http://127.0.0.1:4310';
const out=path.resolve('output/playwright/dl-image-roster',origin.includes('127.0.0.1')?'local':'public');fs.mkdirSync(out,{recursive:true});
const report={completed:false,checks:[],errors:[],externalOrigins:[],writeRequests:[],physicalIOS:false};
const names=['ผู้คุมทดลอง ก','ผู้คุมทดลอง กข','ผู้คุมทดลอง ค'];
async function main(){
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]});
 try{
  for(const width of [1440,390]){
   const ctx=await browser.newContext({viewport:{width,height:1000},isMobile:width<760,hasTouch:width<760,colorScheme:width<760?'dark':'light',serviceWorkers:'block'});
   await ctx.route('**/*',r=>{const req=r.request(),u=new URL(req.url());if(!['GET','HEAD'].includes(req.method()))report.writeRequests.push(u.pathname);if(u.origin===origin||['blob:','data:'].includes(u.protocol))return r.continue();report.externalOrigins.push(u.origin);return r.abort();});
   const p=await ctx.newPage();p.on('pageerror',e=>report.errors.push(e.message));
   await p.goto(origin+'/dev/calendar',{timeout:90000});await p.waitForFunction(()=>document.documentElement.dataset.uiReady==='true');
   await p.getByRole('button',{name:'พื้นที่ทดลองนำเข้า',exact:true}).click();
   const dialog=p.locator('dialog.cal-dialog[open]');
   const launch=async()=>{await p.getByRole('button',{name:'นำเข้าตาราง',exact:true}).click();await dialog.getByRole('button',{name:'ตารางสอบ DL · รูปภาพ',exact:true}).click();};
   await launch();
   const buffer=Buffer.from(await p.evaluate(()=>{const c=document.createElement('canvas');c.width=900;c.height=220;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,900,220);g.strokeStyle='#000';for(const y of [80,112,182]){g.beginPath();g.moveTo(30,y);g.lineTo(870,y);g.stroke();}for(const x of [30,330,510,690,870]){g.beginPath();g.moveTo(x,112);g.lineTo(x,182);g.stroke();}g.fillStyle='#000';g.font='17px Arial';g.fillText('24/11/69 09.00 - 10.30',42,137);g.fillText('24/11/69 17.00 - 18.30',42,165);for(let j=0;j<3;j++)g.fillText('Staff '+String.fromCharCode(65+j),370+j*180,151);return c.toDataURL('image/png').split(',')[1];}),'base64');
   await dialog.getByLabel('เลือกรูปตารางสอบ DL',{exact:true}).setInputFiles({name:'anonymous-roster.png',mimeType:'image/png',buffer});await dialog.getByRole('button',{name:'อ่านตารางจากภาพ',exact:true}).click();await dialog.locator('.dl-import-found').waitFor({timeout:150000});
   const cards=dialog.locator('[data-dl-map]'),select=cards.locator('select');assert.equal(await cards.count(),3);assert.equal(await select.first().locator('option').count(),10);assert.equal(await select.first().inputValue(),'');
   await cards.first().locator('input').fill('');await cards.first().getByRole('button',{name:'ใช้ชื่อนี้ชั่วคราว',exact:true}).click();assert.ok(await cards.first().getByRole('alert').isVisible());assert.ok(await cards.first().locator('input').evaluate(n=>n===document.activeElement));
   for(let i=0;i<3;i++){await cards.nth(i).locator('input').fill(names[i]);await cards.nth(i).getByRole('button',{name:'ใช้ชื่อนี้ชั่วคราว',exact:true}).click();}
   const ids=await select.evaluateAll(ns=>ns.map(n=>n.value));assert.equal(new Set(ids).size,3);assert.ok(ids.every(id=>id.startsWith('dl-person-')));assert.equal(await select.first().locator('option').count(),13);
   // Explicit use of the same normalized name reuses identity; repeated assignment is blocked.
   await cards.first().getByRole('button',{name:'ใช้ชื่อนี้ชั่วคราว',exact:true}).click();assert.equal(await select.first().inputValue(),ids[0]);assert.equal(await select.first().locator('option').count(),13);
   await cards.nth(1).locator('input').fill(names[0]);assert.equal(await select.nth(1).inputValue(),'');await cards.nth(1).getByRole('button',{name:'ใช้ชื่อนี้ชั่วคราว',exact:true}).click();assert.equal(await select.nth(1).inputValue(),ids[0]);assert.ok(await dialog.locator('[data-dl-row] .cal-form-error').count()>0);
   await cards.nth(1).locator('input').fill(names[1]);await cards.nth(1).getByRole('button',{name:'ใช้ชื่อนี้ชั่วคราว',exact:true}).click();assert.equal(await select.nth(1).inputValue(),ids[1]);
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));const bounds=await cards.locator('input,select').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth,font:parseFloat(getComputedStyle(n).fontSize)};}));assert.ok(bounds.every(r=>r.left>=0&&r.right<=r.width+1&&(width>=760||r.font>=16)),JSON.stringify(bounds));
   await cards.first().scrollIntoViewIfNeeded();await p.screenshot({path:path.join(out,`review-${width}.png`)});
   await dialog.locator('[name=dl-import-confirm]').check();await dialog.getByRole('button',{name:'เพิ่ม 2 รอบสอบ',exact:true}).click();await dialog.waitFor({state:'hidden'});
   await p.getByRole('button',{name:'รายการ',exact:true}).click();assert.equal(await p.locator('.cal-agenda-event[data-kind=dl]').count(),2);
   const detail=async()=>{await p.locator('.cal-agenda-event[data-kind=dl]').first().click();for(const name of names)assert.ok((await dialog.locator('.cal-detail-facts').textContent()).includes(name));};
   await detail();await p.screenshot({path:path.join(out,`detail-${width}.png`)});await dialog.getByRole('button',{name:'แก้ไขตาราง',exact:true}).click();for(const name of names)assert.ok(await dialog.getByRole('checkbox',{name,exact:true}).isChecked());await dialog.getByRole('button',{name:'ยกเลิก',exact:true}).click();
   report.checks.push({name:`${width}px: actual anonymous OCR, reviewed names, exact reuse, similar names distinct, duplicate guard, import/detail/edit identity and input containment`,passed:true});
   if(width===1440){
    await p.locator('a[href="/admin/record"]:visible').first().click();await p.waitForURL('**/dev/record');await p.locator('a[href="/calendar"]:visible').first().click();await p.waitForURL('**/dev/calendar');await detail();await p.keyboard.press('Escape');
    await launch();await dialog.getByRole('button',{name:'เพิ่มรายการเอง',exact:true}).click();for(const name of names)assert.equal(await dialog.locator('[data-dl-row] select').first().getByRole('option',{name:name+' · ทดลอง',exact:true}).count(),1);await p.keyboard.press('Escape');
    await p.getByRole('button',{name:'เลิกทำ',exact:true}).click();assert.equal(await p.locator('.cal-agenda-event[data-kind=dl]').count(),0);
    const persisted=await p.evaluate(()=>JSON.stringify({local:{...localStorage},session:{...sessionStorage}}));for(const name of names)assert.ok(!persisted.includes(name));
    await p.reload();await p.waitForFunction(()=>document.documentElement.dataset.uiReady==='true');await launch();await dialog.getByRole('button',{name:'เพิ่มรายการเอง',exact:true}).click();assert.equal(await dialog.locator('[data-dl-row] select').first().locator('option').count(),10);await p.keyboard.press('Escape');
    report.checks.push({name:'client navigation and reopen retain roster; Undo removes events; names absent from Web Storage; reload clears temporary roster',passed:true});
   }
   await ctx.close();
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalOrigins,[]);assert.deepEqual(report.writeRequests,[]);report.completed=true;
 }finally{await browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));}
 console.log('PASS DL roster: '+report.checks.length+' groups');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
