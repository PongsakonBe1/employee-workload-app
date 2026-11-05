/* Phase A measurements: computed text, rendered SVG text, coarse hit regions. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.argv[2]);
const out=path.resolve(__dirname,'../../../../output/playwright/ux-phase1/phase-a');fs.mkdirSync(out,{recursive:true});
const results=[],failures=[],errors=[],checks=[];
async function main(){
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]});
 const contexts=process.argv.includes('--scan')?[['touch',1024,true]]:[['desktop',1440,false],['touch',1024,true],['mobile',390,true],['small',375,true],['tablet',768,true]];
 let completed=false;
 try{for(const [mode,width,touch]of contexts){
  const context=await browser.newContext({viewport:{width,height:1000},hasTouch:touch}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4197/#/record');await page.waitForFunction(()=>document.documentElement.dataset.reviewReady==='7');
  const routes=await page.evaluate(()=>window.designReview.routes);
  if(!process.argv.includes('--states-only'))for(const theme of process.argv.includes('--scan')?['light']:['light','dark'])for(const route of routes){
   await page.goto('http://127.0.0.1:4197/#/'+route.id);await page.evaluate(t=>window.designReview.setTheme(t),theme);
   await page.waitForFunction(()=>document.documentElement.dataset.motionReady==='true'&&document.getAnimations().every(a=>a.playState!=='running'));
   const measured=await audit(page,touch);results.push({mode,theme,route:route.id,...measured});
   if(measured.fonts.length||measured.targets.length||measured.overflow)failures.push({mode,theme,route:route.id,...measured});
  }
  console.log('CHECK '+mode+': '+results.length+' states; '+failures.length+' failing states');
  if(!process.argv.includes('--scan')){
   for(const route of ['record','worklogs','classrooms','imports']){
    await page.goto('http://127.0.0.1:4197/#/'+route);await page.evaluate(()=>{document.documentElement.style.fontSize='24px';applyAccessA();});
    const stats=await audit(page,false);assert.equal(stats.overflow,false,mode+'/'+route+' enlarged text overflow');
   }
   await page.goto('http://127.0.0.1:4197/#/record');
   if(touch)await checkHitPoints(page);
   for(const tpl of ['TPL-0','TPL-3']){
    await page.locator(`[data-action="template-run"][data-id="${tpl}"]`).click();
    await page.waitForFunction(()=>document.getAnimations().every(a=>a.playState!=='running'));
    if(touch)await checkHitPoints(page);
    const stats=await audit(page,touch);if(stats.fonts.length||stats.targets.length)failures.push({mode,route:'dialog-'+tpl,...stats});
    await page.keyboard.press('Escape');
   }
   await page.goto('http://127.0.0.1:4197/#/imports');
   for(const name of ['load-import5','sample-period5','review-import5'])await page.locator(`[data-action="${name}"]:visible`).first().click();
   await page.waitForFunction(()=>document.getAnimations().every(a=>a.playState!=='running'));
   const importStats=await audit(page,touch);if(importStats.fonts.length||importStats.targets.length||importStats.overflow)failures.push({mode,route:'import-review',...importStats});
   await page.goto('http://127.0.0.1:4197/#/record');
   for(const theme of ['light','dark'])for(const material of ['regular','solid'])for(const reduced of [false,true]){
    await page.waitForFunction(()=>document.getAnimations().every(a=>a.playState!=='running'));
    await page.evaluate(({theme,material,reduced})=>{state.settingValues.motion=reduced;state.material=material;document.documentElement.dataset.material=material;window.designReview.setTheme(theme);render();},{theme,material,reduced});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.waitForFunction(()=>document.getAnimations().every(a=>a.playState!=='running'));
    if(material==='solid')assert.equal(await page.locator('#mobile-nav').evaluate(el=>getComputedStyle(el).backdropFilter),'none');
    if(reduced)await page.waitForFunction(()=>window.motionReview.active===0);
   }
   await page.emulateMedia({contrast:'more'});
   assert.equal(await page.locator('#app-sidebar').evaluate(el=>getComputedStyle(el).backdropFilter),'none');
   await page.emulateMedia({contrast:'no-preference'});
   checks.push({mode,textEnlargementRoutes:4,dialogs:2,importReview:true,stateCombinations:8,increasedContrast:true,hitTesting:touch});
  }
  await context.close();
 }completed=true;}catch(error){errors.push(error.message);throw error;}finally{await browser.close();fs.writeFileSync(path.join(out,'accessibility-report.json'),JSON.stringify({completed,results,checks,failures,errors,limitations:['Geometry candidates and label targets, not a WCAG certification','Real device UAT and native rendered font inspection pending','Browser zoom is verified separately from text enlargement']},null,2));}
 if(failures.length||errors.length)throw Error(failures.length+' failing states; '+errors.length+' script errors');
}
async function audit(page,touch){return page.evaluate(touch=>{
 const show=el=>el.checkVisibility()&&el.getBoundingClientRect().width>0;
 const fonts=[];
 for(const el of document.querySelectorAll('#content *,#app-sidebar *,#app-header *,#mobile-nav *,#sheet *, .review-label *')){
  if(!show(el)||![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))continue;
  let size=parseFloat(getComputedStyle(el).fontSize);
  if(el instanceof SVGElement){if(el.tagName!=='text'&&el.tagName!=='tspan')continue;const m=el.getScreenCTM();if(m)size*=Math.hypot(m.a,m.b);}
  if(size<11.9)fonts.push({selector:el.className.baseVal??el.className,size,text:el.textContent.trim().slice(0,45)});
 }
 const targets=[];
 if(touch)for(const el of document.querySelectorAll('button,a[href],input,select,summary,[role=switch]')){
  if(!show(el)||el.disabled)continue;
  const target=el.matches('input[type=checkbox],input[type=radio]')?el.closest('label')||el:el,r=target.getBoundingClientRect();
  if(r.width<43.8||r.height<43.8)targets.push({selector:el.className,action:el.dataset.action||el.textContent.trim().slice(0,30),w:Math.round(r.width),h:Math.round(r.height)});
 }
 return {fonts,targets,overflow:document.documentElement.scrollWidth>innerWidth+1};
},touch);}
async function checkHitPoints(page){
 const misses=await page.evaluate(()=>{
  const modal=document.querySelector('dialog[open]');
  const root=modal||document;
  const controls=root.querySelectorAll(modal?'button,label.check-hit-a':'#app-header button,#mobile-nav a,.record-meta .segment button,#app-sidebar .sidebar-link');
  const misses=[];
  for(const el of controls){const r=el.getBoundingClientRect();if(!el.checkVisibility()||el.disabled||r.top<0||r.bottom>innerHeight)continue;
   for(const [x,y]of [[.5,.5],[.25,.25],[.75,.75]]){const hit=document.elementFromPoint(r.x+r.width*x,r.y+r.height*y);if(hit&&!el.contains(hit))misses.push({action:el.dataset.action||el.textContent.trim().slice(0,20),hit:hit.tagName});}
  }return misses;
 });assert.deepEqual(misses,[],'Touch center/inner-edge points must reach their own control');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
