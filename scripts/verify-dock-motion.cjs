/* Motion geometry and native interaction checks against synthetic development data. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.argv[2]),origin=process.argv[4]||'http://127.0.0.1:4310';
const name=/chrome.exe$/i.test(process.argv[3])?'chrome':'edge';
const out=path.resolve('output/playwright/dock-motion-pass/motion',origin.includes('127.0.0.1')?'local':'public',name);fs.mkdirSync(out,{recursive:true});
const report={completed:false,checks:[],errors:[],externalOrigins:[],physicalSafari:false};
async function main(){
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]});
 const ctx=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block',recordVideo:{dir:out,size:{width:1440,height:1000}}});
 let page;
 try{
  await ctx.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin===origin||['data:','blob:'].includes(u.protocol))return r.continue();report.externalOrigins.push(u.origin);return r.abort();});
  page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(origin+'/dev/calendar',{timeout:90000});await page.locator('.ui-dock[data-motion-ready=spring]').waitFor();
  const dock=page.locator('.ui-dock'),links=dock.locator('.ui-dock-link');
  const geometry=()=>links.evaluateAll(nodes=>nodes.map(n=>{const b=n.querySelector('.ui-dock-tile').getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,scale:+n.style.getPropertyValue('--dock-scale'),shift:parseFloat(n.style.getPropertyValue('--dock-shift'))};}));
  const main=await page.locator('main').boundingBox();
  const centers=await links.evaluateAll(nodes=>nodes.map(n=>{const b=n.parentElement.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};}));
  await page.mouse.move(300,120);
  // Slow sweep records real intermediate frames rather than a CSS endpoint snapshot.
  for(let y=centers[0].y;y<=centers.at(-1).y;y+=8){await page.mouse.move(centers[0].x,y);await page.waitForTimeout(22);}
  await page.mouse.move(centers[2].x,centers[2].y);await page.waitForFunction(()=>document.querySelector('.ui-dock').dataset.moving==='false');
  const hover=await geometry();assert.ok(hover[2].scale>1.35);assert.ok(Math.abs(hover[0].shift)>8);
  hover.forEach((b,i)=>{assert.ok(b.x>=0&&b.y>=0&&b.y+b.h<=1000);if(i)assert.ok(b.y-hover[i-1].y-hover[i-1].h>1,'icons must not overlap');});
  assert.deepEqual(await page.locator('main').boundingBox(),main);report.checks.push({name:'spring magnification, neighbor displacement, bounds and no content reflow',peak:hover[2].scale});
  await page.screenshot({path:path.join(out,'magnified.png')});
  await page.mouse.move(400,120);await page.waitForFunction(()=>document.querySelector('.ui-dock').dataset.moving==='false');assert.ok((await geometry()).every(b=>b.scale===1&&b.shift===0));
  report.checks.push({name:'pointer leave settles exactly and stops animation'});
  const tools=dock.getByRole('button',{name:'หน้าและเครื่องมือทั้งหมด',exact:true});await tools.hover();await page.waitForTimeout(280);await tools.click();
  const dialog=page.locator('dialog[open]');await dialog.waitFor();assert.ok((await dialog.getAttribute('class')).includes('ui-dock-tools-anchored'));
  await page.waitForFunction(()=>document.querySelector('.ui-dock').dataset.moving==='false');assert.ok((await geometry()).every(b=>b.scale===1));assert.equal(await page.getByRole('tooltip').count(),0);
  const box=await dialog.boundingBox();assert.equal(box.x,112);assert.ok(box.y>=0&&box.y+box.height<=1000);
  const rows=await dialog.locator('.ui-route-list a').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect(),t=n.querySelector('.ui-dock-tile').getBoundingClientRect();return {inside:t.left>=b.left&&t.right<=b.right&&t.top>=b.top&&t.bottom<=b.bottom,width:t.width};}));assert.ok(rows.every(r=>r.inside&&r.width===40));
  await page.waitForTimeout(300);await page.screenshot({path:path.join(out,'tools.png')});await page.keyboard.press('Escape');assert.ok(await tools.evaluate(n=>n===document.activeElement));
  await page.keyboard.press('ArrowUp');assert.equal(await dock.locator('a[href="/dashboard"]').evaluate(n=>n===document.activeElement),true);
  report.checks.push({name:'source-anchored tools, consistent uncropped tiles, modal pause, Escape focus and arrow navigation'});
  await page.setViewportSize({width:1440,height:480});await page.waitForFunction(()=>document.querySelector('.ui-dock').dataset.motionLimited==='true');await links.first().hover();await page.waitForTimeout(200);assert.ok((await geometry()).every(b=>!b.scale||b.scale===1));
  report.checks.push({name:'short viewport scroll mode disables magnification to prevent clipping'});
  await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.ui-dock[data-motion-ready=reduced]').waitFor();await links.first().hover();assert.equal(await links.first().evaluate(n=>getComputedStyle(n).transform),'none');
  await tools.click();assert.equal(await dialog.evaluate(n=>n.getAnimations().length),0);await page.keyboard.press('Escape');report.checks.push({name:'reduced motion disables icon and source presentation animation'});
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalOrigins,[]);report.completed=true;
 }finally{if(page){const video=page.video();await ctx.close();if(video){await video.saveAs(path.join(out,'dock-motion.webm'));await video.delete();}}await browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));}
 console.log('PASS motion: '+report.checks.length+' groups; recorded synthetic Dock sweep and tools');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
