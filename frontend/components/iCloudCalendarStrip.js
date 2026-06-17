"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { ChevronLeft, ChevronRight, MapPin, User, Clock } from "lucide-react";

const DAYS_EN = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
const MONTHS_TH = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const DAY_LABELS_TH = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];

const HOUR_START = 7;
const HOUR_END = 22;
const HOUR_HEIGHT = 68; // px per hour

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
  "401": { bar: "bg-blue-500",    pill: "bg-blue-50 text-blue-700 border-blue-200",     dot: "bg-blue-500",    cardBg: "bg-blue-50/80",    cardBorder: "border-blue-200",    cardText: "text-blue-900",    cardSub: "text-blue-700"    },
  "402": { bar: "bg-violet-500",  pill: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500",  cardBg: "bg-violet-50/80",  cardBorder: "border-violet-200",  cardText: "text-violet-900",  cardSub: "text-violet-700"  },
  "406": { bar: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 border-emerald-200",dot: "bg-emerald-500",cardBg: "bg-emerald-50/80",cardBorder: "border-emerald-200",cardText: "text-emerald-900",cardSub: "text-emerald-700" },
  "407": { bar: "bg-sky-500",     pill: "bg-sky-50 text-sky-700 border-sky-200",         dot: "bg-sky-500",    cardBg: "bg-sky-50/80",     cardBorder: "border-sky-200",     cardText: "text-sky-900",     cardSub: "text-sky-700"     },
  default:{ bar: "bg-slate-400",  pill: "bg-slate-50 text-slate-600 border-slate-200",   dot: "bg-slate-400",  cardBg: "bg-slate-50/80",   cardBorder: "border-slate-200",   cardText: "text-slate-800",   cardSub: "text-slate-600"   },
};

const TYPE_STYLE = {
  classroom: { blockBg: "bg-blue-50 border-l-blue-400", label: "เรียน",   labelCls: "bg-blue-100 text-blue-700"   },
  dlExam:    { blockBg: "bg-orange-50 border-l-orange-400", label: "DL",  labelCls: "bg-orange-100 text-orange-700"},
};

const TIME_COL_W = 56; // px — width of the hour label column
const MIN_LANE_W = 160; // px — minimum width per lane when multiple lanes

export default function ICloudCalendarStrip({ showCompactCards = true }) {
  const [now, setNow] = useState(getNowTH());
  const [viewDate, setViewDate] = useState(getNowTH());
  const [classroomSchedules, setClassroomSchedules] = useState([]);
  const [dlExams, setDlExams] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [containerW, setContainerW] = useState(0);
  const timelineRef = useRef(null);
  const wrapperRef = useRef(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const dragStartScrollTop = useRef(0);
  const dragStartScrollLeft = useRef(0);

  // Measure container width responsively
  useEffect(() => {
    if (!wrapperRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerW(entry.contentRect.width);
    });
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

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
        teacher: proctors.join(", "),
        startTime: slot.s, endTime: slot.e,
        startMin: timeToMin(slot.s), endMin: timeToMin(slot.e),
      }));
    });
    return list.sort((a,b) => a.startMin - b.startMin);
  }, [classroomSchedules, dlExams, viewDow, viewStr, users]);

  const active   = events.filter(e => isToday && nowMin >= e.startMin && nowMin < e.endMin);
  const upcoming = events.filter(e => nowMin < e.startMin || !isToday);
  const hours    = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

  // Compute max concurrent lanes for minWidth of inner timeline div
  const maxConcurrentLanes = useMemo(() => {
    if (events.length === 0) return 1;
    const laneMap = [];
    const evWithLane = events.map((ev) => {
      let lane = 0;
      while (laneMap.some((e) => e.lane === lane && e.endMin > ev.startMin && e.startMin < ev.endMin)) lane++;
      laneMap.push({ ...ev, lane });
      return { ...ev, lane };
    });
    return Math.max(...evWithLane.map((ev) =>
      Math.max(...evWithLane.filter((e) => e.endMin > ev.startMin && e.startMin < ev.endMin).map((e) => e.lane)) + 1
    ));
  }, [events]);

  const prevDay  = () => { const d = new Date(viewDate); d.setDate(d.getDate()-1); setViewDate(d); };
  const nextDay  = () => { const d = new Date(viewDate); d.setDate(d.getDate()+1); setViewDate(d); };
  const goToday  = () => setViewDate(getNowTH());

  return (
    <div className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden select-none dark:bg-slate-800 dark:border-slate-700">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-end gap-3">
          <span className={`text-4xl font-semibold leading-none tabular-nums ${isToday ? "text-red-500" : "text-slate-800 dark:text-slate-100"}`}>
            {viewDate.getDate()}
          </span>
          <div className="pb-0.5 leading-tight">
            <p className={`text-base font-semibold ${isToday ? "text-red-500" : "text-slate-700 dark:text-slate-200"}`}>
              {DAY_LABELS_TH[viewDate.getDay()]}
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500">
              {MONTHS_TH[viewDate.getMonth()]} {viewDate.getFullYear() + 543}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevDay} className="p-2 rounded-xl hover:bg-slate-100 active:bg-slate-200 transition text-slate-500 dark:hover:bg-slate-700 dark:text-slate-400">
            <ChevronLeft size={16} />
          </button>
          <button onClick={goToday} className="px-3 py-1.5 text-sm font-semibold text-red-500 hover:bg-red-50 active:bg-red-100 rounded-xl transition dark:hover:bg-red-950/40">
            วันนี้
          </button>
          <button onClick={nextDay} className="p-2 rounded-xl hover:bg-slate-100 active:bg-slate-200 transition text-slate-500 dark:hover:bg-slate-700 dark:text-slate-400">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div ref={wrapperRef} className="relative">
      <div
        ref={timelineRef}
        className="relative overflow-auto bg-white dark:bg-slate-800 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden cursor-grab active:cursor-grabbing"
        style={{ height: `${HOUR_HEIGHT * 7}px` }}
        onMouseDown={(e) => {
          isDragging.current = true;
          dragStartX.current = e.clientX;
          dragStartY.current = e.clientY;
          dragStartScrollTop.current = timelineRef.current.scrollTop;
          dragStartScrollLeft.current = timelineRef.current.scrollLeft;
          e.preventDefault();
        }}
        onMouseMove={(e) => {
          if (!isDragging.current) return;
          timelineRef.current.scrollTop  = dragStartScrollTop.current  - (e.clientY - dragStartY.current);
          timelineRef.current.scrollLeft = dragStartScrollLeft.current - (e.clientX - dragStartX.current);
        }}
        onMouseUp={() => { isDragging.current = false; }}
        onMouseLeave={() => { isDragging.current = false; }}
        onTouchStart={(e) => {
          isDragging.current = true;
          dragStartX.current = e.touches[0].clientX;
          dragStartY.current = e.touches[0].clientY;
          dragStartScrollTop.current  = timelineRef.current.scrollTop;
          dragStartScrollLeft.current = timelineRef.current.scrollLeft;
        }}
        onTouchMove={(e) => {
          if (!isDragging.current) return;
          timelineRef.current.scrollTop  = dragStartScrollTop.current  - (e.touches[0].clientY - dragStartY.current);
          timelineRef.current.scrollLeft = dragStartScrollLeft.current - (e.touches[0].clientX - dragStartX.current);
          e.preventDefault();
        }}
        onTouchEnd={() => { isDragging.current = false; }}
      >
        <div className="relative" style={{
            height: `${HOUR_HEIGHT * (HOUR_END - HOUR_START)}px`,
            minWidth: `${maxConcurrentLanes === 1
              ? (containerW || 320) - TIME_COL_W
              : maxConcurrentLanes * Math.max(((containerW || 320) - TIME_COL_W) / maxConcurrentLanes, MIN_LANE_W)
            }px`,
          }}>

          {/* Hour grid lines */}
          {hours.map((h) => (
            <div key={h} className="absolute left-0 right-0 flex items-center"
              style={{ top: `${(h - HOUR_START) * HOUR_HEIGHT}px` }}>
              <span className="w-14 pl-3 text-xs text-slate-400 dark:text-slate-600 shrink-0 -mt-2.5 font-medium">
                {h < 12 ? `${h}:00` : h === 12 ? "12:00" : `${h}:00`}
              </span>
              <div className="flex-1 border-t border-slate-100 dark:border-slate-700" />
            </div>
          ))}

          {/* Half-hour subtle lines */}
          {hours.map((h) => (
            <div key={`h${h}`} className="absolute left-14 right-0 border-t border-slate-50 dark:border-slate-700/50"
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
            const availW = (containerW || 320) - TIME_COL_W;
            // Assign lanes to overlapping events
            const laneMap = [];
            const evWithLane = events.map((ev) => {
              let lane = 0;
              while (laneMap.some((e) => e.lane === lane && e.endMin > ev.startMin && e.startMin < ev.endMin)) lane++;
              laneMap.push({ ...ev, lane });
              return { ...ev, lane };
            });
            return evWithLane.map((ev) => {
              const topMin = Math.max(ev.startMin, HOUR_START * 60);
              const botMin = Math.min(ev.endMin,   HOUR_END   * 60);
              if (botMin <= topMin) return null;
              const top    = ((topMin - HOUR_START * 60) / 60) * HOUR_HEIGHT;
              const height = Math.max(((botMin - topMin) / 60) * HOUR_HEIGHT - 3, 24);
              const c      = ROOM_ACCENT[ev.room] || ROOM_ACCENT.default;
              const ts     = TYPE_STYLE[ev.type]  || TYPE_STYLE.classroom;
              const isAct  = isToday && nowMin >= ev.startMin && nowMin < ev.endMin;
              // Responsive lane width: 1 lane = fill container, multiple = MIN_LANE_W each (scroll)
              const totalLanes = Math.max(...evWithLane
                .filter((e) => e.endMin > ev.startMin && e.startMin < ev.endMin)
                .map((e) => e.lane)) + 1;
              const LANE_WIDTH = totalLanes === 1 ? availW : Math.max(availW / totalLanes, MIN_LANE_W);
              const laneLeft   = ev.lane * LANE_WIDTH;

              // Dynamic subject font size based on available height
              const subjectSize = height >= 90 ? "text-sm" : height >= 64 ? "text-xs" : "text-[11px]";
              const subjectLines = height >= 90 ? "line-clamp-3" : "line-clamp-2";

              return (
                <div key={ev.id}
                  className={`absolute rounded-2xl border overflow-hidden z-10 ${c.cardBorder} ${isAct ? "shadow-md ring-1 ring-inset " + c.bar.replace("bg-","ring-") : "shadow-sm"}`}
                  style={{ top: `${top + 2}px`, height: `${height}px`, left: `calc(3.5rem + ${laneLeft}px + 4px)`, width: `${LANE_WIDTH - 8}px` }}>
                  {/* Left accent bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${c.bar}`} />
                  <div className={`pl-3.5 pr-2 py-2 h-full flex flex-col justify-center gap-0.5 ${c.cardBg} overflow-hidden`}>
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${c.pill}`}>
                        ห้อง {ev.room}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${ts.labelCls}`}>
                        {ts.label}
                      </span>
                      {isAct && (
                        <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${c.cardSub}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${c.bar} animate-pulse`} />กำลังใช้งาน
                        </span>
                      )}
                    </div>
                    <p className={`${subjectSize} font-bold ${c.cardText} leading-snug ${subjectLines}`}>{ev.subject}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0">
                      <span className={`flex items-center gap-1 text-[11px] ${c.cardSub} whitespace-nowrap`}>
                        <Clock size={9} className="shrink-0" />
                        {ev.startTime}–{ev.endTime}
                      </span>
                      {ev.teacher && (
                        <span className={`flex items-center gap-1 text-[11px] ${c.cardSub} min-w-0`}>
                          <User size={9} className="shrink-0" />
                          <span className="truncate">{ev.teacher}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            });
          })()}

          {/* Empty state */}
          {!loading && events.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <Clock size={18} className="text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">ไม่มีกิจกรรมวันนี้</p>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* ── Compact Detail Cards ── */}
      {showCompactCards && events.length > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/30">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
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
                  className={`flex items-center gap-3 p-2.5 rounded-2xl border bg-white dark:bg-slate-800 dark:border-slate-700 transition ${isPast ? "opacity-40" : ""}`}>
                  <div className={`w-1 self-stretch rounded-full ${c.bar}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${c.pill}`}>ห้อง {ev.room}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${ts.labelCls}`}>{ts.label}</span>
                      <span className="text-xs text-slate-500 font-medium">{ev.startTime}–{ev.endTime}</span>
                      {isAct && <span className="text-xs font-semibold text-blue-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />ดำเนินอยู่</span>}
                    </div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5 truncate">{ev.subject}</p>
                    {ev.teacher && <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5"><User size={10}/>{ev.teacher}</p>}
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
