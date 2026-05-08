"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Users, Search, Shield, User, CheckCircle2, XCircle } from "lucide-react";
import { AppShell } from "../../../components/AppShell";
import { useAuth } from "../../../components/AuthProvider";
import { apiFetch } from "../../../lib/api";

export default function AdminUsersPage() {
  const t = useTranslations();
  const router = useRouter();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  useEffect(() => {
    if (user?.role === "admin") {
      loadUsers();
    }
  }, [user]);

  async function loadUsers() {
    try {
      setLoading(true);
      // For now, use mock data since backend doesn't have users endpoint yet
      // TODO: Replace with actual API call
      const mockUsers = [
        { id: 1, username: "admin", nickname: "Admin", fullName: "Administrator", role: "admin", active: true, worklogCount: 0 },
        { id: 2, username: "a", nickname: "อ๋อง", fullName: "Staff A", role: "user", active: true, worklogCount: 245 },
        { id: 3, username: "b", nickname: "บี", fullName: "Staff B", role: "user", active: true, worklogCount: 189 },
        { id: 4, username: "c", nickname: "ซี", fullName: "Staff C", role: "user", active: true, worklogCount: 312 },
        { id: 5, username: "d", nickname: "ดี", fullName: "Staff D", role: "user", active: true, worklogCount: 156 },
        { id: 6, username: "e", nickname: "อี", fullName: "Staff E", role: "user", active: true, worklogCount: 278 },
        { id: 7, username: "f", nickname: "เอฟ", fullName: "Staff F", role: "user", active: true, worklogCount: 198 },
        { id: 8, username: "g", nickname: "จี", fullName: "Staff G", role: "user", active: false, worklogCount: 134 },
      ];
      setUsers(mockUsers);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user || user.role !== "admin") {
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-white">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Admin
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              จัดการผู้ใช้
            </h1>
          </div>
        </div>
      </section>

      {/* Search */}
      <div className="apple-panel mb-6 p-4">
        <div className="relative max-w-md">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            className="apple-input pl-11"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาพนักงาน..."
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="apple-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/60 text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-5 py-4">ชื่อเล่น</th>
                <th className="px-5 py-4">ชื่อเต็ม</th>
                <th className="px-5 py-4">Username</th>
                <th className="px-5 py-4">สิทธิ์</th>
                <th className="px-5 py-4">สถานะ</th>
                <th className="px-5 py-4">จำนวนงาน</th>
                <th className="px-5 py-4">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="bg-white/45">
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-950">
                    {u.nickname}
                  </td>
                  <td className="px-5 py-4 text-slate-700">{u.fullName}</td>
                  <td className="px-5 py-4 text-slate-600">{u.username}</td>
                  <td className="px-5 py-4">
                    {u.role === "admin" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700">
                        <Shield size={12} />
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        <User size={12} />
                        User
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {u.active ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <CheckCircle2 size={14} />
                        ใช้งาน
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                        <XCircle size={14} />
                        ไม่ใช้งาน
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {u.worklogCount.toLocaleString()}
                  </td>
                  <td className="px-5 py-4">
                    {u.role !== "admin" && (
                      <button
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                          u.active
                            ? "bg-red-50 text-red-600 hover:bg-red-100"
                            : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                        }`}
                      >
                        {u.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="py-12 text-center text-slate-500">{t("common.noData")}</div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="apple-panel p-4">
          <p className="text-sm text-slate-500">พนักงานทั้งหมด</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{users.length}</p>
        </div>
        <div className="apple-panel p-4">
          <p className="text-sm text-slate-500">ใช้งานอยู่</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">
            {users.filter((u) => u.active).length}
          </p>
        </div>
        <div className="apple-panel p-4">
          <p className="text-sm text-slate-500">งานรวมทั้งหมด</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">
            {users.reduce((sum, u) => sum + u.worklogCount, 0).toLocaleString()}
          </p>
        </div>
      </div>
    </AppShell>
  );
}
