"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, Calendar } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { downloadCsv } from "../../lib/api";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";

export default function ExportPage() {
  const [exportMode, setExportMode] = useState("fiscal"); // "fiscal" | "range"
  const [fiscalYear, setFiscalYear] = useState("2569");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  // คำนวณวันเริ่มต้นและสิ้นสุดของปีงบประมาฐไทย
  const getFiscalYearDates = (fy) => {
    const year = parseInt(fy) - 543; // แปลง พ.ศ. เป็น ค.ศ.
    return {
      start: `${year - 1}-10-01`, // 1 ต.ค. ปีก่อน
      end: `${year}-09-30`, // 30 ก.ย. ปีปัจจุบัน
    };
  };

  // Client-side CSV export from Firestore
  async function exportFromFirestore(start, end, filename) {
    const worklogsRef = collection(db, "worklogs");
    const q = query(
      worklogsRef,
      where("date", ">=", start),
      where("date", "<=", end),
    );

    const snapshot = await getDocs(q);
    const worklogs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort by date descending
    worklogs.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

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
      log.requesterName || "",
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
      let url;
      let filename;

      if (exportMode === "fiscal") {
        url = `/export/fiscal-year/${encodeURIComponent(fiscalYear)}.csv`;
        filename = `icit-workload-fy${fiscalYear}.csv`;
      } else {
        // ตรวจสอบว่ามีวันที่ครบหรือไม่
        if (!startDate || !endDate) {
          throw new Error("กรุณาระบุวันที่เริ่มต้นและสิ้นสุด");
        }
        if (startDate > endDate) {
          throw new Error("วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด");
        }
        url = `/export/range?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}.csv`;
        filename = `icit-workload-${startDate}_to_${endDate}.csv`;
      }

      // Check if backend is enabled
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      if (apiUrl) {
        // Use backend API
        await downloadCsv(url, filename);
      } else {
        // Client-side export from Firestore
        const start =
          exportMode === "fiscal"
            ? getFiscalYearDates(fiscalYear).start
            : startDate;
        const end =
          exportMode === "fiscal"
            ? getFiscalYearDates(fiscalYear).end
            : endDate;
        await exportFromFirestore(start, end, filename);
      }
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
              หัวข้อการให้บริการ, หัวข้อรอง, Comment, สถานะ, แหล่งข้อมูล
            </p>
          </div>

          <button
            onClick={exportCsv}
            disabled={loading}
            className="apple-button mt-8 inline-flex w-full items-center justify-center gap-2"
          >
            <Download size={18} />
            {loading ? "Exporting…" : "Download CSV"}
          </button>
        </div>
      </section>
    </AppShell>
  );
}
