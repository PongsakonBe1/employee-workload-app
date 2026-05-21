"use client";

import { useState, useEffect } from "react";
import {
  Download,
  FileSpreadsheet,
  Calendar,
  Clock,
  CheckCircle,
  Users,
  User,
} from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { db } from "../../lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  doc,
  updateDoc,
  orderBy,
  limit,
} from "firebase/firestore";
import { useAuth } from "../../components/AuthProvider";

export default function ExportPage() {
  const { user } = useAuth();
  const [exportMode, setExportMode] = useState("fiscal"); // "fiscal" | "range"
  const [fiscalYear, setFiscalYear] = useState("2569");  // ปีงบประมาณปัจจุบัน
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  // Admin: เลือกส่งออกข้อมูลทั้งหมดหรือตัวเอง
  const [exportScope, setExportScope] = useState("all"); // "all" | "self"

  // Staff: สถานะคำขอส่งออก
  const [pendingRequest, setPendingRequest] = useState(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestReason, setRequestReason] = useState("");

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const isStaff = user?.role === "staff";

  // Staff: โหลดคำขอส่งออกล่าสุดจาก localStorage (ไม่สามารถ query ได้ตาม rules)
  async function loadPendingRequest() {
    if (!isStaff || !user) return;

    try {
      // อ่าน requestId ล่าสุดจาก localStorage
      const savedRequestId = localStorage.getItem(`exportRequest_${user.uid}`);
      if (savedRequestId) {
        const docRef = doc(db, "exportRequests", savedRequestId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          // ตรวจสอบว่าเป็นของตัวเองและยังไม่ถูก reject
          if (data.staffId === user.uid && data.status !== "rejected") {
            setPendingRequest({ id: docSnap.id, ...data });
            return;
          }
        }
        // ถ้าไม่ valid ให้ลบออก
        localStorage.removeItem(`exportRequest_${user.uid}`);
      }
      setPendingRequest(null);
    } catch (err) {
      console.error("Error loading request:", err);
      setPendingRequest(null);
    }
  }

  useEffect(() => {
    loadPendingRequest();
    // Refresh ทุก 2 นาที (ประหยัด quota)
    const interval = setInterval(loadPendingRequest, 120000);
    return () => clearInterval(interval);
  }, [isStaff, user]);

  // Staff: สร้างคำขอส่งออก
  async function createExportRequest() {
    if (!requestReason.trim()) {
      setError("กรุณาระบุเหตุผลในการส่งออกข้อมูล");
      return;
    }

    setLoading(true);
    try {
      const start =
        exportMode === "fiscal"
          ? getFiscalYearDates(fiscalYear).start
          : startDate;
      const end =
        exportMode === "fiscal" ? getFiscalYearDates(fiscalYear).end : endDate;

      const requestData = {
        staffId: user.uid,
        staffEmail: user.email,
        staffName: user.displayName || user.email,
        exportMode,
        fiscalYear: exportMode === "fiscal" ? fiscalYear : null,
        startDate: exportMode === "range" ? startDate : null,
        endDate: exportMode === "range" ? endDate : null,
        dateRange: { start, end },
        reason: requestReason,
        status: "pending",
        createdAt: new Date(),
      };
      const docRef = await addDoc(
        collection(db, "exportRequests"),
        requestData,
      );

      // บันทึก requestId ลง localStorage เพื่อให้สามารถอ่านกลับมาได้
      localStorage.setItem(`exportRequest_${user.uid}`, docRef.id);

      setDone("ส่งคำขอส่งออกข้อมูลแล้ว รอการอนุมัติจากแอดมิน");
      setShowRequestForm(false);
      setRequestReason("");
      // โหลดสถานะทันที
      loadPendingRequest();
    } catch (err) {
      setError("ไม่สามารถส่งคำขอได้: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // คำนวณวันเริ่มต้นและสิ้นสุดของปีงบประมาฐไทย
  const getFiscalYearDates = (fy) => {
    const year = parseInt(fy) - 543; // แปลง พ.ศ. เป็น ค.ศ.
    return {
      start: `${year - 1}-10-01`, // 1 ต.ค. ปีก่อน
      end: `${year}-09-30`, // 30 ก.ย. ปีปัจจุบัน
    };
  };

  // Client-side CSV export from Firestore
  async function exportFromFirestore(
    start,
    end,
    filename,
    isApprovedRequest = false,
  ) {
    const worklogsRef = collection(db, "worklogs");

    // Build query constraints
    const constraints = [where("date", ">=", start), where("date", "<=", end)];

    // Admin เลือกส่งออกเฉพาะตัวเอง
    if (isAdmin && exportScope === "self") {
      constraints.push(where("employeeId", "==", user.uid));
    }

    // Staff ต้องมีการอนุมัติก่อน (isApprovedRequest = true เมื่อกดดาวน์โหลดจากคำขอที่อนุมัติแล้ว)
    if (isStaff && !isApprovedRequest) {
      throw new Error("กรุณารอการอนุมัติจากแอดมินก่อนดาวน์โหลดข้อมูล");
    }

    // Staff ที่อนุมัติแล้ว ดึงเฉพาะข้อมูลตัวเอง
    if (isStaff && isApprovedRequest) {
      constraints.push(where("employeeId", "==", user.uid));
    }

    const q = query(worklogsRef, ...constraints);

    const snapshot = await getDocs(q);
    const worklogs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort by date ascending, then time ascending (น้อยไปมาก)
    worklogs.sort((a, b) => {
      const dateCmp = (a.date || "").localeCompare(b.date || "");
      if (dateCmp !== 0) return dateCmp;
      return (a.time || "").localeCompare(b.time || "");
    });

    // Generate CSV
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
      log.requesterName || log.requester || log.clientName || log.customerName || log.receiverName || "",
      log.dutyGroup || log.mainDuty || "",
      log.mainDuty || "",
      log.minorTask || "",
      log.comment || "",
      log.status || "",
    ]);

    // Convert to CSV string
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    // Download
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function exportCsv() {
    setLoading(true);
    setError("");
    setDone("");

    try {
      let filename;
      let start;
      let end;

      if (exportMode === "fiscal") {
        filename = `icit-workload-fy${fiscalYear}.csv`;
        start = getFiscalYearDates(fiscalYear).start;
        end = getFiscalYearDates(fiscalYear).end;
      } else {
        if (!startDate || !endDate) {
          throw new Error("กรุณาระบุวันที่เริ่มต้นและสิ้นสุด");
        }
        if (startDate > endDate) {
          throw new Error("วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด");
        }
        filename = `icit-workload-${startDate}_to_${endDate}.csv`;
        start = startDate;
        end = endDate;
      }

      await exportFromFirestore(start, end, filename);
      setDone(`Export สำเร็จ: ${filename}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="apple-panel p-8">
          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-950 text-white">
            <FileSpreadsheet size={24} />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Annual export
          </p>
          <h1 className="mt-3 text-5xl font-semibold tracking-tight text-slate-950">
            Export fiscal-year CSV.
          </h1>
          <p className="mt-5 text-slate-600">
            Export uses Thai fiscal-year boundaries. FY 2569 exports records
            from 2025-10-01 through 2026-09-30.
          </p>
        </div>

        <div className="apple-panel p-8">
          {error ? (
            <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          {done ? (
            <div className="mb-6 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">
              {done}
            </div>
          ) : null}

          {/* Admin: Export Scope Selection */}
          {isAdmin && (
            <div className="mb-4 flex gap-2 rounded-2xl bg-indigo-50 p-2">
              <button
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
                  exportScope === "all"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                onClick={() => setExportScope("all")}
              >
                <Users size={16} className="inline mr-2" />
                ข้อมูลทั้งหมด
              </button>
              <button
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
                  exportScope === "self"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                onClick={() => setExportScope("self")}
              >
                <User size={16} className="inline mr-2" />
                เฉพาะของตัวเอง
              </button>
            </div>
          )}

          {/* Export Mode Selection */}
          <div className="mb-6 flex gap-2 rounded-2xl bg-slate-50 p-2">
            <button
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
                exportMode === "fiscal"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setExportMode("fiscal")}
            >
              ตามปีงบประมาณ
            </button>
            <button
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
                exportMode === "range"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setExportMode("range")}
            >
              ตามช่วงวันที่
            </button>
          </div>

          {/* Staff: Pending Request Alert */}
          {isStaff && pendingRequest && (
            <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 p-4">
              <div className="flex items-start gap-3">
                <Clock className="text-amber-600 mt-0.5" size={20} />
                <div className="flex-1">
                  <h4 className="font-semibold text-amber-900">
                    {pendingRequest.status === "pending"
                      ? "รอการอนุมัติ"
                      : "อนุมัติแล้ว"}
                  </h4>
                  <p className="text-sm text-amber-800 mt-1">
                    {pendingRequest.status === "pending"
                      ? `คำขอส่งออกข้อมูล (${pendingRequest.dateRange?.start} ถึง ${pendingRequest.dateRange?.end}) กำลังรอการอนุมัติจากแอดมิน`
                      : `คำขอส่งออกข้อมูล (${pendingRequest.dateRange?.start} ถึง ${pendingRequest.dateRange?.end}) ได้รับการอนุมัติแล้ว กดดาวน์โหลดด้านล่าง`}
                  </p>
                  {pendingRequest.reason && (
                    <p className="text-xs text-amber-700 mt-1">
                      เหตุผล: {pendingRequest.reason}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Staff: Request Form */}
          {isStaff && showRequestForm && (
            <div className="mb-6 rounded-2xl bg-slate-50 p-4">
              <h4 className="font-semibold text-slate-900 mb-3">
                ส่งคำขอส่งออกข้อมูล
              </h4>
              <textarea
                className="apple-input w-full mb-3"
                rows={3}
                placeholder="ระบุเหตุผลในการส่งออกข้อมูล..."
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={createExportRequest}
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
                >
                  {loading ? "กำลังส่ง..." : "ส่งคำขอ"}
                </button>
                <button
                  onClick={() => setShowRequestForm(false)}
                  className="px-4 py-2 bg-white text-slate-600 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          )}

          {exportMode === "fiscal" ? (
            <>
              <label className="apple-label">ปีงบประมาณ (พ.ศ.)</label>
              <input
                className="apple-input"
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
                placeholder="2569"
                type="number"
              />
              <p className="mt-2 text-xs text-slate-500">
                ส่งออกข้อมูลตั้งแต่ {getFiscalYearDates(fiscalYear).start} ถึง{" "}
                {getFiscalYearDates(fiscalYear).end}
              </p>
            </>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="apple-label flex items-center gap-2">
                    <Calendar size={14} />
                    วันที่เริ่มต้น
                  </label>
                  <input
                    className="apple-input"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="apple-label flex items-center gap-2">
                    <Calendar size={14} />
                    วันที่สิ้นสุด
                  </label>
                  <input
                    className="apple-input"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="mt-6 rounded-3xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
            <p className="font-semibold text-slate-950">CSV includes</p>
            <p className="mt-2">
              วันที่, เวลา, ผู้ให้บริการ, ผู้รับบริการ, กลุ่มงาน,
              หัวข้อการให้บริการ, หัวข้อรอง, Comment, สถานะ
            </p>
          </div>

          {/* Staff: Request Export Button */}
          {isStaff && !pendingRequest && (
            <button
              onClick={() => setShowRequestForm(true)}
              disabled={loading}
              className="apple-button mt-8 inline-flex w-full items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700"
            >
              <Clock size={18} />
              ขออนุมาติส่งออกข้อมูล
            </button>
          )}

          {/* Staff: Download Approved Request */}
          {isStaff && pendingRequest?.status === "approved" && (
            <button
              onClick={() =>
                exportFromFirestore(
                  pendingRequest.dateRange.start,
                  pendingRequest.dateRange.end,
                  `workload-${pendingRequest.dateRange.start}_to_${pendingRequest.dateRange.end}.csv`,
                  true, // isApprovedRequest
                )
              }
              disabled={loading}
              className="apple-button mt-8 inline-flex w-full items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle size={18} />
              ดาวน์โหลดข้อมูล (อนุมัติแล้ว)
            </button>
          )}

          {/* Admin: Export Button */}
          {isAdmin && (
            <button
              onClick={exportCsv}
              disabled={loading}
              className="apple-button mt-8 inline-flex w-full items-center justify-center gap-2"
            >
              <Download size={18} />
              {loading
                ? "Exporting…"
                : exportScope === "self"
                  ? "Download My Data"
                  : "Download All Data"}
            </button>
          )}
        </div>
      </section>
    </AppShell>
  );
}
