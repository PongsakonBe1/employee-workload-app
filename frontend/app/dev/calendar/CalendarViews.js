"use client";

import { CalendarDays, ChevronRight } from "lucide-react";
import { CALENDAR_KINDS, CALENDAR_ROOM_COLORS, addCalendarDays, addCalendarMonths, calendarDates, calendarHolidays, calendarLabel, calendarRoomColor, calendarWeekday, layoutCalendarDay, monthCalendarDates, timeMinutes } from "../../../lib/calendarView";

export function RoomLabels({ rooms }) {
  return <span className="cal-room-labels" aria-label={`ห้อง ${rooms.join(" + ")}`}>
    {rooms.map(room => <span className="cal-room-label" data-room-color={CALENDAR_ROOM_COLORS[room] || "shared"} key={room}>
      <i aria-hidden="true" />{room}
    </span>)}
  </span>;
}

function eventColor(row, colorBy, selectedRoom) {
  return colorBy === "room" ? calendarRoomColor(row.rooms, selectedRoom) : undefined;
}

export function HolidayLabels({ date, holidays, holidayOptions, onHoliday }) {
  return calendarHolidays(holidays, date, holidayOptions).map(item => <button
    type="button" className="cal-holiday"
    data-holiday-kind={item.kind} key={item.id}
    onClick={() => onHoliday(item)}
  >
    <CalendarDays size={13} aria-hidden="true" />
    <span>{item.title}</span>
  </button>);
}
export function MiniCalendar({ anchor, selected, today, onSelect }) {
  const days = monthCalendarDates(anchor), focusDate = days.includes(selected) ? selected : anchor.slice(0, 8) + "01";
  function keyboard(event) {
    const date = event.currentTarget.dataset.date;
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -calendarWeekday(date), End: 6 - calendarWeekday(date) };
    let next;
    if (Object.hasOwn(moves, event.key)) next = addCalendarDays(date, moves[event.key]);else if (event.key === "PageUp" || event.key === "PageDown") next = addCalendarMonths(date, event.key === "PageUp" ? -1 : 1);else return;
    event.preventDefault();const container = event.currentTarget.closest(".cal-mini-grid");onSelect(next);requestAnimationFrame(() => container.querySelector(`[data-date="${next}"]`)?.focus());
  }
  return <div
    className="cal-mini-grid" role="group"
    aria-label="เลือกวันจากปฏิทินย่อ"
  >
    {["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map(day => <small key={day}>{day}</small>)}
    {days.map(date => <button
      type="button" key={date}
      data-outside={date.slice(0, 7) !== anchor.slice(0, 7)} data-date={date}
      aria-label={calendarLabel(date)} tabIndex={date === focusDate ? 0 : -1}
      aria-pressed={selected === date} aria-current={today === date ? "date" : undefined}
      onClick={() => onSelect(date)} onKeyDown={keyboard}
    >
      {Number(date.slice(-2))}
    </button>)}
  </div>;
}
export function DayStrip({ range, selected, today, onSelect, holidays, holidayOptions }) {
  return <nav className="cal-day-strip" aria-label="เลือกวันในสัปดาห์">
    {calendarDates(range.start, range.end).map(date => <button
      type="button" key={date}
      aria-label={calendarLabel(date)} aria-pressed={date === selected}
      aria-current={date === today ? "date" : undefined} onClick={() => onSelect(date)}
    >
      <small>{calendarLabel(date, { weekday: "short" })}</small>
      <strong>{Number(date.slice(-2))}</strong>
      {calendarHolidays(holidays, date, holidayOptions).length > 0 && <i aria-label="มีวันหยุดหรือวันสำคัญ" />}
    </button>)}
  </nav>;
}
export function CalendarTimeline({ rows, range, holidays, holidayOptions, onEvent, onHoliday, today, colorBy = "room", selectedRoom = "all" }) {
  const days = calendarDates(range.start, range.end), hourSize = 74;
  const start = Math.min(8, ...rows.map(row => Math.floor(timeMinutes(row.start) / 60))), end = Math.max(20, ...rows.map(row => Math.ceil(timeMinutes(row.end) / 60)));
  const height = (end - start) * hourSize;
  return <div
    className="cal-timeline-scroll" tabIndex={days.length > 1 ? 0 : undefined}
    role="region" aria-label={days.length > 1 ? "ตารางรายสัปดาห์ เลื่อนแนวนอนเพื่อดูทุกวัน" : "ตารางรายวัน"}
  >
    <div
      className="cal-timeline" data-single-day={days.length === 1}
      style={{ "--cal-days": days.length, "--cal-height": `${height}px`, "--cal-hour": `${hourSize}px` }}
    >
      <div className="cal-time-corner">เวลา</div>
      {days.map(date => <div
        className="cal-timeline-date" data-today={date === today}
        key={date}
      >
        <span>{calendarLabel(date, { weekday: "short" })}</span>
        <strong>{Number(date.slice(-2))}</strong>
      </div>)}
      <div className="cal-all-day">ทั้งวัน</div>
      {days.map(date => <div key={date} className="cal-day-holidays"><HolidayLabels {...{ date, holidays, holidayOptions, onHoliday }} /></div>)}
      <div className="cal-hour-labels">
        {Array.from({ length: end - start + 1 }, (_, index) => <span key={index} style={{ top: `${index * hourSize}px` }}>
          {String(start + index).padStart(2, "0")}
          :00
        </span>)}
      </div>
      {days.map(date => <div className="cal-timeline-day" key={date}>
        {layoutCalendarDay(rows.filter(row => row.date === date)).map(row => <button
          type="button" key={row.id}
          className="cal-timed-event" data-kind={row.kind} data-room-color={eventColor(row, colorBy, selectedRoom)}
          style={{ top: `${(timeMinutes(row.start) - start * 60) / 60 * hourSize}px`, height: `${Math.max(42, (timeMinutes(row.end) - timeMinutes(row.start)) / 60 * hourSize - 3)}px`, left: `calc(${row.lane / row.lanes * 100}% + 3px)`, width: `calc(${100 / row.lanes}% - 6px)` }} aria-label={`${row.title} ${calendarLabel(row.date)} ${row.start} ถึง ${row.end} ห้อง ${row.rooms.join(" + ")}`}
          onClick={() => onEvent(row)}
        >
          <RoomLabels rooms={row.rooms} />
          <strong>{row.kind === "dl" ? "สอบ DL" : row.title}</strong>
          <span>{`${row.start}–${row.end}`}</span>
        </button>)}
      </div>)}
    </div>
  </div>;
}
export function CalendarMonth({ anchor, selected, today, rows, holidays, holidayOptions, onDate, onEvent, onHoliday, colorBy = "room", selectedRoom = "all" }) {
  return <section className="cal-month" aria-label={calendarLabel(anchor, { month: "long", year: "numeric" })}>
    <div className="cal-month-grid">
      {["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map(day => <div className="cal-weekday" key={day}>{day}</div>)}
      {monthCalendarDates(anchor).map(date => {
        const events = rows.filter(row => row.date === date), dayHolidays = calendarHolidays(holidays, date, holidayOptions);
        return <div
          className="cal-month-cell" data-outside={date.slice(0, 7) !== anchor.slice(0, 7)}
          data-selected={date === selected} key={date}
        >
          <button
            type="button" className="cal-month-date"
            data-date={date}
            aria-label={`${calendarLabel(date)} ${events.length} กิจกรรม${events.length ? ` ห้อง ${[...new Set(events.flatMap(row => row.rooms))].join(", ")}` : ""}${dayHolidays.length ? " มีวันหยุดหรือวันสำคัญ" : ""}`} aria-current={today === date ? "date" : undefined}
            aria-pressed={date === selected} onClick={() => onDate(date)}
          >
            {Number(date.slice(-2))}
          </button>
          <div className="cal-month-desktop-events">
            <HolidayLabels {...{ date, holidays, holidayOptions, onHoliday }} />
            {events.slice(0, 2).map(row => <button
              type="button" className="cal-month-event"
              data-kind={row.kind} data-room-color={eventColor(row, colorBy, selectedRoom)} key={row.id}
              aria-label={`${CALENDAR_KINDS[row.kind]} ${row.title} ${row.start}–${row.end} ห้อง ${row.rooms.join(" + ")}`}
              onClick={() => onEvent(row)}
            >
              <span className="cal-month-event-meta"><RoomLabels rooms={row.rooms} />{row.start}</span>
              <strong>{row.title}</strong>
            </button>)}
            {events.length > 2 && <button
              type="button" className="cal-month-more"
              onClick={() => onDate(date)}
            >
              {`อีก ${events.length - 2} รายการ`}
            </button>}
          </div>
          <span className="cal-month-dots" aria-hidden="true">
            {colorBy === "room" ? [...new Set(events.flatMap(row => row.rooms))].map(room => <i key={room} data-room-color={CALENDAR_ROOM_COLORS[room] || "shared"} />) : [...new Set(events.map(row => row.kind))].map(kind => <i key={kind} data-kind={kind} />)}
            {dayHolidays.length > 0 && <i data-kind="holiday" />}
          </span>
        </div>;
      })}
    </div>
  </section>;
}
export function CalendarAgenda({ rows, range, holidays, holidayOptions, onEvent, onHoliday, colorBy = "room", selectedRoom = "all", emptyText = "ไม่มีตารางตรงกับตัวกรอง" }) {
  const days = calendarDates(range.start, range.end).filter(date => rows.some(row => row.date === date) || calendarHolidays(holidays, date, holidayOptions).length);
  if (!days.length) return <div className="cal-empty">
    <CalendarDays size={28} aria-hidden="true" />
    <h2>{emptyText}</h2>
    <p>เปลี่ยนวันที่ ห้อง หรือประเภทกิจกรรมได้จากแถบด้านบน</p>
  </div>;
  return <div className="cal-agenda">
    {days.map(date => <section key={date} aria-label={calendarLabel(date)}>
      <h2>{calendarLabel(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h2>
      <HolidayLabels {...{ date, holidays, holidayOptions, onHoliday }} />
      {rows.filter(row => row.date === date).map(row => <button
        type="button" className="cal-agenda-event"
        data-kind={row.kind} data-room-color={eventColor(row, colorBy, selectedRoom)} key={row.id}
        onClick={() => onEvent(row)}
      >
        <span className="cal-event-time">
          {row.start}
          <small>{row.end}</small>
        </span>
        <i aria-hidden="true" />
        <span className="cal-agenda-text">
          <strong>{row.title}</strong>
          <RoomLabels rooms={row.rooms} />
          <small>{`${CALENDAR_KINDS[row.kind]}${row.teacher ? ` · ${row.teacher}` : ""}`}</small>
        </span>
        <ChevronRight size={16} aria-hidden="true" />
      </button>)}
    </section>)}
  </div>;
}
