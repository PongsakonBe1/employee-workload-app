"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, FilePenLine, Search } from "lucide-react";
import { CommentSuggestions } from "./CommentSuggestions";
import { Dialog } from "./ui/Dialog";
import { GlassButton } from "./ui/GlassControls";
import { MINOR_TASKS } from "../lib/commentSuggestions";

const taskCatalog = [...MINOR_TASKS].sort((a, b) => a.localeCompare(b, "th"));

export function WorklogManualWorkspace({ form, setForm, onTask, onSuggestion, busy, onReview }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchInput = useRef(null);
  const matching = taskCatalog.filter(task => task.toLowerCase().includes(search.trim().toLowerCase()));
  useEffect(() => {
    if (pickerOpen) searchInput.current?.focus({ preventScroll: true });
  }, [pickerOpen]);
  const change = ({ target }) => {
    const { name, value } = target;
    setForm(current => ({
      ...current, [name]: value, dateTimeEdited: current.dateTimeEdited || name === "date" || name === "time",
    }));
  };
  return <>
    <form className="record-form" aria-label="กรอกบันทึกงาน" onSubmit={onReview}>
      <fieldset disabled={busy}>
        <button type="button" className="record-task-picker" aria-label="เลือกหัวข้อรอง" onClick={() => { setSearch("");setPickerOpen(true); }}>
          <FilePenLine size={23} aria-hidden="true" />
          <span className="record-task-title"><small>หัวข้อรอง</small><strong>{form.minorTask || "เลือกหัวข้อรอง"}</strong></span>
          <ChevronDown size={17} aria-hidden="true" />
        </button>
        <div className="record-manual-fields">
          <label className="ui-field"><span>วันที่</span><input type="date" required name="date" className="apple-input" value={form.date} onChange={change} /></label>
          <label className="ui-field"><span>เวลา</span><input type="time" required name="time" className="apple-input" value={form.time} onChange={change} /></label>
          <label className="ui-field record-field-full"><span>งานหลัก</span><input className="apple-input" value={form.mainDuty} readOnly /></label>
          <label className="ui-field record-field-full"><span>กลุ่มงาน</span><input className="apple-input" value={form.minorTask ? form.dutyGroup : ""} readOnly /></label>
          <label className="ui-field record-field-full"><span>ผู้รับบริการ <small>ถ้ามี</small></span><input name="recipient" className="apple-input" value={form.recipient} onChange={change} /></label>
          <label className="ui-field record-field-full"><span>รายละเอียด</span><textarea name="comment" className="apple-input" rows={3} value={form.comment} onChange={change} /></label>
        </div>
        <CommentSuggestions minorTask={form.minorTask} selected={form.comment} onSelect={onSuggestion} />
        <GlassButton mode="quick" type="submit" variant="prominent" className="record-manual-submit" disabled={busy || !form.minorTask}>
          ตรวจรายการก่อนบันทึก <ChevronRight size={18} aria-hidden="true" />
        </GlassButton>
      </fieldset>
    </form>
    <Dialog open={pickerOpen} title="เลือกหัวข้อรอง" onClose={() => setPickerOpen(false)} className="worklog-task-dialog">
      <label className="history-search"><Search size={17} aria-hidden="true" /><input ref={searchInput} aria-label="ค้นหาหัวข้อรอง" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="ค้นหาหัวข้อรอง" /></label>
      <ul className="worklog-task-options">{matching.map(task => <li key={task}><button type="button" aria-pressed={form.minorTask === task} onClick={() => { onTask(task);setPickerOpen(false); }}>{task}</button></li>)}</ul>
      {matching.length === 0 && <p className="ui-caption">ไม่พบหัวข้อที่ตรงกับคำค้นหา</p>}
    </Dialog>
  </>;
}
