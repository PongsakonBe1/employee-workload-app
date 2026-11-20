// Copy pinned browser OCR assets from installed packages; never upload images.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const require=createRequire(path.join(root,"frontend/package.json"));
export function prepareDlOcrAssets(destination=path.join(root,"frontend/public/dev-ocr")){
 const packages=[["tesseract.js","7.0.0"],["tesseract.js-core","7.0.0"],["@tesseract.js-data/tha","1.0.0"],["@tesseract.js-data/eng","1.0.0"]];
 const sources=packages.map(([name,version])=>{const manifest=require.resolve(name+"/package.json"),info=JSON.parse(fs.readFileSync(manifest,"utf8"));if(info.version!==version)throw new Error("Unreviewed OCR version: "+name);return {directory:path.dirname(manifest),name,version,license:info.license};});
 fs.mkdirSync(destination,{recursive:true});fs.mkdirSync(path.join(destination,"core"),{recursive:true});
 for(const file of ["tesseract.esm.min.js","worker.min.js"])fs.copyFileSync(path.join(sources[0].directory,"dist",file),path.join(destination,file));
 fs.copyFileSync(path.join(sources[0].directory,"LICENSE.md"),path.join(destination,"LICENSE-tesseract"));
 fs.copyFileSync(path.join(sources[1].directory,"LICENSE"),path.join(destination,"LICENSE-core"));
 for(const file of fs.readdirSync(sources[1].directory).filter(file=>/\.wasm(\.js)?$/.test(file)))fs.copyFileSync(path.join(sources[1].directory,file),path.join(destination,"core",file));
 for(const source of sources.slice(2)){const language=source.name.split("/")[1];fs.copyFileSync(path.join(source.directory,"4.0.0_best_int",language+".traineddata.gz"),path.join(destination,language+".traineddata.gz"));}
 fs.writeFileSync(path.join(destination,"NOTICE.json"),JSON.stringify(sources.map(({name,version,license})=>({name,version,license,source:"https://www.npmjs.com/package/"+name})),null,2));
 return destination;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){prepareDlOcrAssets();console.log("Prepared self-hosted OCR 7.0.0 with Thai/English integer language models.");}
