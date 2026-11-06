/* Real Next.js shared-component checks in a fresh, network-isolated browser. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.argv[2]);
const out=path.resolve(__dirname,'../output/playwright/develop-ui-foundation');fs.mkdirSync(out,{recursive:true});
const report={completed:false,checks:[],errors:[],blockedOrigins:[],limitations:['Synthetic UI route; no successful authenticated backend/Firestore integration test','Physical iOS/Safari/Android testing and full feature-page migration remain pending']};
async function main(){
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]});let page;
 try {
  const context=await browser.newContext({viewport:{width:1440,height:1050},serviceWorkers:'block'});
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin==='http://127.0.0.1:4310')return route.continue();report.blockedOrigins.push(url.origin);return route.abort();});
  page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto('http://127.0.0.1:4310/dev/ui',{timeout:90000});await page.locator('[data-workspace]').waitFor();await page.waitForFunction(()=>document.documentElement.dataset.uiReady==='true');
  const settle=()=>page.waitForFunction(()=>document.querySelector('[data-workspace]')&&document.getAnimations().every(animation=>animation.playState!=='running'));
  const test=async(name,fn)=>{await fn();report.checks.push({name,status:'passed'});console.log('PASS '+name);};
  const visibleDialog=()=>page.locator('dialog[open]');
  const close=async()=>{await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog[open]'));};
  const appearance=async()=>{await page.locator('.ui-header button[aria-label="บัญชีและเครื่องมือ"]').click();await visibleDialog().getByRole('button',{name:'รูปแบบการแสดงผล',exact:true}).click();await visibleDialog().getByRole('heading',{name:'รูปแบบการแสดงผล',exact:true}).waitFor();};
  const navigate=async href=>{await page.locator(`.ui-sidebar a[href="${href}"]`).first().click();await settle();};
  await test('Next mounts the actual shared shell in development and keeps the four role-aware mobile destinations',async()=>{
   assert.match(await page.locator('.ui-develop-label').innerText(),/Development/);
   assert.ok(await page.locator('.ui-dev-metrics .apple-panel').first().evaluate(el=>parseFloat(getComputedStyle(el).padding)>=20),'Existing Tailwind utilities must compile');
   assert.ok(await page.locator('.ui-dev-metrics .text-4xl').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=36),'Existing MetricCard typography must remain intact');
   for(const role of ['staff','admin','superadmin']){await page.getByRole('combobox',{name:'บทบาทตัวอย่าง'}).selectOption(role);await settle();const links=await page.locator('.ui-mobile-nav a').evaluateAll(els=>els.map(el=>el.getAttribute('href')));assert.deepEqual(links,[role==='staff'?'/worklogs/new':'/admin/record','/calendar','/resources','/dashboard']);}
   await page.getByRole('combobox',{name:'บทบาทตัวอย่าง'}).selectOption('staff');
  });
  await test('Theme and backgrounds persist across navigation and reload; switching appearance preserves a form draft',async()=>{
   await page.locator('[name="ui-notes"]').fill('ร่างสังเคราะห์ที่ต้องคงอยู่');await appearance();await visibleDialog().getByRole('button',{name:'มืด',exact:true}).click();await page.waitForFunction(()=>document.documentElement.dataset.uiTheme==='dark');await visibleDialog().getByRole('button',{name:/สีละมุน/}).click();await close();
   assert.equal(await page.locator('[name="ui-notes"]').inputValue(),'ร่างสังเคราะห์ที่ต้องคงอยู่');await navigate('/dashboard');assert.equal(await page.locator('html').getAttribute('data-ui-background'),'ambient');
   await page.reload();await page.locator('[data-workspace]').waitFor();assert.equal(await page.locator('html').getAttribute('data-ui-theme'),'dark');assert.equal(await page.locator('html').getAttribute('data-ui-background'),'ambient');
   const preferences=await page.evaluate(()=>JSON.parse(localStorage.getItem('labboy.appearance.v1')));assert.deepEqual(Object.keys(preferences).sort(),['background','material','motion','theme']);
  });
  await test('System theme changes update appearance; forced solid and reduced motion override decoration',async()=>{
   await appearance();await visibleDialog().getByRole('button',{name:'ตามระบบ',exact:true}).click();await close();await page.emulateMedia({colorScheme:'light'});await page.waitForFunction(()=>document.documentElement.dataset.uiTheme==='light');await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});await page.waitForFunction(()=>document.documentElement.dataset.uiTheme==='dark'&&document.documentElement.dataset.uiMotion==='reduce');
   await appearance();await visibleDialog().getByRole('checkbox',{name:/ลดความโปร่งใส/}).check();await close();assert.equal(await page.locator('.ui-sidebar').evaluate(el=>getComputedStyle(el).backdropFilter),'none');
   await appearance();await visibleDialog().getByRole('checkbox',{name:/ลดความโปร่งใส/}).uncheck();await visibleDialog().getByRole('button',{name:'สว่าง',exact:true}).click();await visibleDialog().getByRole('button',{name:/ฟ้า–เขียวเดิม/}).click();await close();await page.emulateMedia({colorScheme:'light',reducedMotion:'no-preference'});
  });
  await test('Compact sidebar tooltips work on hover and focus without clipping; expanded tools remain scrollable',async()=>{
   await navigate('/calendar');await page.waitForFunction(()=>document.querySelector('[data-workspace]').dataset.compact==='true');const link=page.locator('.ui-sidebar a[href="/dashboard"]');
   await link.hover();await page.getByRole('tooltip').waitFor();const tip=await page.getByRole('tooltip').boundingBox();assert.ok(tip.x>=0&&tip.x+tip.width<=1440);await page.getByRole('tooltip').hover();await page.waitForTimeout(180);assert.ok(await page.getByRole('tooltip').isVisible());await page.keyboard.press('Escape');assert.equal(await page.getByRole('tooltip').count(),0);
   await page.mouse.move(1000,20);await link.focus();await page.getByRole('tooltip').waitFor();await page.keyboard.press('Escape');
   await page.getByRole('combobox',{name:'บทบาทตัวอย่าง'}).selectOption('superadmin');await navigate('/calendar');await page.setViewportSize({width:1440,height:540});await page.locator('.ui-tools-disclosure').click();
   const nav=page.locator('.ui-sidebar-menu'),dimensions=await nav.evaluate(el=>({x:el.scrollWidth-el.clientWidth,y:el.scrollHeight-el.clientHeight}));assert.ok(dimensions.x<=0);assert.ok(dimensions.y>0);await nav.hover();await page.mouse.wheel(0,500);await page.waitForFunction(()=>document.querySelector('.ui-sidebar-menu').scrollTop>0);await page.setViewportSize({width:1440,height:1050});
  });
  await test('Native dialogs trap keyboard focus, Escape restores focus, and route search remains usable',async()=>{
   await page.locator('.ui-header button[aria-label="บัญชีและเครื่องมือ"]').focus();await page.keyboard.press('Enter');for(let n=0;n<12;n++)await page.keyboard.press('Tab');assert.equal(await visibleDialog().evaluate(el=>el.contains(document.activeElement)),true);await close();assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'บัญชีและเครื่องมือ');
   await page.locator('.ui-header button[aria-label="บัญชีและเครื่องมือ"]').click();await page.mouse.click(4,4);await page.waitForFunction(()=>!document.querySelector('dialog[open]'));
   await page.keyboard.press('Control+k');await visibleDialog().getByRole('searchbox').fill('จัดตารางสอบ');assert.equal(await visibleDialog().locator('nav a').count(),1);assert.ok(await visibleDialog().locator('.ui-nav-text').first().isVisible(),'Compact sidebar must not hide names in the route picker');assert.equal(await visibleDialog().locator('nav a').getAttribute('href'),'/admin/dl-exam-schedules');await visibleDialog().locator('nav a').click();assert.equal(await page.locator('dialog[open]').count(),0);
  });
  await test('Native checkbox and segmented controls keep keyboard behavior and do not submit the surrounding form',async()=>{
   const checkbox=page.locator('[name="ui-extra"]');await checkbox.focus();await page.keyboard.press('Space');assert.equal(await checkbox.isChecked(),true);await page.getByRole('button',{name:'วัน',exact:true}).click();assert.equal(await page.getByRole('button',{name:'วัน',exact:true}).getAttribute('aria-pressed'),'true');assert.equal(await page.getByRole('button',{name:'สัปดาห์',exact:true}).getAttribute('aria-pressed'),'false');
   await page.locator('form[aria-label="ฟอร์มตรวจ controls"] button[type="submit"]').click();assert.match(await page.locator('[role="status"]').last().innerText(),/ไม่มีการบันทึกข้อมูลจริง/);
  });
  await test('Mobile date/time fields fit; all backgrounds and shared dialogs work at 375, 390, 430 and tablet widths',async()=>{
   for(const width of [375,390,430,768])for(const theme of ['สว่าง','มืด']){
    await page.setViewportSize({width,height:844});await appearance();await visibleDialog().getByRole('button',{name:theme,exact:true}).click();
    for(const background of ['ฟ้า–เขียวเดิม','สีละมุน','เรียบ']){await visibleDialog().getByRole('button',{name:new RegExp(background)}).click();const rect=await visibleDialog().boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=width+1);}
    await visibleDialog().getByRole('button',{name:/ฟ้า–เขียวเดิม/}).click();await close();
    assert.match(await page.locator('body').evaluate(el=>getComputedStyle(el,'::before').backgroundImage),/gradient/);assert.ok(await page.evaluate(width=>document.documentElement.scrollWidth<=width,width));
    for(const type of ['date','time']){const input=page.locator(`input[type="${type}"]`),rect=await input.boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=width);if(width<761)assert.ok(await input.evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16));}
   }
  });
  await test('Shared text and controls have readable contrast in both themes; screenshots cover phone and desktop',async()=>{
   await page.getByRole('combobox',{name:'บทบาทตัวอย่าง'}).selectOption('staff');await page.evaluate(()=>window.scrollTo(0,0));
   for(const [device,width,height]of [['desktop',1440,1050],['mobile',390,844]])for(const theme of ['light','dark']){
    await page.setViewportSize({width,height});await appearance();await visibleDialog().getByRole('button',{name:theme==='dark'?'มืด':'สว่าง',exact:true}).click();await close();await settle();
    const colors=await page.evaluate(()=>{const button=document.querySelector('.apple-button'),input=document.querySelector('.apple-input');return {button:[getComputedStyle(button).color,getComputedStyle(document.documentElement).getPropertyValue('--ui-accent')],input:[getComputedStyle(input).color,getComputedStyle(input).backgroundColor],boundary:[getComputedStyle(input).borderColor,getComputedStyle(input).backgroundColor]};});assert.ok(contrast(...colors.button)>=4.5,JSON.stringify(colors));assert.ok(contrast(...colors.input)>=4.5);assert.ok(contrast(...colors.boundary)>=3);
    await page.locator('.ui-page-heading h1').click();await page.screenshot({path:path.join(out,`foundation-${device}-${theme}.png`),fullPage:true});await appearance();await settle();await page.screenshot({path:path.join(out,`appearance-${device}-${theme}.png`),fullPage:false});await close();
   }
  });
  await test('Preference changes still work when browser storage refuses writes',async()=>{
   await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new Error('Storage unavailable in test');};});await appearance();await visibleDialog().getByRole('button',{name:'สว่าง',exact:true}).click();await close();await page.waitForFunction(()=>document.documentElement.dataset.uiTheme==='light');
  });
  await test('A touch/mobile context can navigate, open appearance, change options and dismiss the native sheet',async()=>{
   const touch=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3,serviceWorkers:'block'});
   try{
    await touch.route('**/*',route=>new URL(route.request().url()).origin==='http://127.0.0.1:4310'?route.continue():route.abort());
    const phone=await touch.newPage();phone.on('pageerror',error=>report.errors.push(error.message));await phone.goto('http://127.0.0.1:4310/dev/ui',{timeout:90000});await phone.waitForFunction(()=>document.documentElement.dataset.uiReady==='true');assert.equal(await phone.evaluate(()=>matchMedia('(pointer:coarse)').matches),true);
    await phone.locator('.ui-mobile-nav a[href="/calendar"]').tap();await phone.getByRole('heading',{name:'ตารางและการใช้ห้อง',exact:true}).waitFor();await phone.locator('.ui-header button[aria-label="บัญชีและเครื่องมือ"]').tap();await phone.locator('dialog[open]').getByRole('button',{name:'รูปแบบการแสดงผล',exact:true}).tap();await phone.locator('dialog[open]').getByRole('button',{name:'มืด',exact:true}).tap();await phone.waitForFunction(()=>document.documentElement.dataset.uiTheme==='dark');
    await phone.locator('dialog[open]').getByRole('checkbox',{name:/ลดความโปร่งใส/}).tap();assert.equal(await phone.locator('html').getAttribute('data-ui-material'),'solid');await phone.locator('dialog[open] button[aria-label="ปิดหน้าต่าง"]').tap();await phone.waitForFunction(()=>!document.querySelector('dialog[open]'));assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=390));await phone.screenshot({path:path.join(out,'touch-mobile-dark.png'),fullPage:true});
   }finally{await touch.close();}
  });
  await test('Actual AppShell still redirects anonymous users to login without a fake authenticated session',async()=>{
   await page.goto('http://127.0.0.1:4310/calendar',{timeout:90000});await page.waitForURL('**/login',{timeout:30000});assert.equal(await page.locator('[data-workspace]').count(),0);
  });
  assert.deepEqual(report.errors,[]);report.completed=true;
 } catch(error){report.error=error.stack;if(page&&!page.isClosed())await page.screenshot({path:path.join(out,'failure.png'),fullPage:true});throw error;}
 finally {report.blockedOrigins=[...new Set(report.blockedOrigins)];fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();}
}
function contrast(a,b){const luminance=color=>{const channels=color.trim().startsWith('#')?color.trim().slice(1).match(/../g).map(n=>parseInt(n,16)/255):color.match(/[\d.]+/g).slice(0,3).map(Number).map(n=>n/255);const [r,g,blue]=channels.map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return r*.2126+g*.7152+blue*.0722;};const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
main().catch(error=>{console.error(error);process.exitCode=1;});
