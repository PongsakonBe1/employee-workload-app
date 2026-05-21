"use client";

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
