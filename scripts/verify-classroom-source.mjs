// Read the authorized local source PDF, saving numeric results only.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { classroomPageGeometry } from "../frontend/lib/classroomPdfGeometry.js";
import { parseClassroomPages } from "../frontend/lib/classroomImport.js";
const {getDocument,OPS,version}=await import(pathToFileURL(path.resolve(process.argv[2])));
assert.equal(version,"5.6.205");
const task=getDocument({data:new Uint8Array(fs.readFileSync(process.argv[3])),isEvalSupported:false,disableFontFace:true});
try {
  const doc=await task.promise,pages=[];
  for(let i=1;i<=doc.numPages;i++)pages.push(await classroomPageGeometry(await doc.getPage(i),OPS));
  const result=parseClassroomPages(pages);
  const summary={version,pages:doc.numPages,rows:result.rows.length,warnings:result.warnings,byRoom:Object.fromEntries(["401","402","406","407"].map(room=>[room,result.rows.filter(row=>row.room===room).length])),slots:result.rows.map(({room,weekday,start,end})=>({room,weekday,start,end}))};
  assert.deepEqual(summary.byRoom,{"401":9,"402":7,"406":2,"407":7});assert.deepEqual(summary.warnings,[]);
  fs.writeFileSync("output/playwright/classroom-pdf-import/source-numeric-summary.json",JSON.stringify(summary,null,2));
  console.log("PASS source timetable: 25 weekly rows across 4 rooms; no identities saved.");
} finally {await task.destroy();}
