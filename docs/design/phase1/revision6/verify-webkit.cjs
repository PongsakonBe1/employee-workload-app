/* WebKit on Windows is a compatibility check, not real iOS/Safari UAT. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {webkit}=require(process.argv[2]||'playwright');
const output=path.resolve(__dirname,'../../../../output/playwright/ux-phase1/revision6');
async function main(){
 const expected=webkit.executablePath();
 if(!fs.existsSync(expected)){
  fs.writeFileSync(path.join(output,'webkit-report.json'),JSON.stringify({date:'2026-11-05',status:'not_verified',engine:'Playwright WebKit on Windows',reason:'The matching WebKit build is not installed. An already-cached older build did not complete with this runtime; its helper was stopped. No browser was downloaded.',expectedBuild:path.basename(path.dirname(expected)),limitation:'Real Safari/iOS, VoiceOver and device performance still need UAT.'},null,2));
  console.log('NOT VERIFIED: matching WebKit build unavailable; no download performed');process.exitCode=2;return;
 }
 const browser=await webkit.launch({headless:true,timeout:20000}),results=[],errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1050}});page.on('pageerror',e=>errors.push(e.message));
  const settle=()=>page.waitForFunction(()=>document.documentElement.dataset.reviewReady==='6'&&document.documentElement.dataset.motionReady==='true'&&document.getAnimations().every(a=>a.playState!=='running'||a.effect.getTiming().iterations===Infinity));
  for(const [device,width,height]of [['desktop',1440,1050],['mobile',390,844]]){
   await page.setViewportSize({width,height});
   for(const route of ['record','classrooms','imports','settings','staff','worklogs']){
    await page.goto('http://127.0.0.1:4196/#/'+route);await settle();assert.ok(await page.locator('h1').count());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.equal(await page.locator('#app-header').getAttribute('data-optics'),'frosted');results.push({device,route,status:'passed'});
   }
   await page.goto('http://127.0.0.1:4196/#/record');await settle();await page.locator('[data-action="template-run"][data-id="TPL-3"]').click();await settle();assert.ok(await page.locator('#sheet').isVisible());await page.keyboard.press('Escape');await settle();assert.equal(await page.locator('dialog[open],.closing-dialog6').count(),0);
   await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-action="template-run"][data-id="TPL-3"]').click();assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);await page.keyboard.press('Escape');await page.emulateMedia({reducedMotion:'no-preference'});
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'webkit-report.json'),JSON.stringify({date:'2026-11-05',engine:'Playwright WebKit on Windows',version:browser.version(),executableOverride:!!process.argv[3],renders:results,dialogAndReducedMotion:['desktop','mobile'],errors,limitation:'Uses an already-installed engine. Real Safari/iOS, VoiceOver and device performance still need UAT.'},null,2));console.log('PASS WebKit: 12 views, desktop/mobile dialog and Reduce Motion');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
