// Verify final reports, the pinned dependency, and relevant static sources.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const read = file => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
const run = args => { const r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});assert.equal(r.status,0,(r.stdout||'')+(r.stderr||''));return {command:'node '+args.join(' '),passed:true}; };
const staticChecks=[run(['node_modules/eslint/bin/eslint.js','--config','scripts/ui-eslint.config.mjs','frontend/components/ui/GlassControls.js','frontend/components/ui/ZakButton.js','frontend/components/ui/ButtonMaterialProvider.js','frontend/app/dev/ui'])];
for(const name of ['verify-liquid-button-pilot.cjs','benchmark-button-materials.cjs','verify-record-glass.cjs','verify-record-history.cjs','verify-calendar-glass.cjs','verify-templates-combo.cjs','verify-ui-zoom.cjs','check-ui-build.mjs'])staticChecks.push(run(['--check','scripts/'+name]));
const unit=read('unit-full.json');assert.equal(unit.numPassedTests,342);assert.equal(unit.numFailedTests+unit.numPendingTests+unit.numTodoTests,0);
const acceptance={};
for(const browser of ['edge','chrome','public']){
  const r=read(browser+'/report.json');assert.equal(r.completed,true);assert.equal(r.cases.length,8);assert.ok(r.cases.every(x=>x.passed));assert.deepEqual(r.errors,[]);assert.deepEqual(r.httpErrors,[]);
  const minimumContrast=Math.min(...r.contrast.map(x=>x.ratio));assert.ok(r.contrast.length>=64&&minimumContrast>=4.5);
  assert.equal(r.iosUserAgentPolicyOnly,true);assert.equal(r.pinch.policyEnabled,true);assert.ok(r.simulatedModuleAborts>0);assert.ok(r.touchScroll.after>r.touchScroll.before+45);
  acceptance[browser]={passed:8,total:8,minimumContrast,contrastSamples:r.contrast.length,browserVersion:r.browserVersion,iosPolicySmokeOnly:true,pinchGestureVerified:r.pinch.gestureVerified,evidence:browser+'/report.json'};
}
const regression={};
for(const [name,file,count]of [['record','regression-record/report.json',11],['history','regression-history/chrome/report.json',9],['calendar','regression-calendar/report.json',11],['templates','regression-templates/edge/report.json',7]]){
  const r=read(file),cases=r.cases||r.checks;assert.equal(r.completed,true);assert.equal(cases.length,count);assert.ok(cases.every(x=>x.passed===true||x.status==='passed'));assert.deepEqual(r.errors,[]);assert.deepEqual(r.httpErrors||[],[]);regression[name]={passed:count,total:count,evidence:file};
}
const build=read('build-report.json'),zoom=read('zoom-report.json'),performance=read('performance-sample.json');
assert.equal(build.compiled,true);assert.equal(build.productionOutUntouched,true);assert.equal(build.developmentPreviewRendered,false);assert.equal(zoom.completed,true);
assert.equal(performance.completed,true);assert.equal(performance.samples.length,2);assert.ok(performance.samples.every(x=>x.submitCount===20&&x.rafSamples>0));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'frontend/package.json'),'utf8')),lock=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8'));
const dependency=lock.packages['node_modules/@zakisheriff/liquid-glass'];assert.equal(manifest.dependencies['@zakisheriff/liquid-glass'],'0.3.20');assert.equal(dependency.version,'0.3.20');
assert.ok(fs.existsSync(path.join(root,'frontend/.ui-build-check/notices/liquid-glass.txt')));
const sourceFiles=['frontend/components/ui/GlassControls.js','frontend/components/ui/ZakButton.js','frontend/components/ui/ButtonMaterialProvider.js','frontend/app/dev/ui/ButtonMaterialReview.js','frontend/app/dev/ui/workspace.js','frontend/app/zak-button-pilot.css','frontend/app/layout.js','frontend/package.json','package-lock.json'];
const sourceHashes=Object.fromEntries(sourceFiles.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f),'utf8').replace(/\r\n/g,'\n')).digest('hex')]));
const summary={date:'2026-11-09',branch:'codex/liquid-glass-button-pilot',base:'97a8371',completedWithinDevelopmentScope:true,
  dependency:{name:'@zakisheriff/liquid-glass',version:dependency.version,integrity:dependency.integrity,license:'MIT',installScriptsRun:false,newPackages:1},
  unit:{passed:342,total:342,failed:0,skipped:0},acceptance,regression,staticChecks,nativeZoom200:true,compatibilityExport:build,performanceSampleRecorded:true,
  defaultDevelopButtonEngine:'zak',navigationAndSelection:'QuickLiquid unchanged',sourceHashes,
  preview:'https://northwest-revised-domains-varies.trycloudflare.com/dev/ui#button-materials',
  productionDataUsed:false,realAuthFirestoreSIT:false,humanUAT:false,physicalSafariAndroidUAT:false,physicalPinchGestureVerified:false,pushed:false,deployed:false,
  coverage:{featurePreviews:9,newFeatureRoutes:0,allPagesReady:false},
  limitations:['Physical Safari/iPhone/Android and pinch UAT remain pending','iOS user-agent smoke runs on Chromium, not WebKit','SVG refraction is deliberately disabled for non-Chromium; CSS material remains available','The candidate has higher TaskDuration in the one desktop sample; it is not a phone FPS/battery benchmark','Only native buttons were adopted; inputs/sheets/menus were not replaced']};
fs.writeFileSync(path.join(__dirname,'qc-summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log('PASS QC: dependency 0.3.20; 342 units; 8 pilot groups x 3; 38 regressions; zoom/build/static checks and desktop sample');
