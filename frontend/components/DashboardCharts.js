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

// Workload Heatmap — DOW (Mon–Sun) × Hour-of-day grid
export function WorkloadHeatmap({ data }) {
  const [tooltip, setTooltip] = React.useState(null); // { dow, hour, count, top, left }
  const containerRef = React.useRef(null);

  // data = { "0-08": 3, "1-14": 7, … }  key = "displayDow-HH"  Mon=0..Sun=6
  const isEmpty = !data || Object.keys(data).length === 0;

  // Show hours 07:00–21:00 (office range)
  const hours = Array.from({ length: 15 }, (_, i) => i + 7); // 7..21
  const dayLabels = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

  const max = isEmpty ? 1 : Math.max(...Object.values(data), 1);

  const getColor = (dow, hour) => {
    const key = `${dow}-${String(hour).padStart(2, "0")}`;
    const count = (data && data[key]) || 0;
    if (!count) return "bg-slate-100";
    const ratio = count / max;
    if (ratio < 0.2) return "bg-orange-200";
    if (ratio < 0.4) return "bg-orange-400";
    if (ratio < 0.6) return "bg-red-500";
    if (ratio < 0.8) return "bg-red-700";
    return "bg-red-900";
  };

  return (
    <div className="apple-panel p-6">
      <h3 className="mb-1 text-lg font-semibold text-slate-950">Workload Heatmap</h3>
      <p className="mb-4 text-xs text-slate-400">วันในสัปดาห์ × ช่วงเวลา</p>

      {isEmpty ? (
        <div className="flex h-[180px] items-center justify-center text-slate-400 text-sm">ไม่มีข้อมูล</div>
      ) : (
        <div ref={containerRef} className="overflow-x-auto relative">
          {/* Hour axis labels */}
          <div className="flex">
            <div className="w-7 shrink-0" />
            <div className="flex flex-1 gap-[2px]">
              {hours.map((h) => (
                <div key={h} className="flex-1 text-center text-[9px] text-slate-400 leading-none mb-1">
                  {h % 2 === 0 ? `${h}` : ""}
                </div>
              ))}
            </div>
          </div>

          {/* Grid rows */}
          {dayLabels.map((label, dow) => (
            <div key={dow} className="flex items-center gap-[2px] mb-[2px]">
              <div className="w-7 shrink-0 text-[10px] text-slate-500 font-medium text-right pr-1">{label}</div>
              {hours.map((hour) => {
                const key = `${dow}-${String(hour).padStart(2,"0")}`;
                const count = (data && data[key]) || 0;
                const bg = getColor(dow, hour);
                return (
                  <div
                    key={hour}
                    className={`flex-1 h-5 rounded-sm ${bg} cursor-default transition-transform hover:scale-110`}
                    onMouseEnter={(e) => {
                      if (!count) return;
                      const rect = containerRef.current?.getBoundingClientRect();
                      const cellRect = e.currentTarget.getBoundingClientRect();
                      setTooltip({
                        dow, hour, count,
                        top: cellRect.top - (rect?.top ?? 0) - 38,
                        left: cellRect.left - (rect?.left ?? 0) + cellRect.width / 2,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </div>
          ))}

          {/* Legend */}
          <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-slate-400">
            <span>น้อย</span>
            {["bg-slate-100","bg-orange-200","bg-orange-400","bg-red-500","bg-red-700","bg-red-900"].map((c,i) => (
              <div key={i} className={`w-3.5 h-3.5 rounded-sm ${c}`} />
            ))}
            <span>มาก</span>
          </div>

          {/* Tooltip — positioned relative to container */}
          {tooltip && (
            <div
              className="absolute z-50 pointer-events-none bg-slate-900 text-white text-xs rounded-lg px-2.5 py-1.5 shadow-xl -translate-x-1/2 whitespace-nowrap"
              style={{ top: tooltip.top, left: tooltip.left }}
            >
              {["จ","อ","พ","พฤ","ศ","ส","อา"][tooltip.dow]} {String(tooltip.hour).padStart(2,"0")}:00 — {tooltip.count} งาน
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Hour-of-day bar chart
export function HourOfDayChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="apple-panel p-6">
        <h3 className="mb-4 text-lg font-semibold text-slate-950">งานตามช่วงเวลา</h3>
        <div className="flex h-[200px] items-center justify-center text-slate-400 text-sm">ไม่มีข้อมูล</div>
      </div>
    );
  }

  return (
    <div className="apple-panel p-6">
      <h3 className="mb-4 text-lg font-semibold text-slate-950">งานตามช่วงเวลา (ชั่วโมง)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="hour" stroke="#64748b" fontSize={11} />
          <YAxis stroke="#64748b" fontSize={11} />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              fontSize: "12px",
            }}
            formatter={(v) => [`${v} งาน`, "จำนวน"]}
          />
          <Bar dataKey="count" fill="#0f172a" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const COLORS = [
  "#0f172a",
  "#334155",
  "#64748b",
  "#94a3b8",
  "#cbd5e1",
  "#e2e8f0",
];

export function WorkloadByEmployeeChart({ data }) {
  if (!data || data.length === 0) return null;

  // แสดงแค่ Top 10 พนักงานที่มีงานมากที่สุด
  const topData = data.slice(0, 10);

  return (
    <div className="apple-panel p-6">
      <h3 className="mb-4 text-lg font-semibold text-slate-950">
        จำนวนงานตามพนักงาน (Top 10)
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={topData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" stroke="#64748b" fontSize={12} />
          <YAxis
            type="category"
            dataKey="label"
            stroke="#64748b"
            fontSize={12}
            width={80}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              fontSize: "12px",
            }}
          />
          <Bar dataKey="count" fill="#0f172a" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// แปลงชื่อหัวข้อหลักให้สั้นลง
const shortenDutyName = (name) => {
  const shortNames = {
    ดูแลห้องบริการคอมพิวเตอร์: "ห้องบริการ",
    ให้บริการรับแจ้งและแก้ไขปัญหาระบบสารสนเทศ: "รับแจ้งปัญหา",
    "สนับสนุนการทำงานของสำนักคอมพิวเตอร์(ฝ่ายอื่นๆ)": "สนับสนุนฝ่ายอื่น",
    ปฏิบัติงานตามที่ผู้บังคับบัญชามอบหมาย: "งานตามมอบหมาย",
    "คุมสอบ DL": "คุมสอบ DL",
  };
  return shortNames[name] || name;
};

export function WorkloadByDutyChart({ data }) {
  if (!data || data.length === 0) return null;

  // แสดงแค่ Top 8 หัวข้อหลัก
  const topData = data.slice(0, 8);

  // ใช้ชื่อสั้นเพื่อป้องกันข้อความทับกัน
  const shortNames = {
    ดูแลห้องบริการคอมพิวเตอร์: "ดูแลห้องบริการ",
    ให้บริการรับแจ้งและแก้ไขปัญหาระบบสารสนเทศ: "รับแจ้ง/แก้ไขปัญหา",
    ซ่อมบำรุงเครื่องคอมพิวเตอร์และอุปกรณ์: "ซ่อมบำรุงคอมฯ",
    "สนับสนุนการทำงานของสำนักคอมพิวเตอร์(ฝ่ายอื่นๆ)": "สนับสนุนฝ่ายอื่น",
    "คุมสอบ DL": "คุมสอบ",
    "ให้บริการ ICIT อื่นๆ": "ICIT อื่นๆ",
  };

  const shortData = topData.map((item) => ({
    ...item,
    label: shortenDutyName(item.label),
  }));

  return (
    <div className="apple-panel p-6">
      <h3 className="mb-4 text-lg font-semibold text-slate-950">
        สัดส่วนงานตามหัวข้อหลัก
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={shortData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="count"
            nameKey="label"
          >
            {shortData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              fontSize: "12px",
            }}
            formatter={(value, name, props) => {
              // แสดงชื่อเต็มใน tooltip
              const original = data.find(
                (d) => shortenDutyName(d.label) === name,
              );
              return [value, original?.label || name];
            }}
          />
          <Legend fontSize={10} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DailyWorkloadTrend({ data, dateRange }) {
  // ใช้ข้อมูลทั้งหมดที่กรองมา (ตามช่วงที่เลือกในหน้า dashboard)
  const chartData = data && data.length > 0 ? data : [];

  // ถ้าไม่มีข้อมูล แสดงข้อความแจ้ง
  if (chartData.length === 0) {
    return (
      <div className="apple-panel p-6">
        <h3 className="mb-4 text-lg font-semibold text-slate-950">
          แนวโน้มงานรายวัน
        </h3>
        <div className="flex h-[250px] items-center justify-center text-slate-400 text-sm">
          ไม่มีข้อมูล
        </div>
      </div>
    );
  }

  return (
    <div className="apple-panel p-6">
      <h3 className="mb-4 text-lg font-semibold text-slate-950">
        แนวโน้มงานรายวัน {dateRange && `(${dateRange})`}
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
          <YAxis stroke="#64748b" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              fontSize: "12px",
            }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#0f172a"
            strokeWidth={2}
            dot={{ fill: "#0f172a" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MinorTaskDistribution({ data }) {
  if (!data || data.length === 0) return null;

  // แสดงแค่ Top 6 หัวข้อรอง
  const topItems = data.slice(0, 6);

  return (
    <div className="apple-panel p-6">
      <h3 className="mb-4 text-lg font-semibold text-slate-950">
        จำนวนงานตามหัวข้อรอง (Top 6)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={topItems}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="label"
            stroke="#64748b"
            fontSize={11}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis stroke="#64748b" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              fontSize: "12px",
            }}
          />
          <Bar dataKey="count" fill="#334155" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
