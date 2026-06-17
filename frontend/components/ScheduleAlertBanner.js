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
    <div className="fixed top-0 left-0 right-0 z-50 space-y-1">
      {activeAlerts.map((alert) => (
        <div
          key={alert.id}
          className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 shadow-lg animate-in slide-in-from-top"
        >
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <AlertTriangle size={20} className="shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                ห้อง {alert.room} จะปิดในอีก {alert.minutesLeft} นาที
              </p>
              <p className="text-xs text-white/80">
                {alert.subject} {alert.teacher && `· ${alert.teacher}`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 text-xs bg-white/20 px-2 py-1 rounded-full">
                <Clock size={12} />
                {alert.endTime}
              </div>
              <button
                onClick={() => handleDismiss(alert.id)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>
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
