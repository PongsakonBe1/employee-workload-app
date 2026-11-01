/* Builds a local review board and a native-layer Figma preparation bundle.
 * No calls to Figma, no uploads, and no package installation. */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.argv[2]||'playwright');
const root=path.resolve(__dirname,'../../../../output/playwright/ux-phase1/revision3');
const native=path.join(root,'figma-preparation');
fs.mkdirSync(native,{recursive:true});
async function main(){
  const browser=await chromium.launch({headless:true,...(process.argv[3]?{executablePath:process.argv[3]}:{})});
  const page=await browser.newPage();
  const exportScene=new Function(fs.readFileSync(path.join(__dirname,'export-scene.js'),'utf8')+'; return exportDesignScene;')();
  const template=fs.readFileSync(path.join(__dirname,'figma-import-template.js'),'utf8');
  const payload=[];
  try{
    const base=pathToFileURL(path.join(__dirname,'index.html')).href;
    await page.goto(base);const routes=await page.evaluate(()=>window.designReview.routes);
    let canvasY=100;
    for(const route of routes){
      const scenes=[];
      for(const [device,width,height]of [['Desktop',1440,1050],['Mobile',390,844]])for(const theme of ['light','dark']){
        await page.setViewportSize({width,height});await page.goto(base+'#/'+route.id);await page.evaluate(t=>window.designReview.setTheme(t),theme);await page.evaluate(()=>document.fonts.ready);
        const scene=await page.evaluate(exportScene);
        scene.canvasY=canvasY;
        let count=0,text=0,images=0;
        function inspect(node){assert.ok([node.x,node.y,node.w,node.h].every(Number.isFinite),`${route.id}: invalid bounds`);count++;if(node.type==='TEXT'){text++;assert.ok(node.text&&Number.isFinite(node.size));}if(node.image)images++;(node.children||[]).forEach(inspect);}
        scene.children.forEach(inspect);assert.ok(text>10);assert.ok(images>0&&images<=2);
        scene.counts={layers:count,text,images};scenes.push(scene);payload.push(scene);
      }
      const destination=path.join(native,route.id+'.prepared.js');
      fs.writeFileSync(destination,template.replace('__SCENE_PAYLOAD__',JSON.stringify(scenes)));
      canvasY+=Math.max(...scenes.map(s=>s.height))+200;
      const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;new AsyncFunction(fs.readFileSync(destination,'utf8'));
      console.log(`PREPARED ${route.id}: four editable-layout candidates; not imported or validated in Figma`);
    }
    fs.writeFileSync(path.join(native,'manifest.json'),JSON.stringify({fileKey:'aVicg4a7OqVnYZiGS31lus',pageId:'0:1',status:'prepared-only',frames:payload.map(({route,device,theme,width,height,counts})=>({route,device,theme,width,height,counts})),pending:['Starter MCP quota prevents import','Auto Layout and component instances must be reconciled in Figma','Native glass effects, text bounds, and reactions need visual QA']},null,2));
    await page.setViewportSize({width:1440,height:1250});await page.goto(pathToFileURL(path.join(__dirname,'gallery.html')).href);await page.evaluate(()=>document.fonts.ready);await page.locator('article img').first().waitFor({state:'visible'});await page.evaluate(()=>Promise.all([...document.images].map(img=>img.decode().catch(()=>{}))));
    await page.screenshot({path:path.join(root,'review-board-light.png'),fullPage:true});await page.locator('button[data-theme="dark"]').click();await page.evaluate(()=>Promise.all([...document.images].map(img=>img.decode().catch(()=>{}))));await page.screenshot({path:path.join(root,'review-board-dark.png'),fullPage:true});
    console.log(`Prepared ${payload.length} geometry candidates and two review board images. No Figma writes performed.`);
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
