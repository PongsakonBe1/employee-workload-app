/* Use an isolated browser preference profile, not the user's browser or CSS zoom. */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.argv[2]);
const out=path.resolve(__dirname,'../../../../output/playwright/ux-phase1/'+(process.argv.includes('--batch-b')?'phase-b':'phase-a'));
async function sample(zoom){
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'labboy-phase-a-zoom-'));
 fs.mkdirSync(path.join(profile,'Default'));
 // Chromium stores a dictionary keyed by the encoded relative partition path;
 // the default partition has an empty relative path and therefore key "x".
 fs.writeFileSync(path.join(profile,'Default','Preferences'),JSON.stringify({partition:{default_zoom_level:{x:Math.log(zoom)/Math.log(1.2)}}}));
 const context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:process.argv[3],viewport:null,args:['--window-size=1440,1050']});
 const page=context.pages()[0],results=[];
 try{for(const route of ['record','worklogs','classrooms','imports']){
  await page.goto('http://127.0.0.1:4197/#/'+route);await page.waitForFunction(()=>document.documentElement.dataset.reviewReady==='7');
  await page.waitForFunction(()=>document.getAnimations().every(a=>a.playState!=='running'));
  const stats=await page.evaluate(()=>({innerWidth,outerWidth,dpr:devicePixelRatio,root:getComputedStyle(document.documentElement).fontSize,cssZoom:getComputedStyle(document.documentElement).zoom,overflow:document.documentElement.scrollWidth>innerWidth+1}));
  results.push({zoom,route,...stats});assert.equal(stats.overflow,false,route+' browser zoom overflow');
  if(zoom===2)await page.screenshot({path:path.join(out,'zoom-200-'+route+'.png'),fullPage:true});
 }}finally{await context.close();}return results;
}
(async()=>{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'browser-zoom-report.json'),JSON.stringify({completed:false}));const baseline=await sample(1),zoomed=await sample(2);for(let i=0;i<baseline.length;i++){
 assert.ok(Math.abs(zoomed[i].dpr/baseline[i].dpr-2)<.05,'Native zoom must double DPR');assert.ok(Math.abs(zoomed[i].innerWidth*2-baseline[i].innerWidth)<8,'Native zoom must halve layout viewport');assert.equal(zoomed[i].root,baseline[i].root,'Root text size must remain unchanged');}
 fs.writeFileSync(path.join(out,'browser-zoom-report.json'),JSON.stringify({completed:true,method:'Isolated Edge persistent profile partition.default_zoom_level; no CSS zoom, pinch zoom or device-metrics override',baseline,zoomed,limitations:['Headless Edge only; Safari/iOS and device UAT pending']},null,2));console.log('PASS native browser 200% zoom: four routes, doubled DPR and halved layout viewport');})().catch(e=>{fs.writeFileSync(path.join(out,'browser-zoom-report.json'),JSON.stringify({completed:false,error:e.message},null,2));console.error(e);process.exitCode=1;});
