"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../../components/AuthProvider";
import { AppShell } from "../../../components/AppShell";
import TemplateManager from "../../../components/TemplateManager";
import DLExamManager from "../../../components/DLExamManager";
import ScheduleManager from "../../../components/ScheduleManager";
import RoomUsageCalendar from "../../../components/RoomUsageCalendar";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  orderBy,
  limit,
} from "firebase/firestore";
import { db, auth } from "../../../lib/firebase";
import { isAdminRole, isSuperAdminRole } from "../../../lib/authUtils";
import { NotificationBell } from "../../../components/NotificationBell";
import {
  CheckCircle,
  XCircle,
  Download,
  Clock,
  FileSpreadsheet,
  User,
  Calendar,
  RefreshCw,
  Upload,
  AlertCircle,
  Bell,
  Smartphone,
  Send,
  Megaphone,
  GraduationCap,
  BookOpen,
} from "lucide-react";

// Helper function สำหรับบันทึก log
async function logSystemAction(db, user, action, details = "") {
  try {
    await addDoc(collection(db, "systemLogs"), {
      timestamp: new Date(),
      userId: user.uid,
      userEmail: user.email,
      userName: user.displayName || user.email,
      action,
      details,
      type: "action",
    });
  } catch (err) {
    console.error("[SystemLog] Error:", err);
  }
}

// Helper function ดึง email prefix (ก่อน @)
function getEmailPrefix(email) {
  if (!email) return "";
  return email.split("@")[0];
}

export default function SystemManagementPage() {
  const { user } = useAuth();
  const [exportRequests, setExportRequests] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("exports"); // "exports" | "logs" | "templates"

  // Feedback states
  const [message, setMessage] = useState({ type: "", text: "" });
  const [processingId, setProcessingId] = useState(null); // เก็บ requestId ที่กำลังประมวลผล

  // Logs filter states
  const [logsStartDate, setLogsStartDate] = useState("");
  const [logsEndDate, setLogsEndDate] = useState("");
  const [logsLimit, setLogsLimit] = useState(100);
  const [totalLogsCount, setTotalLogsCount] = useState(0);

  // Broadcast notification states (superadmin only)
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState("all"); // "all" | "staff" | "admin"
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [deliveryInApp, setDeliveryInApp] = useState(true);
  const [deliveryPush, setDeliveryPush] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState(null); // {success, inAppSent, pushSent, pushFailed, error}
  const [userCounts, setUserCounts] = useState({ total: 0, staff: 0, admin: 0 });

  // Import worklogs states (superadmin only)
  const [importText, setImportText] = useState("");
  const [importPreview, setImportPreview] = useState([]);
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const isSuperAdmin = isSuperAdminRole(user);
  const isAdmin = isAdminRole(user);

  // โหลดคำขอส่งออกที่รออนุมัติ (ใช้ getDocs แทน onSnapshot ประหยัด quota)
  async function loadExportRequests() {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "exportRequests"),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc"),
        limit(50),
      );
      const snapshot = await getDocs(q);
      const requests = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setExportRequests(requests);
    } catch (err) {
      console.error("Error loading requests:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExportRequests();
  }, [isAdmin]);

  // โหลดจำนวน users สำหรับ Broadcast
  useEffect(() => {
    if (!isSuperAdmin) return;
    async function loadUserCounts() {
      try {
        const usersSnap = await getDocs(query(collection(db, "users"), where("active", "==", true)));
        let staff = 0, admin = 0;
        usersSnap.forEach((d) => {
          const role = d.data().role;
          if (role === "admin" || role === "superadmin") admin++;
          else staff++;
        });
        setUserCounts({ total: staff + admin, staff, admin });
      } catch (err) {
        console.error("Error loading user counts:", err);
      }
    }
    loadUserCounts();
  }, [isSuperAdmin]);

  // โหลด logs ล่าสุด (superadmin เท่านั้น) - ใช้ getDocs แทน onSnapshot
  async function loadSystemLogs() {
    if (!isSuperAdmin) return;
    setLoading(true);
    try {
      let q = query(
        collection(db, "systemLogs"),
        orderBy("timestamp", "desc"),
        limit(logsLimit),
      );

      // ถ้ามีช่วงวันที่ ให้ filter
      if (logsStartDate && logsEndDate) {
        const start = new Date(logsStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(logsEndDate);
        end.setHours(23, 59, 59, 999);

        q = query(
          collection(db, "systemLogs"),
          where("timestamp", ">=", start),
          where("timestamp", "<=", end),
          orderBy("timestamp", "desc"),
          limit(logsLimit),
        );
      }

      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSystemLogs(logs);
      setTotalLogsCount(logs.length);
    } catch (err) {
      console.error("Error loading logs:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "logs") {
      loadSystemLogs();
    }
  }, [isSuperAdmin, activeTab, logsLimit]);

  // อนุมัติคำขอส่งออก
  async function approveRequest(requestId, staffName) {
    setProcessingId(requestId);
    setMessage({ type: "", text: "" });
    try {
      await updateDoc(doc(db, "exportRequests", requestId), {
        status: "approved",
        approvedAt: new Date(),
        approvedBy: user.uid,
        approvedByName: user.displayName || user.email,
      });
      setMessage({
        type: "success",
        text: `อนุมัติคำขอของ ${staffName} เรียบร้อยแล้ว`,
      });
      // บันทึก log
      await logSystemAction(
        db,
        user,
        "APPROVE_EXPORT",
        `Approved export request for ${staffName}`,
      );
      // รีเฟรชรายการหลังอนุมัติ
      await loadExportRequests();
    } catch (err) {
      console.error("Error approving request:", err);
      setMessage({
        type: "error",
        text: "ไม่สามารถอนุมัติได้: " + err.message,
      });
    } finally {
      setProcessingId(null);
    }
  }

  // ปฏิเสธคำขอส่งออก
  async function rejectRequest(requestId, staffName) {
    setProcessingId(requestId);
    setMessage({ type: "", text: "" });
    try {
      await updateDoc(doc(db, "exportRequests", requestId), {
        status: "rejected",
        rejectedAt: new Date(),
        rejectedBy: user.uid,
        rejectedByName: user.displayName || user.email,
      });
      setMessage({
        type: "info",
        text: `ปฏิเสธคำขอของ ${staffName} เรียบร้อยแล้ว`,
      });
      // บันทึก log
      await logSystemAction(
        db,
        user,
        "REJECT_EXPORT",
        `Rejected export request for ${staffName}`,
      );
      // รีเฟรชรายการหลังปฏิเสธ
      await loadExportRequests();
    } catch (err) {
      console.error("Error rejecting request:", err);
      setMessage({ type: "error", text: "ไม่สามารถปฏิเสธได้: " + err.message });
    } finally {
      setProcessingId(null);
    }
  }

  // ดาวน์โหลดไฟล์ให้ staff (ถ้าต้องการ)
  async function downloadForStaff(request) {
    setProcessingId(request.id);
    setMessage({ type: "", text: "" });
    try {
      const q = query(
        worklogsRef,
        where("date", ">=", request.dateRange.start),
        where("date", "<=", request.dateRange.end),
        where("employeeId", "==", request.staffId),
      );

      const snapshot = await getDocs(q);
      const worklogs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      worklogs.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

      const headers = [
        "วันที่",
        "เวลา",
        "ผู้ให้บริการ",
        "ผู้รับบริการ",
        "กลุ่มงาน",
        "หัวข้อหลัก",
        "หัวข้อรอง",
        "Comment",
        "สถานะ",
      ];
      const rows = worklogs.map((log) => [
        log.date || "",
        log.time || "",
        log.employeeDisplayName ||
          log.employeeFullName ||
          log.employeeNickname ||
          log.employeeId ||
          "",
        log.requesterName || "",
        log.dutyGroup || log.mainDuty || "",
        log.mainDuty || "",
        log.minorTask || "",
        log.comment || "",
        log.status || "",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `workload-${request.staffName}-${request.dateRange.start}_to_${request.dateRange.end}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage({
        type: "success",
        text: `ดาวน์โหลดไฟล์ของ ${request.staffName} สำเร็จ (${worklogs.length} รายการ)`,
      });
      // บันทึก log
      await logSystemAction(
        db,
        user,
        "DOWNLOAD_EXPORT",
        `Downloaded export for ${request.staffName}, ${worklogs.length} records`,
      );
    } catch (err) {
      console.error("Error downloading:", err);
      setMessage({
        type: "error",
        text: "ไม่สามารถดาวน์โหลดได้: " + err.message,
      });
    } finally {
      setProcessingId(null);
    }
  }

  // Export system logs to CSV
  async function exportSystemLogs() {
    if (systemLogs.length === 0) {
      setMessage({ type: "error", text: "ไม่มีข้อมูลสำหรับส่งออก" });
      return;
    }

    try {
      const headers = [
        "วันที่-เวลา",
        "ผู้ใช้",
        "อีเมล",
        "Action",
        "รายละเอียด",
        "ผู้ถูกกระทำ",
        "ประเภท",
      ];

      const rows = systemLogs.map((log) => [
        log.timestamp?.toDate?.().toLocaleString("th-TH") ||
          new Date(log.timestamp).toLocaleString("th-TH") ||
          "",
        getEmailPrefix(log.userEmail), // แสดง email prefix แทนชื่อเต็ม
        log.userEmail || "",
        log.action || "",
        log.details || "",
        log.targetUser || "",
        log.type || "",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;

      // ชื่อไฟล์ตามช่วงวันที่
      const dateStr =
        logsStartDate && logsEndDate
          ? `${logsStartDate}_to_${logsEndDate}`
          : new Date().toISOString().slice(0, 10);
      anchor.download = `system-logs-${dateStr}.csv`;

      anchor.click();
      URL.revokeObjectURL(url);

      setMessage({
        type: "success",
        text: `ส่งออก logs สำเร็จ (${systemLogs.length} รายการ)`,
      });
    } catch (err) {
      console.error("Error exporting logs:", err);
      setMessage({ type: "error", text: "ไม่สามารถส่งออก logs ได้" });
    }
  }

  // Send broadcast notification (superadmin only) — Unified: In-App + Push
  async function sendBroadcastNotification() {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      setMessage({ type: "error", text: "กรุณากรอกหัวข้อและข้อความ" });
      return;
    }
    if (!deliveryInApp && !deliveryPush) {
      setMessage({ type: "error", text: "กรุณาเลือกช่องทางส่งอย่างน้อย 1 ช่องทาง" });
      return;
    }

    setSendingBroadcast(true);
    setBroadcastResult(null);

    try {
      const results = { inAppSent: 0, pushSent: 0, pushFailed: 0 };
      const promises = [];

      // In-App: เขียน notifications ลง Firestore
      if (deliveryInApp) {
        const inAppPromise = addDoc(collection(db, "notifications"), {
          userId: broadcastTarget, // "all" | "staff" | "admin"
          title: broadcastTitle.trim(),
          message: broadcastMessage.trim(),
          type: "broadcast",
          read: false,
          timestamp: new Date(),
          sentBy: user.email,
        }).then(() => {
          results.inAppSent = broadcastTarget === "all" ? userCounts.total
            : broadcastTarget === "staff" ? userCounts.staff : userCounts.admin;
        });
        promises.push(inAppPromise);
      }

      // Push: ส่งผ่าน backend API
      if (deliveryPush) {
        const pushPromise = (async () => {
          const currentUser = auth.currentUser;
          if (!currentUser) throw new Error("ไม่ได้ล็อกอิน");
          const idToken = await currentUser.getIdToken();
          const backendBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api").replace(/\/api\/?$/, "");
          const res = await fetch(`${backendBase}/api/notify/broadcast`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              title: broadcastTitle.trim(),
              body: broadcastMessage.trim(),
              data: { target: broadcastTarget },
            }),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Push failed");
          }
          const data = await res.json();
          results.pushSent = data.sentCount || 0;
          results.pushFailed = data.failedCount || 0;
        })();
        promises.push(pushPromise);
      }

      const settled = await Promise.allSettled(promises);

      // รวบรวม errors จากทุก channel
      const errors = settled
        .filter((r) => r.status === "rejected")
        .map((r) => {
          const e = r.reason;
          return e?.message || (typeof e === "string" ? e : JSON.stringify(e)) || "ส่งไม่สำเร็จ";
        });

      if (errors.length > 0 && settled.every((r) => r.status === "rejected")) {
        // ทุก channel ล้มเหลว
        throw new Error(errors.join(" | "));
      }

      setBroadcastResult({ success: true, ...results, partialError: errors[0] || null });
      setMessage({
        type: "success",
        text: `ส่งประกาศสำเร็จ${results.inAppSent ? ` (In-App: ${results.inAppSent} คน)` : ""}${results.pushSent ? ` (Push: ${results.pushSent} คน)` : ""}`,
      });

      // Clear form
      setBroadcastTitle("");
      setBroadcastMessage("");
    } catch (err) {
      const errMsg = err?.message || (typeof err === "string" ? err : JSON.stringify(err)) || "ส่งไม่สำเร็จ";
      console.error("[Broadcast] Error:", errMsg, err);
      setBroadcastResult({ success: false, error: errMsg });
      setMessage({
        type: "error",
        text: "ไม่สามารถส่งประกาศได้: " + errMsg,
      });
    } finally {
      setSendingBroadcast(false);
    }
  }

  // Parse import data จาก tab-separated text
  function parseImportData(text) {
    setImportError("");
    setImportResult(null);
    if (!text.trim()) {
      setImportPreview([]);
      return;
    }

    const lines = text
      .trim()
      .split("\n")
      .filter((l) => l.trim());
    const parsed = [];
    const errors = [];

    lines.forEach((line, i) => {
      // แยกด้วย tab หรือหลาย space
      const cols = line.split(/\t/).map((c) => c.trim());
      // format: date, time, displayName, recipient(optional), minorTask, mainDuty, comment(optional)
      if (cols.length < 5) {
        errors.push(`แถว ${i + 1}: ข้อมูลไม่ครบ (ต้องการอย่างน้อย 5 คอลัมน์)`);
        return;
      }

      const [
        dateRaw,
        time,
        displayName,
        recipient,
        minorTask,
        mainDuty,
        comment,
      ] = cols;

      // แปลงวันที่ dd/m/yyyy หรือ d/m/yyyy -> yyyy-mm-dd
      let date = "";
      if (dateRaw) {
        const parts = dateRaw.split("/");
        if (parts.length === 3) {
          const d = parts[0].padStart(2, "0");
          const m = parts[1].padStart(2, "0");
          const y = parts[2];
          date = `${y}-${m}-${d}`;
        } else {
          date = dateRaw;
        }
      }

      if (!date || !displayName) {
        errors.push(`แถว ${i + 1}: ไม่มีวันที่หรือชื่อพนักงาน`);
        return;
      }

      parsed.push({
        date,
        time: time || "",
        employeeDisplayName: displayName,
        employeeName: displayName,
        employeeId: "", // จะหาจาก displayName
        recipient: recipient || "",
        minorTask: minorTask || "",
        mainDuty: mainDuty || "",
        comment: comment || "",
      });
    });

    if (errors.length > 0) {
      setImportError(errors.join("\n"));
    }
    setImportPreview(parsed);
    return parsed;
  }

  // นำเข้า worklogs จาก parsed data
  async function importWorklogs() {
    if (importPreview.length === 0) {
      setImportError("ไม่มีข้อมูลที่จะนำเข้า");
      return;
    }

    setImporting(true);
    setImportResult(null);
    setImportError("");

    try {
      // โหลด users เพื่อ map displayName -> uid
      const usersSnap = await getDocs(
        query(collection(db, "users"), limit(200)),
      );
      const usersMap = {};
      usersSnap.docs.forEach((d) => {
        const u = d.data();
        const name = u.displayName || u.nickname || u.fullName;
        if (name) usersMap[name] = d.id;
      });

      let success = 0;
      let failed = 0;

      await Promise.all(
        importPreview.map(async (row) => {
          try {
            const uid = usersMap[row.employeeDisplayName] || "";
            await addDoc(collection(db, "worklogs"), {
              date: row.date,
              time: row.time,
              employeeId: uid,
              employeeDisplayName: row.employeeDisplayName,
              employeeName: row.employeeDisplayName,
              recipient: row.recipient,
              minorTask: row.minorTask,
              mainDuty: row.mainDuty,
              comment: row.comment || "",
              status: "บันทึกแล้ว",
              createdAt: new Date(),
              createdBy: user.uid,
              createdByName: user.displayName || user.email,
              source: "import",
            });
            success++;
          } catch {
            failed++;
          }
        }),
      );

      await logSystemAction(
        db,
        user,
        "IMPORT_WORKLOGS",
        `Imported ${success} worklog records`,
      );

      setImportResult({ success, failed });
      setImportText("");
      setImportPreview([]);
      setMessage({
        type: "success",
        text: `นำเข้าสำเร็จ ${success} รายการ${failed > 0 ? ` (ล้มเหลว ${failed} รายการ)` : ""}`,
      });
    } catch (err) {
      console.error("Error importing:", err);
      setImportError("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setImporting(false);
    }
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="apple-panel p-8 text-center">
          <p className="text-red-600">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-950">จัดการระบบ</h1>
          <p className="text-slate-600 mt-1">
            จัดการคำขอส่งออกข้อมูลและดูบันทึกการใช้งานระบบ
          </p>
        </div>
        <NotificationBell />
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 rounded-2xl bg-slate-100 p-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("exports")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === "exports"
              ? "bg-white text-slate-950 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <FileSpreadsheet size={18} />
          คำขอส่งออกข้อมูล
          {exportRequests.length > 0 && (
            <span className="ml-1 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
              {exportRequests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("templates")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === "templates"
              ? "bg-white text-slate-950 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <FileSpreadsheet size={18} />
          Templates
        </button>
        <button
          onClick={() => setActiveTab("classroom-schedules")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === "classroom-schedules"
              ? "bg-white text-slate-950 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <BookOpen size={18} />
          ตารางเรียน
        </button>
        <button
          onClick={() => setActiveTab("dl-exam")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === "dl-exam"
              ? "bg-white text-slate-950 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <GraduationCap size={18} />
          ตารางคุมสอบ DL
        </button>
        {isSuperAdmin && (
          <>
            <button
              onClick={() => setActiveTab("logs")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                activeTab === "logs"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <RefreshCw size={18} />
              บันทึกการใช้งาน
            </button>
            <button
              onClick={() => setActiveTab("broadcast")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                activeTab === "broadcast"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Megaphone size={18} />
              ประกาศ
            </button>
            <button
              onClick={() => setActiveTab("import")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                activeTab === "import"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Upload size={18} />
              นำข้อมูลเข้า
            </button>
          </>
        )}
      </div>

      {/* Alert Messages */}
      {message.text && (
        <div
          className={`mb-4 rounded-2xl p-4 text-sm ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : message.type === "error"
                ? "bg-red-50 text-red-700 border border-red-200"
                : message.type === "info"
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "bg-slate-50 text-slate-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Export Requests Tab */}
      {activeTab === "exports" && (
        <div className="apple-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Clock className="text-amber-500" />
              คำขอส่งออกข้อมูลที่รออนุมัติ
            </h2>
            <button
              onClick={loadExportRequests}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              title="รีเฟรช"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto"></div>
              <p className="mt-2 text-slate-600">กำลังโหลด...</p>
            </div>
          ) : exportRequests.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <CheckCircle
                className="mx-auto mb-2 text-emerald-500"
                size={48}
              />
              <p>ไม่มีคำขอส่งออกข้อมูลที่รออนุมัติ</p>
            </div>
          ) : (
            <div className="space-y-4">
              {exportRequests.map((request) => (
                <div
                  key={request.id}
                  className="border border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <User size={16} className="text-slate-400" />
                        <span className="font-medium text-slate-900">
                          {request.staffName || request.staffEmail}
                        </span>
                        <span className="text-xs text-slate-500">
                          ({request.staffEmail})
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                        <Calendar size={14} />
                        <span>
                          {request.exportMode === "fiscal"
                            ? `ปีงบประมาณ ${request.fiscalYear}`
                            : `${request.dateRange?.start} ถึง ${request.dateRange?.end}`}
                        </span>
                      </div>

                      {request.reason && (
                        <p className="text-sm text-slate-700 bg-slate-100 rounded-lg p-2 mb-3">
                          <span className="font-medium">เหตุผล:</span>{" "}
                          {request.reason}
                        </p>
                      )}

                      <p className="text-xs text-slate-400">
                        ขอเมื่อ:{" "}
                        {request.createdAt
                          ?.toDate?.()
                          ?.toLocaleString("th-TH") || "-"}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() =>
                          approveRequest(
                            request.id,
                            request.staffName || request.staffEmail,
                          )
                        }
                        disabled={processingId === request.id}
                        className={`flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition ${
                          processingId === request.id
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        {processingId === request.id ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <CheckCircle size={14} />
                        )}
                        อนุมัติ
                      </button>
                      <button
                        onClick={() =>
                          rejectRequest(
                            request.id,
                            request.staffName || request.staffEmail,
                          )
                        }
                        disabled={processingId === request.id}
                        className={`flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition ${
                          processingId === request.id
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        {processingId === request.id ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <XCircle size={14} />
                        )}
                        ปฏิเสธ
                      </button>
                      <button
                        onClick={() => downloadForStaff(request)}
                        disabled={processingId === request.id}
                        className={`flex items-center gap-1 px-3 py-1.5 bg-slate-600 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition ${
                          processingId === request.id
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        {processingId === request.id ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Download size={14} />
                        )}
                        ดาวน์โหลด
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* System Logs Tab - Superadmin only */}
      {activeTab === "logs" && isSuperAdmin && (
        <div className="apple-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">บันทึกการใช้งานระบบ</h2>
            <button
              onClick={exportSystemLogs}
              disabled={systemLogs.length === 0}
              className={`flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition ${
                systemLogs.length === 0 ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <Download size={16} />
              ส่งออก CSV
            </button>
          </div>

          {/* Filter Section */}
          <div className="bg-slate-50 rounded-xl p-4 mb-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  วันที่เริ่มต้น
                </label>
                <input
                  type="date"
                  value={logsStartDate}
                  onChange={(e) => setLogsStartDate(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  วันที่สิ้นสุด
                </label>
                <input
                  type="date"
                  value={logsEndDate}
                  onChange={(e) => setLogsEndDate(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  จำนวนรายการ (Quota)
                </label>
                <select
                  value={logsLimit}
                  onChange={(e) => setLogsLimit(Number(e.target.value))}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={50}>50 รายการ</option>
                  <option value={100}>100 รายการ</option>
                  <option value={200}>200 รายการ</option>
                  <option value={500}>500 รายการ</option>
                </select>
              </div>
              <button
                onClick={loadSystemLogs}
                disabled={loading}
                className="flex items-center gap-1 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
              >
                <RefreshCw
                  size={14}
                  className={loading ? "animate-spin" : ""}
                />
                โหลดข้อมูล
              </button>
              {(logsStartDate || logsEndDate) && (
                <button
                  onClick={() => {
                    setLogsStartDate("");
                    setLogsEndDate("");
                  }}
                  className="px-3 py-1.5 text-slate-500 hover:text-slate-700 text-sm"
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>
          </div>

          {/* Row Count Display */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-600">
              แสดง{" "}
              <span className="font-medium text-slate-900">
                {totalLogsCount}
              </span>{" "}
              รายการ
              {logsLimit < 500 && (
                <span className="text-slate-400 ml-1">
                  (จำกัดเพื่อประหยัด quota)
                </span>
              )}
            </p>
            <p className="text-xs text-slate-400">
              บันทึก: login, logout, สร้างงาน, แก้ไขงาน, ลบงาน, export, อนุมัติ
              user
            </p>
          </div>

          {systemLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>ไม่มีบันทึกการใช้งาน</p>
              <p className="text-sm mt-1">
                (ระบบจะบันทึกเมื่อมีการ login, logout, สร้างงาน, ลบงาน)
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto border border-slate-100 rounded-xl">
              {systemLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 p-3 border-b border-slate-100 text-sm hover:bg-slate-50"
                >
                  <span className="text-xs text-slate-400 whitespace-nowrap w-36">
                    {log.timestamp?.toDate?.()?.toLocaleString("th-TH") ||
                      new Date(log.timestamp).toLocaleString("th-TH") ||
                      "-"}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                      log.type === "error"
                        ? "bg-red-100 text-red-700"
                        : log.type === "warning"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {log.action}
                  </span>
                  <span className="text-slate-700 flex-1 truncate">
                    {log.details || log.message}
                  </span>
                  <span
                    className="text-slate-500 text-xs whitespace-nowrap"
                    title={log.userEmail}
                  >
                    {getEmailPrefix(log.userEmail)}
                  </span>
                  {log.targetUser && (
                    <span className="text-slate-400 text-xs whitespace-nowrap">
                      → {String(log.targetUser).substring(0, 8)}...
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Broadcast Tab - Superadmin only — Unified Broadcast Center v2 */}
      {activeTab === "broadcast" && isSuperAdmin && (() => {
        const canSend =
          broadcastTitle.trim().length > 0 &&
          broadcastMessage.trim().length > 0 &&
          (deliveryInApp || deliveryPush);
        const recipientCount =
          broadcastTarget === "all" ? userCounts.total
          : broadcastTarget === "staff" ? userCounts.staff
          : userCounts.admin;

        const deliveryCards = [
          {
            id: "inApp",
            state: deliveryInApp,
            toggle: () => !sendingBroadcast && setDeliveryInApp(!deliveryInApp),
            icon: Bell,
            iconColor: "bg-blue-500",
            title: "In-App",
            subtitle: "Notification Bell",
            desc: "ผู้ใช้เห็นเมื่อเปิดแอป หรือมีไอคอนแจ้งเตือน",
          },
          {
            id: "push",
            state: deliveryPush,
            toggle: () => !sendingBroadcast && setDeliveryPush(!deliveryPush),
            icon: Smartphone,
            iconColor: "bg-violet-500",
            title: "Push Mobile",
            subtitle: "ถึงมือถือแม้ปิดแอป",
            desc: "ต้องมี FCM Token (ผู้ใช้เปิด Push ในเบราว์เซอร์)",
          },
        ];

        return (
          <div>
            {/* Page Header */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-950 flex items-center gap-2">
                <Megaphone size={20} />
                ส่งประกาศ
                <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded-full">Superadmin</span>
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                เขียนข้อความครั้งเดียว ส่งได้ทั้ง In-App และ Push Mobile
              </p>
            </div>

            {/* Responsive Grid: 1-col mobile/iPad, 2-col desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">

              {/* LEFT: Composer */}
              <div className="space-y-5">

                {/* Message Composer Card */}
                <div className="apple-panel p-4 md:p-6 space-y-4">
                  <div>
                    <label htmlFor="bc-title" className="apple-label">
                      หัวข้อประกาศ *
                    </label>
                    <input
                      id="bc-title"
                      type="text"
                      className="apple-input"
                      placeholder="เช่น แจ้งอัพเดตระบบ, ปิดปรับปรุงชั่วคราว"
                      maxLength={100}
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      disabled={sendingBroadcast}
                      aria-required="true"
                    />
                  </div>
                  <div>
                    <label htmlFor="bc-body" className="apple-label">
                      ข้อความ *
                    </label>
                    <textarea
                      id="bc-body"
                      className="apple-input resize-none"
                      placeholder="พิมพ์รายละเอียดประกาศที่นี่..."
                      rows={4}
                      maxLength={500}
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      disabled={sendingBroadcast}
                      aria-required="true"
                    />
                    <p className="text-right text-xs text-slate-400 mt-1">
                      {broadcastMessage.length}/500
                    </p>
                  </div>
                </div>

                {/* Delivery Option Cards */}
                <div>
                  <p className="apple-label mb-3">ส่งไปที่ไหน</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {deliveryCards.map(({ id, state, toggle, icon: Icon, iconColor, title, subtitle, desc }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={toggle}
                        disabled={sendingBroadcast}
                        className={`
                          w-full text-left p-4 rounded-2xl border-2
                          transition-all duration-200 active:scale-[0.98]
                          ${state
                            ? "border-slate-900 bg-slate-900/[0.03]"
                            : "border-slate-200 bg-white/60 hover:border-slate-300"
                          }
                        `}
                        aria-pressed={state}
                        aria-label={`${state ? "ปิด" : "เปิด"} การส่งแบบ ${title}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white transition-colors duration-200 ${state ? iconColor : "bg-slate-200"}`}>
                              <Icon size={20} />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 text-[15px] leading-tight">{title}</p>
                              <p className="text-slate-500 text-xs mt-0.5">{subtitle}</p>
                            </div>
                          </div>
                          {/* iOS Toggle — visual only */}
                          <div
                            className={`relative w-12 h-7 rounded-full flex-shrink-0 transition-colors duration-200 ${state ? "bg-emerald-500" : "bg-slate-200"}`}
                            aria-hidden="true"
                          >
                            <span className={`absolute top-[3px] left-[3px] w-[22px] h-[22px] bg-white rounded-full shadow-sm transition-transform duration-200 ${state ? "translate-x-[20px]" : "translate-x-0"}`} />
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-3 ml-[52px]">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Audience */}
                <div>
                  <p className="apple-label mb-3">ส่งถึงใคร</p>
                  <div className="flex rounded-xl bg-slate-100 p-1 gap-1" role="radiogroup" aria-label="กลุ่มเป้าหมาย">
                    {[
                      { value: "all",   label: "ทุกคน",   count: userCounts.total },
                      { value: "staff", label: "พนักงาน", count: userCounts.staff },
                      { value: "admin", label: "แอดมิน",  count: userCounts.admin },
                    ].map(({ value, label, count }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => !sendingBroadcast && setBroadcastTarget(value)}
                        className={`
                          flex-1 flex items-center justify-center gap-1.5
                          py-2 px-2 rounded-lg text-sm font-medium
                          transition-all duration-150
                          ${broadcastTarget === value
                            ? "bg-white text-slate-950 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                          }
                        `}
                        aria-pressed={broadcastTarget === value}
                      >
                        <span>{label}</span>
                        {count > 0 && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                            broadcastTarget === value
                              ? "bg-slate-100 text-slate-600"
                              : "bg-slate-200/60 text-slate-400"
                          }`}>
                            {count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Validation Hint — shown before result */}
                {!canSend && (broadcastTitle || broadcastMessage) && (
                  <p className="text-xs text-slate-400 text-center">
                    {!broadcastTitle.trim() ? "กรุณากรอกหัวข้อ"
                      : !broadcastMessage.trim() ? "กรุณากรอกข้อความ"
                      : "เลือกช่องทางส่งอย่างน้อย 1 ช่องทาง"}
                  </p>
                )}

                {/* Result Feedback */}
                {broadcastResult?.success && (
                  <div
                    className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3"
                    role="alert"
                    aria-live="polite"
                  >
                    <CheckCircle size={20} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold text-emerald-800">ส่งประกาศสำเร็จ</p>
                      <div className="text-emerald-700 mt-1 space-y-0.5 text-xs">
                        {broadcastResult.inAppSent != null && (
                          <p>In-App: {broadcastResult.inAppSent} คน</p>
                        )}
                        {broadcastResult.pushSent != null && (
                          <p>Push: {broadcastResult.pushSent} คน{broadcastResult.pushFailed > 0 && ` (ล้มเหลว ${broadcastResult.pushFailed})`}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {broadcastResult?.error && (
                  <div
                    className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-start gap-3"
                    role="alert"
                    aria-live="assertive"
                  >
                    <AlertCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold text-red-800">ส่งไม่สำเร็จ</p>
                      <p className="text-red-600 mt-1 text-xs">{broadcastResult.error}</p>
                    </div>
                  </div>
                )}

                {/* Validation Hint */}
                {!canSend && (broadcastTitle || broadcastMessage) && (
                  <p className="text-xs text-slate-400 text-center">
                    {!broadcastTitle.trim() ? "กรุณากรอกหัวข้อ"
                      : !broadcastMessage.trim() ? "กรุณากรอกข้อความ"
                      : "เลือกช่องทางส่งอย่างน้อย 1 ช่องทาง"}
                  </p>
                )}

                {/* Send Button */}
                <div className="flex md:justify-center">
                <button
                  onClick={sendBroadcastNotification}
                  disabled={!canSend || sendingBroadcast}
                  aria-disabled={!canSend}
                  className="apple-button w-full md:w-auto md:min-w-[220px] flex items-center justify-center gap-2"
                >
                  {sendingBroadcast ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      กำลังส่ง...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      {canSend ? `ส่งถึง ${recipientCount} คน` : "เลือกช่องทางก่อน"}
                    </>
                  )}
                </button>
                </div>
              </div>

              {/* RIGHT: Preview Panel — Desktop only (lg+) */}
              <div className="hidden lg:block space-y-4">
                <p className="apple-label">ตัวอย่างที่ผู้ใช้จะเห็น</p>

                {/* In-App Preview */}
                {deliveryInApp ? (
                  <div className="apple-panel p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
                        <Bell size={14} className="text-white" />
                      </div>
                      <span className="text-xs font-semibold text-slate-500">Notification Bell</span>
                      <span className="text-xs text-slate-300 ml-auto">เมื่อกี้</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 leading-snug">
                      {broadcastTitle || <span className="text-slate-300 font-normal">หัวข้อ...</span>}
                    </p>
                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                      {broadcastMessage || <span className="text-slate-300">ข้อความ...</span>}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 p-4 text-center">
                    <Bell size={20} className="text-slate-300 mx-auto mb-1" />
                    <p className="text-xs text-slate-300">เปิด In-App เพื่อดูตัวอย่าง</p>
                  </div>
                )}

                {/* Push Preview */}
                {deliveryPush ? (
                  <div className="rounded-2xl bg-slate-900 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                        <Smartphone size={14} className="text-white" />
                      </div>
                      <span className="text-xs font-semibold text-white/50">Push Notification</span>
                      <span className="text-xs text-white/30 ml-auto">ตอนนี้</span>
                    </div>
                    <p className="text-sm font-semibold text-white leading-snug">
                      {broadcastTitle || <span className="text-white/30 font-normal">หัวข้อ...</span>}
                    </p>
                    <p className="text-xs text-white/60 line-clamp-3 leading-relaxed">
                      {broadcastMessage || <span className="text-white/30">ข้อความ...</span>}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 p-4 text-center">
                    <Smartphone size={20} className="text-slate-300 mx-auto mb-1" />
                    <p className="text-xs text-slate-300">เปิด Push เพื่อดูตัวอย่าง</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })()}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <TemplateManager />
      )}

      {/* Classroom Schedules Tab */}
      {activeTab === "classroom-schedules" && (
        <ScheduleManager />
      )}

      {/* DL Exam Schedules Tab */}
      {activeTab === "dl-exam" && (
        <DLExamManager />
      )}

      {/* Import Worklogs Tab */}
      {activeTab === "import" && isSuperAdmin && (
        <div className="space-y-6">
          <div className="apple-panel p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
                <Upload size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  นำข้อมูลงานเข้าระบบ
                </h2>
                <p className="text-sm text-slate-500">
                  วาง tab-separated data เพื่อนำเข้าหลาย record พร้อมกัน
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mb-4 text-sm text-slate-600">
              <p className="font-medium mb-2">
                รูปแบบข้อมูล (แต่ละคอลัมน์คั่นด้วย Tab):
              </p>
              <code className="block bg-white p-3 rounded-lg text-xs font-mono border border-slate-200 whitespace-pre">
                {`วันที่        เวลา      ชื่อ (displayName)  ผู้รับบริการ  ประเภทงาน (minorTask)  ประเภทหน้าที่ (mainDuty)  หมายเหตุ
12/5/2026   13:47:22  เพียงธาร                           ให้บริการรับแจ้งฯ       Software ลิขสิทธิ์         Solidworks
12/5/2026   13:47:23  พงศกร         6701021610197  ให้บริการรับแจ้งฯ       Software ลิขสิทธิ์         Solidworks`}
              </code>
              <p className="mt-2 text-xs text-slate-500">
                * คอลัมน์ที่ไม่บังคับ: ผู้รับบริการ, หมายเหตุ
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                วางข้อมูลที่นี่ <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={8}
                value={importText}
                onChange={(e) => {
                  setImportText(e.target.value);
                  parseImportData(e.target.value);
                }}
                placeholder="วางข้อมูลจาก Excel หรือ Spreadsheet (Tab-separated)..."
                className="w-full px-4 py-3 border border-slate-200 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
              />
            </div>

            {importError && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle
                    size={16}
                    className="text-red-500 mt-0.5 flex-shrink-0"
                  />
                  <pre className="text-xs text-red-700 whitespace-pre-wrap">
                    {importError}
                  </pre>
                </div>
              </div>
            )}

            {importPreview.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-slate-700 mb-2">
                  ตัวอย่างข้อมูลที่จะนำเข้า ({importPreview.length} รายการ)
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                      <tr>
                        <th className="px-3 py-2 text-left">วันที่</th>
                        <th className="px-3 py-2 text-left">เวลา</th>
                        <th className="px-3 py-2 text-left">ชื่อ</th>
                        <th className="px-3 py-2 text-left">ผู้รับบริการ</th>
                        <th className="px-3 py-2 text-left">ประเภทงาน</th>
                        <th className="px-3 py-2 text-left">ประเภทหน้าที่</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importPreview.slice(0, 10).map((row, i) => (
                        <tr key={i} className="bg-white">
                          <td className="px-3 py-2">{row.date}</td>
                          <td className="px-3 py-2">{row.time}</td>
                          <td className="px-3 py-2 font-medium">
                            {row.employeeDisplayName}
                          </td>
                          <td className="px-3 py-2 text-slate-500">
                            {row.recipient || "-"}
                          </td>
                          <td className="px-3 py-2">{row.minorTask}</td>
                          <td className="px-3 py-2">{row.mainDuty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importPreview.length > 10 && (
                    <p className="text-xs text-slate-500 p-2 text-center">
                      ...และอีก {importPreview.length - 10} รายการ
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-3">
              <button
                onClick={importWorklogs}
                disabled={importing || importPreview.length === 0}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    กำลังนำเข้า...
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    นำเข้า{" "}
                    {importPreview.length > 0
                      ? `(${importPreview.length} รายการ)`
                      : ""}
                  </>
                )}
              </button>
              {importPreview.length > 0 && (
                <button
                  onClick={() => {
                    setImportText("");
                    setImportPreview([]);
                    setImportError("");
                    setImportResult(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition text-sm"
                >
                  ล้าง
                </button>
              )}
            </div>

            {importResult && (
              <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle size={18} className="text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-800">
                    นำเข้าเสร็จสิ้น: สำเร็จ {importResult.success} รายการ
                    {importResult.failed > 0 &&
                      `, ล้มเหลว ${importResult.failed} รายการ`}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
