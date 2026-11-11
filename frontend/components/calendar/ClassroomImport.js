"use client";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, FileText, Upload } from "lucide-react";
import { GlassButton } from "../ui/GlassControls";
import { IMPORT_WEEKDAYS, classroomTermDefaults, importTermIssues, planClassroomImport } from "../../lib/classroomImport";
import { readClassroomPdf } from "../../lib/readClassroomPdf";

export default function ClassroomImport({data,dataset="sample",datasetLabel,onUseSandbox,canEdit,glassMode,onCancel,onImport,writeTarget=""}) {
  const [result,setResult]=useState(null),[fileName,setFileName]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [terms,setTerms]=useState(()=>classroomTermDefaults("2/2569")),[semester,setSemester]=useState("2/2569"),[confirmed,setConfirmed]=useState(false);
  const [roomFilter,setRoomFilter]=useState("all");
  const [focusTarget,setFocusTarget]=useState(null),[showTermErrors,setShowTermErrors]=useState(false);
  const request=useRef(null),errorRef=useRef(null),formRef=useRef(null);
  useEffect(()=>()=>request.current?.abort(),[]);
  useEffect(()=>{
    if (!focusTarget) return;
    const target=formRef.current?.querySelector(focusTarget.selector);
    if (target) { target.scrollIntoView({block:"center",behavior:"auto"});target.focus({preventScroll:true}); }
  },[focusTarget]);
  useEffect(()=>{if(error)errorRef.current?.focus();},[error]);
  async function choose(file) {
    request.current?.abort();const controller=new AbortController();request.current=controller;
    setBusy(true);setError("");setResult(null);setConfirmed(false);setRoomFilter("all");setShowTermErrors(false);setFileName(file?.name||"");
    try {const parsed=await readClassroomPdf(file,controller.signal);if(!controller.signal.aborted)setResult(parsed);}
    catch (failure) {if(!controller.signal.aborted){setError(failure.message||"อ่านไฟล์ไม่สำเร็จ");}}
    finally {if(request.current===controller)setBusy(false);}
  }
  function update(id,patch) {setConfirmed(false);setResult(previous=>({...previous,rows:previous.rows.map(row=>row.id===id?{...row,...patch}:row)}));}
  const existingLabel=datasetLabel||(dataset==="sample"?"ชุดตัวอย่าง":"พื้นที่ทดลองนำเข้า");
  const plan=result?planClassroomImport(result.rows,terms,semester,data,existingLabel):null;
  const termIssues=result?importTermIssues(result.rows,terms):[];
  const selected=result?.rows.filter(row=>row.selected).length||0;
  const needsReview=Boolean(result&&(plan.issues.length||!confirmed));
  const canUseSandbox=dataset==="sample"&&typeof onUseSandbox==="function";
  const sandboxNext=canUseSandbox&&!termIssues.length&&plan?.issues.length>0&&plan.issues.every(issue=>issue.conflict?.origin==="existing");
  const nextLabel=termIssues.length?"กำหนดช่วงภาคเรียน":sandboxNext?"ใช้พื้นที่ทดลองแยก":plan?.issues.length?"ตรวจจุดที่ต้องแก้":!confirmed?"ยืนยันการตรวจรายการ":`เพิ่ม ${selected} ตาราง`;
  function switchToSandbox(){if(canEdit&&canUseSandbox){setConfirmed(false);onUseSandbox();}}
  function changeSemester(value){
    setSemester(value);setConfirmed(false);
    if(value!==semester&&/^\d\/(25|26)\d{2}$/.test(value))setTerms(classroomTermDefaults(value));
  }
  function reviewNext() {
    if (!result) return;
    if (termIssues.length) {
      const issue=termIssues[0];
      setShowTermErrors(true);
      setFocusTarget({selector:`[data-term-group="${issue.group}"][data-term-field="${issue.field}"]`});
    } else if (sandboxNext) switchToSandbox();
    else if (plan.issues.length) {
      setRoomFilter("all");
      setFocusTarget({selector:selected===0?'.cal-import-row input[type="checkbox"]':plan.issues.some(issue=>issue.id)?'.cal-import-row[data-issue="true"]':'[name="import-semester"]'});
    } else setFocusTarget({selector:'[name="import-confirm"]'});
  }
  async function submit(event) {
    event.preventDefault();
    // Re-plan against current state at commit time, including newly added exams.
    const current=planClassroomImport(result?.rows||[],terms,semester,data,existingLabel);
    if(!canEdit)return;
    if(!confirmed||current.issues.length){reviewNext();return;}
    try { const failure=await onImport(current.rules);if(failure)setError(failure); }
    catch { setError("ยังยืนยันผลการบันทึกไม่ได้ กรุณาลองใหม่ด้วยรายการเดิม"); }
  }
  return <form ref={formRef} className="cal-import-form" onSubmit={submit}>
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
      <section className="cal-import-dataset-note" aria-label="ข้อมูลที่ใช้ตรวจตารางชน">
        <strong>กำลังตรวจเทียบกับ{existingLabel}</strong>
        <p>{writeTarget?`ไฟล์อ่านในอุปกรณ์นี้ เมื่อยืนยันจะบันทึกรายการที่เลือกไปยัง ${writeTarget} และตรวจชนกับข้อมูลล่าสุดอีกครั้ง`:dataset==="sample"?"ตารางตัวอย่างที่ใส่ไว้เพื่อดูหน้าตาอาจทับกับไฟล์ของคุณ ใช้พื้นที่แยกเพื่อนำเข้า โดยชุดตัวอย่างและรายการที่เคยเพิ่มยังเก็บไว้ให้สลับกลับได้":"ตรวจซ้ำและเวลาชนเฉพาะรายการในพื้นที่นี้ ข้อมูลยังอยู่เฉพาะแท็บนี้ ไม่เขียนระบบจริง"}</p>
        {canUseSandbox&&<GlassButton mode={glassMode} disabled={!canEdit} onClick={switchToSandbox}>ใช้พื้นที่ทดลองแยก</GlassButton>}
      </section>
      <section className="cal-import-terms" aria-label="กำหนดช่วงภาคเรียน">
        <h3>ช่วงภาคเรียน</h3><p className="cal-form-note">{semester==="2/2569"?"ตั้งต้นด้วยวันที่ทีมยืนยันสำหรับภาคเรียน 2/2569 ปรับแก้ได้ · ":"ระบุวันเริ่มและสิ้นสุดของภาคเรียนนี้ · "}ใช้ซ้ำทุกสัปดาห์ในช่วงนี้ วันหยุดแสดงในปฏิทิน แต่ไม่ตัดคาบเรียนอัตโนมัติ</p>
        <label className="ui-field"><span>ภาคเรียน</span><input name="import-semester" className="apple-input" value={semester} onChange={event=>changeSemester(event.target.value)} placeholder="2/2569" maxLength={6}/></label>
        {[["vocational","ปวช."],["higher","ป.ตรี / อื่น ๆ"]].filter(([key])=>result.rows.some(row=>row.selected&&row.group===key)).map(([key,label])=><fieldset className="cal-import-term" key={key}>
          <legend>{label}</legend><p className="cal-form-note">ตรวจวันเริ่มและสิ้นสุดของกลุ่มนี้ก่อนนำเข้า</p>
          <div className="cal-form-grid">{[["start","เริ่มเรียน"],["end","สิ้นสุด"]].map(([field,text])=>{
            const issue=showTermErrors&&termIssues.find(item=>item.group===key&&item.field===field);
            const errorId=`import-${key}-${field}-error`;
            return <label key={field} className="ui-field"><span>{label} · {text} <small>(จำเป็น)</small></span><input className="apple-input" type="date" data-term-group={key} data-term-field={field} aria-required="true" aria-invalid={Boolean(issue)} aria-describedby={issue?errorId:undefined} value={terms[key][field]} onChange={event=>{setTerms(previous=>({...previous,[key]:{...previous[key],[field]:event.target.value}}));setConfirmed(false);}}/>{issue&&<span className="cal-form-error" id={errorId}>{issue.message}</span>}</label>;
          })}</div>
        </fieldset>)}
      </section>
      <div className="cal-import-list-heading"><h3>ตรวจรายการ · {result.rows.length} รายการ</h3><span>เลือก {selected} รายการ</span></div>
      <label className="ui-field cal-import-room-filter"><span>ตรวจตามห้อง</span><select className="apple-input" value={roomFilter} onChange={event=>setRoomFilter(event.target.value)}><option value="all">ทุกห้อง</option>{[...new Set(result.rows.map(row=>row.room))].map(room=><option key={room} value={room}>{`ห้อง ${room}`}</option>)}</select></label>
      <p className="cal-form-note">ชื่อเป็นข้อความจากเอกสาร แก้ชื่อวิชา/ผู้สอน วัน เวลา ห้อง และกลุ่มได้ก่อนบันทึก กลุ่ม ป.ตรี / อื่น ๆ เป็นค่าเริ่มต้นสำหรับแถวที่ไม่มีคำว่า ปวช.</p>
      {result.warnings.length>0&&<div className="cal-import-warning" role="status"><AlertCircle size={18} aria-hidden="true"/><div><strong>บางส่วนอ่านไม่ได้ ตรวจเทียบต้นฉบับก่อน</strong>{result.warnings.map((warning,i)=><p key={i}>{warning}</p>)}</div></div>}
      <div className="cal-import-rows">{result.rows.map((row,index)=>{
        const issue=plan.issues.find(item=>item.id===row.id&&item.field!=="term");
        return <fieldset key={row.id} className="cal-import-row" tabIndex={-1} data-selected={row.selected} data-issue={Boolean(row.selected&&issue)} hidden={roomFilter!=="all"&&roomFilter!==row.room}>
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
      <div className="cal-import-summary" aria-live="polite">{termIssues.length?`ยังขาดหรือผิด ${termIssues.length} ช่องในช่วงภาคเรียน`:plan.issues.length?`ยังมี ${plan.issues.length} จุดที่ต้องตรวจแก้`:`พร้อมเพิ่ม ${plan.rules.length} ตารางรายสัปดาห์ · ${plan.occurrences} คาบตลอดช่วงที่เลือก`}</div>
      <label className="cal-import-check"><input type="checkbox" name="import-confirm" className="ui-checkbox" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/><span>ตรวจเทียบ PDF และยืนยันชื่อ วัน เวลา ห้อง และช่วงภาคเรียนแล้ว</span></label>
    </>}
    <div className="cal-import-actions">
      {result&&<p className="cal-import-next-help" id="import-next-help" aria-live="polite">{termIssues.length?`${termIssues[0].message} · กดปุ่มเพื่อไปกรอก`:sandboxNext?"รายการชนกับชุดที่ใช้ดูตัวอย่าง ใช้พื้นที่ทดลองแยกได้โดยไม่ลบชุดเดิม":plan.issues.length?`${plan.issues[0].message} · กดปุ่มเพื่อตรวจแก้`:!confirmed?"ยืนยันว่าได้ตรวจรายการแล้วก่อนเพิ่มลงปฏิทิน":writeTarget?"ตรวจครบแล้ว เพิ่มเป็นชุดไปยัง staging ยังไม่มี Undo ฐานข้อมูล":"ตรวจครบแล้ว เพิ่มเป็นชุดและ Undo ได้"}</p>}
      <div className="cal-dialog-actions"><GlassButton mode={glassMode} onClick={onCancel}>ยกเลิก</GlassButton><GlassButton mode={glassMode} variant="prominent" type={needsReview?"button":"submit"} onClick={needsReview?reviewNext:undefined} aria-describedby={result?"import-next-help":undefined} disabled={!canEdit||!result||busy}>{result?nextLabel:"เพิ่มตาราง"}</GlassButton></div>
    </div>
  </form>;
}
