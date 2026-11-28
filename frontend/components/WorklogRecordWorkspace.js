"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { CalendarDays, Check, ChevronDown, ChevronRight, Clock3, FilePenLine, Zap } from "lucide-react";
import QuickLogButtons from "./QuickLogButtons";
import { WorklogManualWorkspace } from "./WorklogManualWorkspace";
import { MobileRoomClosureNotice, WorklogResourceSummary } from "./WorklogResourceSummary";
import { Dialog } from "./ui/Dialog";
import { GlassButton, GlassControlGroup } from "./ui/GlassControls";
import { useSharedResourceStatus } from "../hooks/useSharedResourceStatus";
import { recordStatusRefreshMs, useBangkokRoomClock, useWorklogRecordContext } from "../hooks/useWorklogRecordContext";
import { calendarLabel, timeMinutes, validCalendarDate } from "../lib/calendarView";
import { getMainDutyFromMinorTask } from "../lib/commentSuggestions";
import { nowTime, today } from "../lib/dateUtils";
import { sanitizeInput } from "../lib/validation";
import { roomClosureNotices } from "../lib/worklogResourceSummary";
import { getDutyGroupFromMinorTask } from "../lib/worklogUtils";
import "../app/dev/record/record.css";
import "../app/dev/history/history.css";
import "../app/worklogs/worklog-workspace.css";

export function RecordHeading() {
  return <div className="ui-page-heading record-heading worklog-workspace-heading" data-worklog-workspace="record">
    <h1>บันทึกงาน</h1>
    <p>เลือกงานที่ทำ แล้วกลับไปทำงานต่อได้ทันที</p>
  </div>;
}

function RecordAgenda({ schedule }) {
  if (schedule.status === "loading") return <p className="ui-caption" role="status">กำลังโหลดตาราง…</p>;
  if (schedule.status === "error") return <p className="ui-caption" role="status">โหลดตารางไม่สำเร็จ</p>;
  return <>
    {!schedule.items.length && <p className="ui-caption record-agenda-empty">{schedule.status === "idle" ? "เลือกวันที่เพื่อดูตาราง" : "ไม่พบกิจกรรมในวันที่เลือก"}</p>}
    {schedule.items.slice(0, 4).map(item => <div className="record-agenda" key={item.id}>
      <span>{item.start}</span>
      <div><strong>{item.title}</strong><p>ห้อง {item.rooms.join(" + ")} · {item.start}–{item.end}</p></div>
    </div>)}
    {schedule.items.length > 4 && <p className="ui-caption">อีก {schedule.items.length - 4} กิจกรรมในปฏิทิน</p>}
    {schedule.unavailable > 0 && <p className="ui-caption">มี {schedule.unavailable} รายการที่วัน เวลา หรือห้องไม่ครบ</p>}
  </>;
}

export function WorklogRecordWorkspace({
  form, setForm, mode, setMode, person, directory, busy, onReview, onQuickResult, revision,
}) {
  const dateForm = useId();
  const [editingDate, setEditingDate] = useState(null);
  const [dateError, setDateError] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const employeeId = person?.id;
  const roomClock = useBangkokRoomClock();
  const { worklogs, schedule, todaySchedule, retryTodaySchedule, dlRounds } = useWorklogRecordContext(employeeId, form.date, revision, roomClock?.date);
  const resourceStatus = useSharedResourceStatus({ refreshEveryMs: recordStatusRefreshMs });
  const notices = roomClosureNotices(resourceStatus.status?.roomStatus ?? {}, todaySchedule, roomClock);
  const day = validCalendarDate(form.date) ? calendarLabel(form.date) : "";
  const isToday = form.date === today();
  const agendaTitle = form.date === roomClock?.date ? "ตารางวันนี้" : "ตารางวันที่เลือก";

  function reviewDate(event) {
    event.preventDefault();
    if (!validCalendarDate(editingDate.date) || !Number.isFinite(timeMinutes(editingDate.time))) {
      setDateError("ระบุวันที่และเวลาให้ครบ");
      return;
    }
    setForm(current => ({ ...current, ...editingDate, dateTimeEdited: true }));
    setEditingDate(null);
  }

  function selectTask(minorTask) {
    setForm(current => ({
      ...current, minorTask, mainDuty: getMainDutyFromMinorTask(minorTask), dutyGroup: getDutyGroupFromMinorTask(minorTask),
    }));
  }

  return <>
    <div className="record-layout worklog-live-record">
      <section className="record-entry" aria-label="บันทึกงานของคุณ">
          <div className="record-panel-title">
            <div><h2>{directory ? "งานของทีม" : "งานของฉัน"}</h2>{day && <p>บันทึกสำหรับ {day}</p>}</div>
            {directory || <div className="record-person">
              <span className="ui-avatar" aria-hidden="true">{Array.from(person?.label || "?")[0]}</span>
              <span><small>ผู้ปฏิบัติงาน</small><strong>{person?.label || "ผู้ใช้งาน"}</strong></span>
            </div>}
          </div>
          <MobileRoomClosureNotice notices={notices} />
          <div className="record-meta">
            <GlassControlGroup mode="quick" label="วิธีบันทึกงาน" className="record-mode">
              <button type="button" aria-pressed={mode === "quick"} onClick={() => setMode("quick")}><Zap size={17} aria-hidden="true" /> บันทึกด่วน</button>
              <button type="button" aria-pressed={mode === "manual"} onClick={() => setMode("manual")}><FilePenLine size={17} aria-hidden="true" /> กรอกเอง</button>
            </GlassControlGroup>
            <button type="button" className="record-time" aria-label="เปลี่ยนวันที่และเวลา" onClick={() => { setDateError(""); setEditingDate({ date: form.date, time: form.time }); }}>
              <Clock3 size={17} aria-hidden="true" /><span>{form.time || "เลือกเวลา"}</span><ChevronDown size={13} aria-hidden="true" />
            </button>
          </div>
          {employeeId ? <>
            <div className="worklog-quick-panel" hidden={mode !== "quick"}>
              <QuickLogButtons key={employeeId} targetUser={directory ? person : undefined} onLogSuccess={onQuickResult} expandOnDesktop
                dlContext={{ date: form.date, time: form.time, person, rounds: dlRounds, status: schedule.status }} />
            </div>
            <div className="worklog-record-panel" hidden={mode !== "manual"}>
              <WorklogManualWorkspace
                form={form} setForm={setForm} onTask={selectTask} onSuggestion={comment => setForm(current => ({ ...current, comment }))}
                busy={busy} onReview={onReview}
              />
            </div>
          </> : <p className="ui-caption worklog-record-empty">เลือกผู้ปฏิบัติงานก่อนบันทึก</p>}
      </section>
      <aside className="record-live-context" aria-label="ข้อมูลประกอบการบันทึก">
        <WorklogResourceSummary schedule={todaySchedule} retrySchedule={retryTodaySchedule} notices={notices} resourceStatus={resourceStatus} />
        <div className="record-context">
          <section>
            <div className="record-section-head"><h2>{agendaTitle}</h2><Link href="/calendar" prefetch={false} className="record-link">ดูปฏิทิน <ChevronRight size={16} aria-hidden="true" /></Link></div>
            <RecordAgenda schedule={schedule} />
          </section>
          <section>
            <div className="record-section-head"><h2>{isToday ? (directory ? "สรุปวันนี้" : "วันนี้ของคุณ") : "สรุปวันที่เลือก"}</h2><CalendarDays size={18} aria-hidden="true" /></div>
            <p className="record-context-date">{day}</p>
            {worklogs.status === "ready"
              ? <div className="record-context-count"><strong>{worklogs.count}</strong><span>รายการที่บันทึก{directory && <small>{person.label}</small>}</span></div>
              : <p className="ui-caption">{worklogs.status === "error" ? "โหลดจำนวนบันทึกไม่สำเร็จ" : worklogs.status === "loading" ? "กำลังโหลดจำนวนบันทึก…" : "เลือกผู้ปฏิบัติงานและวันที่เพื่อดูจำนวนบันทึก"}</p>}
          </section>
        </div>
      </aside>
      <div className="record-column record-follow-up">
        <details className="record-inline-schedule worklog-inline-schedule">
          <summary><CalendarDays size={17} aria-hidden="true" /><span>{agendaTitle}</span><small>{day}</small></summary>
          <RecordAgenda schedule={schedule} />
          <Link href="/calendar" className="record-link" prefetch={false}>ดูปฏิทิน</Link>
        </details>
        <section className="record-recent" aria-label="บันทึกล่าสุด">
          <div className="record-section-head"><h2>บันทึกล่าสุด</h2><Link href="/worklogs" prefetch={false} className="record-link">ดูประวัติงาน <ChevronRight size={16} aria-hidden="true" /></Link></div>
          {worklogs.status === "loading" && <p className="ui-caption" role="status">กำลังโหลดบันทึก…</p>}
          {worklogs.status === "error" && <p className="ui-caption" role="status">โหลดบันทึกไม่สำเร็จ</p>}
          {worklogs.status === "ready" && !worklogs.items.length && <p className="ui-caption">ยังไม่มีบันทึกในวันที่เลือก</p>}
          {worklogs.items.map(log => <button type="button" className="record-log-row" key={log.id} onClick={() => setSelectedLog(log)}>
            <Check size={17} aria-hidden="true" />
            <span><strong>{log.minorTask || "บันทึกงาน"}</strong><small>{[person.label, log.time, log.comment].filter(Boolean).join(" · ")}</small></span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>)}
        </section>
      </div>
    </div>
    <Dialog open={Boolean(editingDate)} title="วันที่และเวลา" description="ใช้กับการกรอกเองและคุมสอบ DL รอบจากตารางใช้เวลาสอบ บันทึกด่วนอื่นใช้เวลาปัจจุบัน" onClose={() => setEditingDate(null)}
      footer={editingDate && <><GlassButton onClick={() => setEditingDate(null)}>ยกเลิก</GlassButton><GlassButton type="submit" form={dateForm} variant="prominent">ใช้วันและเวลานี้</GlassButton></>}>
      {editingDate && <form id={dateForm} className="record-manual-fields worklog-date-form" onSubmit={reviewDate}>
        <label className="ui-field"><span>วันที่</span><input required type="date" className="apple-input" value={editingDate.date} onChange={event => setEditingDate(current => ({ ...current, date: event.target.value }))} /></label>
        <label className="ui-field"><span>เวลา</span><input required type="time" className="apple-input" value={editingDate.time} onChange={event => setEditingDate(current => ({ ...current, time: event.target.value }))} /></label>
        <button type="button" className="record-link justify-self-start" onClick={() => setEditingDate({ date: today(), time: nowTime() })}>ใช้เวลาปัจจุบัน</button>
        {dateError && <p role="alert" className="record-error">{dateError}</p>}
      </form>}
    </Dialog>
    <Dialog open={Boolean(selectedLog)} title={selectedLog?.minorTask || "รายละเอียดบันทึก"} onClose={() => setSelectedLog(null)}>
      {selectedLog && <dl className="record-review-fields">
        <dt>ผู้ปฏิบัติงาน</dt><dd>{person?.label}</dd><dt>วันที่และเวลา</dt><dd>{day} · {selectedLog.time}</dd>
        <dt>ผู้รับบริการ</dt><dd>{selectedLog.recipient || "—"}</dd><dt>รายละเอียด</dt><dd>{selectedLog.comment || "—"}</dd>
      </dl>}
    </Dialog>
  </>;
}

export function WorklogRecordReview({ review, saving, error, onClose, onConfirm }) {
  const fields = review?.fields;
  return <Dialog open={Boolean(review)} busy={saving} title="ตรวจรายการก่อนบันทึก" description={saving ? "กำลังบันทึกงาน" : undefined} onClose={onClose}
    footer={<><GlassButton mode="quick" disabled={saving} onClick={onClose}>กลับไปแก้ไข</GlassButton><GlassButton mode="quick" variant="prominent" disabled={saving} onClick={onConfirm}>ยืนยันบันทึก</GlassButton></>}>
    {fields && <dl className="record-review-fields">
      <dt>ผู้ปฏิบัติงาน</dt><dd>{review.employeeLabel}</dd>
      {review.employeeFullName && <><dt>ชื่อ–นามสกุล</dt><dd>{review.employeeFullName}</dd></>}
      <dt>หัวข้อรอง</dt><dd>{fields.minorTask}</dd><dt>งานหลัก</dt><dd>{fields.mainDuty}</dd>
      <dt>กลุ่มงาน</dt><dd>{fields.dutyGroup || "—"}</dd>
      <dt>วันที่และเวลา</dt><dd>{fields.date} · {fields.time}</dd>
      <dt>ผู้รับบริการ</dt><dd>{sanitizeInput(fields.recipient) || "—"}</dd><dt>รายละเอียด</dt><dd>{sanitizeInput(fields.comment) || "—"}</dd>
    </dl>}
    {error && <p className="record-error" role="alert">{error}</p>}
  </Dialog>;
}
