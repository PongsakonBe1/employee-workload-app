const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.argv[2]||'playwright');
async function main(){
  const browser=await chromium.launch({headless:true,...(process.argv[3]?{executablePath:process.argv[3]}:{})});
  const page=await browser.newPage({viewport:{width:1440,height:1050}});
  const output=path.resolve(__dirname,'../../../../output/playwright/ux-phase1/revision4');
  try{
    await page.goto(pathToFileURL(path.join(__dirname,'gallery.html')).href);await page.evaluate(()=>document.fonts.ready);await page.locator('#show-all').click();
    for(const device of ['desktop','mobile'])for(const theme of ['light','dark']){
      await page.locator(`button[data-device="${device}"]`).click();await page.locator(`button[data-theme="${theme}"]`).click();
      await page.evaluate(()=>{document.querySelectorAll('img').forEach(image=>image.loading='eager');return Promise.all([...document.images].map(image=>image.decode()));});
      if(await page.locator('article').count()!==30)throw new Error('Expected all 30 designs');
      await page.screenshot({path:path.join(output,`all-views-${device}-${theme}.png`),fullPage:true});
      console.log(`REVIEW BOARD ${device}/${theme}: 30 loaded previews`);
    }
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
