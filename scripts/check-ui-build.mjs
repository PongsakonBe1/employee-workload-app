// Compile for export compatibility without copying production env or publishing output.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { uiDevelopmentEnvironment } from "./dev-ui.mjs";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const artifactFolder=["resources-ui-refinement","resource-detail-flow","resource-selection","dashboard-staff","assessment-summary","templates-combo","glass-button-roles","liquid-glass-button-pilot","quickliquid-preferred","classroom-pdf-import","dock-navigation-pilot","dock-motion-pass","dock-launchpad"].includes(process.argv[2])?process.argv[2]:"develop-ui-foundation";
const output=path.join(root,"output/playwright",artifactFolder);fs.mkdirSync(output,{recursive:true});
const result=spawnSync(process.execPath,[path.join(root,"node_modules/next/dist/bin/next"),"build","--no-lint"],{cwd:path.join(root,"frontend"),env:{...process.env,...uiDevelopmentEnvironment,NODE_ENV:"production",UI_BUILD_CHECK:"1"},encoding:"utf8",maxBuffer:8*1024*1024});
fs.writeFileSync(path.join(output,"build.log"),(result.stdout||"")+(result.stderr||""));
if(result.error)throw result.error;
if(result.status!==0){console.error('Compatibility build failed; see '+path.join(output,'build.log'));process.exitCode=result.status||1;}
else{
 const directory=path.join(root,"frontend/.ui-build-check"),previewFiles=["dev/templates.html","dev/templates/index.html","dev/dashboard.html","dev/dashboard/index.html","dev/staff.html","dev/staff/index.html","dev/ui.html","dev/ui/index.html","dev/record.html","dev/record/index.html","dev/calendar.html","dev/calendar/index.html","dev/history.html","dev/history/index.html","dev/resources.html","dev/resources/index.html","dev/equipment.html","dev/equipment/index.html","dev/equipment/usage.html","dev/equipment/usage/index.html"].filter(file=>fs.existsSync(path.join(directory,file)));
 const exposesPreview=previewFiles.some(file=>fs.readFileSync(path.join(directory,file),"utf8").includes('data-workspace'));
 if(exposesPreview)throw new Error("Development fixtures must not render in a production export");
 fs.writeFileSync(path.join(output,"build-report.json"),JSON.stringify({compiled:true,exportDirectory:"frontend/.ui-build-check",productionOutUntouched:true,developmentPreviewRendered:false,lint:"Targeted ESLint is a separate command",productionDataUsed:false,deployed:false},null,2));
 console.log('PASS compatibility export; development preview does not render; output isolated in frontend/.ui-build-check');
}
