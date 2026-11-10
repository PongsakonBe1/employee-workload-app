"use client";
import { useEffect, useRef, useState } from "react";
import { ImageIcon, Plus, Upload } from "lucide-react";
import { GlassButton } from "../../../components/ui/GlassControls";
import { planDlImport } from "../../../lib/dlImageImport";
import { readDlImage, validateDlImageFile } from "../../../lib/readDlImage";

export default function DlImageImport({data,dataset,datasetLabel,canEdit,glassMode,onUseSandbox,onCancel,onImport,people,onAddPerson,writeTarget=""}){
 const [file,setFile]=useState(null),[preview,setPreview]=useState(""),[result,setResult]=useState(null),[mapping,setMapping]=useState({});
 const [busy,setBusy]=useState(false),[progress,setProgress]=useState(null),[error,setError]=useState(""),[participants,setParticipants]=useState("75"),[semester,setSemester]=useState("2/2569");
 const [confirmed,setConfirmed]=useState(false),[dayFilter,setDayFilter]=useState("all"),[focus,setFocus]=useState(null);
 const [nameDrafts,setNameDrafts]=useState({}),[nameErrors,setNameErrors]=useState({});
 const [examType,setExamType]=useState("");
 const request=useRef(null),form=useRef(null),errorRef=useRef(null),serial=useRef(0);
 useEffect(()=>()=>request.current?.abort(),[]);
 useEffect(()=>{if(!file){setPreview("");return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file]);
 useEffect(()=>{if(error)errorRef.current?.focus();},[error]);
 useEffect(()=>{if(focus){const node=form.current?.querySelector(focus.selector);node?.scrollIntoView({block:"center",behavior:"auto"});node?.focus({preventScroll:true});}},[focus]);
 const options={participants,semester,mapping,people};
 const existingLabel=datasetLabel||(dataset==="sample"?"ชุดตัวอย่าง":"พื้นที่ทดลองนำเข้า");
 const plan=result?planDlImport(result.rows,options,data):{events:[],issues:[],selected:0};
 async function choose(next){
  request.current?.abort();const controller=new AbortController();request.current=controller;setBusy(true);setFile(null);setError("");setResult(null);setMapping({});setNameDrafts({});setNameErrors({});setConfirmed(false);setDayFilter("all");
  try{await validateDlImageFile(next);if(!controller.signal.aborted)setFile(next);}
  catch(failure){if(!controller.signal.aborted)setError(failure.message);}
  finally{if(request.current===controller)setBusy(false);}
 }
 async function read(){
  request.current?.abort();const controller=new AbortController();request.current=controller;setBusy(true);setError("");setResult(null);setMapping({});setNameDrafts({});setNameErrors({});setConfirmed(false);setDayFilter("all");
  try{const parsed=await readDlImage(file,{signal:controller.signal,onProgress:setProgress});if(!controller.signal.aborted)setResult(parsed);}
  catch(failure){if(!controller.signal.aborted)setError(failure.message||"อ่านภาพไม่สำเร็จ กรุณาตรวจภาพหรือลงรายการเอง");}
  finally{if(request.current===controller){setBusy(false);setProgress(null);}}
 }
 function update(id,patch){setConfirmed(false);setResult(previous=>({...previous,rows:previous.rows.map(row=>row.id===id?{...row,...patch}:row)}));}
 function addReviewedName(person,index){
  if(!canEdit)return;
  const added=onAddPerson(nameDrafts[person.key]??person.text);
  if(added.error){setNameErrors(previous=>({...previous,[person.key]:added.error}));setFocus({selector:`[name="dl-preview-name-${index}"]`});return;}
  setMapping(previous=>({...previous,[person.key]:added.person.id}));setNameErrors(previous=>({...previous,[person.key]:""}));setConfirmed(false);
 }
 function addRound(){
  const id=`manual-${++serial.current}`,row={id,sourceRow:"เพิ่มเอง",date:"",start:"",end:"",proctorKeys:[],manualProctors:["","",""],selected:true};
  setConfirmed(false);setDayFilter("all");setResult(previous=>previous?{...previous,rows:[...previous.rows,row]}:{rows:[row],names:[],warnings:[],sourceRows:0});setFocus({selector:`[data-dl-row="${id}"] input[type=date]`});
 }
 const issue=plan.issues[0],sandboxNext=dataset==="sample"&&plan.issues.length>0&&plan.issues.every(item=>item.field==="conflict"&&item.existing);
 function next(){
  if(sandboxNext){setConfirmed(false);onUseSandbox();return;}
  setDayFilter("all");
  const target=issue?.field==="participants"?'[name="dl-import-participants"]':issue?.field==="semester"?'[name="dl-import-semester"]':issue?.id?`[data-dl-row="${issue.id}"] ${issue.field==="date"?'input[type=date]':issue.field==="end"?'input[name$="-end"]':issue.field==="start"?'input[name$="-start"]':issue.field==="proctors"?'select': 'input[type=date]'}`:issue?'[data-dl-row] input':'[name="dl-import-confirm"]';
  setFocus({selector:issue?.field==="proctors"&&form.current?.querySelector('[data-dl-map] select[data-unmapped=true]')?'[data-dl-map] select[data-unmapped=true]':target});
 }
 async function submit(event){
  event.preventDefault();if(!canEdit||!result)return;
  const current=planDlImport(result.rows,options,data);if(current.issues.length||!confirmed){next();return;}
  if(writeTarget&&!examType){setError("เลือกประเภทผู้เข้าสอบก่อนบันทึก");return;}
  try { const failure=await onImport(current.events,{participants,semester,examType});if(failure){setError(failure);setConfirmed(false);} }
  catch {setError("ยังยืนยันผลการบันทึกไม่ได้ กรุณาลองใหม่ด้วยรายการเดิม");}
 }
 const personOptions=<><option value="">เลือกผู้คุมสอบ</option>{people.map(person=><option value={person.id} key={person.id}>{person.label}{person.temporary?" · ทดลอง":""}</option>)}<option value="none">ไม่มีชื่อในช่องนี้</option></>;
 return <form className="cal-import-form dl-import-form" ref={form} onSubmit={submit} noValidate>
  {writeTarget&&<label className="ui-field"><span>ประเภทผู้เข้าสอบ</span><select className="apple-input" aria-label="ประเภทผู้เข้าสอบ" value={examType} onChange={event=>{setExamType(event.target.value);setConfirmed(false);}} required><option value="">เลือกประเภทผู้เข้าสอบ</option><option value="student">นักศึกษา</option><option value="staff">บุคลากร</option></select><small>ยืนยันรายการแล้วจะบันทึกไปยัง {writeTarget} และตรวจข้อมูลล่าสุดอีกครั้ง</small></label>}
  <ol className="cal-import-steps" aria-label="ขั้นตอนนำเข้า"><li aria-current={!result?"step":undefined}>1 · เลือกและอ่านภาพ</li><li aria-current={result?"step":undefined}>2 · ตรวจและจับคู่ผู้คุม</li><li>3 · เพิ่มลงปฏิทิน</li></ol>
  <div className="cal-import-file"><ImageIcon size={26} aria-hidden="true"/><div><strong>{file?.name||"ตารางสอบ Digital Literacy"}</strong><p>PNG/JPEG · ไม่เกิน 10 MB / 12 ล้านพิกเซล · ตารางแบบตัวอย่างที่มีผู้คุม 3 ช่อง</p></div><label className="cal-import-picker"><Upload size={17} aria-hidden="true"/><span>{file?"เปลี่ยนรูปภาพ":"เลือกรูปภาพ"}</span><input type="file" aria-label="เลือกรูปตารางสอบ DL" accept="image/png,image/jpeg,.png,.jpg,.jpeg" disabled={busy||!canEdit} onChange={event=>{choose(event.target.files?.[0]);event.target.value="";}}/></label></div>
  <p className="cal-form-note">อ่านในอุปกรณ์นี้ ไม่อัปโหลดรูป · ครั้งแรกต้องโหลดตัวอ่านและโมเดลภาษา · ตรวจข้อมูลก่อนเพิ่มทุกครั้ง</p>
  {preview&&<details className="dl-import-source" open={!result}><summary>ดูภาพต้นฉบับ</summary><img data-private="true" src={preview} alt="ตารางสอบต้นฉบับสำหรับตรวจเทียบ" onError={()=>{setPreview("");setError("ไม่สามารถแสดงภาพนี้ได้ กรุณาตรวจไฟล์ PNG/JPEG");}}/></details>}
  {error&&<p ref={errorRef} tabIndex={-1} role="alert" className="cal-form-error">{error}</p>}
  {busy?<div className="dl-import-progress" role="status"><p>{progress?.phase==="reading"?"กำลังอ่านวัน เวลา และผู้คุมสอบ…":"กำลังเตรียมตัวอ่านและโมเดลภาษา…"}</p><progress max="1" value={progress?.progress||0}/><GlassButton mode={glassMode} onClick={()=>request.current?.abort()}>หยุดอ่านภาพ</GlassButton></div>:!result&&<div className="cal-dialog-actions"><GlassButton mode={glassMode} onClick={onCancel}>ยกเลิก</GlassButton><GlassButton mode={glassMode} onClick={addRound} disabled={!canEdit}>เพิ่มรายการเอง</GlassButton><GlassButton mode={glassMode} variant="prominent" onClick={read} disabled={!file||!canEdit}>อ่านตารางจากภาพ</GlassButton></div>}
  {result&&<>
   <p className="dl-import-found" role="status">อ่านได้ {result.sourceRows} แถวต้นฉบับ · {result.rows.length} รอบสอบ — กรุณาตรวจวัน เวลา และผู้คุมตามภาพ</p>
   {result.warnings.map(message=><p key={message} className="cal-form-note">{message}</p>)}
   <section className="cal-import-dataset-note"><strong>กำลังตรวจเทียบกับ{existingLabel}</strong><p>{writeTarget?`ตรวจเบื้องต้นจากปฏิทินที่โหลด และตรวจข้อมูลล่าสุดก่อนบันทึกไปยัง ${writeTarget}`:"ตรวจตารางซ้ำและห้องชนในชุดที่เลือก ข้อมูลอยู่เฉพาะแท็บนี้ ยังไม่บันทึกระบบจริง"}</p>{dataset==="sample"&&<GlassButton mode={glassMode} onClick={()=>{setConfirmed(false);onUseSandbox();}}>ใช้พื้นที่ทดลองแยก</GlassButton>}</section>
   <div className="cal-form-grid"><label className="ui-field"><span>จำนวนคนต่อรอบ</span><input name="dl-import-participants" aria-invalid={plan.issues.some(item=>item.field==="participants")} aria-describedby="dl-import-help" className="apple-input" inputMode="numeric" value={participants} onChange={event=>{setParticipants(event.target.value);setConfirmed(false);}}/></label><label className="ui-field"><span>ภาคเรียน</span><input name="dl-import-semester" aria-invalid={plan.issues.some(item=>item.field==="semester")} aria-describedby="dl-import-help" className="apple-input" value={semester} maxLength={6} onChange={event=>{setSemester(event.target.value);setConfirmed(false);}}/></label></div>
   <p className="cal-form-note">75 คนเป็นค่าตั้งต้นที่ทีมยืนยัน ใช้กับแต่ละรอบ · มากกว่า 40 คนใช้ห้อง 406 + 407 ตามเกณฑ์เดิม · ไม่สร้างรอบเย็นหากไม่มีในภาพ</p>
   {result.names.length>0&&<section className="dl-import-mappings" data-private="true" aria-label="จับคู่ผู้คุมจากภาพ"><h3>ตรวจชื่อและจับคู่ผู้คุม</h3><p className="cal-form-note">รายชื่อ A–H เป็นข้อมูลตัวอย่าง หากไม่มีชื่อที่ตรงกัน ให้แก้ชื่อจากภาพแล้วกด “ใช้ชื่อนี้ชั่วคราว” ใช้กับทุกรอบที่พบชื่อนั้น รายชื่ออยู่เฉพาะแท็บทดลอง รีเฟรชแล้วหาย ไม่สร้างบัญชีผู้ใช้จริง</p>{result.names.map((person,index)=><div className="dl-import-map-card" data-dl-map="true" key={person.key}>
    <p>{index+1}. จากภาพ: {person.text||"อ่านชื่อไม่ครบ — ตรวจต้นฉบับ"}</p>
    <label className="ui-field"><span>ชื่อที่ตรวจแล้ว</span><input className="apple-input" name={`dl-preview-name-${index}`} aria-label={`ชื่อผู้คุมที่ตรวจแล้ว ${index+1}`} maxLength={100} aria-invalid={Boolean(nameErrors[person.key])} aria-describedby={nameErrors[person.key]?`dl-name-error-${index}`:undefined} value={nameDrafts[person.key]??person.text} onChange={event=>{setNameDrafts(previous=>({...previous,[person.key]:event.target.value}));setMapping(previous=>({...previous,[person.key]:""}));setNameErrors(previous=>({...previous,[person.key]:""}));setConfirmed(false);}}/></label>
    <GlassButton mode={glassMode} disabled={!canEdit} onClick={()=>addReviewedName(person,index)}>ใช้ชื่อนี้ชั่วคราว</GlassButton>
    {nameErrors[person.key]&&<p className="cal-form-error" role="alert" id={`dl-name-error-${index}`}>{nameErrors[person.key]}</p>}
    <label className="ui-field"><span>ผู้คุมที่ใช้ในรอบสอบ</span><select className="apple-input" aria-label={`จับคู่ผู้คุมจากภาพ ${index+1}`} data-unmapped={!mapping[person.key]} value={mapping[person.key]||""} onChange={event=>{setMapping(previous=>({...previous,[person.key]:event.target.value}));setConfirmed(false);}}>{personOptions}</select></label>
   </div>)}</section>}
   <div className="cal-import-list-heading"><h3>ตรวจรายการสอบ</h3><GlassButton mode={glassMode} onClick={addRound} disabled={!canEdit||result.rows.length>=100}><Plus size={16} aria-hidden="true"/>เพิ่มรอบสอบ</GlassButton></div>
   <label className="ui-field cal-import-room-filter"><span>แสดงวันที่</span><select className="apple-input" value={dayFilter} onChange={event=>setDayFilter(event.target.value)}><option value="all">ทุกวัน</option>{[...new Set(result.rows.map(row=>row.date).filter(Boolean))].sort().map(date=><option key={date}>{date}</option>)}</select></label>
   <div className="cal-import-rows">{result.rows.map((row,index)=>{const problem=plan.issues.find(item=>item.id===row.id),assignments=row.manualProctors||row.proctorKeys.map(key=>mapping[key]||"");return <fieldset className="cal-import-row" key={row.id} data-dl-row={row.id} data-issue={Boolean(problem)} data-selected={row.selected} hidden={dayFilter!=="all"&&row.date!==dayFilter}>
    <legend>รอบ {index+1} · แถวภาพ {row.sourceRow}</legend><label className="cal-import-check"><input className="ui-checkbox" type="checkbox" checked={row.selected} onChange={event=>update(row.id,{selected:event.target.checked})}/>นำเข้ารอบ {index+1}</label>
    {(!row.date||!row.start||!row.end||row.timeRecovered)&&row.sourceTimeText&&<details className="dl-import-time-source" open={!row.date||!row.start||!row.end}><summary>ตรวจวัน/เวลากับแถวต้นฉบับ</summary>{row.sourceTimePreview&&<img data-private="true" src={row.sourceTimePreview} alt="แถววันและเวลาต้นฉบับสำหรับตรวจแก้"/>}<p className="cal-form-note">ข้อความที่อ่านได้: {row.sourceTimeText}</p></details>}
    <div className="dl-import-round-fields">{[["date","วันที่","date"],["start","เริ่ม","time"],["end","สิ้นสุด","time"]].map(([field,label,type])=><label className="ui-field" key={field}><span>{label}</span><input className="apple-input" type={type} name={`${row.id}-${field}`} aria-invalid={Boolean(problem&&(problem.field===field||problem.field==="conflict"&&field==="date"))} aria-describedby={problem?`dl-issue-${row.id}`:undefined} value={row[field]} onChange={event=>update(row.id,{[field]:event.target.value})}/></label>)}</div>
    <details className="dl-import-proctors" open={problem?.field==="proctors"}><summary>ผู้คุมสอบ · {assignments.filter(value=>value&&value!=="none").length} คนที่เลือก</summary><div className="dl-import-round-fields">{assignments.map((value,slot)=><label className="ui-field" key={slot}><span>ผู้คุมช่อง {slot+1}</span><select className="apple-input" aria-label={`รอบ ${index+1} ผู้คุมช่อง ${slot+1}`} value={value} onChange={event=>update(row.id,{manualProctors:assignments.map((id,i)=>i===slot?event.target.value:id)})}>{personOptions}</select></label>)}</div></details>
    {problem&&<p id={`dl-issue-${row.id}`} className="cal-form-error">{problem.message}</p>}
   </fieldset>;})}</div>
   <div className="cal-import-summary">เลือก {plan.selected} รอบ · {Number(participants)>40?"ห้อง 406 + 407":"ห้อง 406"}</div>
   <label className="cal-import-check"><input name="dl-import-confirm" className="ui-checkbox" type="checkbox" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/>ตรวจเทียบภาพ วัน เวลา จำนวนคน และผู้คุมสอบครบแล้ว</label>
   <div className="cal-import-actions"><p id="dl-import-help" className="cal-import-next-help">{issue?.message||(!confirmed?"ยืนยันการตรวจรายการก่อนเพิ่ม":`พร้อมเพิ่ม ${plan.selected} รอบสอบใน${existingLabel}`)}</p><div className="cal-dialog-actions"><GlassButton mode={glassMode} onClick={onCancel}>ยกเลิก</GlassButton>{issue||!confirmed?<GlassButton mode={glassMode} variant="prominent" disabled={!canEdit} onClick={next}>{sandboxNext?"ใช้พื้นที่ทดลองแยก":issue?`ตรวจ ${plan.issues.length} จุดที่ต้องแก้`:"ยืนยันการตรวจรายการ"}</GlassButton>:<GlassButton mode={glassMode} variant="prominent" type="submit" disabled={!canEdit}>เพิ่ม {plan.selected} รอบสอบ</GlassButton>}</div></div>
  </>}
 </form>;
}
