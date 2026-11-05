/* Actual UI recording, including immediate save and persistent Undo. */
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.argv[2]);
const output=path.resolve(__dirname,'../../../../output/playwright/ux-phase1/revision7');
async function record(browser,mobile){
 const viewport=mobile?{width:390,height:844}:{width:1440,height:1000};
 const context=await browser.newContext({viewport,recordVideo:{dir:output,size:viewport}}),page=await context.newPage();
 const pause=ms=>page.waitForTimeout(ms),act=name=>page.locator(`[data-action="${name}"]:visible`).first();
 const tap=async target=>{await target.scrollIntoViewIfNeeded();const r=await target.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2,{steps:10});await page.mouse.click(r.x+r.width/2,r.y+r.height/2,{delay:85});await pause(650);};
 const nav=id=>tap(page.locator((mobile?'#mobile-nav':'#app-sidebar')+` a[href="#/${id}"]`));
 try{
  await page.goto('http://127.0.0.1:4197/#/record');await page.waitForFunction(()=>document.documentElement.dataset.reviewReady==='7');await pause(700);
  await page.screenshot({path:path.join(output,`motion-poster-${mobile?'mobile':'desktop'}.png`)});
  await tap(page.locator('[data-group="record-mode"][data-value="manual"]'));await tap(page.locator('[data-group="record-mode"][data-value="quick"]'));
  await tap(page.locator('[data-action="template-run"][data-id="TPL-0"]'));await pause(500);await tap(act('room-instant7'));await tap(act('undo-room7'));
  await nav('classrooms');await pause(500);await tap(act('schedule-detail6'));await pause(700);await page.keyboard.press('Escape');await pause(450);
  if(mobile){await tap(act('account7'));await tap(page.locator('#sheet a[href="#/worklogs"]'));}else await nav('worklogs');
  await tap(page.locator(mobile?'.worklog-mobile-list [data-action="open-log5"]':'.worklog-desktop-table [data-action="open-log5"]').first());await pause(700);
  if(mobile){await page.keyboard.press('Escape');await pause(350);}
  await tap(act('account7'));await tap(act('appearance'));await page.locator('[name="appearance"]').selectOption('dark');await pause(700);await page.keyboard.press('Escape');await pause(500);
 }finally{const video=page.video();await context.close();await video.saveAs(path.join(output,`motion-${mobile?'mobile':'desktop'}.webm`));await video.delete();}
 console.log('Recorded '+(mobile?'mobile':'desktop'));
}
(async()=>{fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:process.argv[3]});try{await record(browser,false);await record(browser,true);}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
