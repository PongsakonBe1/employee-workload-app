import { IMPORT_LIMITS, parseClassroomPages } from "./classroomImport";
import { classroomPageGeometry } from "./classroomPdfGeometry";

export async function readClassroomPdf(file, signal) {
  if (!file || !/\.pdf$/i.test(file.name) || file.size>IMPORT_LIMITS.bytes || file.size===0) throw new Error("เลือกไฟล์ PDF ขนาดไม่เกิน 10 MB");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (String.fromCharCode(...bytes.slice(0,5))!=="%PDF-") throw new Error("ไฟล์นี้ไม่ใช่ PDF ที่ถูกต้อง");
  signal?.throwIfAborted();
  // Self-hosted static modules avoid external requests and keep the parser out of
  // the initial calendar bundle. The development asset preparer pins both files.
  let pdfjs;
  try {pdfjs=await import(/* webpackIgnore: true */ "/dev-pdfjs/pdf.mjs");}
  catch {throw new Error("ตัวอ่าน PDF ยังไม่พร้อม กรุณาเตรียม PDF.js แล้วเริ่ม develop server ใหม่");}
  signal?.throwIfAborted();
  pdfjs.GlobalWorkerOptions.workerSrc = "/dev-pdfjs/pdf.worker.min.mjs";
  const task = pdfjs.getDocument({data:bytes,isEvalSupported:false,disableFontFace:true,useSystemFonts:false,stopAtErrors:true});
  const abort=()=>{task.destroy().catch(()=>{});};signal?.addEventListener("abort",abort,{once:true});
  let timedOut=false;
  const timeout=setTimeout(()=>{timedOut=true;abort();},30000);
  try {
    const document = await task.promise;
    if (document.numPages>IMPORT_LIMITS.pages) throw new Error("รองรับ PDF ไม่เกิน 5 หน้า");
    const pages=[];
    for (let i=1;i<=document.numPages;i++) {signal?.throwIfAborted();const page=await document.getPage(i);pages.push(await classroomPageGeometry(page,pdfjs.OPS));page.cleanup();}
    signal?.throwIfAborted();
    return parseClassroomPages(pages);
  } catch (error) {
    if (signal?.aborted) throw new DOMException("Cancelled","AbortError");
    if (timedOut) throw new Error("อ่าน PDF นานเกิน 30 วินาที กรุณาแบ่งไฟล์หรือลองใหม่");
    if (error.name==="PasswordException") throw new Error("ไฟล์มีรหัสผ่าน กรุณาใช้ PDF ที่ไม่มีรหัสผ่าน");
    if (["InvalidPDFException","UnknownErrorException"].includes(error.name)) throw new Error("อ่าน PDF ไม่ได้ กรุณาตรวจไฟล์หรือเพิ่มตารางเอง");
    throw error;
  } finally {clearTimeout(timeout);signal?.removeEventListener("abort",abort);await task.destroy();}
}
