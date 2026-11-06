/* Behavioral and visual checks for Review 10; no real cloud data or new packages. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.argv[2]);
const out=path.resolve(__dirname,'../../../../output/playwright/ux-phase1/refinements-e');fs.mkdirSync(out,{recursive:true});
const report={completed:false,results:[],errors:[],limitations:['Synthetic prototype only; no production data or cloud-read measurement','Physical Safari/iPhone/Android and team comprehension UAT are pending']};
async function main(){
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]});let page;
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',error=>report.errors.push(error.message));
  const settle=()=>page.waitForFunction(()=>document.documentElement.dataset.refinementsEReady==='true'&&document.documentElement.dataset.calendarReady==='true'&&document.getAnimations().every(a=>a.playState!=='running'));
  const visit=async route=>{await page.goto('http://127.0.0.1:4197/#/'+route);await settle();};
  const test=async(name,fn)=>{await fn();report.results.push({name,status:'passed'});console.log('PASS '+name);};
  const screenshot=async(name,fullPage=false)=>{await settle();await page.screenshot({path:path.join(out,name+'.png'),fullPage});};
  const close=async()=>{await page.keyboard.press('Escape');await settle();};
  await test('Mobile preserves classic and ambient gradients in both themes; plain remains an explicit option',async()=>{
   await page.setViewportSize({width:390,height:844});await visit('dashboard');assert.equal(await page.locator('html').getAttribute('data-background'),'classic');
   const backgrounds={};for(const theme of ['light','dark']){
    await page.evaluate(theme=>window.designReview.setTheme(theme),theme);
    for(const background of ['classic','ambient','plain']){
     await page.evaluate(()=>appearanceSheet());await page.locator(`[data-action="background-c"][data-value="${background}"]`).click();
     assert.equal(await page.locator(`[data-action="background-c"][data-value="${background}"]`).evaluate(el=>el===document.activeElement),true);
     await close();const fill=await page.locator('.wallpaper').evaluate(el=>getComputedStyle(el).backgroundImage);backgrounds[theme+'-'+background]=fill;
     if(background==='plain')assert.equal(fill,'none');else assert.match(fill,/gradient/);
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=390),true);
     await screenshot(`dashboard-mobile-${theme}-${background}`);
    }
   }
   assert.notEqual(backgrounds['light-classic'],backgrounds['dark-classic']);assert.notEqual(backgrounds['light-classic'],backgrounds['light-ambient']);
  });
  await test('Overview totals reconcile, the team keeps roster order after counts change, and missing records do not become a ranking',async()=>{
   await page.setViewportSize({width:1440,height:1000});await visit('dashboard');
   const before=await page.locator('.team-person-e').evaluateAll(els=>els.map(el=>el.dataset.key));
   const snapshot=await page.evaluate(()=>({count:planningRowsD().rows.length,shown:Number(document.querySelector('.summary-primary-e>strong').firstChild.textContent),people:people.map(p=>p.id)}));assert.equal(snapshot.shown,snapshot.count);assert.deepEqual(before,snapshot.people);
   await page.evaluate(()=>{for(let n=0;n<25;n++)state.logs.push({id:'REVIEW-E-'+n,date:uiD.range.start,employeeId:people.at(-1).id,task:'รายการสังเคราะห์ตรวจลำดับทีม'});render();});
   assert.deepEqual(await page.locator('.team-person-e').evaluateAll(els=>els.map(el=>el.dataset.key)),before);
   const counts=await page.evaluate(()=>[...document.querySelectorAll('.team-person-e')].map(el=>({shown:Number(el.querySelector('.team-person-count-e strong').textContent),actual:planningRowsD().rows.filter(r=>r.employeeId===el.dataset.key).length})));assert.ok(counts.every(c=>c.shown===c.actual));
   assert.equal(await page.locator('.chart-bar-d[data-kind="person"]').count(),0);
   assert.equal(await page.locator('.dashboard-context-e').getAttribute('open'),null);
  });
  await test('All task categories and team entries still drill into source records without another data load',async()=>{
   await visit('dashboard');const loads=await page.evaluate(()=>uiD.loads);
   await page.locator('[data-action="planning-all-tasks-e"]').click();const expected=await page.evaluate(()=>PlanningD.countBy(planningRowsD().rows,'task').length);assert.equal(await page.locator('#sheet .chart-bar-d').count(),expected);
   const category=page.locator('#sheet .chart-bar-d').last(),count=Number(await category.locator('strong').innerText());await category.click();assert.equal(await page.locator('#sheet tbody tr').count(),count);await close();
   const person=page.locator('.team-person-e').first(),personCount=Number(await person.locator('.team-person-count-e strong').innerText());await person.click();assert.equal(await page.locator('#sheet tbody tr').count(),personCount);await close();
   await page.locator('.dashboard-context-e>summary').click();await page.locator('[data-action="planning-hours-d"]:visible').click();await close();assert.equal(await page.evaluate(()=>uiD.loads),loads);
  });
  await test('An empty scoped period remains explicit, and zero-count staff still open an empty source view',async()=>{
   await page.evaluate(()=>{uiD.range={start:'2024-01-01',end:'2024-01-07'};render();});assert.match(await page.locator('.dashboard-takeaway-e').innerText(),/ยังไม่มีบันทึก/);assert.equal(await page.locator('.summary-primary-e>strong').innerText(),'0รายการ');
   await page.locator('.team-person-e').first().click();assert.match(await page.locator('#sheet').innerText(),/ไม่มีบันทึก/);await close();
  });
  await test('Compact navigation labels are unclipped tooltips with keyboard focus, Escape dismissal and no native-title duplicate',async()=>{
   await visit('classrooms');const link=page.locator('#app-sidebar a[href="#/dashboard"]'),tip=page.locator('#nav-tooltip-e');
   await link.hover();await page.waitForTimeout(100);assert.equal(await tip.isVisible(),false);await tip.waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelector('#nav-tooltip-e').dataset.visible==='true');
   assert.equal(await link.getAttribute('title'),null);assert.equal(await link.getAttribute('aria-describedby'),'nav-tooltip-e');assert.equal(await tip.innerText(),'ภาพรวม');
   const box=await tip.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=1440);assert.ok(box.y>=0&&box.y+box.height<=1000);
   await screenshot('calendar-desktop-tooltip');await tip.hover();await page.waitForTimeout(180);assert.equal(await tip.isVisible(),true);assert.equal(await tip.getAttribute('data-visible'),'true');
   await page.keyboard.press('Escape');assert.equal(await tip.isVisible(),false);assert.equal(await link.getAttribute('aria-describedby'),null);
   await page.mouse.move(1000,20);await link.focus();await tip.waitFor({state:'visible'});await page.keyboard.press('Escape');assert.equal(await tip.isVisible(),false);
   await page.keyboard.press('Tab');await tip.waitFor({state:'visible'});assert.match(await tip.innerText(),/เครื่องมือ/);await page.keyboard.press('Enter');await settle();assert.equal(await tip.isVisible(),false);
  });
  await test('Short desktop rail scrolls expanded tools without horizontal overflow or inaccessible last links',async()=>{
   await page.setViewportSize({width:1440,height:540});await visit('classrooms');await page.locator('[data-action="management7"]').click();
   const nav=page.locator('#app-sidebar .sidebar-menu');const sizes=await nav.evaluate(el=>({width:el.clientWidth,scrollWidth:el.scrollWidth,height:el.clientHeight,scrollHeight:el.scrollHeight,overflow:getComputedStyle(el).overflowY,scrollbar:getComputedStyle(el).scrollbarWidth}));assert.ok(sizes.scrollWidth<=sizes.width);assert.ok(sizes.scrollHeight>sizes.height);assert.equal(sizes.overflow,'auto');assert.equal(sizes.scrollbar,'thin');
   await nav.hover();await page.mouse.wheel(0,400);await page.waitForFunction(()=>document.querySelector('.sidebar-menu').scrollTop>0);
   const last=nav.locator('a').last();await last.focus();const boxes=await last.evaluate(el=>{const a=el.getBoundingClientRect(),b=el.closest('.sidebar-menu').getBoundingClientRect();return{left:a.left,right:a.right,top:a.top,bottom:a.bottom,navLeft:b.left,navRight:b.right,navTop:b.top,navBottom:b.bottom};});assert.ok(boxes.left>=boxes.navLeft&&boxes.right<=boxes.navRight);assert.ok(boxes.top>=boxes.navTop-1&&boxes.bottom<=boxes.navBottom+1);
   await page.keyboard.press('Escape');await screenshot('calendar-desktop-short-rail');
  });
  await test('Tooltip transition respects reduced motion and never appears in an expanded sidebar',async()=>{
   await page.setViewportSize({width:1440,height:1000});await visit('classrooms');await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#app-sidebar a[href="#/dashboard"]').hover();await page.locator('#nav-tooltip-e').waitFor({state:'visible'});
   assert.equal(await page.locator('#nav-tooltip-e').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');await page.keyboard.press('Escape');
   await visit('dashboard');await page.locator('#app-sidebar a[href="#/classrooms"]').hover();await page.waitForTimeout(380);assert.equal(await page.locator('#nav-tooltip-e').isVisible(),false);await page.emulateMedia({reducedMotion:'no-preference'});
  });
  await test('Overview and calendar remain within real viewport widths; the primary chart is compact on desktop',async()=>{
   await page.goto('about:blank');await visit('dashboard');
   for(const width of [375,390,430,768,1440])for(const theme of ['light','dark']){
    await page.setViewportSize({width,height:width<761?844:1000});await page.evaluate(theme=>window.designReview.setTheme(theme),theme);
    for(const route of ['dashboard','classrooms','settings']){await visit(route);assert.ok(await page.evaluate(width=>document.documentElement.scrollWidth<=width,width),route+' '+width+' '+theme);}
   }
   await page.setViewportSize({width:1440,height:1000});await visit('dashboard');assert.ok((await page.locator('.dashboard-trend-e').boundingBox()).height<400);
   for(const [device,width,height]of [['desktop',1440,1000],['mobile',390,844]])for(const theme of ['light','dark']){
    await page.setViewportSize({width,height});await page.evaluate(theme=>window.designReview.setTheme(theme),theme);
    for(const route of ['dashboard','classrooms']){await visit(route);await screenshot(`${route}-${device}-${theme}`);if(route==='dashboard')await screenshot(`${route}-${device}-${theme}-full`,true);}
   }
  });
  assert.deepEqual(report.errors,[]);report.completed=true;
 }catch(error){report.error=error.stack;if(page&&!page.isClosed())await page.screenshot({path:path.join(out,'failure.png'),fullPage:true});throw error;}
 finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
