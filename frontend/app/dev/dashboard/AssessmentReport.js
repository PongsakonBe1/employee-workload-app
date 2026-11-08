"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Copy, FileText } from "lucide-react";
import { Dialog } from "../../../components/ui/Dialog";
import { GlassButton } from "../../../components/ui/GlassControls";
import { usePreviewState } from "../previewState";
import { SourceRecords } from "./PlanningDialogs";
import { planningAdmin, planningFiscalYear } from "../../../lib/planningPreview";
import { calendarLabel, validCalendarDate } from "../../../lib/calendarView";
import { ASSESSMENT_ROUNDS, ASSESSMENT_SECTIONS, assessmentResult, assessmentSection, assessmentTaskCatalog, assessmentText, validateAssessment } from "../../../lib/assessmentPreview";
export function AssessmentReport({
  rawLogs,
  people,
  actor,
  initialRange,
  initialPerson,
  catalog,
  mapping,
  onMapping,
  onClose
}) {
  const [savedDraft, setSavedDraft] = usePreviewState(`planning.assessment.criteria.${actor.role}.${actor.id}`, {
    ...initialRange,
    year: planningFiscalYear(initialRange.end),
    personId: initialPerson,
    round: "1"
  });
  // Opening from a person filter must not reuse a different person's identity.
  // Keep the explicit period draft, but always start from the current context.
  const [draft, setDraft] = useState(() => ({
    ...savedDraft,
    personId: initialPerson
  }));
  useEffect(() => {
    setSavedDraft(draft);
  }, [draft, setSavedDraft]);
  const [applied, setApplied] = useState(null),
    [limit, setLimit] = useState(1000),
    [error, setError] = useState("");
  const [selection, setSelection] = useState(null),
    [mappingDraft, setMappingDraft] = useState(mapping),
    [mappingOpen, setMappingOpen] = useState(false);
  const [text, setText] = useState(""),
    [status, setStatus] = useState("");
  const resultHeading = useRef(null),
    copyField = useRef(null);
  const sourceHeading = useRef(null),
    focusTarget = useRef(null),
    form = useRef(null);
  const admin = planningAdmin(actor);
  const result = useMemo(() => applied ? assessmentResult(rawLogs, people, applied, actor, catalog, mapping, limit) : null, [rawLogs, people, applied, actor, catalog, mapping, limit]);
  const dirty = Boolean(applied && Object.keys(applied).some(key => String(applied[key]) !== String(draft[key])));
  const person = people.find(item => item.id === (applied?.personId || draft.personId));
  const catalogRows = assessmentTaskCatalog(result?.rows || [], catalog);
  const sourceRows = selection && result ? result.rows.filter(row => selection.kind === "task" ? row.task === selection.key : assessmentSection(row.task, mapping) === selection.key) : [];
  useEffect(() => {
    if (selection) sourceHeading.current?.focus({
      preventScroll: true
    });else if (focusTarget.current) document.querySelector(`[data-assessment-pick="${CSS.escape(focusTarget.current)}"]`)?.focus({
      preventScroll: true
    });
  }, [selection]);
  useEffect(() => {
    if (applied) {
      resultHeading.current?.focus({
        preventScroll: true
      });
      resultHeading.current?.closest(".assessment-report-header")?.scrollIntoView({
        block: "start",
        behavior: "auto"
      });
    }
  }, [applied, limit]);
  useEffect(() => {
    if (text) copyField.current?.focus();
  }, [text]);
  function update(field, value) {
    setDraft(current => ({
      ...current,
      [field]: value,
      ...(field === "end" && validCalendarDate(value) ? {
        year: planningFiscalYear(value)
      } : {})
    }));
    setError("");
    setText("");
    setStatus("");
  }
  function apply(event) {
    event.preventDefault();
    try {
      const valid = validateAssessment(draft, people, actor);
      setApplied(valid);
      setLimit(1000);
      setSelection(null);
      setText("");
      setError("");
      setStatus("แสดงสรุปจากช่วงวันที่ที่เลือกแล้ว");
    } catch (err) {
      setError(err.message);
      form.current?.querySelector(`[name="${err.field}"]`)?.focus();
    }
  }
  function openSource(kind, key, label) {
    focusTarget.current = `${kind}:${key}`;
    setSelection({
      kind,
      key,
      label
    });
    setText("");
  }
  function preparedText() {
    if (!result || dirty) throw Error("กดแสดงสรุปเพื่อใช้ช่วงข้อมูลล่าสุดก่อน");
    return assessmentText(result, person);
  }
  async function copy() {
    try {
      const content = preparedText();
      try {
        await navigator.clipboard.writeText(content);
        setStatus("คัดลอกสรุปทั้งรอบแล้ว");
      } catch {
        setText(content);
        setStatus("คัดลอกอัตโนมัติไม่ได้ เลือกข้อความจากกล่องสรุปด้านล่างได้");
      }
    } catch (err) {
      setStatus(err.message);
    }
  }
  function taskRows(tasks) {
    return tasks.map(task => <button key={task.task} className="assessment-task-row" data-assessment-pick={`task:${task.task}`} onClick={() => openSource("task", task.task, task.task)}><span>{task.task}</span><strong>{result.partial ? task.count ? `≥${task.count}` : "—" : task.count}<small>ครั้ง</small></strong></button>);
  }
  return <Dialog open onClose={onClose} title="สรุปประกอบแบบประเมิน" description="รอบปกติ 3 ครั้งต่อปีงบ และรอบพนักงานใหม่ · หน่วยนับตามบันทึกหัวข้อรอง" className="assessment-dialog" footer={<><GlassButton mode="quick" onClick={onClose}>เสร็จสิ้น</GlassButton>{result && <GlassButton mode="quick" variant="prominent" disabled={!result.canCopy || dirty} onClick={copy}><Copy size={17} aria-hidden="true" />คัดลอกสรุปทั้งรอบ</GlassButton>}</>}>
    {!selection ? <>
      <form ref={form} className="planning-form assessment-form" onSubmit={apply}>
        <div className="planning-form-grid"><label className="ui-field"><span>ผู้ปฏิบัติงาน</span>{admin ? <select name="personId" aria-label="เจ้าหน้าที่ในแบบประเมิน" className="apple-input" value={draft.personId} onChange={event => update("personId", event.target.value)}>{people.map(item => <option value={item.id} key={item.id}>{item.displayName}</option>)}</select> : <input className="apple-input" aria-label="เจ้าหน้าที่ในแบบประเมิน" readOnly value={person?.displayName || ""} />}</label><label className="ui-field"><span>รอบประเมิน</span><select name="round" className="apple-input" aria-label="รอบประเมิน" value={draft.round} onChange={event => update("round", event.target.value)}>{Object.entries(ASSESSMENT_ROUNDS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
        <div className="planning-form-grid"><label className="ui-field"><span>เริ่มวันที่</span><input name="start" className="apple-input" type="date" required value={draft.start} onChange={event => update("start", event.target.value)} /></label><label className="ui-field"><span>สิ้นสุดวันที่</span><input name="end" className="apple-input" type="date" required value={draft.end} onChange={event => update("end", event.target.value)} /></label></div>
        <div className="assessment-form-last"><label className="ui-field"><span>ปีงบประมาณตามวันสิ้นสุด</span><input name="year" className="apple-input" type="number" min="2444" max="3543" required value={draft.year} onChange={event => update("year", event.target.value)} /></label><GlassButton mode="quick" variant="prominent" type="submit"><FileText size={17} aria-hidden="true" />แสดงสรุป</GlassButton></div>
        <p className="ui-caption">ระบุช่วงตามรอบที่หน่วยงานแจ้งหรือสัญญาจ้าง · ข้อมูลสังเคราะห์สำหรับตรวจแบบ</p>
        <p className="planning-error" role="alert">{error}</p>
      </form>
      {dirty && <p className="planning-warning" role="status">มีการเปลี่ยนตัวเลือก กดแสดงสรุปเพื่อใช้ช่วงข้อมูลใหม่ก่อนคัดลอก</p>}
      {result && <section className="assessment-result" aria-label="ผลสรุปตามแบบประเมิน">
        <div className="assessment-report-header"><h3 ref={resultHeading} tabIndex={-1}>{person.displayName}</h3><p>ปีงบ {applied.year} · {ASSESSMENT_ROUNDS[applied.round]}</p><p>{calendarLabel(applied.start)} – {calendarLabel(applied.end)}</p><strong data-assessment-total>{result.rows.length.toLocaleString("th-TH")} ครั้ง{result.partial ? " · ยังโหลดไม่ครบ" : " ตามบันทึกที่พบ"}</strong></div>
        {result.partial && <div className="planning-warning"><p>ยังโหลดไม่ครบช่วง ยอดเป็นข้อมูลบางส่วน ต้องโหลดครบก่อนคัดลอกสรุป</p><GlassButton mode="quick" onClick={() => setLimit(value => value + 1000)}>โหลดสรุปเพิ่ม 1,000 รายการ</GlassButton></div>}
        {result.invalid > 0 && <p className="planning-warning">พบ {result.invalid} บันทึกของบุคคลนี้ที่วันที่ไม่ถูกต้อง ยังระบุไม่ได้ว่าอยู่ในรอบใด กรุณาตรวจข้อมูลก่อนคัดลอก</p>}
        {planningFiscalYear(applied.start) !== applied.year && <p className="ui-caption">ช่วงนี้คร่อมปีงบประมาณ ยอดนับตามวันเริ่ม–สิ้นสุดที่ระบุทั้งหมด</p>}
        <p className="assessment-count-rule">1 บันทึกหัวข้อรอง = 1 ครั้ง รวมแต่ละรายการย่อยใน Combo · 0 หมายถึงไม่พบบันทึกในช่วงนี้</p>
        {result.sections.map(section => <section className="assessment-section" key={section.id} data-assessment-section={section.id}><h4><button data-assessment-pick={`section:${section.id}`} onClick={() => openSource("section", section.id, `${section.id} ${section.label}`)}><span>{section.id} {section.label}</span>{section.tasks.length > 0 && <strong>{result.partial ? "≥" : ""}{section.count}<small>ครั้ง</small></strong>}</button></h4>{section.tasks.length ? taskRows(section.tasks) : <p className="ui-caption assessment-no-mapping">ยังไม่มีหัวข้อที่จับคู่กับข้อนี้ ต้องตรวจข้อมูลเพิ่มเติม จึงยังสรุปเป็นศูนย์ไม่ได้</p>}</section>)}
        <section className="assessment-section assessment-unmapped"><h4><button data-assessment-pick="section:unmapped" onClick={() => openSource("section", "unmapped", "ยังไม่จับคู่กับแบบประเมิน")}><span>หัวข้อที่ยังไม่จับคู่กับแบบประเมิน</span><strong>{result.partial ? "≥" : ""}{result.unmappedCount}<small>ครั้ง</small></strong></button></h4>{taskRows(result.unmapped)}<p className="ui-caption">การซ่อมและติดตั้งทั่วไปยังแยกหน่วยงานหรือ IT Clinic จากหัวข้อเพียงอย่างเดียวไม่ได้ จึงคงไว้ให้ตรวจผังจับคู่</p></section>
        <p className="ui-caption">ใช้ประกอบส่วนผลงานในเอกสาร ส่วนคะแนนผลงาน 80 และพฤติกรรม 20 ให้ผู้ประเมินพิจารณา · ยังวัดเงื่อนไขระยะเวลาซ่อมหรือเตรียมห้องล่วงหน้าจากข้อมูลนี้ไม่ได้ · คุมสอบ DL ไม่ถูกนับซ้ำเป็นการเตรียมห้องสอบ</p>
        <GlassButton mode="quick" disabled={!result.canCopy || dirty} onClick={() => {
          try {
            setText(preparedText());
          } catch (err) {
            setStatus(err.message);
          }
        }}>แสดงข้อความสรุป</GlassButton>
      </section>}
      {admin && <details className="assessment-mapping" open={mappingOpen} onToggle={event => setMappingOpen(event.currentTarget.open)}><summary>ตรวจผังหัวข้อรอง → ข้อในแบบประเมิน</summary><p className="ui-caption">ผังตั้งต้นเพื่อทบทวน ใช้ร่วมกันทั้งทีมในต้นแบบ แยกจากน้ำหนัก JD · กำหนดเฉพาะหัวข้อที่จัดหมวดได้แน่นอน</p>{catalogRows.map(task => <label className="ui-field" key={task.task}><span>{task.task}</span><select aria-label={`จับคู่ ${task.task}`} className="apple-input" value={mappingDraft[task.task] || "unmapped"} onChange={event => setMappingDraft(current => ({
            ...current,
            [task.task]: event.target.value
          }))}><option value="unmapped">ยังไม่จับคู่</option>{ASSESSMENT_SECTIONS.map(section => <option key={section.id} value={section.id}>{section.id} {section.label}</option>)}</select></label>)}<GlassButton mode="quick" onClick={() => {
          onMapping({
            ...mappingDraft
          });
          setText("");
          setMappingOpen(false);
          setStatus("ใช้ผังจับคู่ร่วมกันในต้นแบบแล้ว");
        }}>ใช้ผังนี้ในต้นแบบ</GlassButton></details>}
      {text && <label className="ui-field assessment-copy-text"><span>ข้อความสรุปพร้อมคัดลอก</span><textarea aria-label="ข้อความสรุปพร้อมคัดลอก" ref={copyField} readOnly rows={12} value={text} onFocus={event => event.target.select()} /></label>}
    </> : <section className="assessment-source"><GlassButton mode="quick" onClick={() => setSelection(null)}><ChevronLeft size={17} aria-hidden="true" />กลับสรุปตามแบบประเมิน</GlassButton><h3 ref={sourceHeading} tabIndex={-1}>{selection.label}</h3><p className="ui-caption">{sourceRows.length} ครั้ง · {person.displayName} · ตามช่วงที่แสดงในสรุป{result.partial ? " · ยังโหลดไม่ครบ" : ""}</p><SourceRecords key={selection.kind + selection.key} rows={sourceRows} people={people} /></section>}
    <p className="planning-status" role="status" aria-live="polite">{status}</p>
  </Dialog>;
}
