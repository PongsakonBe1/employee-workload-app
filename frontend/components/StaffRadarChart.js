"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { BarChart2, Info } from "lucide-react";

// ─── Axes Definition (Section 2) ─────────────────────────────────────────────
const AXES = [
  { key: "volume",        labelTH: "ปริมาณงาน",    labelEN: "Volume"        },
  { key: "consistency",   labelTH: "สม่ำเสมอ",     labelEN: "Consistency"   },
  { key: "peakHandling",  labelTH: "รับงานหนัก",   labelEN: "Peak Handling" },
  { key: "documentation", labelTH: "ลงรายละเอียด", labelEN: "Documentation" },
  { key: "comboUsage",    labelTH: "ใช้ระบบ",      labelEN: "Combo Usage"   },
  { key: "versatility",   labelTH: "หลากหลาย",     labelEN: "Versatility"   },
];

// ─── Color Slots (Section 3.1) ────────────────────────────────────────────────
const SLOT_COLORS = ["#6366f1", "#f59e0b", "#10b981"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Transform { volume: 80, consistency: 72, ... } → Recharts array format
 * + optional benchmark field from benchmarkMetrics obj
 */
export function metricsToChartData(metricsObj = {}, benchmarkObj = null) {
  return AXES.map(({ key }) => ({
    metric: key,
    value: Math.round(metricsObj[key] ?? 0),
    benchmark: benchmarkObj ? Math.round(benchmarkObj[key] ?? 0) : undefined,
  }));
}

/**
 * Merge multiple staff datasets into single Recharts array for compare mode
 * { metric, value_0, value_1, value_2, benchmark? }
 */
function mergeCompareData(staffList, benchmarkObj = null) {
  const base = AXES.map(({ key }) => ({ metric: key }));
  staffList.forEach((staff, i) => {
    const dataMap = {};
    (staff.chartData || []).forEach((d) => { dataMap[d.metric] = d.value; });
    base.forEach((row) => {
      row[`value_${i}`] = Math.round(dataMap[row.metric] ?? 0);
    });
  });
  if (benchmarkObj) {
    base.forEach((row) => {
      row.benchmark = Math.round(benchmarkObj[row.metric] ?? 0);
    });
  }
  return base;
}

// ─── Custom Tick (Section 5.1) ────────────────────────────────────────────────
function CustomTick({ x, y, payload, cx, cy }) {
  const axis = AXES.find((a) => a.key === payload.value);
  if (!axis) return null;
  const dx = x - cx;
  const dy = y - cy;
  const isTop    = dy < -20;
  const isBottom = dy > 20;
  const isLeft   = dx < -10;
  return (
    <text
      x={x}
      y={y}
      textAnchor={isLeft ? "end" : dx > 10 ? "start" : "middle"}
      dominantBaseline={isTop ? "auto" : isBottom ? "hanging" : "middle"}
      style={{ fontSize: 11, fontFamily: "'IBM Plex Sans Thai', sans-serif", fill: "#475569" }}
    >
      {axis.labelTH}
    </text>
  );
}

// ─── Custom Tooltip (Section 5.2) ─────────────────────────────────────────────
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const metricKey = payload[0]?.payload?.metric;
  const axis = AXES.find((a) => a.key === metricKey);
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-lg px-4 py-3 min-w-[140px]">
      <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
        {axis?.labelTH}
      </p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color || entry.stroke || "#6366f1" }}
            />
            <span className="text-xs text-slate-600">
              {entry.name === "benchmark" ? "ค่าเฉลี่ยทีม" : (entry.name || "คะแนน")}
            </span>
          </div>
          <span className="text-sm font-bold text-slate-900">
            {Math.round(entry.value ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Score Badge (Section 6) ──────────────────────────────────────────────────
export function ScoreBadge({ data = [], staffName = "", color = "#6366f1" }) {
  if (!data.length) return null;
  const overall = Math.round(data.reduce((s, d) => s + (d.value ?? 0), 0) / data.length);
  const sorted  = [...data].sort((a, b) => b.value - a.value);
  const top     = AXES.find((a) => a.key === sorted[0]?.metric);
  const bottom  = AXES.find((a) => a.key === sorted[sorted.length - 1]?.metric);

  return (
    <div className="apple-panel p-4 space-y-3 min-w-[160px]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900 truncate max-w-[100px]">{staffName}</p>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-2xl font-bold" style={{ color }}>{overall}</span>
          <span className="text-xs text-slate-400">/100</span>
        </div>
      </div>
      <div className="h-px bg-slate-100" />
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
        <span className="text-xs text-slate-500">จุดแข็ง</span>
        <span className="text-xs font-semibold text-slate-900 ml-auto text-right">
          {top?.labelTH} ({Math.round(sorted[0]?.value ?? 0)})
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
        <span className="text-xs text-slate-500">พัฒนาได้</span>
        <span className="text-xs font-semibold text-slate-900 ml-auto text-right">
          {bottom?.labelTH} ({Math.round(sorted[sorted.length - 1]?.value ?? 0)})
        </span>
      </div>
    </div>
  );
}

// ─── Loading / Empty states (Section 9) ──────────────────────────────────────
function ChartLoading() {
  return (
    <div className="flex items-center justify-center" style={{ height: 320 }}>
      <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
    </div>
  );
}

function ChartEmpty() {
  return (
    <div className="flex flex-col items-center justify-center gap-2" style={{ height: 320 }}>
      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
        <BarChart2 size={20} className="text-slate-400" />
      </div>
      <p className="text-sm text-slate-500">ไม่มีข้อมูลในช่วงเวลานี้</p>
    </div>
  );
}

// ─── Main Component (Section 5.3) ─────────────────────────────────────────────
/**
 * StaffRadarChart — SR-4
 *
 * Single mode:
 *   <StaffRadarChart data={chartData} staffName="พงศกร" showBenchmark benchmarkData={benchmarkObj} />
 *
 * Compare mode (max 3):
 *   <StaffRadarChart staffList={[{name, chartData, color}]} showBenchmark benchmarkData={benchmarkObj} />
 *
 * @param {Array}   data          — single mode: [{metric, value, benchmark?}] จาก metricsToChartData()
 * @param {Array}   staffList     — compare mode: [{name, chartData, color}]
 * @param {string}  staffName     — ชื่อที่แสดงใน single mode
 * @param {string}  color         — stroke/fill color, default indigo-500
 * @param {boolean} showBenchmark — แสดง team benchmark dashed line
 * @param {Object}  benchmarkData — raw metrics obj { volume, consistency, ... } จาก getTeamAverage()
 * @param {number}  size          — chart height px, default 320
 * @param {boolean} loading       — แสดง spinner
 * @param {boolean} newEmployee   — แสดง warning ข้อมูลน้อย
 */
export default function StaffRadarChart({
  data,
  staffList,
  staffName = "",
  color = "#6366f1",
  showBenchmark = false,
  benchmarkData = null,
  size = 320,
  loading = false,
  newEmployee = false,
}) {
  const isCompare = Array.isArray(staffList) && staffList.length > 1;

  if (loading) return <ChartLoading />;

  // Determine chart dataset
  const benchmarkObj = showBenchmark ? benchmarkData : null;
  const chartData = isCompare
    ? mergeCompareData(staffList, benchmarkObj)
    : data;

  const hasData = chartData && chartData.length > 0;
  if (!hasData) return <ChartEmpty />;

  return (
    <div>
      {newEmployee && (
        <div className="mb-3 rounded-2xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700 flex items-center gap-2">
          <Info size={16} className="flex-shrink-0" />
          พนักงานใหม่ — ข้อมูลน้อยกว่า 3 รายการ ค่าอาจไม่แม่นยำ
        </div>
      )}

      <div
        role="img"
        aria-label={`Radar chart for ${staffName || (isCompare ? staffList.map((s) => s.name).join(", ") : "")}`}
        style={{ width: "100%", height: size }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            data={chartData}
            cx="50%"
            cy="50%"
            outerRadius="72%"
            margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
          >
            <PolarGrid gridType="polygon" stroke="#e2e8f0" strokeWidth={1} />

            <PolarAngleAxis
              dataKey="metric"
              tick={<CustomTick />}
              tickLine={false}
            />

            <PolarRadiusAxis
              domain={[0, 100]}
              tickCount={5}
              tick={{ fontSize: 9, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Team benchmark — SR-6 */}
            {showBenchmark && benchmarkData && (
              <Radar
                name="benchmark"
                dataKey="benchmark"
                stroke="#94a3b8"
                fill="none"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                dot={false}
              />
            )}

            {/* Single staff mode */}
            {!isCompare && (
              <Radar
                name={staffName || "คะแนน"}
                dataKey="value"
                stroke={color}
                fill={color}
                fillOpacity={0.15}
                strokeWidth={2}
                dot={{ r: 3, fill: color, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: color }}
              />
            )}

            {/* Compare mode — max 3 */}
            {isCompare && staffList.map((staff, i) => (
              <Radar
                key={staff.name}
                name={staff.name}
                dataKey={`value_${i}`}
                stroke={staff.color || SLOT_COLORS[i] || SLOT_COLORS[0]}
                fill={staff.color || SLOT_COLORS[i] || SLOT_COLORS[0]}
                fillOpacity={0.12}
                strokeWidth={2}
                dot={{ r: 3, fill: staff.color || SLOT_COLORS[i], strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            ))}

            {isCompare && (
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
            )}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export { AXES, SLOT_COLORS };
