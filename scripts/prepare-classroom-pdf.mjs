import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const require=createRequire(path.join(root,"frontend/package.json"));
export function prepareClassroomPdfAssets(destination=path.join(root,"frontend/public/dev-pdfjs")) {
  let manifest;
  try {manifest=require.resolve("pdfjs-dist/package.json");}catch {return false;}
  const info=JSON.parse(fs.readFileSync(manifest,"utf8"));
  if(info.version!=="5.6.205") throw new Error("Classroom PDF reader requires reviewed pdfjs-dist 5.6.205");
  const source=path.dirname(manifest);
  fs.mkdirSync(destination,{recursive:true});
  for(const file of ["pdf.mjs","pdf.worker.min.mjs"])fs.copyFileSync(path.join(source,"build",file),path.join(destination,file));
  fs.copyFileSync(path.join(source,"LICENSE"),path.join(destination,"LICENSE"));
  return true;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(!prepareClassroomPdfAssets()){console.error("PDF.js is not installed; no assets were copied.");process.exitCode=1;}
  else console.log("Prepared self-hosted PDF.js 5.6.205 and matching worker.");
}
