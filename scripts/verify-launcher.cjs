/* Full-window launcher QC using development fixtures; no production reads/writes. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.argv[2]),origin=process.argv[4]||'http://127.0.0.1:4310';
const name=/chrome.exe$/i.test(process.argv[3])?'chrome':'edge',out=path.resolve('output/playwright/dock-launchpad/launcher',origin.includes('127.0.0.1')?'local':'public',name);fs.mkdirSync(out,{recursive:true});
const report={completed:false,cases:[],errors:[],externalOrigins:[],physicalIOS:false};
async function main(){
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]});
 try{
  for(const width of [1440,1024,390,320])for(const theme of ['light','dark']){
   const ctx=await browser.newContext({viewport:{width,height:width===320?568:900},isMobile:width<600,hasTouch:width<600,colorScheme:theme,serviceWorkers:'block'});
   await ctx.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin===origin||['data:','blob:'].includes(u.protocol))return r.continue();report.externalOrigins.push(u.origin);return r.abort();});
   const page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(e.message));
   await page.goto(origin+'/dev/calendar',{timeout:90000});await page.waitForFunction(()=>document.documentElement.dataset.uiReady==='true');
   const source=width>760?page.locator('.ui-dock').getByRole('button',{name:'หน้าและเครื่องมือทั้งหมด',exact:true}):page.getByRole('button',{name:'ค้นหาหน้าและเครื่องมือ',exact:true});
   const dialog=page.locator('dialog.ui-launcher[open]');await source.click();await dialog.waitFor();
   await dialog.locator('.ui-launcher-grid').evaluate(n=>Promise.all(n.getAnimations().map(animation=>animation.finished)));
   const search=dialog.getByRole('searchbox',{name:'ค้นหาหน้า',exact:true}),links=dialog.locator('.ui-launcher-grid a');
   assert.ok(await search.evaluate(n=>n===document.activeElement));assert.equal(await links.count(),18);
   const layout=await dialog.evaluate(n=>{const b=n.getBoundingClientRect(),grid=n.querySelector('.ui-launcher-grid');return {x:b.x,y:b.y,w:b.width,h:b.height,vw:innerWidth,vh:innerHeight,columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,overflow:n.scrollWidth>n.clientWidth+1,inputFont:getComputedStyle(n.querySelector('input')).fontSize};});
   assert.equal(layout.x,0);assert.equal(layout.y,0);assert.equal(layout.w,layout.vw);assert.equal(layout.h,layout.vh);assert.equal(layout.columns,width===1440?6:width===1024?4:3);assert.equal(layout.overflow,false);assert.equal(layout.inputFont,'16px');
   assert.ok(await links.evaluateAll(ns=>ns.every(n=>{const b=n.getBoundingClientRect(),i=n.querySelector('.ui-dock-tile').getBoundingClientRect();return b.width>=44&&b.height>=44&&i.left>=b.left&&i.right<=b.right&&i.width>=(innerWidth<600?56:72);})));
   await page.waitForTimeout(200);await page.screenshot({path:path.join(out,`launcher-${width}-${theme}.png`)});
   const category=async(label,value)=>{if(width<600)await dialog.getByRole('combobox',{name:'หมวดเครื่องมือ',exact:true}).selectOption(value);else await dialog.getByRole('button',{name:label,exact:true}).click();};
   await category('ห้องและอุปกรณ์','resources');assert.equal(await links.count(),6);assert.equal(await links.filter({hasText:'วิเคราะห์บุคลากร'}).count(),0);
   await category('ทั้งหมด','all');await search.fill('สอบ DL');assert.equal(await links.count(),1);assert.equal(await links.first().getAttribute('aria-label'),'จัดตารางสอบ DL');
   await search.fill('no-such-tool-fixture');assert.equal(await links.count(),0);assert.ok(await dialog.getByRole('heading',{name:'ไม่พบหน้าและเครื่องมือ'}).isVisible());await dialog.getByRole('button',{name:'แสดงทั้งหมด',exact:true}).click();assert.equal(await links.count(),18);
   await search.focus();await page.keyboard.press('ArrowDown');assert.ok(await links.first().evaluate(n=>n===document.activeElement));await page.keyboard.press('ArrowRight');assert.ok(await links.nth(1).evaluate(n=>n===document.activeElement));await page.keyboard.press('ArrowDown');assert.ok(await links.nth(1+layout.columns).evaluate(n=>n===document.activeElement));await page.keyboard.press('Home');await page.keyboard.press('ArrowUp');assert.ok(await search.evaluate(n=>n===document.activeElement));
   await dialog.getByRole('button',{name:'ปิดหน้าต่าง',exact:true}).focus();await page.keyboard.press('Shift+Tab');assert.ok(await dialog.evaluate(n=>n.contains(document.activeElement)));await page.keyboard.press('Escape');assert.ok(await source.evaluate(n=>n===document.activeElement));
   assert.equal(await page.evaluate(()=>document.documentElement.style.overflow),'');
   await source.click();assert.equal(await links.count(),18);await dialog.locator('.ui-launcher-space').click({position:{x:2,y:2}});assert.equal(await dialog.count(),0);
   await page.keyboard.press('Control+k');await dialog.waitFor();await dialog.getByRole('searchbox').fill('ตาราง');await page.keyboard.press('Enter');await page.waitForURL('**/dev/calendar');assert.equal(await dialog.count(),0);
   // Staff fixture exposes only the existing eight allowed destinations.
   await page.goto(origin+'/dev/record');await page.waitForFunction(()=>document.documentElement.dataset.uiReady==='true');
   await page.locator('.record-mode').getByRole('button',{name:'กรอกเอง',exact:true}).click();const notes=page.locator('[name=record-manual-notes]');await notes.fill('Launcher fixture draft');await page.keyboard.press('Control+k');await dialog.waitFor();assert.equal(await links.count(),8);assert.equal(await dialog.getByRole('button',{name:'ดูแลระบบ',exact:true}).count(),0);assert.equal(await links.filter({hasText:'บันทึกด่วนและ Combo'}).count(),0);
   await dialog.getByRole('searchbox').fill('ทรัพยากร');await page.keyboard.press('Escape');assert.equal(await notes.inputValue(),'Launcher fixture draft');
   // OS reduced motion and app solid preference must apply to the launcher too.
   await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('labboy.appearance.v1')||'{}');p.material='solid';localStorage.setItem('labboy.appearance.v1',JSON.stringify(p));});await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.uiReady==='true');await page.keyboard.press('Control+k');await dialog.waitFor();
   assert.equal(await dialog.evaluate(n=>n.getAnimations({subtree:true}).length),0);assert.equal(await dialog.evaluate(n=>getComputedStyle(n).backdropFilter),'none');assert.equal(await dialog.locator('[data-glass-surface=launcher-search]').getAttribute('data-active'),'false');await page.keyboard.press('Escape');
   report.cases.push({width,theme,columns:layout.columns,fullWindow:true,roleFiltering:true,searchAndCategories:true,keyboardAndFocus:true,draftPreserved:true,reducedAndSolid:true});await ctx.close();
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalOrigins,[]);report.completed=true;
 }finally{await browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));}
 console.log('PASS launcher: '+report.cases.length+' viewport/theme flows, search, categories, roles, keyboard, draft and reduced/solid');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
