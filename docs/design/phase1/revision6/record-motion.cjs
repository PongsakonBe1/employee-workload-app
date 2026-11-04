/* Record actual local UI interactions. The small cursor overlay is recording-only. */
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.argv[2]||'playwright');
const output=path.resolve(__dirname,'../../../../output/playwright/ux-phase1/revision6');
async function record(browser,mobile){
 const viewport=mobile?{width:390,height:844}:{width:1440,height:1000};
 const context=await browser.newContext({viewport,recordVideo:{dir:output,size:viewport}}),page=await context.newPage();page.setDefaultTimeout(10000);
 await page.addInitScript(()=>{document.addEventListener('DOMContentLoaded',()=>{const cursor=document.createElement('div');cursor.setAttribute('aria-hidden','true');cursor.style.cssText='position:fixed;width:12px;height:12px;border:1.5px solid #fff;border-radius:50%;box-shadow:0 0 0 1px #164a9c80,0 1px 5px #0005;background:#176cdb88;pointer-events:none;z-index:10000;left:-30px;top:-30px;transform:translate(-50%,-50%)';document.body.append(cursor);document.addEventListener('pointermove',e=>{cursor.style.left=e.clientX+'px';cursor.style.top=e.clientY+'px';});});});
 const loc=name=>page.locator(`[name="${name}"]`),act=name=>page.locator(`[data-action="${name}"]`).first();
 const pause=ms=>page.waitForTimeout(ms),settle=()=>page.waitForFunction(()=>document.documentElement.dataset.reviewReady==='6'&&document.getAnimations().every(a=>a.playState!=='running'||a.effect.getTiming().iterations===Infinity));
 const tap=async target=>{await target.scrollIntoViewIfNeeded();const rect=await target.boundingBox();await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2,{steps:12});await page.mouse.down();await pause(90);await page.mouse.up();await pause(430);};
 const close=()=>tap(page.locator('#sheet [data-action="close-sheet"]').first());
 const nav=route=>tap(page.locator((mobile?'#mobile-nav':'#app-sidebar')+` a[href="#/${route}"]`));
 try{
  await page.goto('http://127.0.0.1:4196/#/record');await settle();await pause(700);
  await page.screenshot({path:path.join(output,`motion-poster-${mobile?'mobile':'desktop'}.png`),fullPage:false});
  if(!mobile){
   await tap(page.locator('[data-group="record-mode"][data-value="manual"]'));await loc('manual-recipient').fill('ผู้รับบริการตัวอย่าง');await pause(500);await tap(page.locator('[data-group="record-mode"][data-value="quick"]'));
   await tap(page.locator('[data-action="template-run"][data-id="TPL-3"]'));await loc('combo-recipient').fill('ผู้รับบริการตัวอย่าง');await pause(500);await tap(act('combo-review'));await pause(600);await close();
   await nav('classrooms');await pause(650);await tap(page.locator('[data-group="schedule-mode6"][data-value="agenda"]'));await tap(act('schedule-detail6'));await pause(650);await close();
   await tap(act('appearance'));await loc('appearance').selectOption('dark');await pause(650);await close();
   await tap(act('open-class-import5'));await tap(act('load-import5'));await tap(act('sample-period5'));await tap(act('review-import5'));await pause(600);
   await loc('import-row-subject5').fill('รายวิชาตัวอย่างที่ตรวจแล้ว');await tap(act('save-import-row5'));
   for(const id of ['IMPORT5-9','IMPORT5-17']){await tap(page.locator(`.import-queue6 [data-action="import-row5"][data-id="${id}"]`));await tap(act('save-import-row5'));}
   await tap(act('import-summary5'));await pause(1000);
  }else{
   await tap(page.locator('[data-group="record-mode"][data-value="manual"]'));await pause(450);await tap(page.locator('[data-group="record-mode"][data-value="quick"]'));
   await tap(page.locator('[data-action="template-run"][data-id="TPL-3"]'));await pause(900);await close();
   await nav('classrooms');await pause(650);await tap(act('schedule-detail6'));await pause(900);await close();
   await nav('worklogs');await pause(500);await tap(page.locator('.worklog-mobile-list [data-action="open-log5"]').first());await pause(800);await close();
   await tap(page.locator('#mobile-nav [data-action="routes"]'));await pause(500);await tap(page.locator('#sheet a[href="#/settings"]'));await tap(page.locator('[data-action="settings-tab"][data-tab="appearance"]'));await loc('appearance').selectOption('dark');await pause(750);await page.screenshot({path:path.join(output,'motion-settings-mobile-dark.png'),fullPage:false});
   await nav('record');await pause(500);await tap(page.locator('[data-action="template-run"][data-id="TPL-3"]'));await pause(800);await close();await pause(500);
  }
 }finally{
  const video=page.video();await context.close();await video.saveAs(path.join(output,`motion-${mobile?'mobile':'desktop'}.webm`));await video.delete();
 }
 console.log(`Recorded ${mobile?'mobile':'desktop'} motion preview`);
}
async function main(){fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({headless:true,...(process.argv[3]?{executablePath:process.argv[3]}:{})});try{await record(browser,false);await record(browser,true);}finally{await browser.close();}}
main().catch(e=>{console.error(e);process.exitCode=1;});
