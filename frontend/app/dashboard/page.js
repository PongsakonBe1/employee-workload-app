"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Calendar, Filter, User } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { MetricCard } from "../../components/MetricCard";
import { useAuth } from "../../components/AuthProvider";
import {
  WorkloadByEmployeeChart,
  WorkloadByDutyChart,
  DailyWorkloadTrend,
  MinorTaskDistribution,
} from "../../components/DashboardCharts";
import { db } from "../../lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";

function BarList({ title, items, t }) {
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <div className="apple-panel p-6">
      <h2 className="text-xl font-semibold tracking-tight text-slate-950">
        {title}
      </h2>
      <div className="mt-6 space-y-4">
        {items.slice(0, 8).map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between gap-4 text-sm">
              <span className="truncate font-medium text-slate-700">
                {item.label}
              </span>
              <span className="font-semibold text-slate-950">{item.count}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-slate-950"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper functions for date ranges
const getThaiFiscalYearDates = (fy) => {
  const year = parseInt(fy) - 543;
  return {
    start: `${year - 1}-10-01`,
    end: `${year}-09-30`,
  };
};

const getToday = () => {
  return new Date().toISOString().split("T")[0];
};

const getThisWeek = () => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const start = new Date(today);
  start.setDate(today.getDate() - dayOfWeek);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
};

const getThisMonth = () => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
};

const getThisQuarter = () => {
  const today = new Date();
  const quarter = Math.floor(today.getMonth() / 3);
  const start = new Date(today.getFullYear(), quarter * 3, 1);
  const end = new Date(today.getFullYear(), quarter * 3 + 3, 0);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
};

export default function DashboardPage() {
  const t = useTranslations();
  const { user } = useAuth();
  const [fiscalYear, setFiscalYear] = useState("2568");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  // Filter states
  const [timeFilter, setTimeFilter] = useState("all"); // "all" | "today" | "week" | "month" | "quarter" | "fiscal"
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [staffList, setStaffList] = useState([]);

  // Load staff list for admin filter
  useEffect(() => {
    async function loadStaff() {
      if (user?.role !== "admin" && user?.role !== "superadmin") return;

      try {
        // ดึง user ที่ active และมี lastLoginAt (ใช้งานจริง) หรือไม่มี migratedFrom (ไม่ใช่ของเก่า)
        const q = query(
          collection(db, "users"),
          where("role", "in", ["staff", "admin"]),
          where("active", "==", true),
        );
        const snapshot = await getDocs(q);
        let staff = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          // กรองเอาเฉพาะ user ที่ใช้งานจริง (มี lastLoginAt) หรือไม่มี migratedFrom (ไม่ใช่ของเก่า)
          .filter((u) => u.lastLoginAt || !u.migratedFrom);

        // Deduplicate by uid (Firebase Auth UID)
        // กรณี migrate: user มี 2 documents (seed เก่า + Gmail ใหม่)
        // เอาเฉพาะอันที่มี lastLoginAt ล่าสุด หรือไม่มี migratedFrom (ของจริง)
        const uidMap = new Map();
        staff.forEach((s) => {
          const uid = s.uid || s.id;
          const existing = uidMap.get(uid);

          if (!existing) {
            uidMap.set(uid, s);
          } else {
            // ถ้ามีซ้ำ เลือกอันที่มี lastLoginAt ใหม่กว่า
            const existingDate =
              existing.lastLoginAt?.toDate?.() ||
              new Date(existing.lastLoginAt || 0);
            const newDate =
              s.lastLoginAt?.toDate?.() || new Date(s.lastLoginAt || 0);
            if (newDate > existingDate) {
              uidMap.set(uid, s);
            }
          }
        });

        // กรองเอาเฉพาะ user ที่ไม่มี migratedFrom (ไม่ใช่ของเก่า)
        // หรือถ้ามี migratedFrom แต่เป็น document เดียวที่มี (ไม่มีตัวใหม่)
        staff = Array.from(uidMap.values()).filter((s) => {
          // ถ้าไม่มี migratedFrom → ของจริง
          if (!s.migratedFrom) return true;
          // ถ้ามี migratedFrom แต่ไม่มี lastLoginAt → ของเก่า ไม่เอา
          if (s.migratedFrom && !s.lastLoginAt) return false;
          // ถ้ามี migratedFrom และมี lastLoginAt → เช็คว่ามีตัวที่ไม่มี migratedFrom อยู่ไหม
          const hasNewerVersion = Array.from(uidMap.values()).some(
            (other) => other.uid === s.uid && !other.migratedFrom,
          );
          // ถ้ามีตัวใหม่แล้ว ไม่เอาตัวเก่า
          return !hasNewerVersion;
        });

        // Sort by name
        staff.sort((a, b) => {
          const nameA = (
            a.displayName ||
            a.fullName ||
            a.nickname ||
            ""
          ).toLowerCase();
          const nameB = (
            b.displayName ||
            b.fullName ||
            b.nickname ||
            ""
          ).toLowerCase();
          return nameA.localeCompare(nameB);
        });

        setStaffList(staff);
      } catch (err) {
        console.error("Error loading staff:", err);
      }
    }
    loadStaff();
  }, [user]);

  // Get date range based on filter
  const getDateRange = () => {
    switch (timeFilter) {
      case "today":
        const today = getToday();
        return { start: today, end: today };
      case "week":
        return getThisWeek();
      case "month":
        return getThisMonth();
      case "quarter":
        return getThisQuarter();
      case "fiscal":
        return getThaiFiscalYearDates(fiscalYear);
      default:
        return null; // all time
    }
  };

  useEffect(() => {
    async function loadStats() {
      const worklogsRef = collection(db, "worklogs");
      const isAdmin = user?.role === "admin" || user?.role === "superadmin";
      const dateRange = getDateRange();

      let q;
      const constraints = [];

      // Role-based filtering
      if (!isAdmin) {
        constraints.push(where("employeeId", "==", user.uid));
      } else if (selectedEmployee !== "all") {
        constraints.push(where("employeeId", "==", selectedEmployee));
      }

      // Query without orderBy เพื่อหลีกเลี่ยง composite index + limit 1000 records
      q = query(worklogsRef, ...constraints, limit(1000));

      // Get total count (with limit 1000 to save quota)
      const countQuery = query(worklogsRef, ...constraints, limit(1000));
      const countSnapshot = await getDocs(countQuery);
      const actualTotal = countSnapshot.size;

      const snapshot = await getDocs(q);
      let worklogs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Client-side sort by date (descending)
      worklogs.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date.localeCompare(a.date);
      });

      // Filter by date range (client-side)
      if (dateRange) {
        worklogs = worklogs.filter((log) => {
          if (!log.date) return false;
          return log.date >= dateRange.start && log.date <= dateRange.end;
        });
      }

      // Calculate stats (client-side)
      const total = worklogs.length;
      const byEmployee = {};
      const byMainDuty = {};
      const byMinorTask = {};
      const byDate = {};

      // Debug: Log first few worklogs to check date format
      console.log("Sample worklogs:", worklogs.slice(0, 3));
      console.log("Date range filter:", dateRange);

      worklogs.forEach((log) => {
        // Count by employee (ใช้ displayName ก่อน ถ้าไม่มีค่อยใช้ fullName หรือ nickname)
        const empName =
          log.employeeDisplayName ||
          log.employeeFullName ||
          log.employeeNickname ||
          log.employeeId ||
          "ไม่ระบุ";

        // Debug: ถ้าชื่อสั้นกว่า 2 ตัวอักษร ให้ log ดู
        if (empName && empName.length <= 2) {
          console.log("Short employee name:", empName, "from", log);
        }

        byEmployee[empName] = (byEmployee[empName] || 0) + 1;

        // Count by main duty
        const duty = log.mainDuty || log.dutyGroup || "ไม่ระบุ";
        byMainDuty[duty] = (byMainDuty[duty] || 0) + 1;

        // Count by minor task
        const minor = log.minorTask || "ไม่ระบุ";
        byMinorTask[minor] = (byMinorTask[minor] || 0) + 1;

        // Count by date
        const date = log.date || "ไม่ระบุ";
        byDate[date] = (byDate[date] || 0) + 1;
      });

      // Convert to array format for charts
      const toArray = (obj) =>
        Object.entries(obj)
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count);

      // Sort by date chronologically (for daily trend chart)
      const toArrayByDate = (obj) =>
        Object.entries(obj)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => new Date(a.date) - new Date(b.date));

      const byDateArray = toArrayByDate(byDate);

      // Debug: Log byDate result
      console.log("byDate object:", byDate);
      console.log("byDate array:", byDateArray);

      setData({
        total: actualTotal, // แสดงจำนวนรวมจริง (ไม่ถูก limit)
        totalLoaded: worklogs.length, // จำนวนที่โหลดมาจริง
        byEmployee: toArray(byEmployee),
        byMainDuty: toArray(byMainDuty),
        byMinorTask: toArray(byMinorTask),
        byDate: byDateArray,
        recent: worklogs.slice(0, 10), // แสดงแค่ 10 รายการล่าสุด
        scope: isAdmin
          ? selectedEmployee === "all"
            ? "all"
            : "filtered"
          : "user",
        fiscalYear: getThaiFiscalYearDates(fiscalYear),
        dateRange,
      });
    }

    if (user) {
      loadStats();
    }
  }, [fiscalYear, user, timeFilter, selectedEmployee]);

  const topDuty = useMemo(() => data?.byMainDuty?.[0]?.label || "—", [data]);

  return (
    <AppShell>
      <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            {t("dashboard.fiscalYear")}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
            {t("dashboard.title")}
          </h1>
          <p className="mt-4 max-w-2xl text-slate-600">
            {t("dashboard.subtitle")}
          </p>
        </div>

        <div className="apple-panel p-3">
          <label className="apple-label">{t("dashboard.fiscalYear")}</label>
          <input
            className="apple-input w-40"
            value={fiscalYear}
            onChange={(event) => setFiscalYear(event.target.value)}
          />
        </div>
      </section>

      {/* Filters Section */}
      <section className="mb-6 apple-panel p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-slate-500" />
          <span className="text-sm font-medium text-slate-700">ตัวกรอง</span>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Time Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "ทั้งหมด" },
              { key: "today", label: "วันนี้" },
              { key: "week", label: "สัปดาห์นี้" },
              { key: "month", label: "เดือนนี้" },
              { key: "quarter", label: "ไตรมาสนี้" },
              { key: "fiscal", label: "ปีงบ" },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setTimeFilter(filter.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  timeFilter === filter.key
                    ? "bg-slate-950 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {filter.label}
              </button>
            ))}

            {/* Fiscal Year Selector (show when fiscal filter is active) */}
            {timeFilter === "fiscal" && (
              <select
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
                className="apple-input py-1.5 text-sm ml-2"
              >
                <option value="2568">2568</option>
                <option value="2569">2569</option>
                <option value="2570">2570</option>
              </select>
            )}
          </div>

          {/* Employee Filter (Admin only) */}
          {(user?.role === "admin" || user?.role === "superadmin") && (
            <div className="flex items-center gap-2 ml-auto">
              <User size={16} className="text-slate-500" />
              <select
                className="apple-input py-1.5 text-sm"
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
              >
                <option value="all">ทุกคน</option>
                {staffList.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.displayName ||
                      staff.fullName ||
                      staff.nickname ||
                      staff.email}
                    {staff.role === "admin" && " [แอดมิน]"}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Show current filter info */}
        <div className="mt-3 text-xs text-slate-500 flex items-center gap-1">
          <Calendar size={12} />
          {data?.dateRange ? (
            <span>
              ช่วงวันที่: {data.dateRange.start} ถึง {data.dateRange.end}
            </span>
          ) : (
            <span>ช่วงวันที่: ทั้งหมด</span>
          )}
        </div>
      </section>

      {error ? (
        <div className="mb-6 rounded-2xl bg-red-50 p-4 text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-5 md:grid-cols-3">
        <MetricCard
          label={t("dashboard.totalRecords")}
          value={data?.total ?? "…"}
          hint={
            data?.scope === "all" ? t("common.all") : t("dashboard.byEmployee")
          }
        />
        <MetricCard
          label={t("dashboard.fiscalPeriod")}
          value={data?.fiscalYear?.startDate ?? "…"}
          hint={
            data?.fiscalYear?.endDate
              ? `${t("common.to") || "to"} ${data.fiscalYear.endDate}`
              : ""
          }
        />
        <MetricCard
          label={t("dashboard.topDuty")}
          value={topDuty}
          hint={t("dashboard.byMainDuty")}
        />
      </section>

      {/* Charts Section */}
      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <WorkloadByEmployeeChart data={data?.byEmployee || []} />
        <WorkloadByDutyChart data={data?.byMainDuty || []} />
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <DailyWorkloadTrend data={data?.byDate || []} />
        <MinorTaskDistribution data={data?.byMinorTask || []} />
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <BarList
          title={t("dashboard.byEmployee")}
          items={data?.byEmployee || []}
        />
        <BarList
          title={t("dashboard.byMainDuty")}
          items={data?.byMainDuty || []}
        />
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <BarList
          title={t("dashboard.byMinorTask")}
          items={data?.byMinorTask || []}
        />

        <div className="apple-panel p-6">
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">
            {t("dashboard.recentRecords")}
          </h2>
          <div className="mt-5 overflow-hidden rounded-3xl border border-slate-100 bg-white/70">
            {(data?.recent || []).map((item) => (
              <div
                key={item.id}
                className="border-b border-slate-100 p-4 last:border-0"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-semibold text-slate-950">
                    {item.mainDuty}
                  </p>
                  <p className="text-xs text-slate-500">
                    {item.date} {item.time}
                  </p>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {item.employeeDisplayName ||
                    item.employeeFullName ||
                    item.employeeNickname}{" "}
                  · {item.minorTask || t("common.noData")}
                </p>
                {item.comment ? (
                  <p className="mt-2 text-sm text-slate-600">{item.comment}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
