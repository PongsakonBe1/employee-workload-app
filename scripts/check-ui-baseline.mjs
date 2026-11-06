// Reproduce unrelated failures from the immutable accepted base, not edited files.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const output=path.join(root,"output/playwright/develop-ui-foundation"),base="dc80fbb";
const working=path.join(output,`baseline-run-${process.pid}`),copied=new Set();
fs.mkdirSync(output,{recursive:true});fs.mkdirSync(working);
function copySource(file){
 if(copied.has(file))return;
 if(!/^frontend\/lib\/[\w.-]+\.js$/.test(file))throw new Error("Baseline copy left the allowlisted pure-logic source directory");
 const code=execFileSync("git",["show",`${base}:${file}`],{cwd:root,encoding:"utf8"});copied.add(file);
 const destination=path.join(working,file);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,code);
 for(const match of code.matchAll(/from\s+["'](\.[^"']+)["']/g)){let relative=path.posix.normalize(path.posix.join(path.posix.dirname(file),match[1]));if(!relative.endsWith(".js"))relative+=".js";copySource(relative);}
}
try{
 for(const file of ["analytics.test.js","staffMetrics.test.js","validation.test.js"])copySource("frontend/lib/"+file);
 fs.writeFileSync(path.join(working,"vitest.config.mjs"),'export default { test: { include: ["frontend/lib/*.test.js"] } };');
 const result=spawnSync(process.execPath,[path.join(root,"node_modules/vitest/vitest.mjs"),"run","--root",working,"--config",path.join(working,"vitest.config.mjs"),"--reporter=json","--outputFile",path.join(output,"unit-baseline.json")],{cwd:root,encoding:"utf8"});
 if(result.error)throw result.error;
 if(!fs.existsSync(path.join(output,"unit-baseline.json")))throw new Error("Baseline runner did not produce a report");
 const report=JSON.parse(fs.readFileSync(path.join(output,"unit-baseline.json"))),current=JSON.parse(fs.readFileSync(path.join(output,"unit-full.json")));
 const failures=r=>r.testResults.flatMap(file=>file.assertionResults.filter(test=>test.status==="failed").map(test=>test.fullName)).sort();
 const baselineFailures=failures(report),currentFailures=failures(current),same=JSON.stringify(baselineFailures)===JSON.stringify(currentFailures);
 fs.writeFileSync(path.join(output,"baseline-comparison.json"),JSON.stringify({base,copiedFiles:[...copied],baselineFailures,currentFailures,sameFailures:same},null,2));
 if(!same)throw new Error("Current failures differ from the accepted baseline");
 console.log(`Confirmed ${baselineFailures.length} identical existing failures on immutable base ${base}`);
}finally{
 // Delete only this newly-created fixture directory after checking the real target.
 const real=fs.realpathSync(working),expected=path.resolve(working);
 if(real!==expected||path.dirname(real)!==fs.realpathSync(output)||!path.basename(real).startsWith("baseline-run-"))throw new Error("Refusing cleanup outside the generated baseline fixture");
 fs.rmSync(real,{recursive:true});
}
