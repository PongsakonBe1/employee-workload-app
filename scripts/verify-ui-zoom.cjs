/* Native Edge preference zoom; never CSS zoom or a user browser profile. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {chromium}=require(process.argv[2]);const route=process.argv[4]||'/dev/ui';if(!['/dev/templates','/dev/dashboard','/dev/staff','/dev/ui','/dev/record','/dev/calendar','/dev/history','/dev/resources','/dev/equipment','/dev/equipment/usage'].includes(route))throw new Error('Only isolated development fixtures are supported');const out=path.resolve(__dirname,['resources-ui-refinement','resource-detail-flow','dashboard-staff','assessment-summary','templates-combo','glass-button-roles'].includes(process.argv[5])?'../output/playwright/'+process.argv[5]:route.startsWith('/dev/equipment')||route==='/dev/resources'?'../output/playwright/resources-equipment':route==='/dev/history'?'../output/playwright/ui-coverage-history':route==='/dev/calendar'?'../output/playwright/calendar-liquid-glass':route==='/dev/record'?'../output/playwright/record-liquid-glass':'../output/playwright/develop-ui-foundation');
async function sample(zoom){
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'icit-ui-zoom-'));
 fs.mkdirSync(path.join(profile,'Default'));fs.writeFileSync(path.join(profile,'Default/Preferences'),JSON.stringify({partition:{default_zoom_level:{x:Math.log(zoom)/Math.log(1.2)}}}));
 let context;
 try{
  context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:process.argv[3],viewport:null,serviceWorkers:'block',args:['--window-size=1440,1050']});
  await context.route('**/*',route=>new URL(route.request().url()).origin==='http://127.0.0.1:4310'?route.continue():route.abort());
  const page=await context.newPage();await page.goto('http://127.0.0.1:4310'+route,{timeout:90000});await page.locator('[data-workspace]').waitFor();await page.waitForFunction(()=>document.documentElement.dataset.uiReady==='true');
  if(route==='/dev/templates'){await page.locator('.template-test-controls summary').click();await page.getByLabel('บทบาทตัวอย่าง',{exact:true}).selectOption('admin');await page.locator('.template-test-controls summary').click();await page.evaluate(()=>scrollTo(0,0));}
  const stats=await page.evaluate(()=>({innerWidth,outerWidth,dpr:devicePixelRatio,rootFont:getComputedStyle(document.documentElement).fontSize,cssZoom:getComputedStyle(document.documentElement).zoom,scrollWidth:document.documentElement.scrollWidth}));
  assert.ok(stats.scrollWidth<=stats.innerWidth);
  await page.locator('.ui-header button[aria-label="บัญชีและเครื่องมือ"]').focus();await page.keyboard.press('Enter');await page.locator('dialog[open]').getByRole('button',{name:'รูปแบบการแสดงผล',exact:true}).focus();await page.keyboard.press('Enter');const box=await page.locator('dialog[open]').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=stats.innerWidth+1);await page.keyboard.press('Escape');
  if(route==='/dev/templates'){await page.getByRole('button',{name:'สร้างเทมเพลต',exact:true}).click();const editor=await page.locator('dialog[open]').boundingBox();assert.ok(editor.x>=0&&editor.x+editor.width<=stats.innerWidth+1);assert.equal(await page.locator('dialog[open] input,dialog[open] select,dialog[open] textarea').evaluateAll(items=>items.filter(el=>{const b=el.getBoundingClientRect();return b.width>0&&(b.x<0||b.right>innerWidth+1)}).length),0);}
  if(zoom===2)await page.screenshot({path:path.join(out,'native-zoom-200.png'),fullPage:true});return stats;
 }finally{
  if(context)await context.close();
  const real=fs.realpathSync(profile),temp=fs.realpathSync(os.tmpdir());if(path.dirname(real)!==temp||!path.basename(real).startsWith('icit-ui-zoom-'))throw new Error('Refusing cleanup outside the generated browser profile');fs.rmSync(real,{recursive:true});
 }
}
(async()=>{fs.mkdirSync(out,{recursive:true});const normal=await sample(1),zoomed=await sample(2);assert.ok(Math.abs(zoomed.dpr/normal.dpr-2)<.05);assert.ok(Math.abs(zoomed.innerWidth*2-normal.innerWidth)<8);assert.equal(zoomed.rootFont,normal.rootFont);assert.equal(zoomed.cssZoom,normal.cssZoom);fs.writeFileSync(path.join(out,'zoom-report.json'),JSON.stringify({completed:true,method:'Native browser preference 200%, isolated profiles',normal,zoomed},null,2));console.log('PASS actual Next UI at native browser zoom 200%');})().catch(error=>{console.error(error);process.exitCode=1;});
