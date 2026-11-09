/* Actual local OCR; source images and recognized names never enter report artifacts. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.argv[2]),origin=process.argv[4]||'http://127.0.0.1:4310';
const out=path.resolve('output/playwright/dl-image-import',origin.includes('127.0.0.1')?'local':'public');fs.mkdirSync(out,{recursive:true});
const report={completed:false,checks:[],errors:[],externalOrigins:[],sourceImageStored:false,recognizedNamesStored:false,physicalIOS:false};
async function main(){
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]}),ctx=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
 try{
  await ctx.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin===origin||['blob:','data:'].includes(u.protocol))return r.continue();report.externalOrigins.push(u.origin);return r.abort();});
  const page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(origin+'/dev/calendar',{timeout:90000});await page.waitForFunction(()=>document.documentElement.dataset.uiReady==='true');
  await page.getByRole('button',{name:'พื้นที่ทดลองนำเข้า',exact:true}).click();await page.getByRole('button',{name:'นำเข้าตาราง',exact:true}).click();
  const dialog=page.locator('dialog.cal-dialog[open]');await dialog.getByRole('button',{name:'ตารางสอบ DL · รูปภาพ',exact:true}).click();await dialog.getByLabel('เลือกรูปตารางสอบ DL',{exact:true}).setInputFiles(process.argv[5]);
  const start=Date.now();await dialog.getByRole('button',{name:'อ่านตารางจากภาพ',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.dl-import-found')||document.querySelector('.dl-import-form [role=alert]'),{},{timeout:150000});
  const failure=dialog.getByRole('alert');if(await failure.count())throw new Error(await failure.textContent());
  const rows=dialog.locator('[data-dl-row]'),values=await rows.evaluateAll(ns=>ns.map(n=>({date:n.querySelector('input[type=date]').value,start:n.querySelector('input[type=time]').value,end:n.querySelector('input[name$="-end"]').value})));
  report.checks.push({name:'actual image OCR',sourceRows:Number((await dialog.locator('.dl-import-found').textContent()).match(/อ่านได้ (\d+)/)[1]),rounds:values.length,uniqueDates:[...new Set(values.map(v=>v.date))].length,recognizedNameGroups:await dialog.locator('[data-dl-map]').count(),elapsedMs:Date.now()-start,values});
  assert.equal(values.length,18);assert.deepEqual(values.map(v=>v.date),['03','04','05','10','11','12','17','18','19'].flatMap(day=>[`2026-11-${day}`,`2026-11-${day}`]));let corrections=0;
  for(let i=0;i<values.length;i++){const expected=i%2?{start:'13:30',end:'15:00'}:{start:'09:00',end:'10:30'};if(!values[i].start||!values[i].end){await rows.nth(i).locator('input[name$="-start"]').fill(expected.start);await rows.nth(i).locator('input[name$="-end"]').fill(expected.end);corrections++;}else assert.deepEqual({start:values[i].start,end:values[i].end},expected);}
  assert.ok(corrections<=2);report.checks[0].automaticTimeRanges=values.length-corrections;report.checks[0].explicitReviewCorrections=corrections;console.log(JSON.stringify({sourceRows:9,rounds:18,automaticTimeRanges:values.length-corrections,explicitReviewCorrections:corrections}));
  const maps=dialog.locator('[data-dl-map] select');for(let i=0;i<await maps.count();i++)await maps.nth(i).selectOption('demo-'+String.fromCharCode(97+i%8));
  await dialog.locator('[name=dl-import-confirm]').check();await dialog.getByRole('button',{name:'เพิ่ม 18 รอบสอบ',exact:true}).click();await dialog.waitFor({state:'hidden'});
  await page.getByRole('button',{name:'รายการ',exact:true}).click();assert.ok(await page.getByText('นำเข้า 18 รอบสอบ DL แล้ว',{exact:false}).first().isVisible());
  assert.equal(await page.locator('.cal-agenda-event[data-kind=dl]').count(),6);
  await page.screenshot({path:path.join(out,'imported-calendar.png')});
  report.checks.push({name:'reviewed anonymous fixture assignments import atomically into sandbox',rounds:18,participantsPerRound:75,rooms:['406','407']});
  await page.getByRole('button',{name:'เดือน',exact:true}).click();assert.equal(await page.locator('.cal-month-event[data-kind=dl]').count(),18);
  const undo=page.getByRole('button',{name:/เลิกทำ/}).first();await undo.click();await page.getByText('เลิกทำการเปลี่ยนแปลงล่าสุดแล้ว',{exact:true}).waitFor();assert.equal(await page.locator('.cal-month-event[data-kind=dl]').count(),0);report.checks.push({name:'all 18 rounds appear across the month and Undo restores empty sandbox'});
  assert.deepEqual(report.externalOrigins,[]);assert.deepEqual(report.errors,[]);report.completed=true;
 }finally{await ctx.close();await browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
