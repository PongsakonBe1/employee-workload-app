"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAYS_EN = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
const DAYS_TH_SHORT = ["อา","จ","อ","พ","พฤ","ศ","ส"];
const MONTHS_TH = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const MONTHS_TH_SHORT = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const DAY_LABELS_TH = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];

const HOUR_START = 7;
const HOUR_END = 19;
const HOUR_HEIGHT = 52; // px per hour

function getNowTH() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
}

function toDateStr(d) {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

function timeToMin(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// Build mini-month grid
function buildMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

const EVENT_COLORS = {
  classroom: { bg: "bg-blue-500", light: "bg-blue-50 border-blue-300", text: "text-blue-700", dot: "bg-blue-500" },
  dlExam:    { bg: "bg-orange-500", light: "bg-orange-50 border-orange-300", text: "text-orange-700", dot: "bg-orange-500" },
};

export default function iCloudCalendarStrip() {
  const [now, setNow] = useState(getNowTH());
  const [viewDate, setViewDate] = useState(getNowTH());
  const [miniMonth, setMiniMonth] = useState({ year: getNowTH().getFullYear(), month: getNowTH().getMonth() });
  const [classroomSchedules, setClassroomSchedules] = useState([]);
  const [dlExams, setDlExams] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const timelineRef = useRef(null);

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setNow(getNowTH()), 30000);
    return () => clearInterval(t);
  }, []);

  // Scroll timeline to current time on mount
  useEffect(() => {
    if (!timelineRef.current) return;
    const nowTH = getNowTH();
    const mins = nowTH.getHours() * 60 + nowTH.getMinutes();
    const offset = ((mins - HOUR_START * 60) / 60) * HOUR_HEIGHT - 40;
    timelineRef.current.scrollTop = Math.max(0, offset);
  }, [loading]);

  // Fetch users
  useEffect(() => {
    getDocs(query(collection(db, "users"))).then((snap) => {
      const m = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        m[d.id] = data.nickname || data.displayName || data.fullName || data.name || d.id;
      });
      setUsers(m);
    });
  }, []);

  // Fetch classroom schedules
  useEffect(() => {
    getDocs(query(collection(db, "classroomSchedules"), where("isActive", "==", true), orderBy("dayOfWeek"), orderBy("startTime")))
      .then((snap) => setClassroomSchedules(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, []);

  // Fetch DL exams (week range)
  useEffect(() => {
    const nowTH = getNowTH();
    const weekStart = new Date(nowTH);
    weekStart.setDate(nowTH.getDate() - nowTH.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    getDocs(query(
      collection(db, "dlExamSchedules"),
      where("isActive", "==", true),
      where("date", ">=", toDateStr(weekStart)),
      where("date", "<=", toDateStr(weekEnd)),
      orderBy("date"), orderBy("timeSlot")
    )).then((snap) => {
      setDlExams(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const todayTH = useMemo(() => getNowTH(), []);
  const todayStr = toDateStr(todayTH);
  const viewStr = toDateStr(viewDate);
  const viewDow = DAYS_EN[viewDate.getDay()];
  const isToday = viewStr === todayStr;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowOffset = ((nowMinutes - HOUR_START * 60) / 60) * HOUR_HEIGHT;

  // Events for viewDate
  const events = useMemo(() => {
    const list = [];
    classroomSchedules.forEach((s) => {
      if (s.dayOfWeek === viewDow) {
        list.push({
          id: s.id, type: "classroom",
          room: s.room,
          subject: s.subject || s.courseName || "ตารางเรียน",
          teacher: s.teacher || "",
          startTime: s.startTime, endTime: s.endTime,
          startMin: timeToMin(s.startTime), endMin: timeToMin(s.endTime),
        });
      }
    });
    dlExams.forEach((e) => {
      if (e.date !== viewStr) return;
      const slotMap = { morning: { s:"09:00", e:"10:30" }, afternoon: { s:"13:00", e:"14:30" }, fullday: { s:"09:00", e:"14:30" } };
      const slot = slotMap[e.timeSlot] || slotMap.morning;
      const rooms = (e.locations || []).map((l) => l.replace("ห้อง ", "").trim());
      const proctors = (e.proctors || []).map((p) => {
        const id = typeof p === "string" ? p : p?.id || p?.userId;
        return users[id] || (typeof p === "object" ? p?.name : p) || "";
      }).filter(Boolean);
      rooms.forEach((room) => {
        list.push({
          id: `${e.id}-${room}`, type: "dlExam", room,
          subject: e.subject || `สอบ DL (${e.examType === "staff" ? "บุคลากร" : "นศ."})`,
          teacher: proctors.slice(0, 2).join(", "),
          startTime: slot.s, endTime: slot.e,
          startMin: timeToMin(slot.s), endMin: timeToMin(slot.e),
        });
      });
    });
    return list.sort((a, b) => a.startMin - b.startMin);
  }, [classroomSchedules, dlExams, viewDow, viewStr, users]);

  // Mini month grid
  const monthGrid = useMemo(() => buildMonthGrid(miniMonth.year, miniMonth.month), [miniMonth]);

  const goToday = () => { const n = getNowTH(); setViewDate(n); setMiniMonth({ year: n.getFullYear(), month: n.getMonth() }); };
  const prevDay = () => { const d = new Date(viewDate); d.setDate(d.getDate() - 1); setViewDate(d); setMiniMonth({ year: d.getFullYear(), month: d.getMonth() }); };
  const nextDay = () => { const d = new Date(viewDate); d.setDate(d.getDate() + 1); setViewDate(d); setMiniMonth({ year: d.getFullYear(), month: d.getMonth() }); };

  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

  return (
    <div className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden select-none">
      {/* ── Top Bar: Day number + nav + month mini ── */}
      <div className="flex gap-0">

        {/* ── Left: Day Header + Timeline ── */}
        <div className="flex-1 min-w-0">

          {/* Header */}
          <div className="flex items-end justify-between px-4 pt-4 pb-2 border-b border-slate-100">
            <div className="flex items-end gap-3">
              <span className={`text-5xl font-thin leading-none ${isToday ? "text-red-500" : "text-slate-800"}`}>
                {viewDate.getDate()}
              </span>
              <div className="pb-0.5">
                <p className={`text-sm font-semibold leading-tight ${isToday ? "text-red-500" : "text-slate-600"}`}>
                  {DAY_LABELS_TH[viewDate.getDay()]}
                </p>
                <p className="text-xs text-slate-400">
                  {MONTHS_TH[viewDate.getMonth()]} {viewDate.getFullYear() + 543}
                </p>
              </div>
            </div>

            {/* Nav */}
            <div className="flex items-center gap-1 pb-1">
              <button onClick={prevDay} className="p-1.5 rounded-xl hover:bg-slate-100 transition text-slate-500">
                <ChevronLeft size={14} />
              </button>
              <button onClick={goToday} className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-xl transition">
                Today
              </button>
              <button onClick={nextDay} className="p-1.5 rounded-xl hover:bg-slate-100 transition text-slate-500">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div ref={timelineRef} className="relative overflow-y-auto" style={{ height: `${HOUR_HEIGHT * 7}px` }}>
            <div className="relative" style={{ height: `${HOUR_HEIGHT * (HOUR_END - HOUR_START)}px` }}>

              {/* Hour lines */}
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 flex items-start"
                  style={{ top: `${(h - HOUR_START) * HOUR_HEIGHT}px` }}
                >
                  <span className="w-12 text-right pr-2 text-[10px] text-slate-400 leading-none -mt-[6px] shrink-0">
                    {h < 12 ? `${h} am` : h === 12 ? "noon" : `${h - 12} pm`}
                  </span>
                  <div className="flex-1 border-t border-slate-100 mt-0" />
                </div>
              ))}

              {/* Now line */}
              {isToday && nowOffset >= 0 && nowOffset <= HOUR_HEIGHT * (HOUR_END - HOUR_START) && (
                <div
                  className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                  style={{ top: `${nowOffset}px` }}
                >
                  <span className="w-12 text-right pr-1.5 text-[10px] font-semibold text-red-500 shrink-0 -mt-[6px]">
                    {String(now.getHours()).padStart(2,"0")}:{String(now.getMinutes()).padStart(2,"0")}
                  </span>
                  <div className="flex-1 flex items-center">
                    <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shrink-0" />
                    <div className="flex-1 border-t-2 border-red-500" />
                  </div>
                </div>
              )}

              {/* Event Blocks */}
              {events.map((ev) => {
                const topMin = Math.max(ev.startMin, HOUR_START * 60);
                const botMin = Math.min(ev.endMin, HOUR_END * 60);
                if (botMin <= topMin) return null;
                const top = ((topMin - HOUR_START * 60) / 60) * HOUR_HEIGHT;
                const height = Math.max(((botMin - topMin) / 60) * HOUR_HEIGHT, 22);
                const c = EVENT_COLORS[ev.type] || EVENT_COLORS.classroom;
                const isActive = isToday && nowMinutes >= ev.startMin && nowMinutes < ev.endMin;

                return (
                  <div
                    key={ev.id}
                    className={`absolute left-12 right-2 rounded-lg border px-2 py-1 overflow-hidden z-10 ${c.light} ${isActive ? "ring-1 ring-offset-0 ring-blue-400" : ""}`}
                    style={{ top: `${top + 1}px`, height: `${height - 2}px` }}
                  >
                    <p className={`text-[10px] font-bold truncate leading-tight ${c.text}`}>
                      ห้อง {ev.room} {ev.type === "dlExam" ? "· DL" : ""}
                    </p>
                    <p className="text-[10px] text-slate-600 truncate leading-tight">{ev.subject}</p>
                    {height > 34 && ev.teacher && (
                      <p className="text-[9px] text-slate-400 truncate">{ev.teacher}</p>
                    )}
                  </div>
                );
              })}

              {/* No events */}
              {!loading && events.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-xs text-slate-300">ไม่มีกิจกรรมวันนี้</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Mini Month Calendar ── */}
        <div className="w-36 shrink-0 border-l border-slate-100 pt-3 px-2 pb-2">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <button
              onClick={() => setMiniMonth(p => { const d = new Date(p.year, p.month - 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
              className="p-0.5 rounded hover:bg-slate-100 text-slate-400"
            >
              <ChevronLeft size={11} />
            </button>
            <span className="text-[10px] font-semibold text-slate-600">
              {MONTHS_TH_SHORT[miniMonth.month]} {miniMonth.year + 543}
            </span>
            <button
              onClick={() => setMiniMonth(p => { const d = new Date(p.year, p.month + 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
              className="p-0.5 rounded hover:bg-slate-100 text-slate-400"
            >
              <ChevronRight size={11} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-0.5">
            {DAYS_TH_SHORT.map((d, i) => (
              <div key={i} className={`text-center text-[9px] font-medium pb-0.5 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-slate-400"}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Date cells */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {monthGrid.map((day, i) => {
              if (!day) return <div key={i} />;
              const cellDate = new Date(miniMonth.year, miniMonth.month, day);
              const cellStr = toDateStr(cellDate);
              const isT = cellStr === todayStr;
              const isV = cellStr === viewStr;
              const isSun = cellDate.getDay() === 0;
              const isSat = cellDate.getDay() === 6;
              const hasEv = dlExams.some(e => e.date === cellStr) ||
                classroomSchedules.some(s => s.dayOfWeek === DAYS_EN[cellDate.getDay()]);

              return (
                <button
                  key={i}
                  onClick={() => { setViewDate(cellDate); }}
                  className={`relative flex flex-col items-center justify-center rounded-full aspect-square text-[10px] font-medium transition
                    ${isT ? "bg-red-500 text-white" :
                      isV ? "bg-slate-800 text-white" :
                      isSun ? "text-red-400 hover:bg-red-50" :
                      isSat ? "text-blue-400 hover:bg-blue-50" :
                      "text-slate-700 hover:bg-slate-100"
                    }`}
                >
                  {day}
                  {hasEv && !isT && !isV && (
                    <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-blue-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Event count for viewed day */}
          <div className="mt-2 pt-2 border-t border-slate-100">
            <p className="text-[9px] text-slate-400 text-center">
              {events.length > 0 ? `${events.length} กิจกรรม` : "ไม่มีกิจกรรม"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
