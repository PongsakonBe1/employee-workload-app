// Verify the actual server DOM before releasing Next.js hydration scripts.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const engines=require(process.argv[2]),executablePath=process.argv[3],origin=process.argv[4]||'http://127.0.0.1:4310';
const webkit=/webkit/i.test(executablePath),browserName=webkit?'webkit':/chrome.exe$/i.test(executablePath)?'chrome':'edge';
const out=path.resolve('output/playwright/classroom-pdf-import/hydration',origin.includes('127.0.0.1')?'local':'public',browserName);
fs.mkdirSync(out,{recursive:true});
const report={completed:false,browser:browserName,physicalIOS:false,cases:[],errors:[],httpErrors:[],unexpectedOrigins:[]};
async function main(){
 let browser;
 try{
  browser=await engines[webkit?'webkit':'chromium'].launch({headless:true,executablePath,timeout:20000});
  for(const width of [390,1440])for(const theme of ['light','dark']){
   const context=await browser.newContext({viewport:{width,height:1000},isMobile:width===390,hasTouch:width===390,colorScheme:theme,locale:'th-TH',timezoneId:'Asia/Bangkok',serviceWorkers:'block'});
   let release,hold=true;const hydrationGate=new Promise(resolve=>{release=resolve;});
   const gateTimeout=setTimeout(()=>{hold=false;release();},20000);
   await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.origin!==origin&&!['data:','blob:'].includes(url.protocol)){report.unexpectedOrigins.push(url.origin);return route.abort();}
    if(hold&&request.resourceType()==='script'&&url.pathname.startsWith('/_next/'))await hydrationGate;
    return route.continue();
   });
   const page=await context.newPage();page.setDefaultTimeout(20000);
   page.on('pageerror',error=>report.errors.push(error.message));
   page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
   page.on('response',response=>{if(response.status()>=400&&['script','stylesheet','document'].includes(response.request().resourceType()))report.httpErrors.push({status:response.status(),path:new URL(response.url()).pathname});});
   await page.goto(origin+'/dev/calendar',{waitUntil:'commit',timeout:90000});
   const caption=page.locator('.cal-source-caption');await caption.waitFor({state:'attached'});
   assert.equal(hold,true,'Hydration gate expired before the server DOM snapshot');
   assert.equal(await page.locator('meta[name="format-detection"]').evaluate(el=>Boolean(el.closest('head'))),true);
   const directives=await page.locator('meta[name="format-detection"]').getAttribute('content');
   for(const type of ['telephone','date','email','address'])assert.ok(directives.includes(type+'=no'));
   const before=await caption.textContent();assert.ok(before.includes('ชุดอ้างอิงปี พ.ศ. 2569 ถึง 2570'));
   assert.equal(await caption.locator('a').count(),0);
   hold=false;release();clearTimeout(gateTimeout);await page.waitForFunction(()=>document.documentElement.dataset.uiReady==='true');
   assert.equal(await caption.textContent(),before);assert.equal(await caption.locator('a').count(),0);
   await page.getByRole('button',{name:'นำเข้าตาราง',exact:true}).click();await page.locator('dialog.cal-import-dialog[open]').waitFor();await page.keyboard.press('Escape');
   await page.getByRole('button',{name:'ค้นหาหน้าและเครื่องมือ',exact:true}).click();
   await page.locator('dialog[open]').getByRole('link',{name:'บันทึกงาน',exact:true}).click();await page.waitForURL('**/dev/record');
   await page.getByRole('button',{name:'ค้นหาหน้าและเครื่องมือ',exact:true}).click();await page.locator('dialog[open]').getByRole('link',{name:'ตาราง',exact:true}).click();await page.waitForURL('**/dev/calendar');
   assert.equal(await caption.textContent(),before);
   await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.uiReady==='true');assert.equal(await caption.textContent(),before);
   report.cases.push({width,theme,formatDetection:directives,serverCaptionMatchesHydratedCaption:true,importDialog:true,nextNavigation:true,hardReload:true});
   await page.screenshot({path:path.join(out,`calendar-${width}-${theme}.png`)});await context.close();
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.httpErrors,[]);assert.deepEqual(report.unexpectedOrigins,[]);report.completed=true;
 }finally{if(browser)await browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));}
 console.log('PASS '+browserName+': metadata precedes hydration; caption matches; navigation/reload/import, four viewport/theme cases');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
