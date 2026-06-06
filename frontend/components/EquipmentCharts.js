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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

// ─── Color Tokens ────────────────────────────────────────────────────────────
const COLORS = {
  normal:  "#22c55e", // green-500
  damaged: "#f59e0b", // amber-500
  lost:    "#ef4444", // red-500
};

const CONDITION_LABEL = {
  normal:  "สมบูรณ์",
  damaged: "ชำรุด",
  lost:    "สูญหาย",
};

// ─── Shared empty state ───────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex h-48 items-center justify-center text-sm text-slate-400">
      ไม่มีข้อมูล
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-white px-3 py-2 shadow-lg border border-slate-100 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {CONDITION_LABEL[p.name] || p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

/**
 * EH-7 Chart 1 — EquipmentDamageChart
 * Stacked bar chart แสดงจำนวน damaged/lost/normal แต่ละเดือน
 *
 * @param {Array} data — [{ month: "2026-01", normal: 40, damaged: 3, lost: 1 }, …]
 */
export function EquipmentDamageChart({ data = [] }) {
  const isEmpty = !data || data.length === 0;
  return (
    <div className="apple-panel p-6">
      <h3 className="mb-1 text-lg font-semibold text-slate-950">อัตราความเสียหายรายเดือน</h3>
      <p className="mb-4 text-xs text-slate-400">จำแนกตามสภาพอุปกรณ์เมื่อคืน</p>
      {isEmpty ? <EmptyState /> : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickFormatter={(v) => {
                const [y, m] = v.split("-");
                const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
                                "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
                return months[parseInt(m, 10) - 1] || v;
              }}
            />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              formatter={(v) => <span className="text-xs text-slate-600">{CONDITION_LABEL[v] || v}</span>}
            />
            <Bar dataKey="normal"  name="normal"  stackId="a" fill={COLORS.normal}  radius={[0, 0, 0, 0]} />
            <Bar dataKey="damaged" name="damaged" stackId="a" fill={COLORS.damaged} radius={[0, 0, 0, 0]} />
            <Bar dataKey="lost"    name="lost"    stackId="a" fill={COLORS.lost}    radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/**
 * EH-7 Chart 2 — EquipmentHealthTimeline
 * Line chart แสดง trend ชำรุด+สูญหาย รายเดือน เทียบระหว่างอุปกรณ์
 *
 * @param {Array} data — [{ month: "2026-01", headphones: 2, power: 1 }, …]
 * @param {string[]} equipmentKeys — ["headphones", "power"]
 */
export function EquipmentHealthTimeline({ data = [], equipmentKeys = ["headphones", "power"] }) {
  const isEmpty = !data || data.length === 0;
  const KEY_LABEL = { headphones: "หูฟัง", power: "ปลั๊กไฟ" };
  const LINE_COLORS = ["#6366f1", "#f59e0b", "#22c55e", "#ef4444"];

  return (
    <div className="apple-panel p-6">
      <h3 className="mb-1 text-lg font-semibold text-slate-950">Timeline ความเสียหายแต่ละประเภท</h3>
      <p className="mb-4 text-xs text-slate-400">จำนวนชำรุด+สูญหาย แยกตามประเภทอุปกรณ์</p>
      {isEmpty ? <EmptyState /> : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickFormatter={(v) => {
                const [, m] = v.split("-");
                const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
                                "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
                return months[parseInt(m, 10) - 1] || v;
              }}
            />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-xl bg-white px-3 py-2 shadow-lg border border-slate-100 text-xs">
                    <p className="font-semibold text-slate-700 mb-1">{label}</p>
                    {payload.map((p) => (
                      <p key={p.dataKey} style={{ color: p.color }}>
                        {KEY_LABEL[p.dataKey] || p.dataKey}: {p.value} ครั้ง
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            <Legend formatter={(v) => <span className="text-xs text-slate-600">{KEY_LABEL[v] || v}</span>} />
            {equipmentKeys.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/**
 * EH-7 Chart 3 — DamageCategoryPie
 * Pie chart สัดส่วน normal/damaged/lost รวมทุกอุปกรณ์
 *
 * @param {Object} data — { normal: 120, damaged: 8, lost: 2 }
 */
export function DamageCategoryPie({ data = {} }) {
  const entries = Object.entries(COLORS)
    .map(([key, color]) => ({ name: key, value: data[key] || 0, color }))
    .filter((e) => e.value > 0);

  const isEmpty = entries.length === 0 || entries.every((e) => e.value === 0);
  const total = entries.reduce((s, e) => s + e.value, 0);

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
        fontSize={11} fontWeight={600}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="apple-panel p-6">
      <h3 className="mb-1 text-lg font-semibold text-slate-950">สัดส่วนสภาพอุปกรณ์</h3>
      <p className="mb-4 text-xs text-slate-400">รวมทุกประเภท · {total} รายการ</p>
      {isEmpty ? <EmptyState /> : (
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie
                data={entries}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                labelLine={false}
                label={<CustomLabel />}
              >
                {entries.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0];
                  return (
                    <div className="rounded-xl bg-white px-3 py-2 shadow-lg border border-slate-100 text-xs">
                      <p style={{ color: d.payload.color }} className="font-semibold">
                        {CONDITION_LABEL[d.name] || d.name}
                      </p>
                      <p className="text-slate-600">{d.value} รายการ ({((d.value / total) * 100).toFixed(1)}%)</p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="space-y-2">
            {entries.map((e) => (
              <div key={e.name} className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
                <span className="text-slate-700 font-medium">{CONDITION_LABEL[e.name]}</span>
                <span className="text-slate-400">{e.value} ({((e.value / total) * 100).toFixed(1)}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
