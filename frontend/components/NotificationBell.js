"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, X, AlertCircle, BellRing } from "lucide-react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  deleteDoc,
  updateDoc,
  arrayUnion,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db, getFCMToken, onFCMMessage } from "../lib/firebase";
import { useAuth } from "./AuthProvider";

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [notifPermission, setNotifPermission] = useState(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "default";
    if (localStorage.getItem("notif_dismissed") === "1") return "dismissed";
    return Notification.permission;
  });
  const [fcmTokenStatus, setFcmTokenStatus] = useState(null); // null | "saving" | "saved" | "error"
  const [reminderTime, setReminderTime] = useState("22:00");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const prevNotifIds = useRef(new Set());
  const allNotificationsRef = useRef(new Map()); // shared across all 4 queries

  // โหลด permission state ตอน mount (sync กับ browser)
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const perm = Notification.permission;
      if (perm !== "default") {
        setNotifPermission(perm);
      } else if (localStorage.getItem("notif_dismissed") === "1") {
        setNotifPermission("dismissed");
      }
    }
  }, []);


  // FCM: ลงทะเบียน token + รับ foreground message
  useEffect(() => {
    if (!user) return;
    let unsubFCM = () => {};

    async function initFCM() {
      if (typeof window === "undefined") return;
      // ต้อง granted ก่อน
      if (Notification.permission !== "granted") return;

      const token = await getFCMToken();
      if (token) {
        try {
          await updateDoc(doc(db, "users", user.uid), {
            fcmToken: token,
            fcmUpdatedAt: new Date(),
          });
          setFcmTokenStatus("saved");
        } catch {
          setFcmTokenStatus("error");
        }
      }

      // Foreground message handler
      unsubFCM = await onFCMMessage((payload) => {
        const title = payload.notification?.title || payload.data?.title || "แจ้งเตือน";
        const body = payload.notification?.body || payload.data?.body || "";
        fireOsNotification(title, body);
        showAlertMessage(title);
      });
    }

    initFCM();
    return () => { if (typeof unsubFCM === "function") unsubFCM(); };
  }, [user, notifPermission]);

  // โหลด reminderTime จาก Firestore settings/system
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "settings", "system")).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.reminderTime) setReminderTime(data.reminderTime);
        if (typeof data.enableDeadlineReminder === "boolean")
          setReminderEnabled(data.enableDeadlineReminder);
      }
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // reset shared map when user changes
    allNotificationsRef.current = new Map();
    prevNotifIds.current = new Set();
    const unsubscribes = [];
    let initialLoadDone = false;

    const handleSnapshot = (snapshot) => {
      const isFirstLoad = !initialLoadDone;
      snapshot.docChanges().forEach((change) => {
        if (change.type === "removed") {
          allNotificationsRef.current.delete(change.doc.id);
          prevNotifIds.current.delete(change.doc.id);
        } else {
          const docData = change.doc.data();
          // Filter out notifications that this user has already dismissed (readBy)
          const readBy = docData.readBy || [];
          if (readBy.includes(user.uid)) {
            allNotificationsRef.current.delete(change.doc.id);
          } else {
            allNotificationsRef.current.set(change.doc.id, {
              id: change.doc.id,
              ...docData,
            });
            // trigger OS notification เฉพาะ doc ใหม่ (ไม่ใช่ initial load) + ไม่เคยเห็นมาก่อน
            if (
              change.type === "added" &&
              !isFirstLoad &&
              !prevNotifIds.current.has(change.doc.id)
            ) {
              fireOsNotification(docData.title || "แจ้งเตือน", docData.message || "");
              showAlertMessage(docData.title || "แจ้งเตือน");
            }
          }
          prevNotifIds.current.add(change.doc.id);
        }
      });

      if (isFirstLoad) initialLoadDone = true;

      // แปลงเป็น array และ sort
      const notifs = Array.from(allNotificationsRef.current.values()).sort((a, b) => {
        const timeA = a.timestamp?.toDate?.() || 0;
        const timeB = b.timestamp?.toDate?.() || 0;
        return timeB - timeA;
      });

      setNotifications(notifs.slice(0, 20));
      setUnreadCount(notifs.length);
    };

    const handleError = (err) => {
      // Silent error - บาง query อาจไม่ผ่าน permission (ตาม role)
      if (err.code !== "permission-denied") {
        console.error("[Notification] Error:", err.message);
      }
    };

    // Query 1: notifications ส่งถึง user นี้โดยตรง
    try {
      const q1 = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        orderBy("timestamp", "desc"),
        limit(20),
      );
      unsubscribes.push(onSnapshot(q1, handleSnapshot, handleError));
    } catch (err) {
      console.error("[Notification] Failed to subscribe q1:", err);
    }

    // Query 2: notifications userId: "all" — ทุก role เห็น (broadcast)
    try {
      const q2 = query(
        collection(db, "notifications"),
        where("userId", "==", "all"),
        orderBy("timestamp", "desc"),
        limit(20),
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
          orderBy("timestamp", "desc"),
          limit(20),
        );
        unsubscribes.push(onSnapshot(q3, handleSnapshot, handleError));
      } catch (err) {
        console.error("[Notification] Failed to subscribe q3 (staff):", err);
      }
    }

    // Query 4: notifications ส่งถึง admin/superadmin
    if (user.role === "admin" || user.role === "superadmin") {
      try {
        const q4 = query(
          collection(db, "notifications"),
          where("userId", "==", "admin"),
          orderBy("timestamp", "desc"),
          limit(20),
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

  // ตรวจสอบเวลา reminder (ใช้ reminderTime จาก Firestore settings)
  useEffect(() => {
    if (!user || !reminderEnabled) return;

    // แปลง reminderTime "HH:MM" → { h, m }
    const [rh, rm] = reminderTime.split(":").map(Number);
    const reminderMinutes = rh * 60 + (rm || 0);

    const checkTime = () => {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      // แจ้งเตือนในช่วง reminderTime ถึง 23:59
      if (nowMinutes >= reminderMinutes && nowMinutes < 24 * 60) {
        const today = now.toISOString().slice(0, 10);
        const q = query(
          collection(db, "worklogs"),
          where("employeeId", "==", user.uid),
        );
        getDocs(q).then((snapshot) => {
          const todayWorklogs = snapshot.docs.filter(
            (d) => d.data().date === today,
          );
          if (todayWorklogs.length === 0) {
            const title = "อย่าลืมบันทึกงานวันนี้";
            const body = "คุณยังไม่ได้ลงบันทึกงานใช่หรือไม่? อย่าลืมลงบันทึกงานด้วยนะ";
            fireOsNotification(title, body);
            showAlertMessage(title);
          }
        });
      }
    };

    const interval = setInterval(checkTime, 30 * 60 * 1000);
    checkTime();
    return () => clearInterval(interval);
  }, [user, reminderEnabled, reminderTime]);

  function fireOsNotification(title, body) {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: "/labboy-logo.png" });
    }
  }

  async function requestPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
    // ถ้า granted ให้ init FCM token ทันที
    if (result === "granted" && user) {
      setFcmTokenStatus("saving");
      try {
        const token = await getFCMToken();
        if (token) {
          await updateDoc(doc(db, "users", user.uid), {
            fcmToken: token,
            fcmUpdatedAt: new Date(),
          });
          setFcmTokenStatus("saved");
        } else {
          setFcmTokenStatus("error");
        }
      } catch {
        setFcmTokenStatus("error");
      }
    }
  }

  // Helper: ตรวจสอบว่าเป็น broadcast notification หรือไม่
  function isBroadcast(notif) {
    return ["all", "staff", "admin", "superadmin"].includes(notif?.userId);
  }

  async function markAsRead(id) {
    try {
      const notif = notifications.find((n) => n.id === id);
      // ลบออกจาก state ทันที (optimistic update)
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      allNotificationsRef.current.delete(id);

      if (isBroadcast(notif)) {
        // Broadcast: soft-delete โดยเพิ่ม uid เข้า readBy array
        await updateDoc(doc(db, "notifications", id), {
          readBy: arrayUnion(user.uid),
        });
      } else {
        // Personal: ลบจริงได้เลย
        await deleteDoc(doc(db, "notifications", id));
      }
    } catch (err) {
      console.error("[Notification] Error marking as read:", err);
    }
  }

  async function deleteNotification(e, id) {
    e.stopPropagation();
    try {
      const notif = notifications.find((n) => n.id === id);
      // ลบออกจาก state ทันที (optimistic update)
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      allNotificationsRef.current.delete(id);

      if (isBroadcast(notif)) {
        // Broadcast: soft-delete โดยเพิ่ม uid เข้า readBy array
        await updateDoc(doc(db, "notifications", id), {
          readBy: arrayUnion(user.uid),
        });
      } else {
        // Personal: ลบจริงได้เลย
        await deleteDoc(doc(db, "notifications", id));
      }
    } catch (err) {
      console.error("[Notification] Error deleting:", err);
    }
  }

  async function markAllAsRead() {
    try {
      const toProcess = [...notifications];
      // ลบออกจาก state ทันที
      setNotifications([]);
      setUnreadCount(0);
      toProcess.forEach((n) => allNotificationsRef.current.delete(n.id));

      // แยก broadcast vs personal
      await Promise.all(
        toProcess.map((n) => {
          if (isBroadcast(n)) {
            // Broadcast: soft-delete โดยเพิ่ม uid เข้า readBy array
            return updateDoc(doc(db, "notifications", n.id), {
              readBy: arrayUnion(user.uid),
            });
          } else {
            // Personal: ลบจริงได้เลย
            return deleteDoc(doc(db, "notifications", n.id));
          }
        }),
      );
    } catch (err) {
      console.error("[Notification] Error marking all as read:", err);
    }
  }

  if (!user) return null;

  return (
    <>
      {/* Alert Banner สำหรับ notification สำคัญ */}
      {showAlert && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] w-[calc(100vw-2rem)] max-w-sm px-2">
          <div className="bg-amber-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <AlertCircle size={20} className="shrink-0" />
            <span className="font-medium text-sm flex-1 min-w-0 truncate">{alertMessage}</span>
            <button
              onClick={() => setShowAlert(false)}
              className="shrink-0 hover:bg-white/20 rounded p-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Banner ขอ permission Browser Notification */}
      {notifPermission === "default" && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100vw-2rem)] max-w-sm px-2">
          <div className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3">
            <BellRing size={20} className="shrink-0 text-amber-400" />
            <span className="text-sm flex-1 min-w-0">เปิดการแจ้งเตือนเพื่อรับแจ้งเตือนแม้ปิดแอปไว้</span>
            <button
              onClick={requestPermission}
              className="shrink-0 bg-amber-400 text-slate-900 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-amber-300 transition"
            >
              เปิด
            </button>
            <button
              onClick={() => { localStorage.setItem("notif_dismissed", "1"); setNotifPermission("dismissed"); }}
              className="shrink-0 hover:bg-white/20 rounded p-1"
            >
              <X size={14} />
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
          <>
            {/* Backdrop สำหรับปิด dropdown */}
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setIsOpen(false)}
            />
            {/* Dropdown — fixed on mobile, absolute on desktop */}
            <div className="fixed right-2 top-14 w-[calc(100vw-1rem)] max-w-xs sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-80 apple-panel z-[9999] shadow-2xl border border-slate-200">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">การแจ้งเตือน</h3>
                <div className="flex items-center gap-2">
                  {notifPermission === "granted" && fcmTokenStatus === "saving" && (
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">กำลังลงทะเบียน...</span>
                  )}
                  {notifPermission === "granted" && fcmTokenStatus === "saved" && (
                    <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">✓ พร้อมรับ Push</span>
                  )}
                  {notifPermission === "granted" && fcmTokenStatus === "error" && (
                    <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full">ลงทะเบียนไม่สำเร็จ</span>
                  )}
                  {notifPermission === "granted" && fcmTokenStatus === null && (
                    <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">แจ้งเตือนเปิดอยู่</span>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-slate-100 rounded"
                  >
                    <X size={16} className="text-slate-400" />
                  </button>
                </div>
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
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {notif.title}
                          </p>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
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
                          className="shrink-0 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
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
          </>
        )}
      </div>
    </>
  );
}
