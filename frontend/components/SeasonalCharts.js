"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Zap } from "lucide-react";
import { PERIOD_COLORS } from "../lib/academicCalendar";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function EmptyState({ height = 180 }) {
  return (
    <div className={`flex items-center justify-center text-sm text-slate-400`} style={{ height }}>
      ไม่มีข้อมูล
    </div>
  );
}

function TrendArrow({ type }) {
  if (type === "peak") return <TrendingUp size={14} className="text-red-500" />;
  if (type === "low")  return <TrendingDown size={14} className="text-slate-400" />;
  return <Minus size={14} className="text-indigo-400" />;
}

/**
 * SP-5 Chart 1 — SeasonalPatternChart
 * Bar chart แสดง workload รายเดือน มีสีตาม academic period + mean reference line
 *
 * @param {Array} data — output จาก analyzeSeasonalPattern().byMonth
 * @param {number} mean — เส้น reference mean
 * @param {number} sd — สำหรับแสดง ±1σ band (optional)
 */
export function SeasonalPatternChart({ data = [], mean: meanVal = 0, sd = 0 }) {
  const isEmpty = !data || data.length === 0;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="rounded-xl bg-white px-3 py-2 shadow-lg border border-slate-100 text-xs">
        <p className="font-semibold text-slate-800 mb-1">{d.month}</p>
        <p className="text-slate-600">{d.count} งาน</p>
        <p style={{ color: d.color }} className="font-medium mt-0.5">{d.periodLabel}</p>
      </div>
    );
  };

  return (
    <div className="apple-panel p-6">
      <h3 className="mb-1 text-lg font-semibold text-slate-950">Seasonal Pattern รายเดือน</h3>
      <p className="mb-4 text-xs text-slate-400">จำนวนงานแต่ละเดือน — สีแสดง academic period</p>

      {/* Period legend */}
      <div className="mb-4 flex flex-wrap gap-3">
        {[
          { color: PERIOD_COLORS.peak,   label: "ช่วงสอบ (Peak)" },
          { color: PERIOD_COLORS.active, label: "เปิดภาคเรียน" },
          { color: PERIOD_COLORS.low,    label: "ปิดภาคเรียน" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
        {meanVal > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-6 h-0.5 bg-slate-400 border-dashed border-t border-slate-400" />
            เฉลี่ย {meanVal}
          </span>
        )}
      </div>

      {isEmpty ? <EmptyState /> : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            {meanVal > 0 && (
              <ReferenceLine
                y={meanVal}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                label={{ value: `μ=${meanVal}`, position: "insideTopRight", fontSize: 10, fill: "#94a3b8" }}
              />
            )}
            {sd > 0 && (
              <ReferenceLine
                y={meanVal + 2 * sd}
                stroke="#fca5a5"
                strokeDasharray="2 4"
                label={{ value: `+2σ`, position: "insideTopRight", fontSize: 9, fill: "#fca5a5" }}
              />
            )}
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color || "#6366f1"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/**
 * SP-5 Chart 2 — OutlierAlertCard
 * แสดงรายการวันที่มีงานผิดปกติ (outlier)
 *
 * @param {Array} outliers — output จาก detectOutliers()
 * @param {number} mean
 */
export function OutlierAlertCard({ outliers = [], mean: meanVal = 0 }) {
  const isEmpty = !outliers || outliers.length === 0;
  return (
    <div className="apple-panel p-6">
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle size={18} className="text-amber-500" />
        <h3 className="text-lg font-semibold text-slate-950">Outlier Days</h3>
      </div>
      <p className="mb-4 text-xs text-slate-400">
        วันที่มีงาน &gt; μ + 2σ{meanVal > 0 ? ` (เฉลี่ย ${meanVal} งาน/วัน)` : ""}
      </p>
      {isEmpty ? (
        <div className="flex items-center gap-2 text-sm text-green-600 py-4">
          <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-xs">✓</span>
          ไม่พบวันที่ผิดปกติ
        </div>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto">
          {outliers.slice(0, 10).map((o) => (
            <div key={o.date} className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
              <AlertTriangle size={13} className="text-amber-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{o.date}</p>
                <p className="text-xs text-slate-500">{o.periodLabel}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-amber-700">{o.count} งาน</p>
                <p className="text-xs text-slate-400">z={o.zscore}</p>
              </div>
            </div>
          ))}
          {outliers.length > 10 && (
            <p className="text-xs text-slate-400 text-center pt-1">+{outliers.length - 10} รายการ</p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * SP-5 Chart 3 — PeakHourPrediction
 * แสดงผลพยากรณ์เดือน peak ถัดไป + Period summary cards
 *
 * @param {Object} prediction — output จาก predictNextPeak()
 * @param {Array}  byPeriod   — output จาก analyzeSeasonalPattern().byPeriod
 */
export function PeakHourPrediction({ prediction = {}, byPeriod = [] }) {
  const confidenceColor = {
    high:   "text-green-700 bg-green-50 border-green-200",
    medium: "text-amber-700 bg-amber-50 border-amber-200",
    low:    "text-slate-500 bg-slate-50 border-slate-200",
  }[prediction.confidence || "low"];

  const confidenceLabel = {
    high: "ความเชื่อมั่นสูง", medium: "ความเชื่อมั่นปานกลาง", low: "ข้อมูลน้อย"
  }[prediction.confidence || "low"];

  return (
    <div className="apple-panel p-6">
      <div className="flex items-center gap-2 mb-1">
        <Zap size={18} className="text-indigo-500" />
        <h3 className="text-lg font-semibold text-slate-950">พยากรณ์ Peak ถัดไป</h3>
      </div>
      <p className="mb-4 text-xs text-slate-400">อ้างอิงจาก {prediction.basedOnYears || 0} ปีย้อนหลัง</p>

      {prediction.nextPeakMonth ? (
        <>
          <div className="rounded-2xl bg-indigo-50 border border-indigo-100 px-5 py-4 mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-1">คาดการณ์ช่วง Peak</p>
            <p className="text-2xl font-bold text-indigo-900">{prediction.nextPeakLabel}</p>
            {prediction.avgCount && (
              <p className="text-sm text-indigo-600 mt-1">เฉลี่ย ~{prediction.avgCount} งาน/เดือน</p>
            )}
            <span className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full border ${confidenceColor}`}>
              {confidenceLabel}
            </span>
          </div>
          {prediction.reason && (
            <p className="text-xs text-slate-500 mb-4">{prediction.reason}</p>
          )}
        </>
      ) : (
        <div className="text-sm text-slate-400 py-4">ไม่มีข้อมูลเพียงพอสำหรับพยากรณ์</div>
      )}

      {/* Period summary */}
      {byPeriod.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">สรุปงานแต่ละช่วง</p>
          <div className="space-y-1.5">
            {byPeriod.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <TrendArrow type={p.type} />
                <span className="text-xs text-slate-600 flex-1">{p.label}</span>
                <span className="text-xs font-semibold text-slate-800">{p.avg} งาน/เดือน</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
