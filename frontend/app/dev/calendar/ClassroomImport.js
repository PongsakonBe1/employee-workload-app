"use client";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, FileText, Upload } from "lucide-react";
import { GlassButton } from "../../../components/ui/GlassControls";
import { IMPORT_WEEKDAYS, planClassroomImport } from "../../../lib/classroomImport";
import { readClassroomPdf } from "../../../lib/readClassroomPdf";

const initialTerms={vocational:{start:"",end:""},higher:{start:"",end:""}};
export default function ClassroomImport({data,canEdit,glassMode,onCancel,onImport}) {
  const [result,setResult]=useState(null),[fileName,setFileName]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [terms,setTerms]=useState(initialTerms),[semester,setSemester]=useState("2/2569"),[confirmed,setConfirmed]=useState(false);
  const [roomFilter,setRoomFilter]=useState("all");
  const request=useRef(null),errorRef=useRef(null);
  useEffect(()=>()=>request.current?.abort(),[]);
  async function choose(file) {
    request.current?.abort();const controller=new AbortController();request.current=controller;
    setBusy(true);setError("");setResult(null);setConfirmed(false);setRoomFilter("all");setFileName(file?.name||"");
    try {const parsed=await readClassroomPdf(file,controller.signal);if(!controller.signal.aborted)setResult(parsed);}
    catch (failure) {if(!controller.signal.aborted){setError(failure.message||"อ่านไฟล์ไม่สำเร็จ");}}
    finally {if(request.current===controller)setBusy(false);}
  }
  function update(id,patch) {setConfirmed(false);setResult(previous=>({...previous,rows:previous.rows.map(row=>row.id===id?{...row,...patch}:row)}));}
  const plan=result?planClassroomImport(result.rows,terms,semester,data):null;
  const selected=result?.rows.filter(row=>row.selected).length||0;
  function submit(event) {
    event.preventDefault();
    // Re-plan against current state at commit time, including newly added exams.
    const current=planClassroomImport(result?.rows||[],terms,semester,data);
    if(!canEdit||!confirmed||current.issues.length){setError("ตรวจแก้รายการและยืนยันก่อนนำเข้า");errorRef.current?.focus();return;}
    onImport(current.rules);
  }
  return <form className="cal-import-form" onSubmit={submit}>
    <ol className="cal-import-steps" aria-label="ขั้นตอนนำเข้า">
      <li aria-current={!result?"step":undefined}>1 · เลือก PDF</li><li aria-current={result?"step":undefined}>2 · ตรวจและปรับแก้</li><li>3 · เพิ่มลงปฏิทิน</li>
    </ol>
    <div className="cal-import-file">
      <FileText size={26} aria-hidden="true"/>
      <div><strong>{fileName||"ตารางการใช้ห้องเรียน"}</strong><p>PDF ที่มีข้อความและเส้นตาราง · ไม่เกิน 10 MB / 5 หน้า</p></div>
      <label className="cal-import-picker"><Upload size={17} aria-hidden="true"/><span>{busy?"กำลังอ่าน…":fileName?"เปลี่ยนไฟล์":"เลือกไฟล์ PDF"}</span><input aria-label="เลือกไฟล์ PDF ตารางเรียน" type="file" accept="application/pdf,.pdf" disabled={busy||!canEdit} onChange={event=>{const file=event.target.files?.[0];if(file)choose(file);event.target.value="";}}/></label>
    </div>
    <p className="cal-form-note">อ่านในอุปกรณ์นี้ ไม่มีการอัปโหลดไฟล์ · รองรับตารางห้อง 401, 402, 406, 407 · “งดให้บริการ” ไม่สร้างรายการปิดห้อง</p>
    {busy&&<p role="status">กำลังอ่านข้อความและขอบช่องตาราง…</p>}
    {error&&<p ref={errorRef} tabIndex={-1} role="alert" className="cal-form-error">{error}</p>}
    {result&&<>
      <section className="cal-import-terms" aria-label="กำหนดช่วงภาคเรียน">
        <h3>ช่วงภาคเรียน</h3><p className="cal-form-note">กรอกวันเริ่มและสิ้นสุดให้ตรงแต่ละกลุ่ม ใช้ซ้ำทุกสัปดาห์ในช่วงนี้ วันหยุดแสดงในปฏิทิน แต่ไม่ตัดคาบเรียนอัตโนมัติ</p>
        <label className="ui-field"><span>ภาคเรียน</span><input className="apple-input" value={semester} onChange={event=>{setSemester(event.target.value);setConfirmed(false);}} placeholder="2/2569" maxLength={6}/></label>
        {[["vocational","ปวช."],["higher","ป.ตรี / อื่น ๆ"]].filter(([key])=>result.rows.some(row=>row.selected&&row.group===key)).map(([key,label])=><fieldset className="cal-import-term" key={key}>
          <legend>{label}</legend><p className="cal-form-note">{key==="higher"?"เอกสารอาจระบุแค่วันเริ่ม กรุณายืนยันวันสิ้นสุดเอง":"ตรวจวันเริ่มและสิ้นสุดตามประกาศภาคเรียน"}</p>
          <div className="cal-form-grid">{[["start","เริ่มเรียน"],["end","สิ้นสุด"]].map(([field,text])=><label key={field} className="ui-field"><span>{label} · {text}</span><input className="apple-input" type="date" value={terms[key][field]} onChange={event=>{setTerms(previous=>({...previous,[key]:{...previous[key],[field]:event.target.value}}));setConfirmed(false);}}/></label>)}</div>
        </fieldset>)}
      </section>
      <div className="cal-import-list-heading"><h3>ตรวจรายการ · {result.rows.length} รายการ</h3><span>เลือก {selected} รายการ</span></div>
      <label className="ui-field cal-import-room-filter"><span>ตรวจตามห้อง</span><select className="apple-input" value={roomFilter} onChange={event=>setRoomFilter(event.target.value)}><option value="all">ทุกห้อง</option>{[...new Set(result.rows.map(row=>row.room))].map(room=><option key={room} value={room}>{`ห้อง ${room}`}</option>)}</select></label>
      <p className="cal-form-note">ชื่อเป็นข้อความจากเอกสาร แก้ชื่อวิชา/ผู้สอน วัน เวลา ห้อง และกลุ่มได้ก่อนบันทึก กลุ่ม ป.ตรี / อื่น ๆ เป็นค่าเริ่มต้นสำหรับแถวที่ไม่มีคำว่า ปวช.</p>
      {result.warnings.length>0&&<div className="cal-import-warning" role="status"><AlertCircle size={18} aria-hidden="true"/><div><strong>บางส่วนอ่านไม่ได้ ตรวจเทียบต้นฉบับก่อน</strong>{result.warnings.map((warning,i)=><p key={i}>{warning}</p>)}</div></div>}
      <div className="cal-import-rows">{result.rows.map((row,index)=>{
        const issue=plan.issues.find(item=>item.id===row.id&&item.field!=="term");
        return <fieldset key={row.id} className="cal-import-row" data-selected={row.selected} hidden={roomFilter!=="all"&&roomFilter!==row.room}>
          <legend>รายการ {index+1} · หน้า {row.page}</legend>
          <label className="cal-import-check"><input type="checkbox" className="ui-checkbox" checked={row.selected} onChange={event=>update(row.id,{selected:event.target.checked})}/><span>นำเข้ารายการ {index+1}</span></label>
          <label className="ui-field cal-import-title"><span>ชื่อวิชา / รายละเอียด</span><input className="apple-input" value={row.title} maxLength={500} disabled={!row.selected} onChange={event=>update(row.id,{title:event.target.value})}/></label>
          <div className="cal-import-row-fields">
            <label className="ui-field"><span>วัน</span><select className="apple-input" disabled={!row.selected} value={row.weekday} onChange={event=>update(row.id,{weekday:Number(event.target.value)})}>{IMPORT_WEEKDAYS.map((label,i)=><option value={i} key={label}>{label}</option>)}</select></label>
            <label className="ui-field"><span>ห้อง</span><select className="apple-input" disabled={!row.selected} value={row.room} onChange={event=>update(row.id,{room:event.target.value})}>{["401","402","406","407"].map(room=><option key={room}>{room}</option>)}</select></label>
            <label className="ui-field"><span>เริ่ม</span><input className="apple-input" disabled={!row.selected} type="time" value={row.start} onChange={event=>update(row.id,{start:event.target.value})}/></label>
            <label className="ui-field"><span>สิ้นสุด</span><input className="apple-input" disabled={!row.selected} type="time" value={row.end} onChange={event=>update(row.id,{end:event.target.value})}/></label>
            <label className="ui-field"><span>ช่วงวันที่</span><select className="apple-input" disabled={!row.selected} value={row.group} onChange={event=>update(row.id,{group:event.target.value})}><option value="vocational">ปวช.</option><option value="higher">ป.ตรี / อื่น ๆ</option></select></label>
          </div>
          {row.selected&&issue&&<p className="cal-form-error"><AlertCircle size={15} aria-hidden="true"/> {issue.message}</p>}
        </fieldset>;
      })}</div>
      <div className="cal-import-summary" aria-live="polite">{plan.issues.some(issue=>issue.field==="term")?"ระบุช่วงภาคเรียนของกลุ่มที่เลือกให้ครบก่อน":plan.issues.length?`ยังมี ${plan.issues.length} จุดที่ต้องตรวจแก้`:`พร้อมเพิ่ม ${plan.rules.length} ตารางรายสัปดาห์ · ${plan.occurrences} คาบตลอดช่วงที่เลือก`}</div>
      <label className="cal-import-check"><input type="checkbox" className="ui-checkbox" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/><span>ตรวจเทียบ PDF และยืนยันชื่อ วัน เวลา ห้อง และช่วงภาคเรียนแล้ว</span></label>
    </>}
    <div className="cal-dialog-actions cal-import-actions"><GlassButton mode={glassMode} onClick={onCancel}>ยกเลิก</GlassButton><GlassButton mode={glassMode} variant="prominent" type="submit" disabled={!canEdit||!result||busy||!confirmed||plan?.issues.length>0}>เพิ่ม {selected||""} ตาราง</GlassButton></div>
  </form>;
}
