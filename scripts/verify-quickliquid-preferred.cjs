// Reviewer-selected default. Only synthetic develop pages are allowed.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.argv[2]);
const origin=process.argv[4]||'http://127.0.0.1:4310';
const name=origin.includes('trycloudflare')?'public':'edge';
const out=path.resolve(__dirname,'../output/playwright/quickliquid-preferred',name);
fs.mkdirSync(out,{recursive:true});
const report={completed:false,cases:[],errors:[],httpErrors:[],productionDataUsed:false};
(async()=>{const browser=await chromium.launch({executablePath:process.argv[3]});try{
  for(const colorScheme of ['light','dark'])for(const width of [390,1440]){
    const c=await browser.newContext({colorScheme,viewport:{width,height:1000},isMobile:width===390,hasTouch:width===390,serviceWorkers:'block'});
    c.setDefaultTimeout(30000);
    const moduleRequests=[];c.on('request',r=>{const u=new URL(r.url());if(u.pathname.includes('zakisheriff')&&r.resourceType()==='script')moduleRequests.push(u.pathname)});
    c.on('page',p=>p.on('pageerror',e=>report.errors.push(e.stack||e.message)));
    c.on('response',r=>{if(new URL(r.url()).origin===origin&&r.status()>=400&&['script','stylesheet','document'].includes(r.request().resourceType()))report.httpErrors.push({path:new URL(r.url()).pathname,status:r.status()})});
    await c.route('**/*',r=>new URL(r.request().url()).origin===origin||/^(data|blob):/.test(r.request().url())?r.continue():r.abort());
    const p=await c.newPage();try{
      assert.equal((await p.goto(origin+'/dev/record',{timeout:90000})).status(),200);await p.waitForFunction(()=>document.documentElement.dataset.uiReady==='true');
      await p.locator('.record-mode').getByRole('button',{name:'กรอกเอง',exact:true}).click();await p.locator('[name=record-manual-notes]').fill('ตรวจค่าเริ่มต้น A');await p.waitForTimeout(300);
      assert.deepEqual(moduleRequests,[],'B must not load on a fresh working page');assert.equal(await p.locator('.ui-zak-button').count(),0);
      await p.getByRole('button',{name:'ตรวจรายการก่อนบันทึก',exact:true}).click();const confirm=p.locator('dialog[open]').getByRole('button',{name:'ยืนยันบันทึก',exact:true});assert.equal(await confirm.getAttribute('data-button-engine'),'quick');await confirm.click();await p.locator('dialog[open]').waitFor({state:'hidden'});assert.match(await p.locator('.record-recent').innerText(),/ตรวจค่าเริ่มต้น A/);
      const workingPageModuleRequests=moduleRequests.length;
      await p.goto(origin+'/dev/ui#button-materials',{timeout:90000});await p.getByTestId('button-material-ready').filter({hasText:'พร้อมเปรียบเทียบ'}).waitFor();const review=p.getByRole('region',{name:'เปรียบเทียบวัสดุปุ่ม A/B',exact:true});
      assert.equal(await review.getByRole('button',{name:'QuickLiquid เดิม',exact:true}).getAttribute('aria-pressed'),'true');assert.ok(moduleRequests.length>0,'The B comparison must remain available on demand');
      const b=review.getByRole('region',{name:'B · Liquid Glass ใหม่',exact:true});assert.equal(await b.getByRole('button',{name:'บันทึกตัวอย่าง',exact:true}).getAttribute('data-button-engine'),'zak');
      await review.getByRole('button',{name:'ทดลองกับหน้าบันทึกงาน',exact:true}).click();await p.waitForURL('**/dev/record');await p.locator('.record-mode').getByRole('button',{name:'กรอกเอง',exact:true}).click();await p.locator('[name=record-manual-notes]').fill('ร่างหลังเลือก A');assert.equal(await p.locator('.ui-zak-button').count(),0);
      await p.goBack();await review.waitFor();assert.equal(await review.getByRole('button',{name:'QuickLiquid เดิม',exact:true}).getAttribute('aria-pressed'),'true');await review.getByRole('button',{name:'ทดลองกับหน้าบันทึกงาน',exact:true}).click();await p.waitForURL('**/dev/record');assert.equal(await p.locator('[name=record-manual-notes]').inputValue(),'ร่างหลังเลือก A');assert.equal(await p.locator('.ui-zak-button').count(),0);
      assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      if(width===390&&colorScheme==='dark')await p.screenshot({path:path.join(out,'default-a-mobile-dark.png'),fullPage:true});
      report.cases.push({width,colorScheme,passed:true,workingPageModuleRequests});console.log('PASS '+width+' '+colorScheme+': A default, B lazy, real submit and draft preserved');
    }finally{await c.close();}
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.httpErrors,[]);report.completed=true;
}catch(e){report.failure=e.stack;throw e;}finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1});
