/* Actual development UI motion, recorded with synthetic data and a fresh profile. */
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.argv[2]),origin=process.argv[4]||'http://127.0.0.1:4310';
const out=path.resolve(__dirname,'../output/playwright/quick-liquid-pilot');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]});
 try{for(const mobile of [false,true]){
  const size=mobile?{width:390,height:844}:{width:1440,height:1000};
  const context=await browser.newContext({viewport:size,isMobile:mobile,hasTouch:mobile,serviceWorkers:'block',recordVideo:{dir:out,size}});
  await context.route('**/*',route=>{const url=new URL(route.request().url());return url.origin===origin||['data:','blob:'].includes(url.protocol)?route.continue():route.abort();});
  const page=await context.newPage();await page.goto(origin+'/dev/ui',{timeout:90000});await page.waitForSelector('[data-glass-surface="toolbar"][data-active="true"]');await page.waitForTimeout(400);
  await page.screenshot({path:path.join(out,`motion-${mobile?'mobile':'desktop'}-poster.png`),fullPage:false});
  if(mobile){
   for(const href of ['/calendar','/resources','/dashboard','/worklogs/new']){await page.locator(`.ui-mobile-nav a[href="${href}"]`).tap();await page.waitForTimeout(650);}
  }else{
   const box=await page.locator('.ui-header-actions').boundingBox();for(const x of [box.x+12,box.x+box.width-12,box.x+30]){await page.mouse.move(x,box.y+24,{steps:18});await page.waitForTimeout(450);}
  }
  await page.getByRole('button',{name:'CSS เดิม',exact:true}).click();await page.waitForTimeout(700);await page.getByRole('button',{name:'QuickLiquid',exact:true}).click();await page.waitForTimeout(700);
  const video=page.video();await context.close();await video.saveAs(path.join(out,`quick-liquid-${mobile?'mobile':'desktop'}.webm`));await video.delete();console.log('Recorded '+(mobile?'mobile':'desktop')+' A/B and motion');
 }}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
