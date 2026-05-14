"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../../components/AuthProvider";
import { AppShell } from "../../../components/AppShell";
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
import { db } from "../../../lib/firebase";
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
  const [activeTab, setActiveTab] = useState("exports"); // "exports" | "logs"

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

  // Import worklogs states (superadmin only)
  const [importText, setImportText] = useState("");
  const [importPreview, setImportPreview] = useState([]);
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const isSuperAdmin = user?.role === "superadmin";
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

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

  // Send broadcast notification (superadmin only)
  async function sendBroadcastNotification() {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      setMessage({ type: "error", text: "กรุณากรอกหัวข้อและข้อความ" });
      return;
    }

    setSendingBroadcast(true);
    try {
      // สร้าง notification ตามกลุ่มเป้าหมาย
      const notifications = [];

      if (broadcastTarget === "all" || broadcastTarget === "staff") {
        notifications.push({
          userId: "staff", // staff ทั้งหมด
          title: broadcastTitle,
          message: broadcastMessage,
          type: "broadcast",
          read: false,
          timestamp: new Date(),
          sentBy: user.email,
        });
      }

      if (broadcastTarget === "all" || broadcastTarget === "admin") {
        notifications.push({
          userId: "admin", // admin/superadmin
          title: broadcastTitle,
          message: broadcastMessage,
          type: "broadcast",
          read: false,
          timestamp: new Date(),
          sentBy: user.email,
        });
      }

      // ส่งทั้งหมด
      await Promise.all(
        notifications.map((notif) =>
          addDoc(collection(db, "notifications"), notif),
        ),
      );

      setMessage({
        type: "success",
        text: `ส่งประกาศถึง ${broadcastTarget === "all" ? "ทุกคน" : broadcastTarget === "staff" ? "พนักงาน" : "แอดมิน"} สำเร็จ`,
      });

      // Clear form
      setBroadcastTitle("");
      setBroadcastMessage("");
      setBroadcastTarget("all");
    } catch (err) {
      console.error("Error sending broadcast:", err);
      setMessage({
        type: "error",
        text: "ไม่สามารถส่งประกาศได้: " + err.message,
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
      <div className="mb-6 flex gap-2 rounded-2xl bg-slate-100 p-2">
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
              <User size={18} />
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
                      → {log.targetUser.substring(0, 8)}...
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Broadcast Tab - Superadmin only */}
      {activeTab === "broadcast" && isSuperAdmin && (
        <div className="apple-panel p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">ส่งประกาศ</h2>
              <p className="text-sm text-slate-600 mt-1">
                ส่งการแจ้งเตือนไปยังพนักงานหรือแอดมินทั้งหมด
              </p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ส่งถึง
                </label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-indigo-500 transition">
                    <input
                      type="radio"
                      name="broadcastTarget"
                      value="all"
                      checked={broadcastTarget === "all"}
                      onChange={(e) => setBroadcastTarget(e.target.value)}
                      className="text-indigo-600"
                    />
                    <span className="text-sm">ทุกคน</span>
                  </label>
                  <label className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-indigo-500 transition">
                    <input
                      type="radio"
                      name="broadcastTarget"
                      value="staff"
                      checked={broadcastTarget === "staff"}
                      onChange={(e) => setBroadcastTarget(e.target.value)}
                      className="text-indigo-600"
                    />
                    <span className="text-sm">พนักงาน (Staff)</span>
                  </label>
                  <label className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-indigo-500 transition">
                    <input
                      type="radio"
                      name="broadcastTarget"
                      value="admin"
                      checked={broadcastTarget === "admin"}
                      onChange={(e) => setBroadcastTarget(e.target.value)}
                      className="text-indigo-600"
                    />
                    <span className="text-sm">แอดมิน (Admin)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  หัวข้อ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="เช่น แจ้งการอัพเดตระบบ"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ข้อความ <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="รายละเอียดประกาศ..."
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-200">
                <button
                  onClick={sendBroadcastNotification}
                  disabled={
                    sendingBroadcast ||
                    !broadcastTitle.trim() ||
                    !broadcastMessage.trim()
                  }
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingBroadcast ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      กำลังส่ง...
                    </>
                  ) : (
                    <>
                      <User size={18} />
                      ส่งประกาศ
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-amber-50 rounded-xl p-4">
            <h3 className="text-sm font-medium text-amber-900 mb-2">
              💡 คำแนะนำ
            </h3>
            <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
              <li>การประกาศจะแสดงใน Notification Bell ของผู้ใช้ทันที</li>
              <li>ผู้ใช้สามารถลบการแจ้งเตือนได้หลังจากอ่านแล้ว</li>
              <li>
                ใช้สำหรับแจ้งข่าวสารสำคัญ เช่น การอัพเดตระบบ
                หรือการแจ้งเตือนทั่วไป
              </li>
            </ul>
          </div>
        </div>
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
