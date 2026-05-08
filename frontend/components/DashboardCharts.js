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

const COLORS = ["#0f172a", "#334155", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0"];

export function WorkloadByEmployeeChart({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="apple-panel p-6">
      <h3 className="mb-4 text-lg font-semibold text-slate-950">
        จำนวนงานตามพนักงาน
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} layout="vertical">
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

export function WorkloadByDutyChart({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="apple-panel p-6">
      <h3 className="mb-4 text-lg font-semibold text-slate-950">
        สัดส่วนงานตามหัวข้อหลัก
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data.slice(0, 6)}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="count"
            nameKey="label"
          >
            {data.slice(0, 6).map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              fontSize: "12px",
            }}
          />
          <Legend fontSize={12} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DailyWorkloadTrend({ data }) {
  // Mock data for daily trend - in real implementation, this comes from API
  const mockData = [
    { date: "01/05", count: 12 },
    { date: "02/05", count: 18 },
    { date: "03/05", count: 15 },
    { date: "04/05", count: 22 },
    { date: "05/05", count: 19 },
    { date: "06/05", count: 25 },
    { date: "07/05", count: 14 },
  ];

  return (
    <div className="apple-panel p-6">
      <h3 className="mb-4 text-lg font-semibold text-slate-950">
        แนวโน้มงานรายวัน (7 วันล่าสุด)
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={mockData}>
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

  const topItems = data.slice(0, 8);

  return (
    <div className="apple-panel p-6">
      <h3 className="mb-4 text-lg font-semibold text-slate-950">
        จำนวนงานตามหัวข้อรอง (Top 8)
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
