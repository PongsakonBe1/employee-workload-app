"use client";

import "../ui-detail-layouts.css";
import { useState, useEffect, useCallback } from "react";
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
} from "firebase/firestore";
import { useAuth } from "../../components/AuthProvider";
import { getThaiFiscalYearDates } from "../../lib/dateUtils";
import { isAdminRole } from "../../lib/authUtils";

function dutyGroupLabel(dutyGroup, mainDuty) {
  if (dutyGroup === "main") return mainDuty || "งานหลัก";
  if (dutyGroup === "additional") return "งานอื่นๆ ที่ได้รับมอบหมาย";
  return dutyGroup || "";
}

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

  const isAdmin = isAdminRole(user);
  const isStaff = user?.role === "staff";

  // Staff: โหลดคำขอส่งออกล่าสุดจาก localStorage (ไม่สามารถ query ได้ตาม rules)
  const loadPendingRequest = useCallback(async () => {
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
  }, [isStaff, user]);

  useEffect(() => {
    loadPendingRequest();
    // Refresh ทุก 2 นาที (ประหยัด quota)
    const interval = setInterval(loadPendingRequest, 120000);
    return () => clearInterval(interval);
  }, [loadPendingRequest]);

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

  // Alias for backward compatibility within this file
  const getFiscalYearDates = getThaiFiscalYearDates;

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
      log.recipient || log.requesterName || log.requester || log.clientName || log.customerName || log.receiverName || log.client || log.to || "",
      dutyGroupLabel(log.dutyGroup, log.mainDuty),
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
      <section className="ui-management grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
        <div className="apple-panel p-5 sm:p-7">
          <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-[var(--ui-blue)] text-[var(--ui-blue-ink)]">
            <FileSpreadsheet size={22} aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            ส่งออกข้อมูลบันทึกงาน
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ui-sub)]">
            ดาวน์โหลดไฟล์ CSV ตามช่วงวันที่หรือตามปีงบประมาณไทย (1 ตุลาคม ถึง 30 กันยายน)
          </p>
        </div>

        <div className="apple-panel p-5 sm:p-7">
          {error ? (
            <div role="alert" className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          {done ? (
            <div role="status" className="mb-6 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">
              {done}
            </div>
          ) : null}

          {/* Admin: Export Scope Selection */}
          {isAdmin && (
            <div className="ui-option-group ui-option-group-pair mb-4" role="group" aria-label="ขอบเขตข้อมูล">
              <button
                className="ui-option"
                aria-pressed={exportScope === "all"}
                onClick={() => setExportScope("all")}
              >
                <Users size={16} aria-hidden="true" />
                ข้อมูลทั้งหมด
              </button>
              <button
                className="ui-option"
                aria-pressed={exportScope === "self"}
                onClick={() => setExportScope("self")}
              >
                <User size={16} aria-hidden="true" />
                เฉพาะของตัวเอง
              </button>
            </div>
          )}

          {/* Export Mode Selection */}
          <div className="ui-option-group ui-option-group-pair mb-6" role="group" aria-label="ช่วงเวลาส่งออก">
            <button
              className="ui-option"
              aria-pressed={exportMode === "fiscal"}
              onClick={() => setExportMode("fiscal")}
            >
              ตามปีงบประมาณ
            </button>
            <button
              className="ui-option"
              aria-pressed={exportMode === "range"}
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
                aria-label="เหตุผลในการส่งออกข้อมูล"
                rows={3}
                placeholder="ระบุเหตุผลในการส่งออกข้อมูล..."
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={createExportRequest}
                  disabled={loading}
                  className="apple-button"
                >
                  {loading ? "กำลังส่ง..." : "ส่งคำขอ"}
                </button>
                <button
                  onClick={() => setShowRequestForm(false)}
                  className="apple-button-secondary"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          )}

          {exportMode === "fiscal" ? (
            <>
              <label htmlFor="export-fiscal-year" className="apple-label">ปีงบประมาณ (พ.ศ.)</label>
              <input
                id="export-fiscal-year"
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
                  <label htmlFor="export-start" className="apple-label flex items-center gap-2">
                    <Calendar size={14} aria-hidden="true" />
                    วันที่เริ่มต้น
                  </label>
                  <input
                    id="export-start"
                    className="apple-input"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="export-end" className="apple-label flex items-center gap-2">
                    <Calendar size={14} aria-hidden="true" />
                    วันที่สิ้นสุด
                  </label>
                  <input
                    id="export-end"
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
            <p className="font-semibold text-slate-950">ข้อมูลในไฟล์ CSV</p>
            <p className="mt-2">
              วันที่, เวลา, ผู้ให้บริการ, ผู้รับบริการ, กลุ่มงาน,
              หัวข้อการให้บริการ, หัวข้อรอง, หมายเหตุ, สถานะ
            </p>
          </div>

          {/* Staff: Request Export Button */}
          {isStaff && !pendingRequest && (
            <button
              onClick={() => setShowRequestForm(true)}
              disabled={loading}
              className="apple-button mt-6 w-full"
            >
              <Clock size={18} />
              ขออนุมัติส่งออกข้อมูล
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
              className="apple-button mt-6 w-full"
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
              className="apple-button mt-6 w-full"
            >
              <Download size={18} />
              {loading
                ? "กำลังส่งออก…"
                : exportScope === "self"
                  ? "ดาวน์โหลดข้อมูลของฉัน"
                  : "ดาวน์โหลดข้อมูลทั้งหมด"}
            </button>
          )}
        </div>
      </section>
    </AppShell>
  );
}
