"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Download, AlertTriangle, XCircle, CheckCircle, Headphones, Plug } from "lucide-react";
import { AppShell } from "../../../components/AppShell";
import { useAuth } from "../../../components/AuthProvider";
import { isAdminRole } from "../../../lib/authUtils";
import { db } from "../../../lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";

const ChartLoading = () => (
  <div className="apple-panel flex h-48 items-center justify-center text-slate-400">
    กำลังโหลดกราฟ…
  </div>
);

const EquipmentDamageChart = dynamic(
  () => import("../../../components/EquipmentCharts").then((m) => m.EquipmentDamageChart),
  { ssr: false, loading: ChartLoading }
);
const EquipmentHealthTimeline = dynamic(
  () => import("../../../components/EquipmentCharts").then((m) => m.EquipmentHealthTimeline),
  { ssr: false, loading: ChartLoading }
);
const DamageCategoryPie = dynamic(
  () => import("../../../components/EquipmentCharts").then((m) => m.DamageCategoryPie),
  { ssr: false, loading: ChartLoading }
);

// ─── Equipment type detection ─────────────────────────────────────────────────
function detectEquipmentType(log) {
  const t = (log.minorTask || "") + (log.comment || "");
  if (t.includes("หูฟัง")) return "headphones";
  if (t.includes("ปลั๊กไฟ")) return "power";
  return "other";
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
function exportCSV(logs) {
  const header = ["วันที่", "เวลา", "ประเภท", "อุปกรณ์", "พนักงาน", "สภาพ", "หมายเหตุ"];
  const rows = logs.map((l) => [
    l.date || "",
    l.time || "",
    detectEquipmentType(l) === "headphones" ? "หูฟัง" : detectEquipmentType(l) === "power" ? "ปลั๊กไฟ" : "อื่นๆ",
    l.comment || "",
    l.employeeDisplayName || l.employeeId || "",
    l.equipmentCondition === "normal" ? "สมบูรณ์" : l.equipmentCondition === "damaged" ? "ชำรุด" : l.equipmentCondition === "lost" ? "สูญหาย" : "",
    l.equipmentNote || "",
  ]);
  const csv = [header, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `equipment-health-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="apple-panel p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-semibold text-slate-950 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function EquipmentHealthPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState("all"); // "all" | "headphones" | "power"
  const [filterCondition, setFilterCondition] = useState("all"); // "all" | "damaged" | "lost" | "normal"

  // Guard — admin only
  useEffect(() => {
    if (user && !isAdminRole(user.role)) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  // Load worklogs ที่เกี่ยวกับอุปกรณ์
  useEffect(() => {
    if (!user || !isAdminRole(user.role)) return;

    async function loadLogs() {
      setLoading(true);
      setError("");
      try {
        const EQUIPMENT_TASKS = [
          "คืนหูฟัง", "ยืมหูฟัง", "คืนปลั๊กไฟ", "ยืมปลั๊กไฟ",
        ];
        const snaps = await Promise.all(
          EQUIPMENT_TASKS.map((task) =>
            getDocs(
              query(
                collection(db, "worklogs"),
                where("minorTask", "==", task),
                orderBy("createdAt", "desc")
              )
            )
          )
        );
        const docsById = new Map();
        snaps.forEach((snap) => {
          snap.docs.forEach((d) => {
            if (!docsById.has(d.id)) docsById.set(d.id, { id: d.id, ...d.data() });
          });
        });
        const all = Array.from(docsById.values()).sort((a, b) =>
          (b.date || "").localeCompare(a.date || "")
        );
        setLogs(all);
      } catch (err) {
        setError("โหลดข้อมูลไม่สำเร็จ: " + err.message);
      } finally {
        setLoading(false);
      }
    }

    loadLogs();
  }, [user]);

  // ─── Derived stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const returnLogs = logs.filter((l) => l.minorTask?.includes("คืน"));
    const total = returnLogs.length;
    const damaged = returnLogs.filter((l) => l.equipmentCondition === "damaged").length;
    const lost = returnLogs.filter((l) => l.equipmentCondition === "lost").length;
    const normal = returnLogs.filter((l) => !l.equipmentCondition || l.equipmentCondition === "normal").length;
    return { total, damaged, lost, normal };
  }, [logs]);

  // ─── Chart data: monthly damage ───────────────────────────────────────────
  const damageChartData = useMemo(() => {
    const returnLogs = logs.filter((l) => l.minorTask?.includes("คืน") && l.date);
    const byMonth = {};
    returnLogs.forEach((l) => {
      const month = l.date.slice(0, 7);
      if (!byMonth[month]) byMonth[month] = { month, normal: 0, damaged: 0, lost: 0 };
      const cond = l.equipmentCondition || "normal";
      byMonth[month][cond] = (byMonth[month][cond] || 0) + 1;
    });
    return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
  }, [logs]);

  // ─── Chart data: timeline by equipment type ───────────────────────────────
  const timelineData = useMemo(() => {
    const returnLogs = logs.filter(
      (l) => l.minorTask?.includes("คืน") && l.date &&
             (l.equipmentCondition === "damaged" || l.equipmentCondition === "lost")
    );
    const byMonth = {};
    returnLogs.forEach((l) => {
      const month = l.date.slice(0, 7);
      const eqType = detectEquipmentType(l);
      if (!byMonth[month]) byMonth[month] = { month };
      byMonth[month][eqType] = (byMonth[month][eqType] || 0) + 1;
    });
    return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
  }, [logs]);

  // ─── Filtered table rows ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return logs.filter((l) => {
      const eqType = detectEquipmentType(l);
      if (filterType !== "all" && eqType !== filterType) return false;
      const cond = l.equipmentCondition || "normal";
      if (filterCondition !== "all" && cond !== filterCondition) return false;
      return true;
    });
  }, [logs, filterType, filterCondition]);

  const CONDITION_BADGE = {
    normal:  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5"><CheckCircle size={11} />สมบูรณ์</span>,
    damaged: <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5"><AlertTriangle size={11} />ชำรุด</span>,
    lost:    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5"><XCircle size={11} />สูญหาย</span>,
  };

  return (
    <AppShell>
      {/* Header */}
      <section className="mb-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Admin</p>
          <h1 className="mt-3 text-5xl font-semibold tracking-tight text-slate-950">
            Equipment Health
          </h1>
          <p className="mt-2 text-sm text-slate-500">ติดตามสุขภาพอุปกรณ์ — ชำรุด / สูญหาย</p>
        </div>
        <button
          onClick={() => exportCSV(filtered)}
          disabled={filtered.length === 0}
          className="apple-button flex items-center gap-2 disabled:opacity-40"
        >
          <Download size={16} />
          Export CSV
        </button>
      </section>

      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Stat Cards */}
      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CheckCircle}    label="คืนสมบูรณ์"  value={stats.normal}  color="bg-green-500" />
        <StatCard icon={AlertTriangle}  label="ชำรุด"        value={stats.damaged} color="bg-amber-500" />
        <StatCard icon={XCircle}        label="สูญหาย"       value={stats.lost}    color="bg-red-500"   />
        <StatCard icon={Headphones}     label="คืนทั้งหมด"  value={stats.total}   color="bg-slate-700" />
      </section>

      {/* Charts */}
      <section className="mb-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EquipmentDamageChart data={damageChartData} />
        </div>
        <DamageCategoryPie data={{ normal: stats.normal, damaged: stats.damaged, lost: stats.lost }} />
      </section>

      <section className="mb-6">
        <EquipmentHealthTimeline data={timelineData} equipmentKeys={["headphones", "power"]} />
      </section>

      {/* Filters + Table */}
      <section className="apple-panel p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h3 className="text-base font-semibold text-slate-950 flex-1">รายการคืนอุปกรณ์</h3>
          {/* Type filter */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            {[
              { value: "all",        label: "ทั้งหมด" },
              { value: "headphones", label: "หูฟัง",   icon: Headphones },
              { value: "power",      label: "ปลั๊กไฟ", icon: Plug },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setFilterType(value)}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors
                  ${filterType === value ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
              >
                {Icon && <Icon size={12} />}{label}
              </button>
            ))}
          </div>
          {/* Condition filter */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            {[
              { value: "all",     label: "ทุกสภาพ" },
              { value: "normal",  label: "สมบูรณ์" },
              { value: "damaged", label: "ชำรุด" },
              { value: "lost",    label: "สูญหาย" },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilterCondition(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors
                  ${filterCondition === value ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center text-sm text-slate-400">
            <span className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin mr-2" />
            กำลังโหลด…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-slate-400">ไม่มีข้อมูล</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {["วันที่", "เวลา", "ประเภท", "รายละเอียด", "พนักงาน", "สภาพ", "หมายเหตุ"].map((h) => (
                    <th key={h} className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map((log) => {
                  const eqType = detectEquipmentType(log);
                  const cond = log.equipmentCondition || "normal";
                  return (
                    <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 pr-4 text-slate-700 whitespace-nowrap">{log.date || "—"}</td>
                      <td className="py-3 pr-4 text-slate-500 whitespace-nowrap">{log.time || "—"}</td>
                      <td className="py-3 pr-4">
                        <span className="flex items-center gap-1 text-slate-600">
                          {eqType === "headphones" ? <Headphones size={13} /> : <Plug size={13} />}
                          {eqType === "headphones" ? "หูฟัง" : eqType === "power" ? "ปลั๊กไฟ" : "อื่นๆ"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-600 max-w-[160px] truncate">{log.comment || "—"}</td>
                      <td className="py-3 pr-4 text-slate-700 whitespace-nowrap">
                        {log.employeeDisplayName || log.employeeId || "—"}
                      </td>
                      <td className="py-3 pr-4">{CONDITION_BADGE[cond] || CONDITION_BADGE.normal}</td>
                      <td className="py-3 text-slate-500 max-w-[180px] truncate">
                        {log.equipmentNote || (cond !== "normal" && log._backfillReason) || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length > 200 && (
              <p className="mt-3 text-xs text-slate-400 text-center">
                แสดง 200 รายการแรก จากทั้งหมด {filtered.length} รายการ
              </p>
            )}
          </div>
        )}
      </section>
    </AppShell>
  );
}
