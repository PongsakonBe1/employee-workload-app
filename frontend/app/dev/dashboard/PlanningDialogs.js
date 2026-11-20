"use client";

import { useState } from "react";
import { GlassButton } from "../../../components/ui/GlassControls";
import { Dialog } from "../../../components/ui/Dialog";
import { calendarLabel } from "../../../lib/calendarView";
import { JD_CATEGORIES, PLANNING_MODES, planningFiscalYear, planningRange, validateJD } from "../../../lib/planningPreview";
export function RangeDialog({
  selection,
  onClose,
  onApply
}) {
  const [mode, setMode] = useState(selection.mode),
    [year, setYear] = useState(planningFiscalYear(selection.range.end));
  const [custom, setCustom] = useState(selection.range),
    [error, setError] = useState("");
  let displayed;
  try {
    displayed = mode === "custom" ? custom : planningRange(mode, selection.anchor, year);
  } catch {
    displayed = custom;
  }
  return <Dialog open onClose={onClose} title="ช่วงข้อมูล" description="เลือกแล้วกดใช้ช่วงนี้ เพื่อเปลี่ยนข้อมูลพร้อมกันทุกกราฟ" footer={<GlassButton mode="quick" variant="prominent" type="submit" form="planning-range">ใช้ช่วงนี้</GlassButton>}>
    <form id="planning-range" className="planning-form" onSubmit={event => {
      event.preventDefault();
      try {
        const range = planningRange(mode, selection.anchor, year, custom);
        onApply({
          mode,
          range,
          anchor: mode === "custom" ? range.start : mode === "fiscal" ? range.end : selection.anchor
        });
      } catch (err) {
        setError(err.message);
      }
    }}>
      <label className="ui-field"><span>ช่วงเวลา</span><select className="apple-input" aria-label="ช่วงเวลา" value={mode} onChange={event => {
          setMode(event.target.value);
          setError("");
        }}>{Object.entries(PLANNING_MODES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      {mode === "fiscal" && <label className="ui-field"><span>ปีงบประมาณ</span><input className="apple-input" type="number" min="2444" max="3543" required value={year} onChange={event => setYear(event.target.value)} /></label>}
      <div className="planning-form-grid">{[["start", "เริ่มวันที่"], ["end", "สิ้นสุดวันที่"]].map(([key, label]) => <label className="ui-field" key={key}><span>{label}</span><input className="apple-input" type="date" required readOnly={mode !== "custom"} value={displayed[key]} onChange={event => setCustom({
            ...custom,
            [key]: event.target.value
          })} /></label>)}</div>
      <p className="ui-caption">สัปดาห์จันทร์–อาทิตย์ · ไตรมาส ต.ค.–ธ.ค. เป็น Q1 ของปีงบ · ปีงบ 1 ต.ค.–30 ก.ย.</p>
      <p className="planning-error" role="alert">{error}</p>
    </form>
  </Dialog>;
}
export function JDDialog({
  year,
  profile,
  tasks,
  onClose,
  onSave
}) {
  const [draft, setDraft] = useState({
      year,
      weights: profile?.weights || Object.fromEntries(JD_CATEGORIES.map(([id]) => [id, ""])),
      mapping: profile?.mapping || {}
    }),
    [error, setError] = useState("");
  return <Dialog open onClose={onClose} title="JD กลางของทีม" description="หนึ่งชุดต่อปีงบประมาณ ใช้ร่วมกันทุกคนในข้อมูลจำลอง" footer={<GlassButton mode="quick" variant="prominent" type="submit" form="planning-jd">ใช้ชุดกลางนี้ในต้นแบบ</GlassButton>}>
    <form id="planning-jd" className="planning-form" onSubmit={event => {
      event.preventDefault();
      try {
        onSave(validateJD(draft));
      } catch (err) {
        setError(err.message);
      }
    }}>
      <label className="ui-field"><span>ปีงบประมาณ</span><input className="apple-input" type="number" min="2444" max="3543" required value={draft.year} onChange={event => setDraft({
          ...draft,
          year: event.target.value
        })} /></label>
      <p className="ui-caption">ยังไม่ยืนยันน้ำหนักจาก JD จริง กรอกเพื่อทดลอง UI เท่านั้น · น้ำหนักไม่ถูกใช้ข้ามปีอัตโนมัติ</p>
      <div className="planning-form-grid">{JD_CATEGORIES.map(([id, label]) => <label className="ui-field" key={id}><span>{label} (%)</span><input className="apple-input" type="number" step="0.1" min="0" max="100" required value={draft.weights[id]} onChange={event => setDraft({
            ...draft,
            weights: {
              ...draft.weights,
              [id]: event.target.value
            }
          })} /></label>)}</div>
      <details className="planning-mapping"><summary>ตรวจผังหัวข้อรอง → หมวด JD</summary><p className="ui-caption">หนึ่งหัวข้อรองอยู่ได้หนึ่งหมวด รายการที่ยังไม่ชัดเจนให้คงเป็นยังไม่จับคู่</p>{tasks.map(task => <label className="ui-field" key={task}><span>{task}</span><select className="apple-input" value={draft.mapping[task] || "unmapped"} onChange={event => setDraft({
            ...draft,
            mapping: {
              ...draft.mapping,
              [task]: event.target.value
            }
          })}><option value="unmapped">ยังไม่จับคู่</option>{JD_CATEGORIES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>)}</details>
      <p className="planning-error" role="alert">{error}</p>
    </form>
  </Dialog>;
}
export function SourceRecords({
  rows,
  people
}) {
  const [visible, setVisible] = useState(100);
  return rows.length ? <><div className="planning-records">{rows.slice(0, visible).map((row, index) => <article key={row.id || index} className="planning-source-record"><div><strong>{row.task}</strong><p>{row.employeeId ? people.find(person => person.id === row.employeeId)?.displayName : "ระบุเจ้าหน้าที่ไม่ได้"}</p><p>{row.comment || row.detail || "—"}</p></div><time dateTime={row.date}>{calendarLabel(row.date, {
            dateStyle: "medium"
          })}<small>{row.time || "ไม่ระบุเวลา"}</small></time></article>)}</div>{rows.length > visible && <GlassButton mode="quick" onClick={() => setVisible(value => value + 100)}>แสดงเพิ่ม 100 รายการ</GlassButton>}<p className="ui-caption">แสดง {Math.min(visible, rows.length)} จาก {rows.length} กิจกรรมในกลุ่มนี้</p></> : <p className="planning-empty">ไม่มีบันทึกตรงกับกลุ่มนี้</p>;
}
