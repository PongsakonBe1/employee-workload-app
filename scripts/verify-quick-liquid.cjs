/* Development-only optics checks. No real account, backend data or new test dependency. */
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const {chromium}=require(process.argv[2]),origin=process.argv[4]||'http://127.0.0.1:4310';
const out=path.resolve(__dirname,'../output/playwright/quick-liquid-pilot',origin.startsWith('http://127.0.0.1')?'':'public');fs.mkdirSync(out,{recursive:true});
const report={url:origin+'/dev/ui',completed:false,checks:[],errors:[],metrics:[],limitations:['Chromium browser; iOS UA verifies our CSS fallback policy, not actual Safari rendering','No physical-device battery/FPS claims or production data integration']};
async function main(){
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]});let page;
 const context=async options=>{const result=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block',...options});await result.route('**/*',route=>{const url=new URL(route.request().url());return url.origin===origin||['data:','blob:'].includes(url.protocol)?route.continue():route.abort();});return result;};
 const open=async target=>{let response;for(let attempt=0;attempt<3;attempt++){response=await target.goto(origin+'/dev/ui',{timeout:90000});if(response.status()===200)break;assert.ok([502,503,504].includes(response.status()),'Unexpected preview HTTP '+response.status());await target.waitForTimeout(400);}assert.equal(response.status(),200);await target.waitForFunction(()=>document.documentElement.dataset.uiReady==='true');target.on('pageerror',error=>report.errors.push(error.message));};
 const count=async(target,n)=>target.waitForFunction(n=>(globalThis.__QUICK_LIQUID__?.metrics().engineCount||0)===n,n);
 const maps=target=>target.waitForFunction(()=>globalThis.__QUICK_LIQUID__?.metrics().engines.every(engine=>engine.mapKey&&!engine.mapError));
 const settle=target=>target.waitForFunction(()=>document.getAnimations().every(a=>a.playState!=='running')&&document.querySelector('.ui-glass-indicator')?.dataset.moving!=='true');
 const appearance=async target=>{await target.locator('.ui-header button[aria-label="บัญชีและเครื่องมือ"]').click();await target.locator('dialog[open]').getByRole('button',{name:'รูปแบบการแสดงผล',exact:true}).click();};
 const close=target=>target.keyboard.press('Escape');
 const test=async(name,fn)=>{await fn();report.checks.push({name,status:'passed'});console.log('PASS '+name);};
 try{
  const desktop=await context();page=await desktop.newPage();await open(page);
  await test('Desktop mounts one decorative SVG surface; hidden mobile surfaces do not allocate maps or contain controls',async()=>{
   await count(page,1);await maps(page);await page.waitForSelector('[data-glass-surface="toolbar"][data-glass-phase="svg"]');
   assert.equal(await page.locator('.ui-optical-layer button,.ui-optical-layer a,.ui-optical-layer input').count(),0);
   assert.equal(await page.locator('.ui-optical-layer').first().getAttribute('aria-hidden'),'true');report.metrics.push({device:'desktop',...await page.evaluate(()=>globalThis.__QUICK_LIQUID__.metrics())});
  });
  await test('A/B switches preserve the draft and release engine/cache resources after repeated toggles',async()=>{
   await page.locator('[name="ui-notes"]').fill('ร่างสังเคราะห์ตรวจการสลับวัสดุ');
   for(let i=0;i<5;i++){await page.getByRole('button',{name:'CSS เดิม',exact:true}).click();await count(page,0);assert.equal(await page.evaluate(()=>globalThis.__QUICK_LIQUID__.metrics().uniqueMaps),0);await page.getByRole('button',{name:'QuickLiquid',exact:true}).click();await count(page,1);await maps(page);}
   assert.equal(await page.locator('[name="ui-notes"]').inputValue(),'ร่างสังเคราะห์ตรวจการสลับวัสดุ');
  });
  await test('Light/dark follow the app choice, and solid/forced-colors preferences remove all optical engines',async()=>{
   const tints=[];
   for(const theme of ['มืด','สว่าง']){await appearance(page);await page.locator('dialog[open]').getByRole('button',{name:theme,exact:true}).click();await close(page);await count(page,1);await maps(page);tints.push(await page.locator('.ql-tint').first().evaluate(el=>getComputedStyle(el).backgroundImage));}
   assert.notEqual(tints[0],tints[1]);await appearance(page);await page.locator('dialog[open]').getByRole('checkbox',{name:/ลดความโปร่งใส/}).check();await close(page);await count(page,0);assert.equal(await page.locator('.ui-glass-indicator').isVisible(),false);
   await appearance(page);await page.locator('dialog[open]').getByRole('checkbox',{name:/ลดความโปร่งใส/}).uncheck();await close(page);await count(page,1);await page.emulateMedia({forcedColors:'active'});await count(page,0);await page.emulateMedia({forcedColors:'none'});await count(page,1);await maps(page);
  });
  await test('Rendered pixels change with displacement scale while blur, tint and geometry stay fixed',async()=>{
   await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.documentElement.dataset.uiMotion==='reduce');await maps(page);
   await page.evaluate(()=>{
    const header=document.querySelector('.ui-header'),actions=document.querySelector('.ui-header-actions'),box=actions.getBoundingClientRect(),h=header.getBoundingClientRect(),probe=document.createElement('div');probe.id='optical-render-probe';probe.style.cssText=`position:absolute;pointer-events:none;left:${box.left-h.left-8}px;top:${box.top-h.top-8}px;width:${box.width+16}px;height:${box.height+16}px;background:repeating-linear-gradient(90deg,#e23434 0 12px,#1948ed 12px 24px,#f9e427 24px 36px);`;header.insertBefore(probe,actions);
   });
   await page.waitForTimeout(150);const clip=await page.locator('.ui-header-actions').boundingBox();const a=await page.screenshot({clip}),same=await page.screenshot({clip});
   const filterId=await page.locator('[data-glass-surface="toolbar"] .ql-lens').evaluate(el=>getComputedStyle(el).backdropFilter.match(/#([^"\)]+)/)[1]);
   assert.ok(await page.locator(`filter[id="${filterId}"] feDisplacementMap`).count());
   await page.evaluate(id=>document.getElementById(id).querySelectorAll('feDisplacementMap').forEach(node=>{node.dataset.savedScale=node.getAttribute('scale');node.setAttribute('scale','0');}),filterId);
   const b=await page.screenshot({clip}),difference=comparePNG(a,b),noise=comparePNG(a,same);
   fs.writeFileSync(path.join(out,'refraction-on.png'),a);fs.writeFileSync(path.join(out,'refraction-zero.png'),b);report.pixelProbe={...difference,baselineNoise:noise.changedPixels};assert.ok(difference.changedPixels>50&&difference.changedPixels>noise.changedPixels*5,JSON.stringify(report.pixelProbe));
   await page.evaluate(id=>{document.getElementById(id).querySelectorAll('feDisplacementMap').forEach(node=>node.setAttribute('scale',node.dataset.savedScale));document.querySelector('#optical-render-probe').remove();},filterId);await page.emulateMedia({reducedMotion:'no-preference'});
  });
  await test('A simulated encoding failure falls back without leaving an active SVG filter or breaking menus',async()=>{
   const broken=await context();try{await broken.addInitScript(()=>{HTMLCanvasElement.prototype.toBlob=function(callback){callback(null);};});const target=await broken.newPage();await open(target);await target.waitForSelector('[data-glass-surface="toolbar"][data-glass-phase="css"]',{timeout:15000});assert.equal(await target.locator('svg feDisplacementMap').count(),0);await appearance(target);assert.ok(await target.locator('dialog[open]').isVisible());}finally{await broken.close();}
  });
  await test('Touch navigation keeps real anchors, a settled spring indicator and working menus in both themes',async()=>{
   const phoneContext=await context({viewport:{width:390,height:844},isMobile:true,hasTouch:true});try{
    const phone=await phoneContext.newPage();await open(phone);await count(phone,2);await maps(phone);await settle(phone);
    assert.ok(await phone.evaluate(()=>globalThis.__QUICK_LIQUID__.metrics().engines.every(engine=>engine.quality==='low')));
    for(const href of ['/calendar','/resources','/dashboard','/worklogs/new']){
     await phone.locator(`.ui-mobile-nav a[href="${href}"]`).tap();await phone.waitForFunction(()=>document.querySelector('.ui-glass-indicator').dataset.ready==='true'&&document.querySelector('.ui-glass-indicator').dataset.moving==='false');
     const selected=await phone.locator('.ui-mobile-nav a[aria-current="page"]').boundingBox(),indicator=await phone.locator('.ui-glass-indicator').boundingBox();assert.ok(Math.abs(selected.x-indicator.x)<1&&Math.abs(selected.width-indicator.width)<1,JSON.stringify({selected,indicator}));
    }
    await appearance(phone);await phone.locator('dialog[open]').getByRole('checkbox',{name:/ลดการเคลื่อนไหว/}).check();await close(phone);await phone.locator('.ui-mobile-nav a[href="/calendar"]').tap();await settle(phone);assert.equal(await phone.locator('.ui-glass-indicator').getAttribute('data-moving'),'false');
    for(const theme of ['สว่าง','มืด']){await appearance(phone);await phone.locator('dialog[open]').getByRole('button',{name:theme,exact:true}).click();await close(phone);await count(phone,2);await maps(phone);await settle(phone);assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=390));await phone.screenshot({path:path.join(out,`quick-mobile-${theme==='มืด'?'dark':'light'}.png`),fullPage:false});}
    report.metrics.push({device:'touch-mobile',...await phone.evaluate(()=>globalThis.__QUICK_LIQUID__.metrics())});
    await phone.getByRole('button',{name:'CSS เดิม',exact:true}).tap();await count(phone,0);await phone.screenshot({path:path.join(out,'css-mobile-dark.png'),fullPage:false});
   }finally{await phoneContext.close();}
  });
  await test('An iOS/Safari user agent gets explicit CSS optics, with no SVG displacement filters',async()=>{
   const safariPolicy=await context({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});try{const target=await safariPolicy.newPage();await open(target);await count(target,2);await target.waitForFunction(()=>[...document.querySelectorAll('[data-glass-surface][data-active=true]')].every(el=>el.dataset.glassPhase==='css'));assert.equal(await target.locator('[data-glass-surface][data-active=true]').count(),2);assert.equal(await target.locator('svg feDisplacementMap').count(),0);await appearance(target);await close(target);await target.screenshot({path:path.join(out,'safari-policy-fallback.png'),fullPage:false});}finally{await safariPolicy.close();}
  });
  await test('Desktop previews and keyboard dialogs retain layout after the optics experiment',async()=>{
   for(const theme of ['สว่าง','มืด']){await appearance(page);await page.locator('dialog[open]').getByRole('button',{name:theme,exact:true}).click();await close(page);await maps(page);await settle(page);await page.locator('.ui-page-heading h1').click();await page.screenshot({path:path.join(out,`quick-desktop-${theme==='มืด'?'dark':'light'}.png`),fullPage:false});}
   await page.getByRole('button',{name:'CSS เดิม',exact:true}).click();await count(page,0);await page.screenshot({path:path.join(out,'css-desktop-dark.png'),fullPage:false});await page.keyboard.press('Control+k');await page.locator('dialog[open]').getByRole('searchbox').fill('ตาราง');assert.ok(await page.locator('dialog[open] .ui-nav-text').first().isVisible());await close(page);
  });
  assert.deepEqual(report.errors,[]);report.completed=true;await desktop.close();
 }catch(error){report.error=error.stack;if(page&&!page.isClosed())await page.screenshot({path:path.join(out,'failure.png'),fullPage:true});throw error;}
 finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();}
}
function png(buffer){
 let at=8,width,height,channels;const idat=[];
 while(at<buffer.length){const length=buffer.readUInt32BE(at),type=buffer.toString('ascii',at+4,at+8),data=buffer.subarray(at+8,at+8+length);if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);assert.equal(data[8],8);assert.ok([2,6].includes(data[9]));channels=data[9]===6?4:3;}if(type==='IDAT')idat.push(data);at+=length+12;}
 const bytes=zlib.inflateSync(Buffer.concat(idat)),stride=width*channels,pixels=Buffer.alloc(stride*height);let source=0;
 const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let y=0;y<height;y++){const filter=bytes[source++];for(let x=0;x<stride;x++){const offset=y*stride+x,left=x>=channels?pixels[offset-channels]:0,up=y?pixels[offset-stride]:0,corner=y&&x>=channels?pixels[offset-stride-channels]:0;const predictor=filter===0?0:filter===1?left:filter===2?up:filter===3?Math.floor((left+up)/2):paeth(left,up,corner);pixels[offset]=(bytes[source++]+predictor)&255;}}
 return{width,height,channels,pixels};
}
function comparePNG(a,b){const x=png(a),y=png(b);assert.equal(x.width,y.width);assert.equal(x.height,y.height);let changedPixels=0;for(let p=0;p<x.width*x.height;p++)if([0,1,2].some(c=>Math.abs(x.pixels[p*x.channels+c]-y.pixels[p*y.channels+c])>5))changedPixels++;return{width:x.width,height:x.height,changedPixels};}
main().catch(error=>{console.error(error);process.exitCode=1;});
