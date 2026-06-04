"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { FileText, Search, Filter, User, Clock, FileEdit, Trash2, LogIn, LogOut } from "lucide-react";
import { AppShell } from "../../../components/AppShell";
import { useAuth } from "../../../components/AuthProvider";
import { isAdminRole } from "../../../lib/authUtils";

const LOG_TYPES = {
  WORKLOG_CREATED: { label: "สร้างรายการ", labelEn: "Created", icon: FileEdit, color: "bg-emerald-100 text-emerald-700" },
  WORKLOG_UPDATED: { label: "แก้ไขรายการ", labelEn: "Updated", icon: FileEdit, color: "bg-amber-100 text-amber-700" },
  WORKLOG_DELETED: { label: "ลบรายการ", labelEn: "Deleted", icon: Trash2, color: "bg-red-100 text-red-700" },
  WORKLOG_LOCKED: { label: "ล็อกรายการ", labelEn: "Locked", icon: FileText, color: "bg-slate-100 text-slate-700" },
  USER_LOGIN: { label: "เข้าสู่ระบบ", labelEn: "Login", icon: LogIn, color: "bg-blue-100 text-blue-700" },
  USER_LOGOUT: { label: "ออกจากระบบ", labelEn: "Logout", icon: LogOut, color: "bg-slate-100 text-slate-600" },
};

// Mock audit logs data
const MOCK_LOGS = [
  { id: 1, type: "WORKLOG_CREATED", user: "อ๋อง", target: "WL-2024-001", timestamp: "2024-05-08T14:30:00Z", details: "ยืมหูฟัง ICIT01" },
  { id: 2, type: "WORKLOG_UPDATED", user: "บี", target: "WL-2024-002", timestamp: "2024-05-08T13:15:00Z", details: "แก้ไขรายละเอียด" },
  { id: 3, type: "USER_LOGIN", user: "ซี", target: "system", timestamp: "2024-05-08T09:00:00Z", details: "" },
  { id: 4, type: "WORKLOG_CREATED", user: "ดี", target: "WL-2024-003", timestamp: "2024-05-08T11:20:00Z", details: "เปิดห้อง 401" },
  { id: 5, type: "WORKLOG_LOCKED", user: "system", target: "WL-2024-000", timestamp: "2024-05-08T00:00:00Z", details: "Auto-locked 23:59" },
  { id: 6, type: "WORKLOG_DELETED", user: "อ๋อง", target: "WL-2024-004", timestamp: "2024-05-07T16:45:00Z", details: "ลบรายการผิดพลาด" },
  { id: 7, type: "USER_LOGOUT", user: "เอฟ", target: "system", timestamp: "2024-05-07T18:30:00Z", details: "" },
  { id: 8, type: "WORKLOG_CREATED", user: "จี", target: "WL-2024-005", timestamp: "2024-05-07T15:10:00Z", details: "Microsoft Authenticator" },
];

export default function AuditLogsPage() {
  const t = useTranslations();
  const router = useRouter();
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const isAdmin = isAdminRole(user);

  // Redirect non-admin users
  useEffect(() => {
    if (user && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [user, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      // TODO: Replace with actual API call
      setLogs(MOCK_LOGS);
      setLoading(false);
    }
  }, [user, isAdmin]);

  const filteredLogs = logs.filter((log) => {
    const matchesFilter = filter === "ALL" || log.type === filter;
    const matchesSearch =
      searchQuery === "" ||
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (!user || !isAdmin) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-slate-600">{t("common.loading")}</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="mb-6">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
            <FileText size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Admin
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              ประวัติการใช้งาน
            </h1>
          </div>
        </div>
      </section>

      {/* Filters */}
      <div className="apple-panel mb-6 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1 max-w-md">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              className="apple-input pl-11"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาผู้ใช้ หรือรายการ..."
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select
              className="apple-input py-2 text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="ALL">ทั้งหมด</option>
              <option value="WORKLOG_CREATED">สร้างรายการ</option>
              <option value="WORKLOG_UPDATED">แก้ไขรายการ</option>
              <option value="WORKLOG_DELETED">ลบรายการ</option>
              <option value="USER_LOGIN">เข้าสู่ระบบ</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="apple-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/60 text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-5 py-4">เวลา</th>
                <th className="px-5 py-4">ประเภท</th>
                <th className="px-5 py-4">ผู้ใช้</th>
                <th className="px-5 py-4">เป้าหมาย</th>
                <th className="px-5 py-4">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => {
                const config = LOG_TYPES[log.type] || LOG_TYPES.WORKLOG_CREATED;
                const Icon = config.icon;
                return (
                  <tr key={log.id} className="bg-white/45">
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-slate-400" />
                        <span>{formatDate(log.timestamp)}</span>
                      </div>
                      <span className="ml-5 text-xs text-slate-400">
                        {formatTime(log.timestamp)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.color}`}
                      >
                        <Icon size={12} />
                        {config.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100">
                          <User size={14} className="text-slate-500" />
                        </div>
                        <span className="font-medium text-slate-700">
                          {log.user}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-600">
                      {log.target}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {log.details || "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="py-12 text-center text-slate-500">
            {t("common.noData")}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        {Object.entries(LOG_TYPES).map(([type, config]) => {
          const count = logs.filter((l) => l.type === type).length;
          return (
            <div key={type} className="apple-panel p-4">
              <div className="flex items-center gap-2">
                <div className={`rounded-full p-1.5 ${config.color}`}>
                  <config.icon size={14} />
                </div>
                <span className="text-xs text-slate-500">{config.label}</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{count}</p>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
