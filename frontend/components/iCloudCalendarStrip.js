"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { ChevronLeft, ChevronRight, MapPin, User, Clock } from "lucide-react";

const DAYS_EN = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
const MONTHS_TH = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
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

const ROOM_ACCENT = {
  "401": { bar: "bg-blue-500",   pill: "bg-blue-50 text-blue-700 border-blue-200",   dot: "bg-blue-500"   },
  "402": { bar: "bg-violet-500", pill: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" },
  "406": { bar: "bg-emerald-500",pill: "bg-emerald-50 text-emerald-700 border-emerald-200",dot: "bg-emerald-500"},
  "407": { bar: "bg-sky-500",    pill: "bg-sky-50 text-sky-700 border-sky-200",    dot: "bg-sky-500"    },
  default:{ bar: "bg-slate-400", pill: "bg-slate-50 text-slate-600 border-slate-200", dot: "bg-slate-400"  },
};

const TYPE_STYLE = {
  classroom: { blockBg: "bg-blue-50 border-l-blue-400", label: "เรียน",   labelCls: "bg-blue-100 text-blue-700"   },
  dlExam:    { blockBg: "bg-orange-50 border-l-orange-400", label: "DL",  labelCls: "bg-orange-100 text-orange-700"},
};

export default function ICloudCalendarStrip({ showCompactCards = true }) {
  const [now, setNow] = useState(getNowTH());
  const [viewDate, setViewDate] = useState(getNowTH());
  const [classroomSchedules, setClassroomSchedules] = useState([]);
  const [dlExams, setDlExams] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const timelineRef = useRef(null);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartScrollTop = useRef(0);

  // Clock tick every 30s
  useEffect(() => {
    const t = setInterval(() => setNow(getNowTH()), 30000);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll to now on load
  useEffect(() => {
    if (!timelineRef.current || loading) return;
    const mins = getNowTH().getHours() * 60 + getNowTH().getMinutes();
    const offset = ((mins - HOUR_START * 60) / 60) * HOUR_HEIGHT - 60;
    timelineRef.current.scrollTop = Math.max(0, offset);
  }, [loading]);

  // Fetch users
  useEffect(() => {
    getDocs(query(collection(db, "users"))).then((snap) => {
      const m = {};
      snap.docs.forEach((d) => {
        const u = d.data();
        m[d.id] = u.displayName || u.nickname || u.fullName || u.name || d.id;
      });
      setUsers(m);
    });
  }, []);

  // Fetch classroom schedules
  useEffect(() => {
    getDocs(query(collection(db, "classroomSchedules"), where("isActive", "==", true), orderBy("dayOfWeek"), orderBy("startTime")))
      .then((snap) => setClassroomSchedules(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, []);

  // Fetch DL exams for current week
  useEffect(() => {
    const nowTH = getNowTH();
    const weekStart = new Date(nowTH); weekStart.setDate(nowTH.getDate() - nowTH.getDay());
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
    getDocs(query(
      collection(db, "dlExamSchedules"),
      where("isActive", "==", true),
      where("date", ">=", toDateStr(weekStart)),
      where("date", "<=", toDateStr(weekEnd)),
      orderBy("date"), orderBy("timeSlot")
    )).then((snap) => { setDlExams(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const todayStr = toDateStr(getNowTH());
  const viewStr  = toDateStr(viewDate);
  const viewDow  = DAYS_EN[viewDate.getDay()];
  const isToday  = viewStr === todayStr;
  const nowMin   = now.getHours() * 60 + now.getMinutes();
  const nowOffset = ((nowMin - HOUR_START * 60) / 60) * HOUR_HEIGHT;
  const nowTimeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;

  // Build event list
  const events = useMemo(() => {
    const list = [];
    classroomSchedules.forEach((s) => {
      if (s.dayOfWeek !== viewDow) return;
      list.push({ id: s.id, type: "classroom", room: s.room,
        subject: s.subject || "ตารางเรียน", teacher: s.teacher || "",
        startTime: s.startTime, endTime: s.endTime,
        startMin: timeToMin(s.startTime), endMin: timeToMin(s.endTime) });
    });
    dlExams.forEach((e) => {
      if (e.date !== viewStr) return;
      const slotMap = { morning:{s:"09:00",e:"10:30"}, afternoon:{s:"13:00",e:"14:30"}, fullday:{s:"09:00",e:"14:30"} };
      const slot = slotMap[e.timeSlot] || slotMap.morning;
      const rooms = (e.locations || []).map((l) => l.replace("ห้อง ","").trim());
      const proctors = (e.proctors || []).map((p) => {
        const id = typeof p === "string" ? p : p?.id || p?.userId;
        return users[id] || (typeof p === "object" ? p?.name : p) || "";
      }).filter(Boolean);
      rooms.forEach((room) => list.push({
        id: `${e.id}-${room}`, type: "dlExam", room,
        subject: e.subject || `คุมสอบ DL (${e.examType === "staff" ? "บุคลากร" : "นศ."})`,
        teacher: proctors.slice(0,2).join(", "),
        startTime: slot.s, endTime: slot.e,
        startMin: timeToMin(slot.s), endMin: timeToMin(slot.e),
      }));
    });
    return list.sort((a,b) => a.startMin - b.startMin);
  }, [classroomSchedules, dlExams, viewDow, viewStr, users]);

  const active   = events.filter(e => isToday && nowMin >= e.startMin && nowMin < e.endMin);
  const upcoming = events.filter(e => nowMin < e.startMin || !isToday);
  const hours    = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

  const prevDay  = () => { const d = new Date(viewDate); d.setDate(d.getDate()-1); setViewDate(d); };
  const nextDay  = () => { const d = new Date(viewDate); d.setDate(d.getDate()+1); setViewDate(d); };
  const goToday  = () => setViewDate(getNowTH());

  return (
    <div className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden select-none">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-end gap-3">
          <span className={`text-4xl font-semibold leading-none tabular-nums ${isToday ? "text-red-600" : "text-slate-800"}`}>
            {viewDate.getDate()}
          </span>
          <div className="pb-0.5 leading-tight">
            <p className={`text-base font-semibold ${isToday ? "text-red-600" : "text-slate-700"}`}>
              {DAY_LABELS_TH[viewDate.getDay()]}
            </p>
            <p className="text-sm text-slate-400">
              {MONTHS_TH[viewDate.getMonth()]} {viewDate.getFullYear() + 543}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevDay} className="p-2 rounded-xl hover:bg-slate-100 active:bg-slate-200 transition text-slate-500">
            <ChevronLeft size={16} />
          </button>
          <button onClick={goToday} className="px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 active:bg-red-100 rounded-xl transition">
            วันนี้
          </button>
          <button onClick={nextDay} className="p-2 rounded-xl hover:bg-slate-100 active:bg-slate-200 transition text-slate-500">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div
        ref={timelineRef}
        className="relative overflow-y-auto bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden cursor-grab active:cursor-grabbing"
        style={{ height: `${HOUR_HEIGHT * 7}px` }}
        onMouseDown={(e) => {
          isDragging.current = true;
          dragStartY.current = e.clientY;
          dragStartScrollTop.current = timelineRef.current.scrollTop;
          e.preventDefault();
        }}
        onMouseMove={(e) => {
          if (!isDragging.current) return;
          const delta = e.clientY - dragStartY.current;
          timelineRef.current.scrollTop = dragStartScrollTop.current - delta;
        }}
        onMouseUp={() => { isDragging.current = false; }}
        onMouseLeave={() => { isDragging.current = false; }}
        onTouchStart={(e) => {
          isDragging.current = true;
          dragStartY.current = e.touches[0].clientY;
          dragStartScrollTop.current = timelineRef.current.scrollTop;
        }}
        onTouchMove={(e) => {
          if (!isDragging.current) return;
          const delta = e.touches[0].clientY - dragStartY.current;
          timelineRef.current.scrollTop = dragStartScrollTop.current - delta;
          e.preventDefault();
        }}
        onTouchEnd={() => { isDragging.current = false; }}
      >
        <div className="relative" style={{ height: `${HOUR_HEIGHT * (HOUR_END - HOUR_START)}px` }}>

          {/* Hour grid lines */}
          {hours.map((h) => (
            <div key={h} className="absolute left-0 right-0 flex items-center"
              style={{ top: `${(h - HOUR_START) * HOUR_HEIGHT}px` }}>
              <span className="w-14 pl-3 text-xs text-slate-400 shrink-0 -mt-2.5 font-medium">
                {h < 12 ? `${h}:00` : h === 12 ? "12:00" : `${h}:00`}
              </span>
              <div className="flex-1 border-t border-slate-100" />
            </div>
          ))}

          {/* Half-hour subtle lines */}
          {hours.map((h) => (
            <div key={`h${h}`} className="absolute left-14 right-0 border-t border-slate-50"
              style={{ top: `${(h - HOUR_START) * HOUR_HEIGHT + HOUR_HEIGHT / 2}px` }} />
          ))}

          {/* Now line — only on today */}
          {isToday && nowOffset >= 0 && nowOffset <= HOUR_HEIGHT * (HOUR_END - HOUR_START) && (
            <div className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
              style={{ top: `${nowOffset}px` }}>
              <span className="w-14 pl-3 text-xs font-bold text-red-500 shrink-0 -mt-2.5">{nowTimeStr}</span>
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 -ml-1" />
              <div className="flex-1 border-t-2 border-red-500" />
            </div>
          )}

          {/* Event blocks — with collision lane layout */}
          {(() => {
            // Assign lanes to overlapping events
            const laneMap = [];
            const evWithLane = events.map((ev) => {
              let lane = 0;
              while (laneMap.some((e) => e.lane === lane && e.endMin > ev.startMin && e.startMin < ev.endMin)) lane++;
              laneMap.push({ ...ev, lane });
              return { ...ev, lane };
            });
            // Count max lanes per event (how many overlap)
            return evWithLane.map((ev) => {
            const topMin = Math.max(ev.startMin, HOUR_START * 60);
            const botMin = Math.min(ev.endMin,   HOUR_END   * 60);
            if (botMin <= topMin) return null;
            const top    = ((topMin - HOUR_START * 60) / 60) * HOUR_HEIGHT;
            const height = Math.max(((botMin - topMin) / 60) * HOUR_HEIGHT - 3, 24);
            const c      = ROOM_ACCENT[ev.room] || ROOM_ACCENT.default;
            const ts     = TYPE_STYLE[ev.type]  || TYPE_STYLE.classroom;
            const isAct  = isToday && nowMin >= ev.startMin && nowMin < ev.endMin;
            // Find total lanes for this time slot
            const totalLanes = Math.max(...evWithLane
              .filter((e) => e.endMin > ev.startMin && e.startMin < ev.endMin)
              .map((e) => e.lane)) + 1;
            const laneWidth = `${100 / totalLanes}%`;
            const laneLeft  = `${(ev.lane / totalLanes) * 100}%`;

            return (
              <div key={ev.id}
                className={`absolute rounded-2xl border overflow-hidden z-10 ${isAct ? "shadow-md" : "shadow-sm"}`}
                style={{ top: `${top + 2}px`, height: `${height}px`, left: `calc(3.5rem + ${laneLeft})`, width: `calc(${laneWidth} - 0.75rem)` }}>
                {/* Left accent bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${c.bar}`} />
                <div className="pl-3 pr-2 py-1.5 h-full flex flex-col justify-center bg-white/95">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${c.pill}`}>
                      ห้อง {ev.room}
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${ts.labelCls}`}>
                      {ts.label}
                    </span>
                    {isAct && (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-blue-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />กำลังใช้งาน
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-slate-800 leading-tight truncate">{ev.subject}</p>
                  {height > 52 && (
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock size={10} className="shrink-0" />
                        {ev.startTime}–{ev.endTime}
                      </span>
                      {ev.teacher && (
                        <span className="flex items-center gap-1 text-xs text-slate-500 truncate">
                          <User size={10} className="shrink-0" />
                          {ev.teacher}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          });
          })()}

          {/* Empty state */}
          {!loading && events.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <Clock size={18} className="text-slate-400" />
              </div>
              <p className="text-sm text-slate-400 font-medium">ไม่มีกิจกรรมวันนี้</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Compact Detail Cards ── */}
      {showCompactCards && events.length > 0 && (
        <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            {events.length} กิจกรรม{isToday ? "วันนี้" : `  ${viewDate.getDate()} ${MONTHS_TH[viewDate.getMonth()]}`}
          </p>
          <div className="space-y-1.5">
            {events.map((ev) => {
              const c     = ROOM_ACCENT[ev.room] || ROOM_ACCENT.default;
              const ts    = TYPE_STYLE[ev.type]  || TYPE_STYLE.classroom;
              const isAct = isToday && nowMin >= ev.startMin && nowMin < ev.endMin;
              const isPast= isToday && nowMin >= ev.endMin;
              return (
                <div key={ev.id}
                  className={`flex items-center gap-3 p-2.5 rounded-2xl border bg-white transition ${isPast ? "opacity-40" : ""}`}>
                  <div className={`w-1 self-stretch rounded-full ${c.bar}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${c.pill}`}>ห้อง {ev.room}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${ts.labelCls}`}>{ts.label}</span>
                      <span className="text-xs text-slate-500 font-medium">{ev.startTime}–{ev.endTime}</span>
                      {isAct && <span className="text-xs font-semibold text-blue-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />ดำเนินอยู่</span>}
                    </div>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">{ev.subject}</p>
                    {ev.teacher && <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5"><User size={10}/>{ev.teacher}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
