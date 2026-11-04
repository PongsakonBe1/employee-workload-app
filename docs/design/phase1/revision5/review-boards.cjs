/* Render the whitelisted localhost review gallery, never a file URL. */
const path=require('node:path');
const {chromium}=require(process.argv[2]||'playwright');
async function main(){
 const browser=await chromium.launch({headless:true,...(process.argv[3]?{executablePath:process.argv[3]}:{})});
 const page=await browser.newPage({viewport:{width:1440,height:1050}});
 const output=path.resolve(__dirname,'../../../../output/playwright/ux-phase1/revision5');
 try{
  await page.goto('http://127.0.0.1:4195/gallery.html');await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>{document.querySelectorAll('img').forEach(i=>i.loading='eager');return Promise.all([...document.images].map(i=>i.decode()));});
  await page.screenshot({path:path.join(output,'review-overview.png'),fullPage:true});
  await page.locator('#show-all').click();
  for(const device of ['desktop','mobile'])for(const theme of ['light','dark']){
   await page.locator(`button[data-device="${device}"]`).click();await page.locator(`button[data-theme="${theme}"]`).click();
   await page.evaluate(()=>{document.querySelectorAll('img').forEach(i=>i.loading='eager');return Promise.all([...document.images].map(i=>i.decode()));});
   if(await page.locator('article').count()!==30)throw Error('Expected 30 views');
   await page.screenshot({path:path.join(output,`all-views-${device}-${theme}.png`),fullPage:true});
   console.log(`BOARD ${device}/${theme}: 30 decoded previews`);
  }
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
