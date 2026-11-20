"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { GlassButton } from "./ui/GlassControls";
import { calendarDates, calendarLabel, calendarRange, calendarToday, calendarWeekday } from "../lib/calendarView";
import { getThaiHoliday, prefetchHolidaysForYear } from "../lib/thaiHolidays";
import { WORKLOG_HISTORY_READ_LIMIT } from "../lib/worklogHistoryRange";

const weekdayLabels = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const dayPageSize = 8;

export function WorklogHistoryCalendar({
  month, day, onMoveMonth, onToday, onDay, items, loading, error, truncated,
  getDisplayName, onOpen, canEdit, onEdit, onDelete,
}) {
  const [, refreshHolidays] = useState(0);
  const year = Number(month.slice(0, 4));
  useEffect(() => {
    let current = true;
    prefetchHolidaysForYear(year).then(() => {
      if (current) refreshHolidays(version => version + 1);
    });
    return () => { current = false; };
  }, [year]);

  const range = calendarRange(month, "month");
  const days = calendarDates(range.start, range.end);
  const leadingDays = (calendarWeekday(month) + 1) % weekdayLabels.length;
  const today = calendarToday();
  const itemsByDate = new Map();
  for (const item of items) {
    if (!itemsByDate.has(item.date)) itemsByDate.set(item.date, []);
    itemsByDate.get(item.date).push(item);
  }
  const selectedItems = itemsByDate.get(day) || [];

  return (
    <div className="history-calendar-layout mb-6">
      <section className="apple-panel history-calendar-panel" aria-labelledby="history-calendar-month">
        <header className="history-calendar-header">
          <h2 id="history-calendar-month">{calendarLabel(month, { month: "long", year: "numeric" })}</h2>
          <div className="history-calendar-nav">
            <button type="button" aria-label="เดือนก่อนหน้า" onClick={() => onMoveMonth(-1)}><ChevronLeft size={19} aria-hidden="true" /></button>
            <button type="button" onClick={onToday}>วันนี้</button>
            <button type="button" aria-label="เดือนถัดไป" onClick={() => onMoveMonth(1)}><ChevronRight size={19} aria-hidden="true" /></button>
          </div>
        </header>
        <div className="history-calendar-weekdays" aria-hidden="true">
          {weekdayLabels.map(label => <span key={label}>{label}</span>)}
        </div>
        <div className="history-calendar-grid" role="group" aria-label="เลือกวันในปฏิทิน" aria-busy={loading}>
          {Array.from({ length: leadingDays }, (_, i) => <span className="history-calendar-blank" key={i} aria-hidden="true" />)}
          {days.map(date => {
            const count = itemsByDate.get(date)?.length || 0;
            const holiday = getThaiHoliday(date);
            const label = calendarLabel(date, { day: "numeric", month: "long", year: "numeric" });
            const countLabel = loading || error ? "" : ` · ${count} รายการ`;
            return (
              <button
                type="button" key={date} className="history-calendar-day" aria-pressed={day === date}
                aria-current={date === today ? "date" : undefined}
                aria-label={label + countLabel + (holiday ? ` · ${holiday}` : "")}
                data-holiday={holiday ? "" : undefined}
                data-sunday={calendarWeekday(date) === 6 ? "" : undefined}
                onClick={() => onDay(day === date ? null : date)}
              >
                <span className="history-calendar-number">{Number(date.slice(-2))}</span>
                {count > 0 && <span className="history-calendar-count">{count} รายการ</span>}
                {holiday && <span className="history-calendar-holiday">{holiday}</span>}
              </button>
            );
          })}
        </div>
        <p className="history-calendar-summary" role="status">
          {loading ? "กำลังโหลดประวัติของเดือนนี้…" : error ? "โหลดประวัติของเดือนนี้ไม่สำเร็จ" : `${items.length} รายการในเดือนนี้`}
          {!loading && !error && truncated && (
            <span> · ถึงขีดจำกัด {WORKLOG_HISTORY_READ_LIMIT} รายการ ผลอาจไม่ครบ ลองระบุช่วงวันที่ให้แคบลง</span>
          )}
        </p>
      </section>

      <section className="apple-panel history-calendar-panel" aria-labelledby="history-day-heading" aria-busy={loading}>
        <h3 id="history-day-heading">{day ? calendarLabel(day, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "รายการตามวัน"}</h3>
        {!day ? <p className="history-calendar-summary">เลือกวันเพื่อดูรายการ</p>
          : loading ? <p className="history-calendar-summary">กำลังโหลดรายการ…</p>
          : error ? <p className="history-calendar-summary">ยังแสดงรายการของวันนี้ไม่ได้</p>
          : <HistoryDayItems key={day} items={selectedItems} getDisplayName={getDisplayName}
              onOpen={onOpen} canEdit={canEdit} onEdit={onEdit} onDelete={onDelete} />}
      </section>
    </div>
  );
}

function HistoryDayItems({ items, getDisplayName, onOpen, canEdit, onEdit, onDelete }) {
  const [visible, setVisible] = useState(dayPageSize);
  const list = useRef(null);
  const nextFocus = useRef(null);
  const sorted = [...items].sort((left, right) => (left.time || "").localeCompare(right.time || ""));
  const showing = Math.min(visible, sorted.length);
  useEffect(() => {
    if (nextFocus.current === null) return;
    const firstNew = list.current?.children[nextFocus.current];
    (firstNew?.querySelector("button") || firstNew)?.focus();
    nextFocus.current = null;
  }, [visible]);

  return (
    <>
      <p className="history-calendar-summary" role="status">
        {items.length === 0 ? "ไม่มีรายการในวันที่เลือก" : `${items.length} รายการ`}
      </p>
      <ol ref={list} className="history-calendar-entries">
        {sorted.slice(0, visible).map(item => (
          <li key={item.id} tabIndex={-1}>
            <span className="history-calendar-time">{item.time || "—"}</span>
            <div className="history-calendar-entry">
              <p className="history-calendar-task">{item.minorTask || item.mainDuty || "บันทึกงาน"}</p>
              {item.minorTask && item.mainDuty && <p className="text-sm text-[var(--ui-sub)]">{item.mainDuty}</p>}
              {item.recipient && <p className="text-xs text-[var(--ui-sub)]">ผู้รับบริการ · {item.recipient}</p>}
              {(item.equipment || item.room || item.comment) && (
                <p className="text-xs text-[var(--ui-sub)]">{item.equipment || item.room || item.comment}</p>
              )}
              <div className="history-calendar-entry-meta">
                <span>{getDisplayName(item)}</span>
                {item.status && <span className="history-calendar-status" data-recorded={item.status === "บันทึกแล้ว" ? "" : undefined}>{item.status}</span>}
              </div>
              {onOpen ? <button className="history-link" type="button" onClick={() => onOpen(item)}>ดูรายละเอียด</button>
                : canEdit(item) && <div className="flex gap-2">
                  <GlassButton aria-label="แก้ไข" icon={<Pencil size={16} aria-hidden="true" />} onClick={() => onEdit(item)} />
                  <GlassButton aria-label="ลบ" variant="destructive" icon={<Trash2 size={16} aria-hidden="true" />} onClick={() => onDelete(item.id)} />
                </div>}
            </div>
          </li>
        ))}
      </ol>
      {showing < sorted.length && (
        <GlassButton onClick={() => {
          nextFocus.current = showing;
          setVisible(value => value + dayPageSize);
        }}>ดูเพิ่มอีก {Math.min(dayPageSize, sorted.length - showing)} รายการ</GlassButton>
      )}
    </>
  );
}
