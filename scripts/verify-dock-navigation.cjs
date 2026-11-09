/* Native browser QC for the development-only Dock and reversible preferences. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.argv[2]),origin=process.argv[4]||'http://127.0.0.1:4310';
const name=/chrome.exe$/i.test(process.argv[3])?'chrome':'edge';
const out=path.resolve('output/playwright',['dock-motion-pass','dock-launchpad'].includes(process.argv[5])?process.argv[5]:'dock-navigation-pilot',origin.includes('127.0.0.1')?'local':'public',name);fs.mkdirSync(out,{recursive:true});
const report={completed:false,cases:[],errors:[],httpErrors:[],unexpectedOrigins:[],physicalIOS:false};
const routes=['/dev/record','/dev/history','/dev/calendar','/dev/resources','/dev/equipment','/dev/equipment/usage','/dev/dashboard','/dev/staff','/dev/templates'];
async function main(){
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]});
 try{
  for(const width of [1440,390])for(const theme of ['light','dark']){
   const ctx=await browser.newContext({viewport:{width,height:1000},isMobile:width===390,hasTouch:width===390,colorScheme:theme,serviceWorkers:'block'});
   await ctx.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin===origin||['data:','blob:'].includes(u.protocol))return route.continue();report.unexpectedOrigins.push(u.origin);return route.abort();});
   const page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
   page.on('response',r=>{if(r.status()>=400&&['document','script','stylesheet'].includes(r.request().resourceType()))report.httpErrors.push({status:r.status(),path:new URL(r.url()).pathname});});
   const open=async route=>{assert.equal((await page.goto(origin+route,{timeout:90000})).status(),200);await page.waitForFunction(()=>document.documentElement.dataset.uiReady==='true');await page.locator('[data-workspace]').waitFor();};
   for(const route of routes){
    await open(route);assert.equal(await page.locator('[data-workspace]').getAttribute('data-navigation'),'dock');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    if(width===1440){
     await page.locator('.ui-dock').waitFor({state:'visible'});assert.equal(await page.locator('.ui-dock-links a').count(),5);
     const box=await page.locator('.ui-dock').boundingBox(),content=await page.locator('main').boundingBox();assert.ok(box.x+box.width<=content.x+1);
     assert.equal(await page.locator('a.ui-dock-link[aria-current]').count(),1,route+' must identify its parent Dock destination');
    }else{assert.equal(await page.locator('.ui-dock').isVisible(),false);assert.equal(await page.locator('.ui-mobile-nav>a').count(),4);}
    if(route==='/dev/calendar'||route==='/dev/record')await page.screenshot({path:path.join(out,`${route.endsWith('calendar')?'calendar':'record'}-${width}-${theme}.png`)});
   }
   await open('/dev/record');await page.locator('.record-mode').getByRole('button',{name:'กรอกเอง',exact:true}).click();await page.locator('[name=record-manual-notes]').fill('Dock draft remains');
   const appearance=async()=>{if(width===1440)await page.locator('.ui-dock').getByRole('button',{name:'รูปแบบการแสดงผล',exact:true}).click();else{await page.getByRole('button',{name:'บัญชีและเครื่องมือ',exact:true}).click();await page.locator('dialog[open]').getByRole('button',{name:'รูปแบบการแสดงผล',exact:true}).click();}};
   await appearance();await page.locator('dialog[open]').getByRole('button',{name:'Sidebar แบบเดิม',exact:true}).click();await page.keyboard.press('Escape');assert.equal(await page.locator('[name=record-manual-notes]').inputValue(),'Dock draft remains');
   await page.getByRole('button',{name:'บัญชีและเครื่องมือ',exact:true}).click();await page.locator('dialog[open]').getByRole('button',{name:'รูปแบบการแสดงผล',exact:true}).click();await page.locator('dialog[open]').getByRole('button',{name:'Dock ลอยตัว',exact:true}).click();await page.keyboard.press('Escape');
   assert.equal(await page.locator('[name=record-manual-notes]').inputValue(),'Dock draft remains');
   if(width===1440){
    const calendar=page.locator('.ui-dock-links').getByRole('link',{name:'ตาราง',exact:true});await calendar.hover();await page.getByRole('tooltip').filter({hasText:'ตาราง'}).waitFor();
    await page.waitForFunction(()=>parseFloat(document.querySelector('.ui-dock-links a[href="/calendar"]').style.getPropertyValue('--dock-scale'))>1.1);
    await calendar.focus();await page.keyboard.press('ArrowDown');assert.equal(await page.locator('.ui-dock-links a[href="/resources"]').evaluate(el=>el===document.activeElement),true);await page.keyboard.press('Escape');
    await calendar.click();await page.waitForURL('**/dev/calendar');await page.locator('.ui-dock-links').getByRole('link',{name:'บันทึกงาน',exact:true}).click();await page.waitForURL('**/dev/record');
    assert.equal(await page.locator('[name=record-manual-notes]').inputValue(),'Dock draft remains');
    await page.locator('.ui-dock').getByRole('button',{name:'หน้าและเครื่องมือทั้งหมด',exact:true}).click();assert.equal(await page.locator('dialog[open]').getByRole('link',{name:'บันทึกด่วนและ Combo',exact:true}).count(),0);await page.keyboard.press('Escape');
    await page.locator('.ui-dock-links').getByRole('link',{name:'ตาราง',exact:true}).click();await page.waitForURL('**/dev/calendar');
    await page.locator('.ui-dock').getByRole('button',{name:'หน้าและเครื่องมือทั้งหมด',exact:true}).click();await page.locator('dialog[open]').getByRole('link',{name:'บันทึกด่วนและ Combo',exact:true}).click();await page.waitForURL('**/dev/templates');
    await page.setViewportSize({width:1440,height:480});const short=await page.locator('.ui-dock').boundingBox();assert.ok(short.y>=0&&short.y+short.height<=480);assert.equal(await page.locator('.ui-dock a,.ui-dock button').evaluateAll(nodes=>nodes.filter(node=>{const box=node.getBoundingClientRect();return box.width<44||box.height<44;}).length),0);await page.locator('.ui-dock').getByRole('button',{name:'รูปแบบการแสดงผล',exact:true}).click();await page.keyboard.press('Escape');await page.setViewportSize({width:1440,height:1000});
    await appearance();await page.locator('dialog[open]').getByRole('checkbox',{name:/ลดการเคลื่อนไหว/}).check();await page.locator('dialog[open]').getByRole('checkbox',{name:/ลดความโปร่งใส/}).check();await page.keyboard.press('Escape');
    await page.locator('.ui-dock-links a').first().hover();assert.equal(await page.locator('.ui-dock-tile').first().evaluate(el=>getComputedStyle(el).transform),'none');assert.equal(await page.locator('.ui-dock-shell').evaluate(el=>getComputedStyle(el).backdropFilter),'none');
   }
   await page.screenshot({path:path.join(out,`dock-${width}-${theme}.png`),fullPage:true});
   report.cases.push({width,theme,routes:routes.length,draftSurvivesNavigationAndSidebarSwitch:true,desktopDockOrFourMobileTabs:true});await ctx.close();
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.httpErrors,[]);assert.deepEqual(report.unexpectedOrigins,[]);report.completed=true;
 }finally{await browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));}
 console.log('PASS Dock: 36 page/theme/viewport checks, reversible navigation, draft, tooltip, keyboard and accessibility');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
