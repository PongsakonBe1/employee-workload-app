"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, DoorClosed, DoorOpen, FilePenLine, Headphones, Monitor, Moon, Phone, Plug, ShieldAlert, Undo2, Usb, UserRound, Zap } from "lucide-react";
import { WorkspaceFrame } from "../../../components/ui/WorkspaceFrame";
import { Dialog } from "../../../components/ui/Dialog";
import { GlassButton, GlassControlGroup } from "../../../components/ui/GlassControls";
import { useAppearance } from "../../../components/ui/AppearanceProvider";
import { combos, initialDevices, initialLogs, initialRooms, people, schedule, tasks } from "./fixtures";

const deviceIcons = { headphones: Headphones, plug: Plug, usb: Usb };
const quickItems = [
  { id: "rooms3", title: "ห้องแลกเปลี่ยนความรู้", hint: "เลือกห้องเพื่อเปิด / ปิด", Icon: DoorOpen, tone: "purple" },
  { id: "rooms4", title: "ห้องเรียน ชั้น 4", hint: "เลือกห้องเพื่อเปิด / ปิด", Icon: DoorClosed, tone: "purple" },
  { id: "headphones", title: "ยืม / คืนหูฟัง", hint: "เลือกอุปกรณ์เพื่อยืม / คืน", Icon: Headphones, tone: "green" },
  { id: "account", title: "เปิดใช้บัญชี", hint: "เลือกเฉพาะงานที่ทำ", Icon: UserRound, tone: "blue", count: 5 },
  { id: "software", title: "ติดตั้งโปรแกรม", hint: "เลือกเฉพาะงานที่ทำ", Icon: Monitor, tone: "purple", count: 6 },
  { id: "phone", title: "รับสายโทรศัพท์", hint: "ระบุรายละเอียดของงาน", Icon: Phone, tone: "amber" },
  { id: "plug", title: "ยืม / คืนปลั๊กไฟ", hint: "เลือกอุปกรณ์เพื่อยืม / คืน", Icon: Plug, tone: "green" },
  { id: "usb", title: "ยืม / คืน USB", hint: "เลือกอุปกรณ์เพื่อยืม / คืน", Icon: Usb, tone: "blue" },
];
const thaiDate = value => new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeZone: "Asia/Bangkok" }).format(new Date(`${value}T12:00:00+07:00`));

function DailyAgenda({ date }) {
  const events = schedule.filter(item => item.date === date);
  return events.length ? events.map(item => <div className="record-agenda" key={item.id}>
    <span>{item.start}</span>
    <div>
      <strong>{item.title}</strong>
      <p>{`ห้อง ${item.room} · ${item.start}–${item.end}`}</p>
    </div>
  </div>) : <p className="ui-caption record-agenda-empty">ไม่มีตารางตัวอย่างในวันที่เลือก</p>;
}

export default function RecordPreview() {
  const { resolved } = useAppearance();
  const [role, setRole] = useState("staff"), [personId, setPersonId] = useState(people[0].id);
  const [mode, setMode] = useState("quick"), [glassMode, setGlassMode] = useState("quick"), [quickPage, setQuickPage] = useState(0);
  const [dateTime, setDateTime] = useState({ date: "2026-11-06", time: "10:55" }), [dateDraft, setDateDraft] = useState(dateTime);
  const [data, setData] = useState({ rooms: initialRooms, devices: initialDevices, logs: initialLogs });
  const [undo, setUndo] = useState(null), [status, setStatus] = useState("");
  const [dialog, setDialog] = useState(null), [query, setQuery] = useState(""), [deviceId, setDeviceId] = useState(null);
  const [selected, setSelected] = useState([]), [recipient, setRecipient] = useState(""), [notes, setNotes] = useState("");
  const [step, setStep] = useState("edit"), [error, setError] = useState(""), [selectedLog, setSelectedLog] = useState(null);
  const [manual, setManual] = useState({ taskId: tasks[0].id, recipient: "", notes: "" });
  const [manualError, setManualError] = useState("");
  const recipientRef = useRef(null), notesRef = useRef(null), firstChoiceRef = useRef(null), manualNotesRef = useRef(null), taskSearchRef = useRef(null), sequence = useRef(0);
  const person = people.find(item => item.id === personId), task = tasks.find(item => item.id === manual.taskId);
  const device = data.devices.find(item => item.id === deviceId), combo = combos[dialog];
  const DeviceIcon = device ? deviceIcons[device.kind] : Headphones;
  const floor = dialog === "rooms3" ? "3" : "4";
  const deviceDialog = ["headphones", "plug", "usb"].includes(dialog);
  const todayLogs = data.logs.filter(log => log.date === dateTime.date && log.person === person.displayName);

  useEffect(() => {
    if (dialog === "task") taskSearchRef.current?.focus();
  }, [dialog]);
  useEffect(() => {
    if (deviceId) recipientRef.current?.focus({ preventScroll: true });
  }, [deviceId]);

  function focusField(ref) {
    requestAnimationFrame(() => { ref.current?.focus({ preventScroll: true });ref.current?.scrollIntoView({ block: "center", behavior: "instant" }); });
  }
  function openDialog(value) {
    setError("");setQuery("");setSelected([]);setRecipient("");setNotes("");setStep("edit");setDeviceId(null);setDialog(value);
    if (value === "datetime") setDateDraft(dateTime);
  }
  function commit(entries, update = current => current) {
    // One in-memory transaction; Undo restores only this latest preview transaction.
    const logs = entries.map(entry => ({ ...entry, ...dateTime, person: person.displayName, id: `preview-${++sequence.current}` }));
    const next = update({ ...data, logs: [...logs, ...data.logs] });
    setUndo({ before: data, count: entries.length });setData(next);setDialog(null);setStatus(`บันทึกตัวอย่าง ${entries.length} รายการแล้ว`);
  }
  function toggleRoom(room) {
    commit([{ title: `${room.open ? "ปิด" : "เปิด"}ห้อง ${room.id}`, detail: room.detail }], current => ({ ...current, rooms: current.rooms.map(item => item.id === room.id ? { ...item, open: !item.open } : item) }));
  }
  function reviewCombo(event) {
    event.preventDefault();
    if (!selected.length) { setError("เลือกอย่างน้อย 1 งานที่ทำจริง");focusField(firstChoiceRef);return; }
    if (!recipient.trim()) { setError("ระบุผู้รับบริการก่อนตรวจรายการ");focusField(recipientRef);return; }
    setError("");setStep("review");
  }
  function submitDevice(event) {
    event.preventDefault();
    if (!device?.available) return;
    if (!device.student && !/^[0-9]{13}$/.test(recipient)) { setError("ใช้รหัสตัวเลข 0–9 จำนวน 13 หลักเท่านั้น");focusField(recipientRef);return; }
    const student = device.student || recipient;
    commit([{ title: `${device.student ? "คืน" : "ยืม"}${device.name}`, detail: `${device.location} · รหัสตัวอย่าง ${student}` }], current => ({ ...current, devices: current.devices.map(item => item.id === device.id ? { ...item, student: item.student ? null : student } : item) }));
  }
  function submitManual(event) {
    event.preventDefault();
    if (!manual.notes.trim()) { setManualError("ระบุรายละเอียดของงาน หรือเลือกข้อความแนะนำ");focusField(manualNotesRef);return; }
    commit([{ title: task.label, detail: [manual.recipient.trim(), manual.notes.trim()].filter(Boolean).join(" · ") }]);
    setManual(current => ({ ...current, notes: "", recipient: "" }));setManualError("");
  }
  const dialogTitle = dialog?.startsWith("rooms") ? `เลือกห้อง ชั้น ${floor}` : deviceDialog ? device ? `${device.student ? "คืน" : "ยืม"}${device.name}` : quickItems.find(item => item.id === dialog).title : combo?.title || ({ datetime: "วันที่และเวลา", task: "เลือกหัวข้อรอง", person: "ผู้ปฏิบัติงาน", phone: "รับสายโทรศัพท์", history: "ประวัติงานตัวอย่าง", log: selectedLog?.title, schedule: "ตารางวันที่เลือก", notifications: "การแจ้งเตือน" }[dialog] || "");
  const visibleTasks = tasks.filter(item => `${item.label} ${item.major}`.includes(query));

  return <WorkspaceFrame
    user={{ uid: person.id, displayName: person.displayName, initial: person.initial, role }} pathname={role === "staff" ? "/worklogs/new" : "/admin/record"}
    glassMode={glassMode}
    onNavigate={href => { if (["/worklogs", "/profile"].includes(href)) openDialog(href === "/worklogs" ? "history" : "person");else if (href === "/calendar") openDialog("schedule");else if (!["/worklogs/new", "/admin/record"].includes(href)) setStatus("หน้านี้ยังอยู่ในส่วนกลางเดิม — รอบนี้ตรวจหน้าบันทึกงานตามแบบ Review 10"); }}
    notificationSlot={<button
      type="button" className="ui-icon-button"
      aria-label="การแจ้งเตือนตัวอย่าง" onClick={() => openDialog("notifications")}
    >
      <Bell size={20} aria-hidden="true" />
    </button>}
  >
    <div className="ui-page-heading record-heading">
      <h1>บันทึกงาน</h1>
      <p>เลือกงานที่ทำ แล้วกลับไปทำงานต่อได้ทันที</p>
      <small className="record-preview-badge">Development · ข้อมูลตัวอย่าง</small>
    </div>
    <div className="record-layout">
      <div className="record-column">
        <section aria-label="บันทึกงานของคุณ">
          <div className="record-panel-title">
            <div>
              <h2>
                งานของ
                {role === "staff" ? "ฉัน" : "ทีม"}
              </h2>
              <p>
                {`บันทึกสำหรับ ${thaiDate(dateTime.date)}`}
              </p>
            </div>
            <button
              className="record-person" type="button"
              onClick={() => openDialog("person")} aria-label="ผู้ปฏิบัติงาน"
            >
              <span className="ui-avatar">{person.initial}</span>
              <span>
                <small>ผู้ปฏิบัติงาน</small>
                <strong>{person.displayName}</strong>
              </span>
              <ChevronDown size={14} aria-hidden="true" />
            </button>
          </div>
          <div className="record-meta">
            <GlassControlGroup
              mode={glassMode} label="วิธีบันทึกงาน"
              className="record-mode"
            >
              {[["quick", "บันทึกด่วน", Zap], ["manual", "กรอกเอง", FilePenLine]].map(([id, label, Icon]) => <button
                key={id} type="button"
                aria-pressed={mode === id} onClick={() => setMode(id)}
              >
                <Icon size={17} aria-hidden="true" />
                {label}
              </button>)}
            </GlassControlGroup>
            <button
              type="button" className="record-time"
              onClick={() => openDialog("datetime")} aria-label="เปลี่ยนวันที่และเวลา"
            >
              <Clock3 size={17} aria-hidden="true" />
              <span>{dateTime.time}</span>
              <ChevronDown size={13} aria-hidden="true" />
            </button>
          </div>
          <div hidden={mode !== "quick"}>
            <div className="record-quick-grid">
              {quickItems.slice(quickPage * 6, quickPage * 6 + 6).map(({ id, title, hint, Icon, tone, count }) => <button
                key={id} type="button"
                className="record-quick-card" onClick={() => openDialog(id)}
              >
                <span className="record-tile ui-nav-symbol" data-tone={tone}><Icon size={29} aria-hidden="true" /></span>
                {count && <span className="record-quick-count">
                  {count}
                  {' '}
                  งาน
                </span>}
                <strong>{title}</strong>
                <small>{hint}</small>
              </button>)}
            </div>
            <div className="record-pagination" aria-label="หน้าบันทึกด่วน">
              <button
                type="button" disabled={quickPage === 0}
                onClick={() => setQuickPage(0)}
              >
                <ChevronLeft size={16} aria-hidden="true" />
                ก่อนหน้า
              </button>
              <span>
                {quickPage + 1}
                {' '}
                / 2
              </span>
              <button
                type="button" disabled={quickPage === 1}
                onClick={() => setQuickPage(1)}
              >
                ถัดไป
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
          <form
            hidden={mode !== "manual"} className="record-form"
            aria-label="กรอกบันทึกงาน" onSubmit={submitManual}
            noValidate
          >
            <fieldset>
              <legend>งานที่ทำ</legend>
              <label className="ui-field">
                <span>หัวข้อหลัก</span>
                <input
                  className="apple-input" readOnly
                  value={task.major}
                />
              </label>
              <div className="ui-field">
                <span id="record-task-label">หัวข้อรอง</span>
                <button
                  type="button" className="record-task-picker"
                  aria-labelledby="record-task-label record-task-value" onClick={() => openDialog("task")}
                >
                  <span id="record-task-value">{task.label}</span>
                  <ChevronDown size={17} aria-hidden="true" />
                </button>
              </div>
            </fieldset>
            <fieldset>
              <legend>รายละเอียด</legend>
              <label className="ui-field">
                <span>
                  ผู้รับบริการ
                  <small>ถ้ามี</small>
                </span>
                <input
                  className="apple-input" name="record-manual-recipient"
                  value={manual.recipient} onChange={event => setManual({ ...manual, recipient: event.target.value })}
                />
              </label>
              <label className="ui-field">
                <span>
                  รายละเอียดของงาน
                  <small>จำเป็น</small>
                </span>
                <textarea
                  className="apple-input" name="record-manual-notes"
                  rows={3} value={manual.notes}
                  ref={manualNotesRef} aria-required="true"
                  aria-invalid={Boolean(manualError)} aria-describedby={manualError ? "record-manual-error" : undefined}
                  onChange={event => { setManual({ ...manual, notes: event.target.value });setManualError(""); }}
                />
              </label>
              <div
                className="record-suggestions" role="group"
                aria-label="ข้อความแนะนำ"
              >
                <span>ข้อความแนะนำ</span>
                {task.suggestions.map(suggestion => <button
                  type="button" key={suggestion}
                  onClick={() => setManual(current => ({ ...current, notes: current.notes ? `${current.notes}\n${suggestion}` : suggestion }))}
                >
                  {suggestion}
                </button>)}
              </div>
              {manualError && <p
                id="record-manual-error" className="record-error"
                role="alert"
              >
                {manualError}
              </p>}
            </fieldset>
            <div className="record-form-actions">
              <span className="ui-caption">
                {thaiDate(dateTime.date)}
                {' '}
                ·
                {' '}
                {dateTime.time}
              </span>
              <GlassButton
                mode={glassMode} variant="prominent"
                type="submit"
              >
                <Check size={18} aria-hidden="true" />
                บันทึกงาน
              </GlassButton>
            </div>
          </form>
          <details className="record-inline-schedule">
            <summary>
              <CalendarDays size={17} aria-hidden="true" />
              <span>ตารางวันที่เลือก</span>
              <small>{thaiDate(dateTime.date)}</small>
            </summary>
            <DailyAgenda date={dateTime.date} />
            <small>ตารางตัวอย่างสำหรับตรวจแบบ ไม่ใช่ตารางจริง</small>
          </details>
        </section>
        {undo && <div
          className="record-undo" role="region"
          aria-label="เลิกทำรายการล่าสุด"
        >
          <span>
            <Check size={18} aria-hidden="true" />
            บันทึกตัวอย่าง
            {' '}
            {undo.count}
            {' '}
            รายการแล้ว
          </span>
          <GlassButton mode={glassMode} onClick={() => { setData(undo.before);setUndo(null);setStatus("เลิกทำรายการล่าสุดแล้ว"); }}>
            <Undo2 size={16} aria-hidden="true" />
            เลิกทำ
          </GlassButton>
        </div>}
        <section className="record-recent" aria-labelledby="record-recent-title">
          <div className="record-section-head">
            <h2 id="record-recent-title">บันทึกล่าสุด</h2>
            <button
              type="button" className="record-link"
              onClick={() => openDialog("history")}
            >
              ดูประวัติ
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
          {data.logs.slice(0, 3).map(log => <button
            type="button" className="record-log-row"
            key={log.id} onClick={() => { setSelectedLog(log);setDialog("log"); }}
          >
            <Check size={17} aria-hidden="true" />
            <span>
              <strong>{log.title}</strong>
              <small>
                {log.person}
                {' '}
                ·
                {' '}
                {log.time}
                {' '}
                ·
                {' '}
                {log.detail}
              </small>
            </span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>)}
        </section>
      </div>
      <aside className="record-context" aria-label="ข้อมูลประกอบการบันทึก">
        <section>
          <div className="record-section-head">
            <h2>วันนี้ของคุณ</h2>
            <CalendarDays size={18} aria-hidden="true" />
          </div>
          <p className="record-context-date">{thaiDate(dateTime.date)}</p>
          <div className="record-context-count">
            <strong>{todayLogs.length}</strong>
            <span>
              รายการที่บันทึก
              <br />
              <small>ข้อมูลตัวอย่างของผู้ปฏิบัติงานที่เลือก</small>
            </span>
          </div>
        </section>
        <section>
          <div className="record-section-head">
            <h2>ตารางวันที่เลือก</h2>
            <button
              type="button" className="record-link"
              onClick={() => openDialog("schedule")}
            >
              ดูตาราง
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
          <DailyAgenda date={dateTime.date} />
          <p className="ui-caption">ตัวอย่างเพื่อเทียบ layout</p>
        </section>
        <p className="record-preview-note">
          Development · Review 10
          <br />
          ทดลองบันทึกและเลิกทำได้ในหน้านี้
          <br />
          ไม่เชื่อมข้อมูล production
        </p>
      </aside>
    </div>
    <details className="record-inspector">
      <summary>ตัวเลือกตรวจแบบ · Development</summary>
      <div className="record-inspector-controls">
        <label>
          บทบาทตัวอย่าง
          <select
            className="apple-input" value={role}
            onChange={event => { setRole(event.target.value);setPersonId(people[0].id); }}
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
            <option value="superadmin">Superadmin</option>
          </select>
        </label>
        <div
          className="ui-glass-comparison" role="group"
          aria-label="เปรียบเทียบวัสดุกระจก"
        >
          {[["css", "CSS เดิม"], ["quick", "QuickLiquid"]].map(([value, label]) => <button
            type="button" className="ui-choice"
            key={value} aria-pressed={glassMode === value}
            onClick={() => setGlassMode(value)}
          >
            {label}
          </button>)}
        </div>
        <a href="/dev/ui">เปิดห้องทดสอบส่วนกลาง</a>
      </div>
      <p className="ui-caption">
        {resolved.solid ? "ใช้พื้นทึบตามการตั้งค่าของคุณ" : "QuickLiquid สำหรับ controls ที่เลือก · Safari ใช้ CSS fallback"}
        {' '}
        · ทุกธุรกรรมอยู่ในหน่วยความจำ เมื่อ refresh จะเริ่มใหม่
      </p>
    </details>
    <p
      className="record-live-status" role="status"
      aria-live="polite"
    >
      {status}
    </p>
    <Dialog
      open={Boolean(dialog)} onClose={() => setDialog(null)}
      title={dialogTitle} className={`record-dialog ${dialog?.startsWith("rooms") ? "record-room-dialog" : ""}`}
      description={dialog?.startsWith("rooms") ? "กดเปิดหรือปิดห้องเพื่อบันทึกทันที แล้วเลิกทำได้จากหน้าบันทึก" : "ข้อมูลสังเคราะห์สำหรับตรวจแบบ — ไม่มีการบันทึกไปยังระบบจริง"}
    >
      {dialog?.startsWith("rooms") && <div className="record-room-grid">
        {data.rooms.filter(room => room.floor === floor).map(room => { const Icon = room.open ? DoorOpen : DoorClosed;return <button
          key={room.id} type="button"
          className="record-resource-tile" data-state={room.open ? "open" : "closed"}
          onClick={() => toggleRoom(room)}
        >
          <Icon size={30} aria-hidden="true" />
          <strong>
            {`ห้อง ${room.id}`}
          </strong>
          <span className="record-badge" data-tone={room.open ? "green" : "neutral"}>
            {room.open ? <Check size={14} aria-hidden="true" /> : <Moon size={14} aria-hidden="true" />}
            {room.open ? "เปิดอยู่" : "ปิดอยู่"}
          </span>
          <small>{room.detail}</small>
          <span className="record-resource-action">
            {room.open ? "ปิดห้อง" : "เปิดห้อง"}
            <ChevronRight size={16} aria-hidden="true" />
          </span>
        </button>; })}
      </div>}
      {deviceDialog && !device && <div className="record-device-grid">
        {data.devices.filter(item => item.kind === dialog).map(item => { const Icon = deviceIcons[item.kind], StateIcon = !item.available ? ShieldAlert : item.student ? Clock3 : Check;return <button
          type="button" className="record-resource-tile"
          key={item.id} disabled={!item.available}
          data-state={item.student ? "borrowed" : "ready"} onClick={() => { setDeviceId(item.id);setError(""); }}
        >
          <Icon size={30} aria-hidden="true" />
          <strong>{item.name}</strong>
          <span className="record-badge" data-tone={!item.available ? "amber" : item.student ? "blue" : "green"}>
            <StateIcon size={14} aria-hidden="true" />
            {!item.available ? "ไม่พร้อมใช้" : item.student ? "กำลังยืม" : "พร้อมยืม"}
          </span>
          <small>{item.location}</small>
          <span className="record-resource-action">{!item.available ? "ตรวจสภาพก่อนใช้" : item.student ? "คืนรายการนี้" : "ยืมรายการนี้"}</span>
        </button>; })}
      </div>}
      {deviceDialog && device && <form onSubmit={submitDevice} noValidate>
        <button
          type="button" className="record-link record-back"
          onClick={() => { setDeviceId(null);setError(""); }}
        >
          <ChevronLeft size={16} aria-hidden="true" />
          เลือกอุปกรณ์อื่น
        </button>
        <div className="record-device-summary">
          <span className="record-tile ui-nav-symbol" data-tone="green"><DeviceIcon size={28} aria-hidden="true" /></span>
          <div>
            <strong>{device.name}</strong>
            <p>{device.location}</p>
          </div>
        </div>
        <label className="ui-field">
          <span>{device.student ? "รหัสผู้ยืมเดิม" : "รหัสนักศึกษา 13 หลัก"}</span>
          <input
            className="apple-input record-student" name="record-student"
            ref={recipientRef} type="text"
            inputMode="numeric" autoComplete="off"
            spellCheck={false} pattern="[0-9]{13}"
            readOnly={Boolean(device.student)} value={device.student || recipient}
            aria-required={!device.student} aria-invalid={Boolean(error)}
            aria-describedby="record-student-hint record-dialog-error" onChange={event => { const value = event.target.value;if (/^[0-9]*$/.test(value)) { setRecipient(value);setError(""); } else { setRecipient("");setError("ช่องนี้รับเฉพาะตัวเลข 0–9 กรุณาตรวจภาษาแป้นพิมพ์"); } }}
          />
        </label>
        <p className="ui-caption" id="record-student-hint">{device.student ? "คืนให้ผู้ยืมเดิมโดยไม่ต้องสแกนซ้ำ" : "รับเฉพาะตัวเลข 0–9 ไม่รับตัวอักษรหรือเลขไทย"}</p>
        <p
          className="record-error" id="record-dialog-error"
          role="alert"
        >
          {error}
        </p>
        <div className="record-form-actions">
          <GlassButton mode={glassMode} onClick={() => setDialog(null)}>ยกเลิก</GlassButton>
          <GlassButton
            mode={glassMode} type="submit"
            variant="prominent"
          >
            <Check size={18} aria-hidden="true" />
            {device.student ? "บันทึกคืน" : "บันทึกยืม"}
          </GlassButton>
        </div>
      </form>}
      {combo && step === "edit" && <form onSubmit={reviewCombo} noValidate>
        <p className="ui-caption">เลือกเฉพาะงานที่ทำจริง ทุกครั้งเริ่มโดยไม่เลือกรายการ</p>
        <div className="record-choice-actions">
          <button
            type="button" className="record-link"
            onClick={() => setSelected(combo.tasks.map((_, i) => i))}
          >
            เลือกทั้งหมด
          </button>
          <button
            type="button" className="record-link"
            onClick={() => setSelected([])}
          >
            ล้างการเลือก
          </button>
        </div>
        <fieldset className="record-combo">
          <legend className="record-sr-only">งานที่ทำจริง</legend>
          {combo.tasks.map((label, i) => <label
            key={label} className="record-check-row"
            data-selected={selected.includes(i)}
          >
            <input
              ref={i === 0 ? firstChoiceRef : undefined} type="checkbox"
              checked={selected.includes(i)} onChange={event => { setSelected(event.target.checked ? [...selected, i].sort((a, b) => a - b) : selected.filter(value => value !== i));setError(""); }}
            />
            <span>{label}</span>
          </label>)}
        </fieldset>
        <label className="ui-field record-recipient">
          <span>
            ผู้รับบริการ
            <small>จำเป็น</small>
          </span>
          <input
            className="apple-input" name="record-combo-recipient"
            value={recipient} ref={recipientRef}
            aria-required="true" aria-invalid={Boolean(error) && !recipient.trim()}
            aria-describedby="record-combo-error" onChange={event => { setRecipient(event.target.value);setError(""); }}
          />
        </label>
        <p
          className="record-error" id="record-combo-error"
          role="alert"
        >
          {error}
        </p>
        <div className="record-form-actions">
          <GlassButton mode={glassMode} onClick={() => setDialog(null)}>ยกเลิก</GlassButton>
          <GlassButton
            mode={glassMode} variant="prominent"
            type="submit"
          >
            {`ตรวจ ${selected.length} รายการ`}
            <ChevronRight size={16} aria-hidden="true" />
          </GlassButton>
        </div>
      </form>}
      {combo && step === "review" && <div>
        <p className="record-review-count">
          {selected.length}
          {' '}
          <span>รายการที่เลือก</span>
        </p>
        <p className="ui-caption">
          ผู้รับบริการ:
          {recipient}
          {' '}
          ·
          {dateTime.time}
        </p>
        <ul className="record-review-list">
          {selected.map(i => <li key={i}>
            <Check size={16} aria-hidden="true" />
            {combo.tasks[i]}
          </li>)}
        </ul>
        <div className="record-form-actions">
          <GlassButton mode={glassMode} onClick={() => setStep("edit")}>
            <ChevronLeft size={16} aria-hidden="true" />
            แก้ไขรายการ
          </GlassButton>
          <GlassButton
            mode={glassMode} variant="prominent"
            onClick={() => commit(selected.map(i => ({ title: combo.tasks[i], detail: recipient.trim() })))}
          >
            {`บันทึก ${selected.length} รายการ`}
          </GlassButton>
        </div>
      </div>}
      {dialog === "task" && <div>
        <label className="ui-field">
          <span>ค้นหาหัวข้อรอง</span>
          <input
            className="apple-input" type="search"
            value={query} onChange={event => setQuery(event.target.value)}
            ref={taskSearchRef}
          />
        </label>
        <div className="record-task-results">
          {visibleTasks.length ? visibleTasks.map(item => <button
            type="button" key={item.id}
            aria-pressed={manual.taskId === item.id} onClick={() => { setManual({ ...manual, taskId: item.id });setDialog(null); }}
          >
            <span>
              <strong>{item.label}</strong>
              <small>{item.major}</small>
            </span>
            {manual.taskId === item.id && <Check size={18} aria-hidden="true" />}
          </button>) : <p className="ui-caption">ไม่พบหัวข้อ ลองค้นด้วยคำอื่น</p>}
        </div>
      </div>}
      {dialog === "datetime" && <form onSubmit={event => { event.preventDefault();setDateTime(dateDraft);setDialog(null); }}>
        <div className="record-date-grid">
          <label className="ui-field">
            <span>วันที่</span>
            <input
              className="apple-input" type="date"
              required value={dateDraft.date}
              onChange={event => setDateDraft({ ...dateDraft, date: event.target.value })}
            />
          </label>
          <label className="ui-field">
            <span>เวลา</span>
            <input
              className="apple-input" type="time"
              required value={dateDraft.time}
              onChange={event => setDateDraft({ ...dateDraft, time: event.target.value })}
            />
          </label>
        </div>
        <div className="record-form-actions">
          <GlassButton mode={glassMode} onClick={() => setDialog(null)}>ยกเลิก</GlassButton>
          <GlassButton
            mode={glassMode} variant="prominent"
            type="submit"
          >
            ใช้วันที่และเวลานี้
          </GlassButton>
        </div>
      </form>}
      {dialog === "person" && <div>
        <p className="ui-caption">{role === "staff" ? "Staff บันทึกให้บัญชีของตนเอง" : "คงชื่อที่ตั้งไว้ครบ เลือกด้วย ID ไม่ตัดชื่อต้น"}</p>
        {(role === "staff" ? [person] : people).map(item => <button
          key={item.id} type="button"
          className="record-person-option" aria-pressed={personId === item.id}
          onClick={() => { setPersonId(item.id);setDialog(null); }}
        >
          <span className="ui-avatar">{item.initial}</span>
          <span>
            <strong>{item.displayName}</strong>
            <small>{item.fullName}</small>
          </span>
          {personId === item.id && <Check size={18} aria-hidden="true" />}
        </button>)}
      </div>}
      {dialog === "phone" && <form noValidate onSubmit={event => { event.preventDefault();if (!notes.trim()) { setError("ระบุรายละเอียดการให้บริการ");focusField(notesRef);return; }commit([{ title: "รับสายโทรศัพท์", detail: notes.trim() }]); }}>
        <label className="ui-field">
          <span>
            รายละเอียดการให้บริการ
            <small>จำเป็น</small>
          </span>
          <textarea
            className="apple-input" rows={4}
            ref={notesRef} value={notes}
            aria-invalid={Boolean(error)} aria-describedby="record-phone-error"
            onChange={event => { setNotes(event.target.value);setError(""); }}
          />
        </label>
        <p
          id="record-phone-error" className="record-error"
          role="alert"
        >
          {error}
        </p>
        <div className="record-form-actions">
          <GlassButton mode={glassMode} onClick={() => setDialog(null)}>ยกเลิก</GlassButton>
          <GlassButton
            mode={glassMode} variant="prominent"
            type="submit"
          >
            บันทึกงาน
          </GlassButton>
        </div>
      </form>}
      {dialog === "history" && <div>
        {data.logs.map(log => <button
          className="record-log-row" type="button"
          key={log.id} onClick={() => { setSelectedLog(log);setDialog("log"); }}
        >
          <Check size={16} aria-hidden="true" />
          <span>
            <strong>{log.title}</strong>
            <small>
              {thaiDate(log.date)}
              {' '}
              ·
              {' '}
              {log.person}
              {' '}
              ·
              {' '}
              {log.time}
            </small>
          </span>
          <ChevronRight size={16} aria-hidden="true" />
        </button>)}
      </div>}
      {dialog === "log" && selectedLog && <div>
        <dl className="record-log-detail">
          <div>
            <dt>ผู้ปฏิบัติงาน</dt>
            <dd>{selectedLog.person}</dd>
          </div>
          <div>
            <dt>วันที่และเวลา</dt>
            <dd>
              {thaiDate(selectedLog.date)}
              {' '}
              ·
              {' '}
              {selectedLog.time}
            </dd>
          </div>
          <div>
            <dt>รายละเอียด</dt>
            <dd>{selectedLog.detail}</dd>
          </div>
        </dl>
        <GlassButton mode={glassMode} onClick={() => setDialog("history")}>
          <ChevronLeft size={16} aria-hidden="true" />
          กลับไปประวัติ
        </GlassButton>
      </div>}
      {dialog === "schedule" && <div className="record-schedule-list">
        <p>{thaiDate(dateTime.date)}</p>
        <DailyAgenda date={dateTime.date} />
        <p className="ui-caption">หน้า calendar เต็มจะย้ายตามแบบในเฟสถัดไป</p>
      </div>}
      {dialog === "notifications" && <p className="ui-caption">ไม่มีการแจ้งเตือนตัวอย่างเพิ่มเติม</p>}
    </Dialog>
  </WorkspaceFrame>;
}
