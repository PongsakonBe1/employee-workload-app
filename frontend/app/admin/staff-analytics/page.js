"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Download, Users, Search, BarChart2, Activity, Award, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, LayoutList, User } from "lucide-react";
import { AppShell } from "../../../components/AppShell";
import { useAuth } from "../../../components/AuthProvider";
import { isAdminRole } from "../../../lib/authUtils";
import { db } from "../../../lib/firebase";
import {
  collection, query, where, getDocs, orderBy,
} from "firebase/firestore";
import {
  calculateRadarMetrics,
  getTeamAverage,
} from "../../../lib/staffMetrics";
import { SLOT_COLORS, AXES } from "../../../components/StaffRadarChart";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────
const TIME_RANGES = [
  { label: "1 เดือน", value: "1M", days: 30 },
  { label: "3 เดือน", value: "3M", days: 90 },
  { label: "6 เดือน", value: "6M", days: 180 },
  { label: "1 ปี",    value: "1Y", days: 365 },
];

const METRIC_SHORT = {
  volume:        "Vol",
  versatility:   "Ver",
  consistency:   "Con",
  peakHandling:  "Pk",
  documentation: "Doc",
  comboUsage:    "Cmb",
};

const METRIC_FULL_TH = {
  volume:        "ปริมาณงาน — จำนวนรายการที่บันทึกในช่วงเวลานี้",
  versatility:   "หลากหลาย — ทำงานหลายประเภท",
  consistency:   "สม่ำเสมอ — บันทึกงานสม่ำเสมอทุกวัน",
  peakHandling:  "รับงานหนัก — รับมือวันที่มีงานเยอะ",
  documentation: "ลงรายละเอียด — กรอกหมายเหตุครบถ้วน",
  comboUsage:    "ใช้ระบบครบ — ใช้ฟีเจอร์ระบบครบ",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDateRange(days) {
  const end   = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

function avgMetrics(m) {
  if (!m) return 0;
  return Math.round(
    (m.volume + m.versatility + m.consistency + m.peakHandling + m.documentation + m.comboUsage) / 6
  );
}

function exportCSV(rows) {
  const header = ["ชื่อ", "ปริมาณงาน", "หลากหลาย", "สม่ำเสมอ", "รับงานหนัก", "ลงรายละเอียด", "ใช้ระบบ", "เฉลี่ย"];
  const lines  = rows.map((r) => [
    r.name,
    Math.round(r.metrics.volume),
    Math.round(r.metrics.versatility),
    Math.round(r.metrics.consistency),
    Math.round(r.metrics.peakHandling),
    Math.round(r.metrics.documentation),
    Math.round(r.metrics.comboUsage),
    avgMetrics(r.metrics),
  ].join(","));
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `staff-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function MetricPill({ value, label }) {
  const v = Math.round(value ?? 0);
  const color =
    v >= 75 ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
    v >= 50 ? "text-slate-700 bg-slate-50 border-slate-200" :
              "text-amber-700 bg-amber-50 border-amber-200";
  return (
    <div className="flex flex-col items-center">
      <span className={`inline-block rounded-lg px-2 py-0.5 text-sm font-bold tabular-nums border ${color}`}>{v}</span>
      <span className="text-[10px] text-slate-400 mt-0.5">{label}</span>
    </div>
  );
}

// Mini radar — ใช้ recharts โดยตรงเพื่อ performance
function MiniRadar({ metrics, color = "#6366f1", height = 150 }) {
  const data = AXES.map(({ key, labelTH }) => ({
    subject: labelTH,
    value: Math.round(metrics?.[key] ?? 0),
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: "#94a3b8" }} />
        <Radar dataKey="value" stroke={color} fill={color} fillOpacity={0.2} strokeWidth={1.5} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StaffAnalyticsPage() {
  const { user } = useAuth();
  const router   = useRouter();

  // Guard
  useEffect(() => {
    if (user === null) { router.replace("/"); return; }
    if (user && !isAdminRole(user)) { router.replace("/dashboard"); }
  }, [user, router]);

  const [timeRange,      setTimeRange]      = useState("1M");
  const [confirmPending, setConfirmPending] = useState(null); // pending timeRange value
  const [staffList,      setStaffList]      = useState([]);   // all users
  const [worklogs,       setWorklogs]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState("");
  const [searchQuery,    setSearchQuery]    = useState("");
  const [sortMetric,     setSortMetric]     = useState("count");

  function handleTimeRangeChange(val) {
    if (val === "1Y") {
      setConfirmPending(val);
    } else {
      setTimeRange(val);
    }
  }

  const dateRange = useMemo(() => {
    const days = TIME_RANGES.find((t) => t.value === timeRange)?.days ?? 30;
    return getDateRange(days);
  }, [timeRange]);

  // Load all users
  useEffect(() => {
    if (!user) return;
    getDocs(collection(db, "users"))
      .then((snap) => {
        const list = snap.docs.map((d) => ({
          uid:  d.id,
          name: d.data().displayName || d.data().nickname || d.data().email || d.id,
          role: d.data().role || "staff",
        }));
        setStaffList(list);
      })
      .catch(() => {});
  }, [user]);

  // Load worklogs for date range
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError("");
    const q = query(
      collection(db, "worklogs"),
      where("date", ">=", dateRange.start),
      where("date", "<=", dateRange.end),
      orderBy("date", "desc")
    );
    getDocs(q)
      .then((snap) => {
        setWorklogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      })
      .catch((err) => setError("โหลดข้อมูลไม่สำเร็จ: " + err.message))
      .finally(() => setLoading(false));
  }, [user, dateRange]);

  // SR-6: Compute all metrics + benchmark
  const allStaffMetrics = useMemo(() => {
    return staffList.map((s) => ({
      ...s,
      metrics: calculateRadarMetrics(s.uid, worklogs, dateRange),
    }));
  }, [staffList, worklogs, dateRange]);

  // SR-6: Team benchmark
  const benchmarkData = useMemo(() => {
    const metrics = allStaffMetrics.map((s) => s.metrics);
    return getTeamAverage(metrics);
  }, [allStaffMetrics]);

  // Worklog count ต่อคน (ตัวเลขจริง)
  const worklogCountByUid = useMemo(() => {
    const map = {};
    for (const w of worklogs) {
      if (w.employeeId) map[w.employeeId] = (map[w.employeeId] || 0) + 1;
    }
    return map;
  }, [worklogs]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const total = worklogs.length;
    const days  = TIME_RANGES.find((t) => t.value === timeRange)?.days ?? 30;
    const avgPerDay = total > 0 ? (total / days).toFixed(1) : "0";
    const topStaff  = allStaffMetrics.reduce((best, s) => {
      const cnt = worklogCountByUid[s.uid] || 0;
      return cnt > (worklogCountByUid[best?.uid] || 0) ? s : best;
    }, null);
    return { total, avgPerDay, topStaff };
  }, [worklogs, allStaffMetrics, worklogCountByUid, timeRange]);

  // Filtered + sorted ranking list
  const filteredStaff = useMemo(() => {
    let list = allStaffMetrics.filter((s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (sortMetric === "avg") {
      list = list.sort((a, b) => avgMetrics(b.metrics) - avgMetrics(a.metrics));
    } else if (sortMetric === "count") {
      list = list.sort((a, b) => (worklogCountByUid[b.uid] || 0) - (worklogCountByUid[a.uid] || 0));
    } else {
      list = list.sort((a, b) => (b.metrics[sortMetric] ?? 0) - (a.metrics[sortMetric] ?? 0));
    }
    return list;
  }, [allStaffMetrics, searchQuery, sortMetric, worklogCountByUid]);

  const [expandedUid,  setExpandedUid]  = useState(null);
  const [viewMode,      setViewMode]      = useState("list"); // "list" | "single"
  const [singleIndex,   setSingleIndex]   = useState(0);

  // reset index when filteredStaff changes
  const singleStaff = filteredStaff[singleIndex] ?? null;

  if (!user || !isAdminRole(user)) return null;

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Staff Analytics</h1>
          <p className="mt-0.5 text-sm text-slate-400">ภาระงานและประสิทธิภาพทีม — ช่วง {timeRange}</p>
        </div>
        {/* Time Range */}
        <div role="radiogroup" aria-label="ช่วงเวลา" className="flex gap-1 rounded-2xl bg-slate-100 p-1">
          {TIME_RANGES.map((t) => (
            <button
              key={t.value}
              role="radio"
              aria-checked={timeRange === t.value}
              onClick={() => handleTimeRangeChange(t.value)}
              className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-all ${
                timeRange === t.value
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {confirmPending && (
        <div className="mb-4 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-amber-800">โหลดข้อมูล 1 ปีย้อนหลัง?</p>
            <p className="text-xs text-amber-600 mt-0.5">จะใช้ reads มากกว่าปกติ ~1,200+ รายการ อาจโหลดช้าลง</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setConfirmPending(null)}
              className="px-3 py-1.5 rounded-lg text-sm text-amber-700 border border-amber-300 hover:bg-amber-100 transition"
            >
              ยกเลิก
            </button>
            <button
              onClick={() => { setTimeRange(confirmPending); setConfirmPending(null); }}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 transition"
            >
              โหลดเลย
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* ── Summary Cards ────────────────────────────────────────────────── */}
      {!loading && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity size={14} className="text-indigo-400" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">รายการงาน</p>
            </div>
            <p className="text-2xl font-bold text-slate-950">{summaryStats.total.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-0.5">รวมในช่วง {timeRange}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart2 size={14} className="text-sky-400" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">เฉลี่ย/วัน</p>
            </div>
            <p className="text-2xl font-bold text-slate-950">{summaryStats.avgPerDay}</p>
            <p className="text-xs text-slate-400 mt-0.5">รายการต่อวัน (ทั้งทีม)</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-1">
              <Award size={14} className="text-amber-400" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">งานมากสุด</p>
            </div>
            <p className="text-lg font-bold text-slate-950 truncate">
              {summaryStats.topStaff?.name || "-"}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {summaryStats.topStaff ? (worklogCountByUid[summaryStats.topStaff.uid] || 0) + " รายการ" : ""}
            </p>
          </div>
        </div>
      )}

      {/* ── Staff Panel ────────────────────────────────────────────────── */}
      <div className="apple-panel p-4 md:p-6">
        {/* Toolbar row 1 */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Users size={18} className="text-slate-400 flex-shrink-0" />
            <h2 className="text-base font-semibold text-slate-950 whitespace-nowrap">ภาระงานรายคน</h2>
            <span className="text-xs text-slate-400 whitespace-nowrap">{filteredStaff.length} คน</span>
          </div>
          {/* View toggle */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 flex-shrink-0">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                viewMode === "list" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <LayoutList size={13} />
              <span className="hidden sm:inline">รายการ</span>
            </button>
            <button
              onClick={() => { setViewMode("single"); setSingleIndex(0); }}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                viewMode === "single" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <User size={13} />
              <span className="hidden sm:inline">ทีละคน</span>
            </button>
          </div>
        </div>
        {/* Toolbar row 2 */}
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="ค้นหา..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <select
            value={sortMetric}
            onChange={(e) => setSortMetric(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 max-w-[130px]"
          >
            <option value="count">งาน</option>
            <option value="avg">Avg</option>
            {Object.entries(METRIC_SHORT).map(([k, sh]) => (
              <option key={k} value={k}>{sh}</option>
            ))}
          </select>
          <button
            onClick={() => exportCSV(filteredStaff)}
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors flex-shrink-0"
          >
            <Download size={13} />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
          </div>
        ) : filteredStaff.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">ไม่มีข้อมูล</p>
        ) : viewMode === "single" ? (
          /* ─── SINGLE VIEW ────────────────────────────────────────────── */
          singleStaff ? (
            <div>
              {/* Navigation bar */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => setSingleIndex((i) => Math.max(0, i - 1))}
                  disabled={singleIndex === 0}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} /> ก่อนหน้า
                </button>
                <div className="text-center">
                  <p className="text-xs text-slate-400">คนที่ {singleIndex + 1} / {filteredStaff.length}</p>
                  <p className="text-base font-bold text-slate-900">{singleStaff.name}</p>
                </div>
                <button
                  onClick={() => setSingleIndex((i) => Math.min(filteredStaff.length - 1, i + 1))}
                  disabled={singleIndex >= filteredStaff.length - 1}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ถัดไป <ChevronRight size={16} />
                </button>
              </div>

              {/* 30:70 layout — single person */}
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* LEFT 30% */}
                <div className="w-full md:w-[30%] flex-shrink-0 space-y-4">
                  {/* rank + count + avg */}
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: SLOT_COLORS[singleIndex % SLOT_COLORS.length] }}
                      />
                      <span className="text-xs text-slate-500">อันดับ {singleIndex + 1}</span>
                    </div>
                    <div className="flex justify-around">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-indigo-600">{worklogCountByUid[singleStaff.uid] || 0}</p>
                        <p className="text-xs text-slate-400 mt-0.5">รายการงาน</p>
                      </div>
                      <div className="w-px bg-slate-200" />
                      <div className="text-center">
                        <p className={`text-3xl font-bold ${
                          avgMetrics(singleStaff.metrics) >= 75 ? "text-emerald-600"
                          : avgMetrics(singleStaff.metrics) >= 50 ? "text-slate-700"
                          : "text-amber-600"
                        }`}>{avgMetrics(singleStaff.metrics)}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Avg Score</p>
                      </div>
                    </div>
                  </div>

                  {/* metric progress bars */}
                  <div className="space-y-3">
                    {AXES.map(({ key, labelTH }) => {
                      const v = Math.round(singleStaff.metrics?.[key] ?? 0);
                      const barColor = v >= 75 ? "#10b981" : v >= 50 ? "#6366f1" : "#f59e0b";
                      return (
                        <div key={key}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-medium text-slate-700">{labelTH}</span>
                            <span className="text-xs font-bold" style={{ color: barColor }}>{v}</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${v}%`, backgroundColor: barColor }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">{METRIC_FULL_TH[key]?.split(" — ")[1] || ""}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* RIGHT 70% — big radar */}
                <div className="flex-1 w-full">
                  <MiniRadar
                    metrics={singleStaff.metrics}
                    color={SLOT_COLORS[singleIndex % SLOT_COLORS.length]}
                    height={320}
                  />
                </div>
              </div>

              {/* dot pagination */}
              <div className="mt-6 flex justify-center gap-1.5 flex-wrap">
                {filteredStaff.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSingleIndex(i)}
                    className={`rounded-full transition-all ${
                      i === singleIndex
                        ? "w-5 h-2 bg-indigo-600"
                        : "w-2 h-2 bg-slate-300 hover:bg-slate-400"
                    }`}
                    title={filteredStaff[i]?.name}
                  />
                ))}
              </div>
            </div>
          ) : null
        ) : (
          /* ─── LIST VIEW — ตารางปกติ ──────────────────────────────────── */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-3 pr-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 w-6">#</th>
                  <th className="pb-3 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">ชื่อ</th>
                  <th
                    onClick={() => setSortMetric("count")}
                    className={`pb-3 pr-2 text-center text-xs font-semibold uppercase tracking-wide cursor-pointer select-none transition-colors ${
                      sortMetric === "count" ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
                    }`}
                    title="จำนวนรายการงาน"
                  >
                    งาน{sortMetric === "count" && " ↓"}
                  </th>
                  {Object.entries(METRIC_SHORT).map(([key, short]) => (
                    <th
                      key={key}
                      onClick={() => setSortMetric(key)}
                      className={`pb-3 pr-2 text-center text-xs font-semibold uppercase tracking-wide cursor-pointer select-none transition-colors ${
                        sortMetric === key ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
                      }`}
                      title={METRIC_FULL_TH[key]}
                    >
                      {short}{sortMetric === key && " ↓"}
                    </th>
                  ))}
                  <th
                    onClick={() => setSortMetric("avg")}
                    className={`pb-3 text-center text-xs font-semibold uppercase tracking-wide cursor-pointer select-none transition-colors ${
                      sortMetric === "avg" ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
                    }`}
                    title="คะแนนเฉลี่ย 6 มิติ"
                  >
                    Avg{sortMetric === "avg" && " ↓"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((s, rank) => {
                  const avg   = avgMetrics(s.metrics);
                  const count = worklogCountByUid[s.uid] || 0;
                  const color = SLOT_COLORS[rank % SLOT_COLORS.length];
                  return (
                    <tr key={s.uid} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 pr-2 text-xs text-slate-400">{rank + 1}</td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          <span className="font-medium text-slate-800 whitespace-nowrap">{s.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-2 text-center">
                        <span className="text-sm font-bold text-indigo-600">{count}</span>
                      </td>
                      {Object.keys(METRIC_SHORT).map((key) => {
                        const v = Math.round(s.metrics[key] ?? 0);
                        const cls = v >= 75 ? "text-emerald-700 bg-emerald-50"
                                  : v >= 50 ? "text-slate-700"
                                  : "text-amber-700 bg-amber-50";
                        return (
                          <td key={key} className="py-2.5 pr-2 text-center">
                            <span className={`inline-block rounded-lg px-1 py-0.5 text-xs font-semibold tabular-nums ${cls}`}>{v}</span>
                          </td>
                        );
                      })}
                      <td className="py-2.5 text-center">
                        <span className={`text-sm font-bold ${
                          avg >= 75 ? "text-emerald-600" : avg >= 50 ? "text-slate-700" : "text-amber-600"
                        }`}>{avg}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-1">
          <p className="text-xs text-slate-400 w-full mb-1 font-medium">คำอธิบาย metrics (hover ที่หัวคอลัมน์เพื่อดูรายละเอียด)</p>
          {Object.entries(METRIC_FULL_TH).map(([key, desc]) => (
            <span key={key} className="text-xs text-slate-400">
              <span className="font-semibold text-slate-600">{METRIC_SHORT[key]}</span> = {desc.split(" — ")[0]}
            </span>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
