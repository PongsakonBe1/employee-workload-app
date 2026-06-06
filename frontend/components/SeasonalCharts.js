"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Info, X, BarChart2 } from "lucide-react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from "recharts";
import { PERIOD_COLORS, formatMonthLabel } from "../lib/analytics";

// ─── Constants ────────────────────────────────────────────────────────────────

const PERIOD_LABEL_MAP = {
  // Bachelor (new 2569 keys)
  sem1_opening: "เปิดภาคเรียนที่ 1",
  sem1_mid_jul: "กลางภาค ที่ 1 (ก.ค.)",
  sem1_mid_exam: "สอบกลางภาค ที่ 1",
  sem1_late: "กลางภาค ที่ 1 (ก.ย.)",
  sem1_final_exam: "สอบปลายภาค ที่ 1",
  between_semesters: "ช่วงเปลี่ยนภาคเรียน",
  sem2_opening: "เปิดภาคเรียนที่ 2",
  sem2_early: "ต้นภาค ที่ 2",
  sem2_mid_exam: "สอบกลางภาค ที่ 2",
  sem2_feb: "กลางภาค ที่ 2 (ก.พ.)",
  sem2_final_exam: "สอบปลายภาค ที่ 2",
  summer_session: "ภาคฤดูร้อน",
  // TGGS keys
  tggs_sem1_opening: "เปิดภาค 1 (TGGS)",
  tggs_sem1_sep: "กลางภาค (TGGS ก.ย.)",
  tggs_sem1_mid_exam: "สอบกลางภาค 1 (TGGS)",
  tggs_sem1_nov: "กลางภาค (TGGS พ.ย.)",
  tggs_sem1_final_exam: "สอบปลายภาค 1 (TGGS)",
  tggs_break_dec: "ช่วงพัก (TGGS)",
  tggs_sem2_opening: "เปิดภาค 2 (TGGS)",
  tggs_sem2_feb: "กลางภาค (TGGS ก.พ.)",
  tggs_sem2_mid_exam: "สอบกลางภาค 2 (TGGS)",
  tggs_sem2_apr: "กลางภาค (TGGS เม.ย.)",
  tggs_sem2_final_exam: "สอบปลายภาค 2 (TGGS)",
  tggs_summer: "ภาคฤดูร้อน (TGGS)",
  // Legacy keys (fallback)
  opening: "เปิดภาคเรียน", midSemester1: "กลางภาค ภาค 1",
  exam1: "สอบกลางภาค", break1: "ปิดภาคเรียน",
  opening2: "เปิดภาคเรียนที่ 2", midSemester2: "กลางภาค ภาค 2",
  exam2: "สอบปลายภาค", break2: "ปิดภาคเรียนยาว",
};

const PERIOD_TYPE_MAP = {
  sem1_opening: "active", sem1_mid_jul: "active",
  sem1_mid_exam: "peak", sem1_late: "active",
  sem1_final_exam: "peak", between_semesters: "low",
  sem2_opening: "active", sem2_early: "active",
  sem2_mid_exam: "peak", sem2_feb: "active",
  sem2_final_exam: "peak", summer_session: "low",
  tggs_sem1_opening: "active", tggs_sem1_sep: "active",
  tggs_sem1_mid_exam: "peak", tggs_sem1_nov: "active",
  tggs_sem1_final_exam: "peak", tggs_break_dec: "low",
  tggs_sem2_opening: "active", tggs_sem2_feb: "active",
  tggs_sem2_mid_exam: "peak", tggs_sem2_apr: "active",
  tggs_sem2_final_exam: "peak", tggs_summer: "low",
  // Legacy
  opening: "active", midSemester1: "active",
  exam1: "peak", break1: "low",
  opening2: "active", midSemester2: "active",
  exam2: "peak", break2: "low",
};

function getColor(periodKey) {
  const type = PERIOD_TYPE_MAP[periodKey] || "active";
  return PERIOD_COLORS[type] || PERIOD_COLORS.active;
}

// ─── LegendChips (ITEM-4: progressive disclosure + popover ⓘ) ────────────────

const LEGEND_ITEMS = [
  { color: "#be123c", label: "ช่วงสอบ",  months: "ส.ค. / ต.ค. / ม.ค. / มี.ค." },
  { color: "#3730a3", label: "ภาคเรียน", months: "มิ.ย.–ก.ค. / พ.ย.–ก.พ." },
  { color: "#475569", label: "ปิดเทอม",  months: "ต.ค.–พ.ย. / เม.ย.–พ.ค." },
];

function LegendChips() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") { setOpen(false); return; }
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", handler);
    if (open && closeRef.current) closeRef.current.focus();
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", handler);
    };
  }, [open]);

  return (
    <div className="relative z-50 flex items-center gap-2 ml-auto flex-wrap" ref={ref}>
      {LEGEND_ITEMS.map(({ color, label }) => (
        <span key={label} className="flex items-center gap-1 text-[10px] text-slate-500">
          <span
            aria-hidden="true"
            className="w-2.5 h-2.5 rounded-sm inline-block flex-shrink-0"
            style={{ background: color }}
          />
          <span className="hidden sm:inline">{label}</span>
        </span>
      ))}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="คำอธิบายกราฟ"
        aria-expanded={open}
        className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors
          ${open
            ? "bg-indigo-100 text-indigo-600"
            : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          }`}
      >
        <Info size={13} />
      </button>

      {open && typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed z-[9999] w-72 rounded-2xl border border-slate-100
                       bg-white shadow-2xl p-4 text-xs transition-all origin-top-right"
            style={{
              top: ref.current ? ref.current.getBoundingClientRect().bottom + 8 : 0,
              right: ref.current ? window.innerWidth - ref.current.getBoundingClientRect().right : 0,
            }}
            role="dialog"
            aria-label="คู่มืออ่านกราฟ"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-950">คู่มืออ่านกราฟ</p>
              <button
                type="button"
                ref={closeRef}
                onClick={() => setOpen(false)}
                aria-label="ปิด"
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
              สีแท่งกราฟ
            </p>
            <div className="space-y-2 mb-3">
              {LEGEND_ITEMS.map(({ color, label, months }) => (
                <div key={label} className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-sm mt-0.5 flex-shrink-0"
                    style={{ background: color }}
                  />
                  <div>
                    <p className="font-medium text-slate-700">{label}</p>
                    <p className="text-slate-400">{months}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 my-2" />

            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
              เส้น Reference
            </p>
            <div className="space-y-1.5 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 border-t-2 border-dashed border-slate-400 flex-shrink-0" />
                <p className="text-slate-600">ค่าเฉลี่ยงานต่อเดือน</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 border-t-2 border-dashed border-amber-400 flex-shrink-0" />
                <p className="text-slate-600">เกณฑ์ผิดปกติ (ค่าเฉลี่ย + 2×SD)</p>
              </div>
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 mb-2">
              <p className="text-amber-700">
                💡 แท่งเกินเส้นส้ม = วันงานมากผิดปกติ (Outlier) — ควรเตรียม staffing เพิ่ม
              </p>
            </div>

            <p className="text-slate-400 text-[10px]">
              * TGGS/นานาชาติ: ช่วงสอบเร็วกว่า 1 เดือน (ก.ย. / พ.ย.)
            </p>
          </div>,
          document.body
        )}
    </div>
  );
}

// ─── CustomTooltip (ITEM-4: multiplier vs mean + period color) ────────────────

const makeCustomTooltip = (mean) =>
  function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const multiplier = mean > 0 ? (d.count / mean).toFixed(1) : null;
    const isOutlier = mean > 0 && d.count > mean * 2;

    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm min-w-[160px]">
        <p className="font-semibold text-slate-800">{formatMonthLabel(label)}</p>
        <p className="text-slate-600 mt-1">
          งาน <span className="font-bold text-slate-950">{d.count}</span> รายการ
        </p>
        {d.periodLabel && d.periodLabel !== "unknown" && (
          <p className={`text-xs mt-0.5 font-medium
            ${d.periodType === "peak"   ? "text-rose-600"   : ""}
            ${d.periodType === "low"    ? "text-slate-400"  : ""}
            ${d.periodType === "active" ? "text-indigo-600" : ""}
          `}>
            {d.periodType === "peak" ? "⚠️ " : ""}
            {d.periodLabel}
          </p>
        )}
        {multiplier && parseFloat(multiplier) > 1.2 && (
          <p className={`text-xs mt-1 ${isOutlier ? "text-amber-600 font-medium" : "text-slate-400"}`}>
            {isOutlier ? "🔴" : "↑"} สูงกว่าเฉลี่ย {multiplier}×
          </p>
        )}
      </div>
    );
  };

// ─── AcademicCalendarStrip (ITEM-4: timeline bar ใต้ chart) ──────────────────

const ACADEMIC_STRIP_2569 = [
  { key: "sem1_open",  label: "Semester 1", type: "active", months: ["2026-06", "2026-07"] },
  { key: "sem1_mid",   label: "Midterm",    type: "peak",   months: ["2026-08"] },
  { key: "sem1_post",  label: "Semester 1", type: "active", months: ["2026-09"] },
  { key: "sem1_final", label: "Final",      type: "peak",   months: ["2026-10"] },
  { key: "break1",     label: "Break",      type: "low",    months: ["2026-11"] },
  { key: "sem2_open",  label: "Semester 2", type: "active", months: ["2026-11", "2026-12"] },
  { key: "sem2_mid",   label: "Midterm",    type: "peak",   months: ["2027-01"] },
  { key: "sem2_post",  label: "Semester 2", type: "active", months: ["2027-02"] },
  { key: "sem2_final", label: "Final",      type: "peak",   months: ["2027-03"] },
  { key: "summer",     label: "Summer",     type: "low",    months: ["2027-04", "2027-05"] },
];

function AcademicCalendarStrip({ dataMonths = [] }) {
  const monthSet = new Set(dataMonths);
  const segments = ACADEMIC_STRIP_2569.filter((seg) =>
    seg.months.some((m) => monthSet.has(m))
  );
  if (!segments.length) return null;

  return (
    <div className="mt-2" aria-label="ปฏิทินภาคเรียน มจพ 2569">
      <div className="flex w-full rounded-lg overflow-hidden h-5 text-[9px]">
        {segments.map((seg) => {
          const spanCount = seg.months.filter((m) => monthSet.has(m)).length;
          const bg =
            seg.type === "peak"   ? "#be123c" :
            seg.type === "active" ? "#3730a3" : "#475569";
          return (
            <div
              key={seg.key}
              title={seg.label}
              aria-label={seg.label}
              style={{
                flex: spanCount,
                background: bg,
                opacity: seg.type === "low" ? 0.5 : 0.72,
              }}
              className="flex items-center justify-center text-white font-medium
                         truncate px-1 cursor-default select-none
                         transition-opacity hover:opacity-100"
            >
              <span className="hidden sm:inline truncate">{seg.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── SeasonalPatternChart ─────────────────────────────────────────────────────

export function SeasonalPatternChart({ data = [], mean = 0, sd = 0 }) {
  if (!data || data.length === 0) {
    return (
      <div className="apple-panel p-6">
        <div className="flex flex-col items-center justify-center h-48 text-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center">
            <BarChart2 size={24} className="text-slate-300" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600">ยังไม่มีข้อมูลเพียงพอ</p>
            <p className="text-xs text-slate-400 mt-1">
              กราฟจะแม่นยำขึ้นเมื่อมีข้อมูลสะสม 2 เดือนขึ้นไป
            </p>
          </div>
        </div>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    periodLabel: PERIOD_LABEL_MAP[d.period] || d.period || "ไม่ระบุช่วง",
    periodType:  PERIOD_TYPE_MAP[d.period]  || "active",
  }));

  const upperBound = mean + 2 * sd;
  const dataMonths = chartData.map((d) => d.month);
  const TooltipContent = makeCustomTooltip(mean);

  return (
    <div className="apple-panel p-6">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <h3 className="text-base font-semibold text-slate-950">แพทเทิร์นตามภาคเรียน</h3>
        <LegendChips />
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickFormatter={(v) => formatMonthLabel(v).split(" ")[0]}
          />
          <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
          <Tooltip content={<TooltipContent />} />
          {mean > 0 && (
            <ReferenceLine
              y={mean}
              stroke="#94a3b8"
              strokeDasharray="4 3"
              label={{ value: `เฉลี่ย ${mean}`, position: "insideTopRight", fontSize: 10, fill: "#94a3b8" }}
            />
          )}
          {upperBound > mean && (
            <ReferenceLine
              y={upperBound}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              label={{ value: "+2σ", position: "insideTopRight", fontSize: 10, fill: "#f59e0b" }}
            />
          )}
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48} fillOpacity={0.85}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={getColor(entry.period)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <AcademicCalendarStrip dataMonths={dataMonths} />
    </div>
  );
}

// ─── OutlierAlertCard ─────────────────────────────────────────────────────────

export function OutlierAlertCard({ outliers = [], mean = 0 }) {
  if (!outliers.length) return null;
  return (
    <div className="apple-panel p-4 border-l-4 border-amber-400">
      <h3 className="text-sm font-semibold text-slate-800 mb-2">
        วันผิดปกติ (Outlier) — เกินค่าเฉลี่ย+2σ
      </h3>
      <div className="flex flex-wrap gap-2">
        {outliers.slice(0, 8).map((o) => (
          <span
            key={o.date}
            className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-2 py-1"
          >
            {o.date} — {o.count} งาน
          </span>
        ))}
        {outliers.length > 8 && (
          <span className="text-xs text-slate-400">+{outliers.length - 8} วัน</span>
        )}
      </div>
    </div>
  );
}

// ─── PeakHourPrediction ───────────────────────────────────────────────────────

export function PeakHourPrediction({ prediction, byPeriod = [] }) {
  if (!prediction || !prediction.nextPeakLabel || prediction.nextPeakLabel === "ไม่มีข้อมูล") {
    return (
      <div className="apple-panel p-6 flex items-center justify-center text-slate-400 text-sm h-full">
        ยังไม่มีข้อมูลเพียงพอสำหรับการพยากรณ์
      </div>
    );
  }

  const confColor =
    prediction.confidence === "high" ? "text-emerald-600 bg-emerald-50"
    : prediction.confidence === "medium" ? "text-amber-600 bg-amber-50"
    : "text-slate-500 bg-slate-50";

  return (
    <div className="apple-panel p-6 space-y-4">
      <h3 className="text-base font-semibold text-slate-950">ช่วงที่อาจมีงานมาก</h3>
      <div>
        <p className="text-2xl font-bold text-slate-950 leading-tight">{prediction.nextPeakLabel}</p>
        {prediction.note && (
          <p className="text-xs text-slate-400 mt-1">{prediction.note}</p>
        )}
      </div>
      <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${confColor}`}>
        ความเชื่อมั่น:{" "}
        {prediction.confidence === "high" ? "สูง" : prediction.confidence === "medium" ? "ปานกลาง" : "ต่ำ"}
      </span>
      {byPeriod.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-xs font-medium text-slate-500">ค่าเฉลี่ยตามช่วง</p>
          {byPeriod.slice(0, 4).map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-xs">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: PERIOD_COLORS[p.type] || "#94a3b8" }}
              />
              <span className="text-slate-600 flex-1 truncate">{p.label}</span>
              <span className="font-semibold text-slate-800">{p.avg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
