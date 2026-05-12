"use client";

import { useState, useEffect } from "react";
import { Bell, X, AlertCircle, CheckCircle, Info } from "lucide-react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "./AuthProvider";

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  useEffect(() => {
    if (!user) return;

    const allNotifications = new Map();
    const unsubscribes = [];

    const handleSnapshot = (snapshot) => {
      // รวม notifications จากทุก query
      snapshot.docs.forEach((doc) => {
        allNotifications.set(doc.id, { id: doc.id, ...doc.data() });
      });

      // แปลงเป็น array และ sort
      const notifs = Array.from(allNotifications.values()).sort((a, b) => {
        const timeA = a.timestamp?.toDate?.() || 0;
        const timeB = b.timestamp?.toDate?.() || 0;
        return timeB - timeA;
      });

      setNotifications(notifs.slice(0, 20));
      setUnreadCount(notifs.length);

      // แสดง alert สำหรับ notification ใหม่
      const newImportantNotif = notifs.find(
        (n) =>
          n.timestamp?.toDate &&
          Date.now() - n.timestamp.toDate().getTime() < 5000,
      );
      if (newImportantNotif) {
        showAlertMessage(newImportantNotif.title);
      }
    };

    const handleError = (err) => {
      // Silent error - บาง query อาจไม่ผ่าน permission (ตาม role)
      if (err.code !== "permission-denied") {
        console.error("[Notification] Error:", err.message);
      }
    };

    // Query 1: notifications ส่งถึง user นี้โดยตรง (ทุกคน)
    try {
      const q1 = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        where("read", "==", false),
      );
      unsubscribes.push(onSnapshot(q1, handleSnapshot, handleError));
    } catch (err) {
      console.error("[Notification] Failed to subscribe q1:", err);
    }

    // Query 2: notifications ส่งถึงทุกคน (all) - ทุก role อ่านได้
    try {
      const q2 = query(
        collection(db, "notifications"),
        where("userId", "==", "all"),
        where("read", "==", false),
      );
      unsubscribes.push(onSnapshot(q2, handleSnapshot, handleError));
    } catch (err) {
      console.error("[Notification] Failed to subscribe q2:", err);
    }

    // Query 3: notifications ส่งถึง staff ทั้งหมด
    if (user.role === "staff") {
      try {
        const q3 = query(
          collection(db, "notifications"),
          where("userId", "==", "staff"),
          where("read", "==", false),
        );
        unsubscribes.push(onSnapshot(q3, handleSnapshot, handleError));
      } catch (err) {
        console.error("[Notification] Failed to subscribe q3 (staff):", err);
      }
    }

    // Query 4: notifications ส่งถึง admin ทั้งหมด (รวม superadmin)
    if (user.role === "admin" || user.role === "superadmin") {
      try {
        const q4 = query(
          collection(db, "notifications"),
          where("userId", "==", "admin"),
          where("read", "==", false),
        );
        unsubscribes.push(onSnapshot(q4, handleSnapshot, handleError));
      } catch (err) {
        console.error("[Notification] Failed to subscribe q4 (admin):", err);
      }
    }

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [user]);

  // แสดง alert message
  function showAlertMessage(message) {
    setAlertMessage(message);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3000);
  }

  // ตรวจสอบเวลาใกล้ 23:59
  useEffect(() => {
    if (!user) return;

    const checkTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // แจ้งเตือนถ้าเวลา 22:00-23:59 และยังไม่ได้บันทึกงานวันนี้
      if (hours >= 22 && hours < 24) {
        // ตรวจสอบว่ามีการบันทึกงานวันนี้หรือไม่
        const today = now.toISOString().slice(0, 10);
        // Simplified query - ไม่ต้องการ index (กรอง date ที่ client)
        const q = query(
          collection(db, "worklogs"),
          where("employeeId", "==", user.uid),
        );

        getDocs(q).then((snapshot) => {
          // กรองเฉพาะงานวันนี้ที่ client side
          const todayWorklogs = snapshot.docs.filter(
            (doc) => doc.data().date === today,
          );

          if (todayWorklogs.length === 0) {
            // ยังไม่มีการบันทึก ให้แสดง notification
            showLocalNotification(
              "อย่าลืมบันทึกงานวันนี้",
              "เหลือเวลาอีกไม่กี่ชั่วโมงก่อนระบบล็อก",
            );
          }
        });
      }
    };

    // เช็คทุก 30 นาที
    const interval = setInterval(checkTime, 30 * 60 * 1000);
    checkTime(); // เช็คทันทีตอน mount

    return () => clearInterval(interval);
  }, [user]);

  function showLocalNotification(title, message) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body: message });
    }
  }

  async function markAsRead(id) {
    try {
      await updateDoc(doc(db, "notifications", id), {
        read: true,
        readAt: new Date(),
      });
    } catch (err) {
      console.error("[Notification] Error marking as read:", err);
    }
  }

  async function deleteNotification(e, id) {
    e.stopPropagation(); // ป้องกัน trigger markAsRead
    try {
      await deleteDoc(doc(db, "notifications", id));
    } catch (err) {
      console.error("[Notification] Error deleting:", err);
    }
  }

  async function markAllAsRead() {
    // อัพเดตทั้งหมดเป็นอ่านแล้ว
  }

  if (!user) return null;

  return (
    <>
      {/* Alert Banner สำหรับ notification สำคัญ */}
      {showAlert && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-amber-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <AlertCircle size={20} />
            <span className="font-medium">{alertMessage}</span>
            <button
              onClick={() => setShowAlert(false)}
              className="ml-2 hover:bg-white/20 rounded p-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="relative z-[999]">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 rounded-full hover:bg-slate-100 transition"
        >
          <Bell size={20} className="text-slate-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 apple-panel z-[9999] shadow-2xl border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">การแจ้งเตือน</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-500">
                  ไม่มีการแจ้งเตือน
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer group"
                    onClick={() => markAsRead(notif.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">
                          {notif.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {notif.message}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {notif.timestamp
                            ?.toDate?.()
                            .toLocaleString("th-TH") || ""}
                        </p>
                      </div>
                      <button
                        onClick={(e) => deleteNotification(e, notif.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
                        title="ลบการแจ้งเตือน"
                      >
                        <X size={14} className="text-red-500" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {notifications.length > 0 && (
              <div className="p-2 border-t border-slate-100">
                <button
                  onClick={markAllAsRead}
                  className="w-full py-2 text-xs text-slate-600 hover:bg-slate-50 rounded transition"
                >
                  ทำเครื่องหมายว่าอ่านทั้งหมด
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
