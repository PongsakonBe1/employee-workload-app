"use client";

import { useId, useRef, useState } from "react";
import { calendarLabel, validCalendarDate } from "../lib/calendarView";
import { DL_SHIFTS, DL_WORKLOG_TASK, dlRoundLabel, validateDlWorklogDate } from "../lib/dlQuickLog";
import { saveDlQuickLog } from "../lib/dlQuickLogFirestore";
import { logSystemAction, SystemActions } from "../lib/systemLog";
import { Dialog } from "./ui/Dialog";
import { GlassButton } from "./ui/GlassControls";

export function DlQuickLogDialog({ request, context, onClose, onSaved }) {
  const formId = useId();
  const lock = useRef(false);
  const [choice, setChoice] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState(null);
  const [scheduleChanged, setScheduleChanged] = useState(false);
  const currentDate = request.date === context.date;
  const dateValidation = validateDlWorklogDate(request.date);
  const dateError = currentDate ? dateValidation.error : "วันที่เปลี่ยนแล้ว กรุณาปิดแล้วเลือกรอบใหม่";
  const loading = currentDate && context.status === "loading";
  const rounds = currentDate ? context.rounds : [];
  const options = rounds.length
    ? rounds.map(round => ({ value: round.id, label: dlRoundLabel({ ...round, roundId: round.id }), round }))
    : Object.entries(DL_SHIFTS).map(([value, label]) => ({ value, label, shift: value }));
  const selected = loading ? null : options.find(option => option.value === choice) ?? (rounds.length === 1 ? options[0] : null);

  function choose(value) {
    setChoice(value);
    setError("");
    setDuplicate(null);
  }

  async function submit(event) {
    event.preventDefault();
    if (lock.current || !selected || duplicate || scheduleChanged || dateError) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await saveDlQuickLog({ ...request, round: selected.round, shift: selected.shift, note });
      if (result.status === "duplicate") {
        setDuplicate(result.worklog);
      } else if (result.status === "invalid-date") {
        setError(result.message);
      } else if (result.status === "schedule-changed") {
        setScheduleChanged(true);
        setError("ตารางสอบเปลี่ยนแล้ว กรุณาโหลดหน้าใหม่และตรวจรอบอีกครั้ง");
      } else {
        void logSystemAction(SystemActions.WORKLOG_CREATE, `Quick log: ${DL_WORKLOG_TASK}`, { templateId: request.templateId });
        onSaved();
      }
    } catch (failure) {
      console.error("DL Quick Log submission failed", failure?.code ?? failure?.name);
      setError("ยังยืนยันผลการบันทึกไม่ได้ กรุณาลองอีกครั้ง ระบบจะตรวจรอบเดิมก่อนบันทึก");
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }

  const dateLabel = validCalendarDate(request.date) ? calendarLabel(request.date) : "";
  return <Dialog open onClose={onClose} busy={busy} title={DL_WORKLOG_TASK}
    description={busy ? "กำลังตรวจและบันทึกรอบสอบ…" : [request.person?.label, dateLabel].filter(Boolean).join(" · ")}
    className="record-dialog" footer={<>
      <GlassButton onClick={onClose} disabled={busy}>ปิด</GlassButton>
      <GlassButton type="submit" form={formId} variant="prominent" disabled={!selected || busy || Boolean(duplicate) || scheduleChanged || Boolean(dateError)}>บันทึกรอบนี้</GlassButton>
    </>}>
    {dateError ? <p role="alert" className="record-error">{dateError}</p> : <form id={formId} onSubmit={submit}>
      {loading ? <p role="status" className="ui-caption">กำลังหารอบสอบจากตาราง…</p> : <>
        {!rounds.length && <p className="ui-caption">{context.status === "error" ? "โหลดตารางสอบไม่สำเร็จ เลือกช่วงเวลาที่คุมจริงได้" : "ไม่พบรอบของผู้ปฏิบัติงานในวันที่เลือก เลือกช่วงเวลาที่คุมจริง"}</p>}
        <fieldset className={`record-combo record-dl-options${rounds.length ? "" : " record-dl-shifts"}`}>
          <legend className="apple-label">{rounds.length ? "รอบในตารางสอบ" : "ช่วงเวลาที่คุมสอบ"}</legend>
          {options.map(option => <label key={option.value} className="record-check-row" data-selected={selected?.value === option.value}>
            <input type="radio" name="dl-round" value={option.value} checked={selected?.value === option.value} onChange={() => choose(option.value)} />
            <span>{option.label}</span>
          </label>)}
        </fieldset>
        <label className="ui-field record-dl-note">หมายเหตุ (ถ้ามี)
          <textarea className="apple-input" rows={2} maxLength={500} value={note} onChange={event => setNote(event.target.value)} />
        </label>
      </>}
      {error && <p className="record-error" role="alert">{error}</p>}
      {duplicate && <div className="record-error">
        <p role="alert">รอบนี้มีบันทึกอยู่แล้ว</p>
        <details><summary>ดูบันทึกเดิม</summary>
          <dl className="record-review-fields">
            <dt>วันที่และเวลา</dt><dd>{validCalendarDate(duplicate.date) ? calendarLabel(duplicate.date) : dateLabel} · {duplicate.time}</dd>
            <dt>รายละเอียด</dt><dd>{duplicate.comment}</dd>
          </dl>
        </details>
      </div>}
    </form>}
  </Dialog>;
}
