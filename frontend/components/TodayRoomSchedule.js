"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { Calendar, Clock, MapPin, ChevronRight, BookOpen, Users, Dot } from "lucide-react";

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const ROOM_COLORS = {
  "401": { bg: "bg-blue-500", light: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-500" },
  "402": { bg: "bg-violet-500", light: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", dot: "bg-violet-500" },
  "406": { bg: "bg-emerald-500", light: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  "407": { bg: "bg-sky-500", light: "bg-sky-50", border: "border-sky-200", text: "text-sky-700", dot: "bg-sky-500" },
  "default": { bg: "bg-slate-500", light: "bg-slate-50", border: "border-slate-200", text: "text-slate-700", dot: "bg-slate-400" },
};

function getNow() {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
}

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatThaiDate(d) {
  const THAI_DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
  const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return `วัน${THAI_DAYS[d.getDay()]}ที่ ${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export default function TodayRoomSchedule() {
  const [classroomSchedules, setClassroomSchedules] = useState([]);
  const [dlExams, setDlExams] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(getNow());

  // Clock tick every minute
  useEffect(() => {
    const tick = setInterval(() => setNow(getNow()), 60000);
    return () => clearInterval(tick);
  }, []);

  // Fetch users
  useEffect(() => {
    getDocs(query(collection(db, "users"))).then((snap) => {
      const m = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        m[d.id] = data.nickname || data.displayName || data.fullName || data.name || data.email || d.id;
      });
      setUsers(m);
    }).catch(() => {});
  }, []);

  // Fetch classroom schedules
  useEffect(() => {
    getDocs(
      query(collection(db, "classroomSchedules"), where("isActive", "==", true), orderBy("dayOfWeek"), orderBy("startTime"))
    ).then((snap) => {
      setClassroomSchedules(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }).catch(() => {});
  }, []);

  // Fetch DL Exam schedules for today
  useEffect(() => {
    const todayStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
    getDocs(
      query(
        collection(db, "dlExamSchedules"),
        where("isActive", "==", true),
        where("date", "==", todayStr),
        orderBy("timeSlot")
      )
    ).then((snap) => {
      setDlExams(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const todayStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
  const dayOfWeek = DAYS[now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const events = useMemo(() => {
    const list = [];

    // Classroom schedules (recurring by day-of-week)
    classroomSchedules.forEach((s) => {
      if (s.dayOfWeek === dayOfWeek) {
        list.push({
          id: s.id,
          type: "classroom",
          room: s.room,
          subject: s.subject || s.courseName || "ตารางเรียน",
          teacher: s.teacher || s.instructorName || "",
          startTime: s.startTime,
          endTime: s.endTime,
          startMin: timeToMinutes(s.startTime),
          endMin: timeToMinutes(s.endTime),
        });
      }
    });

    // DL Exam schedules (date-specific)
    dlExams.forEach((e) => {
      const timeMap = {
        morning:   { start: "09:00", end: "10:30" },
        afternoon: { start: "13:00", end: "14:30" },
        fullday:   { start: "09:00", end: "14:30" },
      };
      const slot = timeMap[e.timeSlot] || timeMap.morning;
      const rooms = (e.locations || []).map((l) => l.replace("ห้อง ", "").trim());
      const proctorNames = (e.proctors || []).map((p) => {
        const id = typeof p === "string" ? p : p?.id || p?.userId;
        return users[id] || (typeof p === "object" ? p?.name : p) || "";
      }).filter(Boolean);

      rooms.forEach((room) => {
        list.push({
          id: `${e.id}-${room}`,
          type: "dlExam",
          room,
          subject: e.subject || `สอบ DL (${e.examType === "staff" ? "บุคลากร" : "นักศึกษา"})`,
          teacher: proctorNames.join(", "),
          startTime: slot.start,
          endTime: slot.end,
          startMin: timeToMinutes(slot.start),
          endMin: timeToMinutes(slot.end),
          studentCount: e.studentCount,
          examType: e.examType,
        });
      });
    });

    return list.sort((a, b) => a.startMin - b.startMin);
  }, [classroomSchedules, dlExams, dayOfWeek, users]);

  // Group unique rooms that need to be opened today
  const roomsToOpen = useMemo(() => {
    const seen = new Set();
    const result = [];
    events.forEach((e) => {
      if (!seen.has(e.room)) {
        seen.add(e.room);
        result.push(e.room);
      }
    });
    return result.sort();
  }, [events]);

  const activeEvents = events.filter((e) => currentMinutes >= e.startMin && currentMinutes < e.endMin);
  const upcomingEvents = events.filter((e) => currentMinutes < e.startMin);
  const pastEvents = events.filter((e) => currentMinutes >= e.endMin);

  if (loading) {
    return (
      <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-4 animate-pulse space-y-3">
        <div className="h-4 bg-slate-100 rounded-full w-1/2" />
        <div className="h-16 bg-slate-100 rounded-2xl" />
        <div className="h-16 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden">
      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Calendar size={14} className="text-blue-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">ตารางห้องเรียน</span>
          </div>
          <p className="text-[13px] font-semibold text-slate-800">{formatThaiDate(now)}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-slate-400">{currentTimeStr}</span>
        </div>
      </div>

      {/* ── Rooms to open today ── */}
      {roomsToOpen.length > 0 && (
        <div className="px-4 pb-3">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-medium">
            ห้องที่ต้องเปิดวันนี้
          </p>
          <div className="flex flex-wrap gap-1.5">
            {roomsToOpen.map((room) => {
              const c = ROOM_COLORS[room] || ROOM_COLORS.default;
              const isActive = activeEvents.some((e) => e.room === room);
              return (
                <span
                  key={room}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.light} ${c.border} ${c.text}`}
                >
                  {isActive && <span className={`w-1.5 h-1.5 rounded-full ${c.dot} animate-pulse inline-block`} />}
                  ห้อง {room}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ── No events ── */}
      {events.length === 0 && (
        <div className="px-4 pb-5 text-center">
          <p className="text-sm text-slate-400 py-3">ไม่มีกิจกรรมในห้องเรียนชั้น 4 วันนี้</p>
        </div>
      )}

      {/* ── Event List ── */}
      {events.length > 0 && (
        <div className="divide-y divide-slate-50">
          {/* Active now */}
          {activeEvents.length > 0 && (
            <div className="px-3 py-2">
              <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider px-1 mb-1.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse inline-block" />
                กำลังดำเนินการ
              </p>
              <div className="space-y-1.5">
                {activeEvents.map((e) => <EventCard key={e.id} event={e} status="active" />)}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {upcomingEvents.length > 0 && (
            <div className="px-3 py-2">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-1.5">
                กำลังจะมาถึง
              </p>
              <div className="space-y-1.5">
                {upcomingEvents.map((e) => <EventCard key={e.id} event={e} status="upcoming" />)}
              </div>
            </div>
          )}

          {/* Past (collapsed) */}
          {pastEvents.length > 0 && (
            <div className="px-3 py-2">
              <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider px-1 mb-1.5">
                เสร็จสิ้นแล้ว
              </p>
              <div className="space-y-1.5 opacity-40">
                {pastEvents.map((e) => <EventCard key={e.id} event={e} status="past" />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Footer ── */}
      <div className="px-4 py-2.5 bg-slate-50/60 border-t border-slate-50 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">{events.length} กิจกรรมวันนี้</span>
        <a href="/admin/classroom-schedules" className="text-[11px] text-blue-500 font-medium flex items-center gap-0.5 hover:underline">
          ดูทั้งหมด <ChevronRight size={11} />
        </a>
      </div>
    </div>
  );
}

function EventCard({ event, status }) {
  const c = ROOM_COLORS[event.room] || ROOM_COLORS.default;
  const isDL = event.type === "dlExam";

  return (
    <div className={`flex items-start gap-2.5 p-2.5 rounded-2xl ${
      status === "active" ? `${c.light} ${c.border} border` :
      status === "upcoming" ? "bg-slate-50 border border-slate-100" :
      "bg-white border border-slate-50"
    }`}>
      {/* Room dot + time */}
      <div className="flex flex-col items-center shrink-0 min-w-[42px]">
        <div className={`w-2 h-2 rounded-full mt-0.5 ${status === "active" ? c.dot : "bg-slate-300"}`} />
        <span className={`text-[10px] font-semibold mt-1 ${status === "active" ? c.text : "text-slate-500"}`}>
          {event.startTime}
        </span>
        <span className="text-[9px] text-slate-400">{event.endTime}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-0.5 flex-wrap">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
            isDL ? "bg-orange-100 text-orange-700" : `${c.light} ${c.text}`
          }`}>
            {isDL ? "DL" : "เรียน"} ห้อง {event.room}
          </span>
          {isDL && event.examType && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600">
              {event.examType === "staff" ? "บุคลากร" : "นศ."}
            </span>
          )}
          {event.studentCount && (
            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
              <Users size={9} /> {event.studentCount}
            </span>
          )}
        </div>
        <p className={`text-[12px] font-medium truncate ${status === "past" ? "text-slate-400" : "text-slate-800"}`}>
          {event.subject}
        </p>
        {event.teacher && (
          <p className="text-[10px] text-slate-400 truncate">
            {isDL ? "ผู้คุมสอบ: " : "อาจารย์: "}{event.teacher}
          </p>
        )}
      </div>
    </div>
  );
}
