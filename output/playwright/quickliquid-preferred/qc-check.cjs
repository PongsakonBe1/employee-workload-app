const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),read=f=>JSON.parse(fs.readFileSync(path.join(__dirname,f),'utf8'));
const results={};
for(const target of ['edge','public']){const r=read(target+'/report.json');assert.equal(r.completed,true);assert.equal(r.cases.length,4);assert.ok(r.cases.every(x=>x.passed&&x.workingPageModuleRequests===0));assert.deepEqual(r.errors,[]);assert.deepEqual(r.httpErrors,[]);results[target]={passed:4,total:4,evidence:target+'/report.json'};}
const build=read('build-report.json');assert.equal(build.compiled,true);assert.equal(build.productionOutUntouched,true);assert.equal(build.developmentPreviewRendered,false);
const files=['frontend/components/ui/ButtonMaterialProvider.js','frontend/app/dev/ui/ButtonMaterialReview.js'];
const sourceHashes=Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f),'utf8').replace(/\r\n/g,'\n')).digest('hex')]));
fs.writeFileSync(path.join(__dirname,'qc-summary.json'),JSON.stringify({date:'2026-11-09',decision:'Reviewer preferred A / QuickLiquid',base:'59c50bc',branch:'codex/liquid-glass-button-pilot',defaultEngine:'quick',candidateEngine:'B remains available for explicit review',candidateJsLoadedOnFreshWorkingPage:false,results,compatibilityExport:build,targetedLint:'passed: ButtonMaterialProvider.js and ButtonMaterialReview.js',sourceHashes,productionDataUsed:false,deployed:false,realDeviceUAT:false,allPagesReady:false},null,2)+'\n');
console.log('PASS selected A: 4/4 local and 4/4 Cloudflare; B lazy; save/draft/layout checks and build passed');
