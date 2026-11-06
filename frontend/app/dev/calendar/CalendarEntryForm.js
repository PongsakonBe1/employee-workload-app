"use client";

import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { CALENDAR_KINDS, CALENDAR_ROOMS } from "../../../lib/calendarView";
import { GlassButton } from "../../../components/ui/GlassControls";
import { calendarPeople } from "./fixtures";

export default function CalendarEntryForm({ entry, setEntry, editing, error, glassMode, onSave, onCancel }) {
  const form = useRef(null), errorRef = useRef(null);
  useEffect(() => {
    if (!error) return;
    const control = form.current?.querySelector(`[name="${error.field}"]`);
    (control || errorRef.current)?.focus({ preventScroll: true });(control || errorRef.current)?.scrollIntoView({ block: "nearest" });
  }, [error]);
  const update = patch => setEntry(current => ({ ...current, ...patch }));
  const toggle = (key, value, checked) => update({ [key]: checked ? [...entry[key], value] : entry[key].filter(item => item !== value) });
  const round = [["09:00", "10:30"], ["13:30", "15:00"], ["17:00", "18:30"]].findIndex(([start, end]) => start === entry.start && end === entry.end);
  return <form
    className="cal-entry-form" ref={form}
    onSubmit={onSave} noValidate
  >
    {editing?.recurring && <p className="cal-form-note">กำลังแก้ตารางรายสัปดาห์ การบันทึกมีผลกับทุกครั้งในช่วงวันที่ของตารางนี้</p>}
    <fieldset>
      <legend>กิจกรรม</legend>
      <label className="ui-field">
        <span>ชื่อวิชาหรือกิจกรรม</span>
        <input
          className="apple-input" name="title"
          value={entry.title} aria-required="true"
          aria-invalid={error?.field === "title"} aria-describedby={error?.field === "title" ? "cal-entry-error" : undefined}
          onChange={event => update({ title: event.target.value })}
        />
      </label>
      <div className="cal-form-grid">
        <label className="ui-field">
          <span>ประเภท</span>
          <select
            className="apple-input" name="kind"
            value={entry.kind} onChange={event => update({ kind: event.target.value, repeat: event.target.value === "classroom" ? "weekly" : "none" })}
          >
            {Object.entries(CALENDAR_KINDS).map(([kind, label]) => <option value={kind} key={kind}>{label}</option>)}
          </select>
        </label>
        <label className="ui-field">
          <span>{entry.kind === "dl" ? "จำนวนคนต่อรอบ" : "ภาคเรียน"}</span>
          {entry.kind === "dl" ? <input
            className="apple-input" name="participants"
            type="text" inputMode="numeric"
            value={entry.participants} aria-invalid={error?.field === "participants"}
            onChange={event => update({ participants: event.target.value })}
          /> : <select
            className="apple-input" value={entry.semester}
            onChange={event => update({ semester: event.target.value })}
          >
            <option>2/2569</option>
            <option>1/2570</option>
          </select>}
        </label>
      </div>
    </fieldset>
    <fieldset>
      <legend>วันที่และเวลา</legend>
      <div className="cal-form-grid">
        <label className="ui-field">
          <span>{entry.repeat === "weekly" ? "เริ่มวันที่" : "วันที่"}</span>
          <input
            className="apple-input" type="date"
            name="date" value={entry.date}
            aria-invalid={error?.field === "date"} onChange={event => update({ date: event.target.value })}
          />
        </label>
        <label className="ui-field">
          <span>การเกิดซ้ำ</span>
          <select
            className="apple-input" value={entry.repeat}
            onChange={event => update({ repeat: event.target.value })} disabled={entry.kind !== "classroom"}
          >
            <option value="none">ครั้งเดียว</option>
            <option value="weekly">ทุกสัปดาห์ในวันเดียวกัน</option>
          </select>
        </label>
      </div>
      {entry.repeat === "weekly" && <label className="ui-field">
        <span>สิ้นสุดวันที่</span>
        <input
          className="apple-input" type="date"
          name="validTo" value={entry.validTo}
          aria-invalid={error?.field === "validTo"} onChange={event => update({ validTo: event.target.value })}
        />
      </label>}
      {entry.kind === "dl" && <label className="ui-field">
        <span>รอบสอบ</span>
        <select
          className="apple-input" name="round"
          aria-label="รอบสอบ" value={entry.customRound || round < 0 ? "custom" : String(round)}
          onChange={event => { const times = [["09:00", "10:30"], ["13:30", "15:00"], ["17:00", "18:30"]][Number(event.target.value)];if (times) update({ start: times[0], end: times[1], customRound: false });else update({ customRound: true }); }}
        >
          <option value="0">เช้า · 09:00–10:30</option>
          <option value="1">บ่าย · 13:30–15:00</option>
          <option value="2">เย็น · 17:00–18:30</option>
          <option value="custom">กำหนดเวลาเอง</option>
        </select>
      </label>}
      <div className="cal-form-grid">
        <label className="ui-field">
          <span>เวลาเริ่ม</span>
          <input
            className="apple-input" name="start"
            type="time" value={entry.start}
            onChange={event => update({ start: event.target.value })}
          />
        </label>
        <label className="ui-field">
          <span>เวลาสิ้นสุด</span>
          <input
            className="apple-input" name="end"
            type="time" value={entry.end}
            aria-invalid={error?.field === "end"} onChange={event => update({ end: event.target.value })}
          />
        </label>
      </div>
    </fieldset>
    <fieldset>
      <legend>ห้องและผู้รับผิดชอบ</legend>
      {entry.kind === "dl" ? <p className="cal-form-note">{Number(entry.participants) > 40 ? "ห้อง 406 + 407 · เพิ่มห้อง 407 อัตโนมัติเมื่อเกิน 40 คน" : "ห้อง 406 · เพิ่มห้อง 407 เมื่อเกิน 40 คน"}</p> : <div className="cal-room-options">
        {CALENDAR_ROOMS.map(room => <label key={room}>
          <input
            className="ui-checkbox" name="rooms"
            type="checkbox" checked={entry.rooms.includes(room)}
            onChange={event => toggle("rooms", room, event.target.checked)}
          />
          <span>{`ห้อง ${room}`}</span>
        </label>)}
      </div>}
      {entry.kind === "dl" ? <div className="cal-proctor-options">
        <p className="ui-caption">ผู้คุมสอบ</p>
        {calendarPeople.map(person => <label className="ui-check-row" key={person.id}>
          <span>{person.label}</span>
          <input
            className="ui-checkbox" type="checkbox"
            name="proctors" checked={entry.proctors.includes(person.id)}
            onChange={event => toggle("proctors", person.id, event.target.checked)}
          />
        </label>)}
      </div> : <label className="ui-field">
        <span>ผู้สอน / ผู้รับผิดชอบ</span>
        <input
          className="apple-input" value={entry.teacher}
          onChange={event => update({ teacher: event.target.value })}
        />
      </label>}
    </fieldset>
    {error && <p
      className="cal-form-error" id="cal-entry-error"
      ref={errorRef} tabIndex={-1}
      role="alert"
    >
      {error.message}
    </p>}
    <div className="cal-dialog-actions">
      <GlassButton mode={glassMode} onClick={onCancel}>ยกเลิก</GlassButton>
      <GlassButton
        mode={glassMode} variant="prominent"
        type="submit"
      >
        <Check size={17} aria-hidden="true" />
        บันทึกตัวอย่าง
      </GlassButton>
    </div>
  </form>;
}
