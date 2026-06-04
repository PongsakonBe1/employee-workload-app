"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Download, X, Plus, Users, Search, TrendingUp } from "lucide-react";
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
  getRankingByMetric,
} from "../../../lib/staffMetrics";
import { metricsToChartData, ScoreBadge, SLOT_COLORS, AXES } from "../../../components/StaffRadarChart";

// Dynamic import — no SSR for Recharts
const StaffRadarChart = dynamic(
  () => import("../../../components/StaffRadarChart"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-80">
        <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
      </div>
    ),
  }
);

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
function MetricCell({ value }) {
  const v = Math.round(value ?? 0);
  const color =
    v >= 75 ? "text-emerald-700 bg-emerald-50" :
    v >= 50 ? "text-slate-700" :
              "text-amber-700 bg-amber-50";
  return (
    <span className={`inline-block rounded-lg px-1.5 py-0.5 text-xs font-semibold tabular-nums ${color}`}>
      {v}
    </span>
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

  const [timeRange,    setTimeRange]    = useState("1M");
  const [staffList,    setStaffList]    = useState([]);   // all users
  const [worklogs,     setWorklogs]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [searchQuery,  setSearchQuery]  = useState("");
  const [selectedIds,  setSelectedIds]  = useState([]);   // selected for chart (max 3)
  const [sortMetric,   setSortMetric]   = useState("avg");

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

  // Filtered + sorted ranking list
  const filteredStaff = useMemo(() => {
    let list = allStaffMetrics.filter((s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (sortMetric === "avg") {
      list = list.sort((a, b) => avgMetrics(b.metrics) - avgMetrics(a.metrics));
    } else {
      list = list.sort((a, b) => (b.metrics[sortMetric] ?? 0) - (a.metrics[sortMetric] ?? 0));
    }
    return list;
  }, [allStaffMetrics, searchQuery, sortMetric]);

  // Selected staff for chart
  const selectedStaff = useMemo(
    () => allStaffMetrics.filter((s) => selectedIds.includes(s.uid)),
    [allStaffMetrics, selectedIds]
  );

  const handleSelectStaff = useCallback((uid) => {
    setSelectedIds((prev) => {
      if (prev.includes(uid)) return prev.filter((id) => id !== uid);
      if (prev.length >= 3)   return prev; // max 3
      return [...prev, uid];
    });
  }, []);

  // Build chart props
  const isCompare = selectedStaff.length > 1;

  const chartStaffList = selectedStaff.map((s, i) => ({
    name:      s.name,
    chartData: metricsToChartData(s.metrics, null),
    color:     SLOT_COLORS[i] || SLOT_COLORS[0],
  }));

  const singleChartData = selectedStaff.length === 1
    ? metricsToChartData(selectedStaff[0].metrics, benchmarkData)
    : null;

  if (!user || !isAdminRole(user)) return null;

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Staff Analytics</h1>
          <p className="mt-0.5 text-sm text-slate-400">ประสิทธิภาพพนักงาน 6 มิติ</p>
        </div>
        {/* Time Range */}
        <div role="radiogroup" aria-label="ช่วงเวลา" className="flex gap-1 rounded-2xl bg-slate-100 p-1">
          {TIME_RANGES.map((t) => (
            <button
              key={t.value}
              role="radio"
              aria-checked={timeRange === t.value}
              onClick={() => setTimeRange(t.value)}
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

      {error && (
        <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* ── Radar Chart Section ─────────────────────────────────────────── */}
      {selectedStaff.length > 0 && (
        <div className="apple-panel mb-6 p-4 md:p-6">
          {/* Selected chips */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {selectedStaff.map((s, i) => (
              <span
                key={s.uid}
                className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium"
                style={{
                  borderColor: SLOT_COLORS[i],
                  color: SLOT_COLORS[i],
                  backgroundColor: SLOT_COLORS[i] + "15",
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: SLOT_COLORS[i] }}
                />
                {s.name}
                <button
                  onClick={() => handleSelectStaff(s.uid)}
                  aria-label={`ลบ ${s.name} ออกจากการเปรียบเทียบ`}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-black/10"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {selectedStaff.length < 3 && (
              <span className="text-xs text-slate-400">
                + เลือกพนักงานจากตารางด้านล่าง (สูงสุด 3 คน)
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Chart */}
            <div className="flex-1 w-full">
              {isCompare ? (
                <StaffRadarChart
                  staffList={chartStaffList}
                  showBenchmark={!!benchmarkData}
                  benchmarkData={benchmarkData}
                  size={360}
                />
              ) : (
                <StaffRadarChart
                  data={singleChartData}
                  staffName={selectedStaff[0]?.name}
                  color={SLOT_COLORS[0]}
                  showBenchmark={!!benchmarkData}
                  benchmarkData={benchmarkData}
                  size={320}
                  newEmployee={
                    worklogs.filter((w) => w.employeeId === selectedStaff[0]?.uid).length < 3
                  }
                />
              )}
            </div>

            {/* Score Badges — single mode only */}
            {!isCompare && singleChartData && (
              <div className="sm:w-48 w-full">
                <ScoreBadge
                  data={singleChartData}
                  staffName={selectedStaff[0]?.name}
                  color={SLOT_COLORS[0]}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Rankings Table Section ─────────────────────────────────────── */}
      <div className="apple-panel p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-950">Rankings</h2>
            <span className="text-xs text-slate-400">{filteredStaff.length} คน</span>
          </div>
          <div className="flex gap-2">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="ค้นหาพนักงาน..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-48"
              />
            </div>
            {/* Export */}
            <button
              onClick={() => exportCSV(filteredStaff)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Download size={14} />
              CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-3 pl-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 w-8">#</th>
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">ชื่อ</th>
                  {Object.entries(METRIC_SHORT).map(([key, short]) => (
                    <th
                      key={key}
                      onClick={() => setSortMetric(key)}
                      className={`pb-3 text-center text-xs font-semibold uppercase tracking-wide cursor-pointer select-none transition-colors ${
                        sortMetric === key ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
                      }`}
                      title={AXES.find((a) => a.key === key)?.labelTH}
                    >
                      {short}
                      {sortMetric === key && <span className="ml-0.5">↓</span>}
                    </th>
                  ))}
                  <th
                    onClick={() => setSortMetric("avg")}
                    className={`pb-3 text-center text-xs font-semibold uppercase tracking-wide cursor-pointer select-none ${
                      sortMetric === "avg" ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    Avg{sortMetric === "avg" && <span className="ml-0.5">↓</span>}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-sm text-slate-400">
                      ไม่มีข้อมูล
                    </td>
                  </tr>
                )}
                {filteredStaff.map((s, rank) => {
                  const isSelected = selectedIds.includes(s.uid);
                  const slotIdx    = selectedIds.indexOf(s.uid);
                  return (
                    <tr
                      key={s.uid}
                      onClick={() => handleSelectStaff(s.uid)}
                      className={`border-b border-slate-50 cursor-pointer transition-colors ${
                        isSelected ? "bg-indigo-50/60" : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="py-2.5 pl-2 text-xs text-slate-400 w-8">{rank + 1}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          {isSelected && (
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: SLOT_COLORS[slotIdx] }}
                            />
                          )}
                          <span
                            className={`font-medium ${isSelected ? "text-slate-900" : "text-slate-700"}`}
                            aria-pressed={isSelected}
                          >
                            {s.name}
                          </span>
                        </div>
                      </td>
                      {Object.keys(METRIC_SHORT).map((key) => (
                        <td key={key} className="py-2.5 text-center">
                          <MetricCell value={s.metrics[key]} />
                        </td>
                      ))}
                      <td className="py-2.5 text-center">
                        <span className="text-sm font-bold text-slate-800">
                          {avgMetrics(s.metrics)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
