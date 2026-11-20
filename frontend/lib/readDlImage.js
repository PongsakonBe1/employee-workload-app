import { DL_IMAGE_LIMITS, dlNameKey, dlTableGeometry, parseDlTimeCell } from "./dlImageImport";

function abortable(promise,signal){
 signal.throwIfAborted();return new Promise((resolve,reject)=>{
  const cancel=()=>reject(new DOMException("Cancelled","AbortError"));signal.addEventListener("abort",cancel,{once:true});
  Promise.resolve(promise).then(resolve,reject).finally(()=>signal.removeEventListener("abort",cancel));
 });
}
function dimensions(bytes){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if([137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value)&&bytes.length>=24)return {width:view.getUint32(16),height:view.getUint32(20)};
 if(bytes[0]===255&&bytes[1]===216){
  let offset=2;
  while(offset+8<bytes.length){if(bytes[offset]!==255){offset++;continue;}const marker=bytes[offset+1];if(marker===217||marker===218)break;const length=view.getUint16(offset+2);if(length<2||offset+length+2>bytes.length)break;if([192,193,194].includes(marker))return {height:view.getUint16(offset+5),width:view.getUint16(offset+7)};offset+=length+2;}
 }
 throw new Error("เลือกภาพ PNG หรือ JPEG ที่ถูกต้อง");
}
export async function validateDlImageFile(file){
 if(!file||!file.size||file.size>DL_IMAGE_LIMITS.bytes||!/^.+\.(png|jpe?g)$/i.test(file.name))throw new Error("เลือกภาพ PNG/JPEG ขนาดไม่เกิน 10 MB");
 const size=dimensions(new Uint8Array(await file.arrayBuffer()));
 if(!size.width||!size.height||size.width>DL_IMAGE_LIMITS.dimension||size.height>DL_IMAGE_LIMITS.dimension||size.width*size.height>DL_IMAGE_LIMITS.pixels)throw new Error("ภาพต้องไม่เกิน 12 ล้านพิกเซล และด้านละ 6,000 พิกเซล");
 return size;
}
export async function readDlImage(file,{signal,onProgress=()=>{}}={}){
 const controller=new AbortController(),cancel=()=>controller.abort();let timedOut=false,worker,bitmap;
 signal?.addEventListener("abort",cancel,{once:true});if(signal?.aborted)cancel();
 const timeout=setTimeout(()=>{timedOut=true;cancel();},120000),active=controller.signal;
 const terminate=()=>worker?.terminate();active.addEventListener("abort",terminate,{once:true});
 try{
  await validateDlImageFile(file);active.throwIfAborted();
  bitmap=await abortable(createImageBitmap(file).then(image=>{if(active.aborted){image.close();active.throwIfAborted();}return image;}),active);
  const canvas=document.createElement("canvas");canvas.width=bitmap.width;canvas.height=bitmap.height;
  const ctx=canvas.getContext("2d",{willReadFrequently:true});ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0);
  const geometry=dlTableGeometry(ctx.getImageData(0,0,canvas.width,canvas.height));
  onProgress({phase:"loading",progress:0});
  const {default:{createWorker,PSM}}=await abortable(import(/* webpackIgnore: true */ "/dev-ocr/tesseract.esm.min.js"),active);active.throwIfAborted();
  const setup=createWorker(["tha","eng"],1,{workerPath:new URL("/dev-ocr/worker.min.js",location.origin).href,corePath:new URL("/dev-ocr/core",location.origin).href,langPath:new URL("/dev-ocr",location.origin).href,cachePath:"labboy-dl-ocr-7-best-int",logger:message=>{if(!active.aborted&&message.status!=="recognizing text")onProgress({phase:"loading",progress:message.progress||0});},errorHandler:()=>{}}).then(instance=>{if(active.aborted){instance.terminate();throw new DOMException("Cancelled","AbortError");}return instance;});
  worker=await abortable(setup,active);
  const crop=document.createElement("canvas"),names=[],cells=[];let total=geometry.rows.length*4,done=0;
  async function recognize(row,column){
   active.throwIfAborted();const left=geometry.columns[column]+3,top=row.top+3,width=geometry.columns[column+1]-left-2,height=row.bottom-top-2;
   const scale=Math.min(4,1600/width);crop.width=Math.round(width*scale);crop.height=Math.round(height*scale);
   const context=crop.getContext("2d");context.fillStyle="#fff";context.fillRect(0,0,crop.width,crop.height);context.drawImage(canvas,left,top,width,height,0,0,crop.width,crop.height);
   const result=await abortable(worker.recognize(crop,{}, {text:true}),active);active.throwIfAborted();done++;onProgress({phase:"reading",progress:done/total});
   return {text:result.data.text.trim(),confidence:result.data.confidence,preview:column===0?crop.toDataURL("image/png"):undefined};
  }
  await worker.setParameters({tessedit_pageseg_mode:PSM.SINGLE_BLOCK,tessedit_char_whitelist:"0123456789/.: -"});
  for(const row of geometry.rows)cells.push(await recognize(row,0));
  const retry=cells.map((cell,index)=>({cell,index})).filter(({cell})=>parseDlTimeCell(cell.text).some(row=>!row.date||!row.start||!row.end));total+=retry.length;
  await worker.setParameters({tessedit_char_whitelist:""});
  for(const {cell,index} of retry)cell.alternate=(await recognize(geometry.rows[index],0)).text;
  await worker.setParameters({tessedit_pageseg_mode:PSM.SINGLE_LINE,tessedit_char_whitelist:""});
  const rows=[];
  for(const [index,row] of geometry.rows.entries()){
   const keys=[];
   for(let column=1;column<4;column++){
    const read=await recognize(row,column),key=dlNameKey(read.text)||`unread-${index}-${column}`;keys.push(key);
    if(!names.some(person=>person.key===key))names.push({key,text:read.text,confidence:read.confidence});
   }
   for(const [round,times] of parseDlTimeCell(cells[index].text,cells[index].alternate).entries())rows.push({id:`image-${index}-${round}`,sourceRow:index+1,sourceTimeText:cells[index].text,sourceTimePreview:cells[index].preview,...times,proctorKeys:keys,selected:true});
  }
  if(rows.length>DL_IMAGE_LIMITS.rounds)throw new Error("พบรายการมากเกิน 100 รอบ กรุณาแบ่งภาพ");
  const warnings=[];
  if(rows.some(row=>!row.date||!row.start||!row.end))warnings.push("มีวันที่หรือเวลาอ่านไม่ครบ ตรวจและแก้รายการก่อนนำเข้า");
  if(rows.some(row=>row.timeRecovered))warnings.push("มีช่องเวลาที่ต้องจัดรูปแบบหรืออ่านซ้ำ กรุณาตรวจเทียบกับภาพก่อนยืนยัน");
  active.throwIfAborted();return {rows,names,sourceRows:geometry.rows.length,warnings};
 }catch(error){
  if(timedOut)throw new Error("อ่านภาพเกิน 2 นาที กรุณาใช้ภาพที่ชัดหรือแบ่งภาพ");
  if(active.aborted)throw new DOMException("Cancelled","AbortError");
  if(["InvalidStateError","EncodingError"].includes(error.name))throw new Error("ไม่สามารถอ่านภาพนี้ได้ กรุณาตรวจไฟล์ PNG/JPEG หรือเลือกภาพใหม่");
  if(error instanceof TypeError)throw new Error("ตัวอ่านภาพยังไม่พร้อม ตรวจการเชื่อมต่อแล้วลองอีกครั้ง");
  throw error;
 }finally{clearTimeout(timeout);signal?.removeEventListener("abort",cancel);active.removeEventListener("abort",terminate);await worker?.terminate();bitmap?.close();}
}
