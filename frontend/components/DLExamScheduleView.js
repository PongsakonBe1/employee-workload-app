"use client";

import { useState } from "react";
import { Calendar, Clock, Users, MapPin, BookOpen } from "lucide-react";
import { useDLExamSchedules } from "../hooks/useDLExamSchedules";

export default function DLExamScheduleView({ compact = false }) {
  const { upcomingExams, loading } = useDLExamSchedules();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return now.getMonth();
  });

  const months = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  const currentYear = new Date().getFullYear();

  // Filter exams by selected month
  const filteredExams = upcomingExams.filter((exam) => {
    const examDate = new Date(exam.date);
    return examDate.getMonth() === selectedMonth && examDate.getFullYear() === currentYear;
  });

  // Group exams by date
  const examsByDate = filteredExams.reduce((acc, exam) => {
    if (!acc[exam.date]) {
      acc[exam.date] = [];
    }
    acc[exam.date].push(exam);
    return acc;
  }, {});

  // Sort dates
  const sortedDates = Object.keys(examsByDate).sort();

  if (compact) {
    // Compact view for dashboard
    if (loading) {
      return (
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-slate-100 rounded w-3/4"></div>
          <div className="h-4 bg-slate-100 rounded w-1/2"></div>
        </div>
      );
    }

    if (upcomingExams.length === 0) {
      return (
        <p className="text-sm text-slate-500">ไม่มีตารางสอบ DL ที่กำลังจะถึง</p>
      );
    }

    return (
      <div className="space-y-3">
        {upcomingExams.slice(0, 3).map((exam) => {
          const examDate = new Date(exam.date);
          const isToday = exam.date === new Date().toISOString().slice(0, 10);

          return (
            <div
              key={exam.id}
              className={`p-3 rounded-lg border ${
                isToday
                  ? "bg-amber-50 border-amber-200"
                  : "bg-white border-slate-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Calendar size={14} className="text-slate-400" />
                <span className={`text-xs font-medium ${isToday ? "text-amber-700" : "text-slate-600"}`}>
                  {isToday ? "วันนี้" : examDate.toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                </span>
                <Clock size={14} className="text-slate-400 ml-2" />
                <span className="text-xs text-slate-600">{exam.timeSlot}</span>
              </div>
              <p className="text-sm font-medium text-slate-900">{exam.subject}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  ห้อง {exam.room}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={12} />
                  ผู้คุม {exam.invigilatorCount || 1} คน
                </span>
              </div>
            </div>
          );
        })}
        {upcomingExams.length > 3 && (
          <p className="text-xs text-slate-400 text-center">
            และอีก {upcomingExams.length - 3} รายการ
          </p>
        )}
      </div>
    );
  }

  // Full view
  return (
    <div className="space-y-4">
      {/* Month selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {months.map((month, index) => (
          <button
            key={month}
            onClick={() => setSelectedMonth(index)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedMonth === index
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {month}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl"></div>
          ))}
        </div>
      ) : sortedDates.length === 0 ? (
        <div className="text-center py-8">
          <BookOpen size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">ไม่มีตารางสอบ DL ในเดือนนี้</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((date) => {
            const dateObj = new Date(date);
            const isToday = date === new Date().toISOString().slice(0, 10);

            return (
              <div key={date} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className={`px-4 py-3 border-b ${isToday ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-200"}`}>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className={isToday ? "text-amber-600" : "text-slate-500"} />
                    <span className={`font-medium ${isToday ? "text-amber-900" : "text-slate-900"}`}>
                      {dateObj.toLocaleDateString("th-TH", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                    {isToday && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                        วันนี้
                      </span>
                    )}
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {examsByDate[date].map((exam) => (
                    <div key={exam.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Clock size={14} className="text-slate-400" />
                            <span className="text-sm font-medium text-slate-900">
                              {exam.timeSlot}
                            </span>
                          </div>
                          <p className="text-base font-semibold text-slate-900">
                            {exam.subject}
                          </p>
                          {exam.note && (
                            <p className="text-sm text-slate-500 mt-1">{exam.note}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg">
                            <MapPin size={12} />
                            ห้อง {exam.room}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <Users size={14} />
                          ต้องการผู้คุมสอบ {exam.invigilatorCount || 1} คน
                        </span>
                        {exam.assignedInvigilators?.length > 0 && (
                          <span className="text-green-600">
                            มีผู้คุมแล้ว {exam.assignedInvigilators.length} คน
                          </span>
                        )}
                      </div>
                      {exam.assignedInvigilators?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {exam.assignedInvigilators.map((name, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
