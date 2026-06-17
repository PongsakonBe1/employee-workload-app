"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, X, Clock } from "lucide-react";

/**
 * Component แสดงแจ้งเตือนเมื่อห้องเรียนใกล้จะปิด
 * แสดง banner ด้านบนเมื่อมีห้องที่จะปิดใน 15 นาที
 */
export default function ScheduleAlertBanner() {
  const [alerts, setAlerts] = useState([]);
  const [dismissed, setDismissed] = useState([]);

  const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  useEffect(() => {
    const checkUpcomingClosures = async () => {
      try {
        const db = (await import("../lib/firebase")).db;
        const { collection, query, where, getDocs } = await import("firebase/firestore");

        const now = new Date();
        const dayOfWeek = DAYS[now.getDay()];
        const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

        // ดึงตารางเรียนวันนี้
        const q = query(
          collection(db, "classroomSchedules"),
          where("isActive", "==", true),
          where("dayOfWeek", "==", dayOfWeek)
        );
        const snapshot = await getDocs(q);
        const schedules = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // หาห้องที่ใกล้จะปิด (ภายใน 15 นาที)
        const upcomingAlerts = schedules
          .map((schedule) => {
            const diff = timeDiffInMinutes(currentTime, schedule.endTime);
            if (diff > 0 && diff <= 15) {
              return {
                ...schedule,
                minutesLeft: diff,
              };
            }
            return null;
          })
          .filter(Boolean);

        setAlerts(upcomingAlerts);
      } catch (err) {
        console.error("Error checking schedules:", err);
      }
    };

    checkUpcomingClosures();

    // Check every minute
    const interval = setInterval(checkUpcomingClosures, 60000);
    return () => clearInterval(interval);
  }, []);

  // Auto-dismiss alerts that have passed
  useEffect(() => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const expired = alerts
      .filter((alert) => currentTime >= alert.endTime)
      .map((alert) => alert.id);

    if (expired.length > 0) {
      setDismissed((prev) => [...prev, ...expired]);
    }
  }, [alerts]);

  const handleDismiss = (id) => {
    setDismissed((prev) => [...prev, id]);
  };

  const activeAlerts = alerts.filter((alert) => !dismissed.includes(alert.id));

  if (activeAlerts.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none" style={{ maxWidth: "calc(100vw - 2rem)" }}>
      {activeAlerts.map((alert) => (
        <div
          key={alert.id}
          className="pointer-events-auto w-72 max-w-full bg-white border border-amber-200 rounded-2xl shadow-lg overflow-hidden"
        >
          {/* Progress bar — depletes proportionally to minutesLeft out of 15 */}
          <div className="h-1 bg-amber-100">
            <div
              className="h-1 bg-amber-400 transition-none"
              style={{ width: `${Math.min((alert.minutesLeft / 15) * 100, 100)}%` }}
            />
          </div>
          <div className="px-4 py-3 flex items-start gap-3">
            <div className="mt-0.5 w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
              <AlertTriangle size={15} className="text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">
                ห้อง {alert.room} ปิดในอีก {alert.minutesLeft} นาที
              </p>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {alert.subject}{alert.teacher && ` · ${alert.teacher}`}
              </p>
              <div className="flex items-center gap-1 text-xs text-amber-600 font-medium mt-1">
                <Clock size={11} />
                ปิด {alert.endTime} น.
              </div>
            </div>
            <button
              onClick={() => handleDismiss(alert.id)}
              className="mt-0.5 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function timeDiffInMinutes(time1, time2) {
  const [h1, m1] = time1.split(":").map(Number);
  const [h2, m2] = time2.split(":").map(Number);
  return h2 * 60 + m2 - (h1 * 60 + m1);
}
