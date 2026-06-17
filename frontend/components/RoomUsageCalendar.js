"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, GraduationCap, BookOpen, Users } from "lucide-react";
import CalendarViewToggle from "./CalendarViewToggle";
import { getHoliday, HOLIDAY_COLORS } from "../data/holidays";

/**
 * RoomUsageCalendar - iOS Style Calendar Component
 * แสดงตารางการใช้ห้องเรียนชั้น 4 แบบ iOS Calendar
 * 
 * Props:
 * - view: "week" | "day" | "compact" - รูปแบบการแสดงผล
 * - showDLExam: boolean - แสดงตารางคุมสอบ DL ด้วยหรือไม่
 * - date: Date - วันที่เริ่มต้น (optional, default = วันนี้)
 */

const ROOMS = ["401", "402", "406", "407"];
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DAY_LABELS = {
  sunday: "อา",
  monday: "จ",
  tuesday: "อ",
  wednesday: "พ",
  thursday: "พฤ",
  friday: "ศ",
  saturday: "ส",
};
const DAY_FULL_LABELS = {
  sunday: "อาทิตย์",
  monday: "จันทร์",
  tuesday: "อังคาร",
  wednesday: "พุธ",
  thursday: "พฤหัสบดี",
  friday: "ศุกร์",
  saturday: "เสาร์",
};

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 - 20:00

export default function RoomUsageCalendar({ 
  view: initialView = "week", 
  showDLExam = true, 
  showCEMExam = false,
  showHolidays = true,
  initialDate = new Date(),
  allowViewToggle = true
}) {
  // Support multiple view modes: "1day" | "3day" | "week"
  const [view, setView] = useState(initialView === "compact" ? "1day" : initialView);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [classroomSchedules, setClassroomSchedules] = useState([]);
  const [dlExams, setDLExams] = useState([]);
  const [cemExams, setCemExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null); // For mobile filter
  const [users, setUsers] = useState({}); // Map userId -> userName
  const [usersLoading, setUsersLoading] = useState(true);

  // Fetch users for proctor name lookup
  useEffect(() => {
    const fetchUsers = async () => {
      setUsersLoading(true);
      try {
        // Fetch all users (not filtering by isActive to ensure we get all proctors)
        const q = query(collection(db, "users"));
        const snapshot = await getDocs(q);
        const userMap = {};
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          userMap[doc.id] = data.name || data.displayName || data.email || doc.id;
        });
        console.log('[RoomUsageCalendar] Users loaded:', Object.keys(userMap).length, 'users');
        setUsers(userMap);
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        setUsersLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Fetch classroom schedules
  useEffect(() => {
    const fetchClassroomSchedules = async () => {
      try {
        const q = query(
          collection(db, "classroomSchedules"),
          where("isActive", "==", true),
          orderBy("dayOfWeek"),
          orderBy("startTime")
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          type: "classroom",
          ...doc.data(),
        }));
        setClassroomSchedules(data);
        console.log('[RoomUsageCalendar] Classroom schedules:', data);
      } catch (err) {
        console.error("Error fetching classroom schedules:", err);
      }
    };

    fetchClassroomSchedules();
  }, []);

  // Fetch DL exams
  useEffect(() => {
    if (!showDLExam) return;
    
    const fetchDLExams = async () => {
      try {
        // Use Thailand timezone (UTC+7) - same as CompactView
        const now = new Date();
        const thailandTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
        const weekStart = new Date(thailandTime);
        weekStart.setDate(thailandTime.getDate() - thailandTime.getDay()); // Sunday
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // Saturday
        
        const q = query(
          collection(db, "dlExamSchedules"),
          where("isActive", "==", true),
          where("date", ">=", weekStart.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })),
          where("date", "<=", weekEnd.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })),
          orderBy("date"),
          orderBy("timeSlot")
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          type: "dlExam",
          ...doc.data(),
        }));
        setDLExams(data);
        console.log('[RoomUsageCalendar] DL exams:', data);
      } catch (err) {
        console.error("Error fetching DL exams:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDLExams();
  }, [showDLExam, currentDate]);

  // Get week dates (Thailand timezone UTC+7)
  const weekDates = useMemo(() => {
    const thailandTime = new Date(currentDate.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const start = new Date(thailandTime);
    start.setDate(thailandTime.getDate() - thailandTime.getDay()); // Sunday
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return date;
    });
  }, [currentDate]);

  // Navigation
  const prevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get events for a specific day and room
  const getEvents = (date, room) => {
    const dayOfWeek = DAYS[date.getDay()];
    // Use Thailand timezone (UTC+7) for date comparison
    const dateStr = date.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
    
    const events = [];
    
    // Classroom schedules
    classroomSchedules.forEach((schedule) => {
      if (schedule.dayOfWeek === dayOfWeek && schedule.room === room) {
        events.push({
          ...schedule,
          startHour: parseInt(schedule.startTime.split(":")[0]),
          endHour: parseInt(schedule.endTime.split(":")[0]),
          startMinute: parseInt(schedule.startTime.split(":")[1]),
          endMinute: parseInt(schedule.endTime.split(":")[1]),
        });
      }
    });
    
    // DL Exams
    if (showDLExam) {
      dlExams.forEach((exam) => {
        if (exam.date === dateStr && exam.locations?.includes(`ห้อง ${room}`)) {
          const timeSlot = exam.timeSlot === "morning" ? { start: "09:00", end: "10:30" } :
                          exam.timeSlot === "afternoon" ? { start: "13:00", end: "14:30" } :
                          { start: "09:00", end: "14:30" };
          events.push({
            ...exam,
            subject: `สอบ DL (${exam.examType === "staff" ? "พนักงาน" : "นักศึกษา"})`,
            teacher: exam.proctors?.map(p => p.name || p).slice(0, 2).join(", ") || "",
            room,
            startHour: parseInt(timeSlot.start.split(":")[0]),
            endHour: parseInt(timeSlot.end.split(":")[0]),
            startMinute: parseInt(timeSlot.start.split(":")[1]),
            endMinute: parseInt(timeSlot.end.split(":")[1]),
            isExam: true,
          });
        }
      });
    }
    
    return events.sort((a, b) => a.startHour * 60 + a.startMinute - b.startHour * 60 - b.startMinute);
  };

  // Compact View (for Dashboard/Sidebar)
  if (view === "compact") {
    console.log('[RoomUsageCalendar] Sending to CompactView:', { usersCount: Object.keys(users).length, usersLoading });
    return <CompactView 
      classroomSchedules={classroomSchedules} 
      dlExams={dlExams} 
      showDLExam={showDLExam}
      loading={loading}
      users={users}
      usersLoading={usersLoading}
    />;
  }

  // Mobile Day View
  if (view === "day" || (typeof window !== "undefined" && window.innerWidth < 768)) {
    return <DayView 
      currentDate={currentDate}
      setCurrentDate={setCurrentDate}
      classroomSchedules={classroomSchedules}
      dlExams={dlExams}
      showDLExam={showDLExam}
      loading={loading}
      selectedRoom={selectedRoom}
      setSelectedRoom={setSelectedRoom}
    />;
  }

  // Desktop Week View (Default)
  return (
    <WeekView 
      weekDates={weekDates}
      currentDate={currentDate}
      prevWeek={prevWeek}
      nextWeek={nextWeek}
      goToToday={goToToday}
      getEvents={getEvents}
      loading={loading}
    />
  );
}

// ==================== COMPACT VIEW ====================
function CompactView({ classroomSchedules, dlExams, showDLExam, loading, users = {}, usersLoading = false }) {
  // Use Thailand timezone (UTC+7)
  const now = new Date();
  const thailandTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const dayOfWeek = DAYS[thailandTime.getDay()];
  // Format: YYYY-MM-DD for Thailand timezone
  const todayStr = thailandTime.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
  const currentTime = `${String(thailandTime.getHours()).padStart(2, "0")}:${String(thailandTime.getMinutes()).padStart(2, "0")}`;

  if (loading || usersLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 animate-pulse">
        <div className="h-4 bg-slate-100 rounded w-1/3 mb-3"></div>
        <div className="space-y-2">
          <div className="h-12 bg-slate-100 rounded-xl"></div>
          <div className="h-12 bg-slate-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  // Get today's events - recompute when users change
  const todayEvents = useMemo(() => {
    const events = [];
    
    classroomSchedules.forEach((s) => {
      if (s.dayOfWeek === dayOfWeek && s.isActive !== false) {
        events.push({ ...s, type: "classroom", sortTime: s.startTime });
      }
    });

    if (showDLExam) {
      dlExams.forEach((e) => {
        if (e.date === todayStr && e.isActive !== false) {
          // Determine start time based on timeSlot
          const startTime = e.timeSlot === "morning" ? "09:00" : e.timeSlot === "afternoon" ? "13:00" : "09:00";
          // Map proctor IDs to names
          const proctors = e.proctors || [];
          console.log('[CompactView] Mapping proctors for exam:', e.id, 'proctors:', proctors, 'users:', Object.keys(users));
          const proctorNames = proctors.map(p => {
            const id = typeof p === "string" ? p : p.id || p.userId;
            const name = users[id] || (typeof p === "object" ? p.name : p);
            console.log('[CompactView] Mapping ID:', id, '-> name:', name);
            return name;
          }).filter(Boolean);
          console.log('[CompactView] Final proctorNames:', proctorNames);
          events.push({ 
            ...e, 
            type: "dlExam", 
            sortTime: startTime, 
            startTime,
            proctorNames 
          });
        }
      });
    }
    
    // Sort events by time
    events.sort((a, b) => a.sortTime.localeCompare(b.sortTime));
    return events;
  }, [classroomSchedules, dlExams, showDLExam, dayOfWeek, todayStr, users]);

  if (todayEvents.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-600">ตารางห้องวันนี้</span>
        </div>
        <p className="text-sm text-slate-400 text-center py-4">ไม่มีกิจกรรมในห้องเรียนชั้น 4 วันนี้</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-slate-700">
            ห้องเรียนชั้น 4 วันนี้ ({todayEvents.length})
          </span>
        </div>
        <span className="text-xs text-slate-400">{currentTime}</span>
      </div>
      
      <div className="space-y-2 max-h-56 overflow-y-auto">
        {todayEvents.map((event, idx) => {
          const isInProgress = currentTime >= event.startTime && currentTime < event.endTime;
          const isUpcoming = currentTime < event.startTime;
          
          // For DL Exam: get locations and proctors
          const locations = event.type === "dlExam" ? event.locations?.join(", ") : event.room;
          // Use pre-computed proctor names from useMemo
          const proctorNames = event.proctorNames || [];
          const studentCount = event.type === "dlExam" ? event.studentCount : null;
          
          return (
            <div 
              key={idx}
              className={`p-3 rounded-xl border-l-4 text-sm ${
                event.type === "dlExam" 
                  ? "bg-orange-50/50 border-orange-200 border-l-orange-400" 
                  : isInProgress 
                    ? "bg-blue-50/50 border-blue-200 border-l-blue-400" 
                    : isUpcoming 
                      ? "bg-slate-50 border-slate-200 border-l-slate-300" 
                      : "bg-slate-50/30 border-slate-200 border-l-slate-300 opacity-70"
              }`}
            >
              <div className="flex items-start gap-2">
                {/* Time column */}
                <div className="flex-shrink-0 w-14 text-center">
                  <span className={`block text-xs font-semibold ${
                    isInProgress ? "text-blue-600" : "text-slate-500"
                  }`}>
                    {event.startTime}
                  </span>
                  <span className="block text-[10px] text-slate-400">{event.endTime}</span>
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      event.type === "dlExam" 
                        ? "bg-orange-100 text-orange-700" 
                        : "bg-blue-100 text-blue-700"
                    }`}>
                      {event.type === "dlExam" ? locations : `ห้อง ${event.room}`}
                    </span>
                    {event.type === "dlExam" && event.examType && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-600">
                        {event.examType === "staff" ? "บุคลากร" : "นักศึกษา"}
                      </span>
                    )}
                    {studentCount && (
                      <span className="text-[10px] text-slate-500">
                        {studentCount} คน
                      </span>
                    )}
                    {isInProgress && (
                      <span className="text-[10px] font-medium text-blue-600 animate-pulse">
                        ● กำลังสอบ
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-slate-800 mt-0.5 truncate text-sm">
                    {event.subject || (event.type === "dlExam" ? "คุมสอบ DL" : "เรียน")}
                  </p>
                  {proctorNames.length > 0 && (
                    <p className="text-xs text-slate-500 truncate">
                      ผู้คุมสอบ: {proctorNames.join(", ")}
                    </p>
                  )}
                  {event.teacher && event.type !== "dlExam" && (
                    <p className="text-xs text-slate-500 truncate">
                      อาจารย์: {event.teacher}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== DAY VIEW (Mobile) ====================
function DayView({ currentDate, setCurrentDate, classroomSchedules, dlExams, showDLExam, loading, selectedRoom, setSelectedRoom }) {
  const dayOfWeek = DAYS[currentDate.getDay()];
  const dateStr = currentDate.toISOString().split("T")[0];

  const prevDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const nextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get events for selected day
  const events = [];
  
  classroomSchedules.forEach((s) => {
    if (s.dayOfWeek === dayOfWeek && s.isActive !== false) {
      if (!selectedRoom || s.room === selectedRoom) {
        events.push({ ...s, type: "classroom", icon: BookOpen });
      }
    }
  });

  if (showDLExam) {
    dlExams.forEach((e) => {
      if (e.date === dateStr && e.isActive !== false) {
        events.push({ 
          ...e, 
          type: "dlExam", 
          icon: GraduationCap,
          room: e.locations?.join(", ") || e.location || "-"
        });
      }
    });
  }

  events.sort((a, b) => a.startTime.localeCompare(b.startTime));

  const today = new Date();
  const isToday = currentDate.toDateString() === today.toDateString();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevDay} className="p-2 -ml-2 rounded-full hover:bg-white/20 transition">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-sm opacity-90">{DAY_FULL_LABELS[dayOfWeek]}</p>
            <p className="text-lg font-semibold">{currentDate.getDate()} {currentDate.toLocaleString('th-TH', { month: 'short' })}</p>
          </div>
          <button onClick={nextDay} className="p-2 -mr-2 rounded-full hover:bg-white/20 transition">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        
        {!isToday && (
          <button 
            onClick={goToToday}
            className="w-full py-1.5 text-sm bg-white/20 rounded-lg hover:bg-white/30 transition"
          >
            กลับไปวันนี้
          </button>
        )}
      </div>

      {/* Room Filter */}
      <div className="p-3 border-b border-slate-100">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedRoom(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
              !selectedRoom 
                ? "bg-blue-500 text-white" 
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            ทั้งหมด
          </button>
          {ROOMS.map((room) => (
            <button
              key={room}
              onClick={() => setSelectedRoom(room)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                selectedRoom === room 
                  ? "bg-blue-500 text-white" 
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              ห้อง {room}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400">ไม่มีกิจกรรมในวันนี้</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event, idx) => (
              <div 
                key={idx}
                className={`p-4 rounded-xl border-l-4 ${
                  event.type === "dlExam"
                    ? "bg-orange-50 border-orange-400"
                    : "bg-blue-50 border-blue-400"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    event.type === "dlExam" ? "bg-orange-100" : "bg-blue-100"
                  }`}>
                    <event.icon className={`w-4 h-4 ${
                      event.type === "dlExam" ? "text-orange-600" : "text-blue-600"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">
                        {event.startTime} - {event.endTime}
                      </span>
                      {event.type === "dlExam" && (
                        <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                          สอบ
                        </span>
                      )}
                    </div>
                    <h4 className="font-medium text-slate-900 truncate">{event.subject}</h4>
                    <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>ห้อง {event.room}</span>
                    </div>
                    {event.teacher && (
                      <p className="text-sm text-slate-500 mt-1 truncate">{event.teacher}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== WEEK VIEW (Desktop) ====================
function WeekView({ weekDates, currentDate, prevWeek, nextWeek, goToToday, getEvents, loading }) {
  // Use Thailand timezone (UTC+7)
  const now = new Date();
  const today = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-slate-800">ตารางการใช้ห้องเรียนชั้น 4</h3>
            <span className="text-sm text-slate-500">
              {weekDates[0].getDate()} - {weekDates[6].getDate()} {weekDates[6].toLocaleString('th-TH', { month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={prevWeek}
              className="p-2 rounded-full bg-white border border-slate-200 shadow-sm hover:shadow-md hover:bg-slate-50 text-slate-600 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={goToToday}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-full shadow-sm hover:shadow-md hover:bg-blue-600 transition-all"
            >
              วันนี้
            </button>
            <button 
              onClick={nextWeek}
              className="p-2 rounded-full bg-white border border-slate-200 shadow-sm hover:shadow-md hover:bg-slate-50 text-slate-600 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-sm"></div>
            <span className="text-slate-600 font-medium">ตารางเรียน</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-orange-400 to-red-500 shadow-sm"></div>
            <span className="text-slate-600 font-medium">คุมสอบ DL</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Days Header */}
          <div className="grid grid-cols-8 border-b border-slate-100">
            <div className="p-3 text-center text-sm font-medium text-slate-500 bg-slate-50">ห้อง</div>
            {weekDates.map((date, idx) => {
              const isToday = date.toDateString() === today.toDateString();
              return (
                <div 
                  key={idx} 
                  className={`p-3 text-center ${isToday ? "bg-blue-50/50" : ""}`}
                >
                  <p className={`text-sm font-medium ${isToday ? "text-blue-600" : "text-slate-600"}`}>
                    {DAY_LABELS[DAYS[idx]]}
                  </p>
                  <p className={`text-lg font-semibold mt-0.5 ${isToday ? "text-blue-700" : "text-slate-800"}`}>
                    {date.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Rooms */}
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-slate-400 mt-2">กำลังโหลด...</p>
            </div>
          ) : (
            ROOMS.map((room) => (
              <div key={room} className="grid grid-cols-8 border-b border-slate-100 last:border-b-0">
                <div className="p-3 text-center font-medium text-slate-600 bg-slate-50/50 flex items-center justify-center">
                  {room}
                </div>
                {weekDates.map((date, dayIdx) => {
                  const events = getEvents(date, room);
                  const isToday = date.toDateString() === today.toDateString();
                  
                  return (
                    <div 
                      key={dayIdx} 
                      className={`p-2 min-h-[100px] ${isToday ? "bg-blue-50/30" : ""} ${dayIdx < 6 ? "border-r border-slate-100" : ""}`}
                    >
                      <div className="space-y-1.5">
                        {events.map((event, evtIdx) => (
                          <div 
                            key={evtIdx}
                            className={`p-2 rounded-lg text-xs shadow-sm ${
                              event.isExam 
                                ? "bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-orange-200" 
                                : "bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-blue-200"
                            }`}
                            title={`${event.subject} (${event.startTime}-${event.endTime})`}
                          >
                            <p className="font-medium truncate">{event.subject}</p>
                            <p className="text-[10px] opacity-90">{event.startTime}-{event.endTime}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
