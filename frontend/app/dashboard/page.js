"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Calendar, Filter, User } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { MetricCard } from "../../components/MetricCard";
import { useAuth } from "../../components/AuthProvider";
import { db } from "../../lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";

const ChartLoading = () => (
  <div className="apple-panel flex h-48 items-center justify-center text-slate-400">
    กำลังโหลดกราฟ…
  </div>
);

const WorkloadByEmployeeChart = dynamic(
  () => import("../../components/DashboardCharts").then((m) => m.WorkloadByEmployeeChart),
  { ssr: false, loading: ChartLoading }
);
const WorkloadByDutyChart = dynamic(
  () => import("../../components/DashboardCharts").then((m) => m.WorkloadByDutyChart),
  { ssr: false, loading: ChartLoading }
);
const DailyWorkloadTrend = dynamic(
  () => import("../../components/DashboardCharts").then((m) => m.DailyWorkloadTrend),
  { ssr: false, loading: ChartLoading }
);
const MinorTaskDistribution = dynamic(
  () => import("../../components/DashboardCharts").then((m) => m.MinorTaskDistribution),
  { ssr: false, loading: ChartLoading }
);
const WorkloadHeatmap = dynamic(
  () => import("../../components/DashboardCharts").then((m) => m.WorkloadHeatmap),
  { ssr: false, loading: ChartLoading }
);
const HourOfDayChart = dynamic(
  () => import("../../components/DashboardCharts").then((m) => m.HourOfDayChart),
  { ssr: false, loading: ChartLoading }
);

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

const toLocalDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getThisWeek = () => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const start = new Date(today);
  start.setDate(today.getDate() - dayOfWeek);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toLocalDateStr(start), end: toLocalDateStr(end) };
};

const getThisMonth = () => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0); // last day of month
  return { start: toLocalDateStr(start), end: toLocalDateStr(end) };
};

const getThisQuarter = () => {
  const today = new Date();
  const q = Math.floor(today.getMonth() / 3);
  const start = new Date(today.getFullYear(), q * 3, 1);
  const end = new Date(today.getFullYear(), q * 3 + 3, 0); // last day of last month in quarter
  return { start: toLocalDateStr(start), end: toLocalDateStr(end) };
};

export default function DashboardPage() {
  const t = useTranslations();
  const { user } = useAuth();
  const [fiscalYear, setFiscalYear] = useState("2569");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  // Filter states
  const [timeFilter, setTimeFilter] = useState("month"); // Default: 1 month to save quota
  const [showAllData, setShowAllData] = useState(false); // Toggle for loading all data
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [staffList, setStaffList] = useState([]);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [pendingCustomStart, setPendingCustomStart] = useState("");
  const [pendingCustomEnd, setPendingCustomEnd] = useState("");
  const [leaderboard, setLeaderboard] = useState([]); // staff leaderboard

  // Modal state for limit warning
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [actualCount, setActualCount] = useState(0);
  const [hasMoreData, setHasMoreData] = useState(false); // True if there might be more records than we queried
  const [dataWarning, setDataWarning] = useState(""); // Warning message when charts aggregate from truncated data

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
      case "custom":
        return customStart && customEnd ? { start: customStart, end: customEnd } : null;
      default:
        return null; // all time
    }
  };

  useEffect(() => {
    async function loadStats() {
      const worklogsRef = collection(db, "worklogs");
      const isAdmin = user?.role === "admin" || user?.role === "superadmin";
      const dateRange = getDateRange();

      // Build uidToName map จาก users collection (ชื่อปัจจุบัน)
      let uidToName = {};
      try {
        const usersSnap = await getDocs(
          query(collection(db, "users"), where("active", "==", true))
        );
        usersSnap.docs.forEach((d) => {
          const u = d.data();
          uidToName[d.id] = u.displayName || u.fullName || u.nickname || u.email || d.id;
        });
      } catch (_) {}

      let q;
      const constraints = [];

      // หา displayName ของ selectedEmployee เพื่อใช้ match worklogs เก่า
      let selectedDisplayName = null;
      if (isAdmin && selectedEmployee !== "all") {
        const sel = staffList.find((s) => s.id === selectedEmployee);
        selectedDisplayName =
          sel?.displayName || sel?.nickname || sel?.fullName || null;
      }

      // Role-based filtering
      // DA-3: Staff ไม่ filter employeeId ใน query เพื่อใช้ข้อมูลร่วมคำนวณ leaderboard ได้เลย (ลด query ซ้ำซ้อน)
      if (isAdmin && selectedEmployee !== "all") {
        // Admin เลือกดูรายบุคคล
        constraints.push(where("employeeId", "==", selectedEmployee));
      }

      // STEP 1: Count actual records in date range (for accurate display)
      let totalInRange = 0;
      let allWorklogsInRange = [];
      let worklogs = [];

      let hasMoreThanLimit = false;

      if (!showAllData) {
        // Query up to 1000 records
        let countQuery;
        if (dateRange) {
          countQuery = query(
            worklogsRef,
            ...constraints,
            where("date", ">=", dateRange.start),
            where("date", "<=", dateRange.end),
            limit(1000),
          );
        } else {
          countQuery = query(worklogsRef, ...constraints, limit(1000));
        }

        const countSnapshot = await getDocs(countQuery);
        let docsById = new Map(
          countSnapshot.docs.map((d) => [d.id, { id: d.id, ...d.data() }]),
        );

        // ถ้า filter รายบุคคล: query เพิ่มด้วย employeeDisplayName/employeeName == displayName
        // เพื่อดึง worklogs เก่าที่บันทึกชื่อแทน uid (ไม่ใช้ where date เพื่อหลีกเลี่ยง composite index)
        if (isAdmin && selectedEmployee !== "all" && selectedDisplayName) {
          const nameSnapshots = await Promise.all([
            getDocs(
              query(
                worklogsRef,
                where("employeeDisplayName", "==", selectedDisplayName),
                limit(500),
              ),
            ),
            getDocs(
              query(
                worklogsRef,
                where("employeeName", "==", selectedDisplayName),
                limit(500),
              ),
            ),
          ]);
          nameSnapshots.forEach((snap) => {
            snap.docs.forEach((d) => {
              if (!docsById.has(d.id)) {
                docsById.set(d.id, { id: d.id, ...d.data() });
              }
            });
          });
          // filter date ที่ client หลัง merge
          if (dateRange) {
            for (const [id, doc] of docsById) {
              if (
                !doc.date ||
                doc.date < dateRange.start ||
                doc.date > dateRange.end
              ) {
                docsById.delete(id);
              }
            }
          }
        }

        allWorklogsInRange = Array.from(docsById.values());
        totalInRange = allWorklogsInRange.length;
        hasMoreThanLimit = countSnapshot.size >= 1000;

        // Sort and take only first 300 for display
        allWorklogsInRange.sort((a, b) => {
          if (!a.date) return 1;
          if (!b.date) return -1;
          return b.date.localeCompare(a.date);
        });
        worklogs = allWorklogsInRange.slice(0, 300);
      } else {
        // Showing all data - load up to 1000
        const dataLimit = 1000;
        q = query(worklogsRef, ...constraints, limit(dataLimit));

        const snapshot = await getDocs(q);
        let docsById = new Map(
          snapshot.docs.map((d) => [d.id, { id: d.id, ...d.data() }]),
        );

        // merge worklogs เก่าที่ใช้ชื่อ
        if (isAdmin && selectedEmployee !== "all" && selectedDisplayName) {
          const nameSnapshots = await Promise.all([
            getDocs(
              query(
                worklogsRef,
                where("employeeDisplayName", "==", selectedDisplayName),
                limit(500),
              ),
            ),
            getDocs(
              query(
                worklogsRef,
                where("employeeName", "==", selectedDisplayName),
                limit(500),
              ),
            ),
          ]);
          nameSnapshots.forEach((snap) => {
            snap.docs.forEach((d) => {
              if (!docsById.has(d.id))
                docsById.set(d.id, { id: d.id, ...d.data() });
            });
          });
        }

        worklogs = Array.from(docsById.values());

        // Client-side sort
        worklogs.sort((a, b) => {
          if (!a.date) return 1;
          if (!b.date) return -1;
          return b.date.localeCompare(a.date);
        });

        // Filter by date range if specified
        if (dateRange) {
          worklogs = worklogs.filter((log) => {
            if (!log.date) return false;
            return log.date >= dateRange.start && log.date <= dateRange.end;
          });
        }

        totalInRange = worklogs.length;
        allWorklogsInRange = worklogs; // DA-3: เก็บ full dataset สำหรับ leaderboard
      }

      // DA-3: สำหรับ staff — filter worklogs เฉพาะของตัวเองสำหรับแสดง chart/stats
      // (allWorklogsInRange ยังเก็บข้อมูลทุกคนไว้ใช้คำนวณ leaderboard)
      if (!isAdmin) {
        worklogs = worklogs.filter((log) => log.employeeId === user.uid);
        totalInRange = allWorklogsInRange.filter((log) => log.employeeId === user.uid).length;
      }

      setActualCount(totalInRange);
      setHasMoreData(hasMoreThanLimit);

      // DA-1: Show warning when aggregating from truncated data
      if (hasMoreThanLimit) {
        setDataWarning(`ข้อมูลในช่วงนี้มีมากกว่า 1,000 รายการ — กราฟและสถิติแสดงจากข้อมูลบางส่วนเท่านั้น`);
      } else if (totalInRange > 300 && !showAllData) {
        setDataWarning(`กราฟแสดงจาก 300 รายการล่าสุด (จากทั้งหมด ${totalInRange} รายการ)`);
      } else {
        setDataWarning("");
      }

      // Show modal if count > 300
      if (totalInRange > 300 && !showAllData) {
        setShowLimitModal(true);
      } else {
        setShowLimitModal(false);
      }

      // Use actual count for display
      const actualTotal = totalInRange;

      // Calculate stats (client-side)
      const total = worklogs.length;
      const byEmployee = {};
      const byMainDuty = {};
      const byMinorTask = {};
      const byDate = {};
      const byHour = {};
      const byDayHour = {}; // DOW (1=Mon..7=Sun) × hour key "D-HH"

      worklogs.forEach((log) => {
        // Count by employee — join ชื่อปัจจุบันจาก users collection
        const empName =
          (log.employeeId && uidToName[log.employeeId])
            ? uidToName[log.employeeId]
            : (log.employeeDisplayName || log.employeeFullName || log.employeeNickname || log.employeeId || "ไม่ระบุ");

        byEmployee[empName] = (byEmployee[empName] || 0) + 1;

        // Count by hour-of-day (parse from time field "HH:MM")
        if (log.time) {
          const h = parseInt(log.time.split(":")[0], 10);
          if (!isNaN(h)) {
            const key = `${String(h).padStart(2,"0")}:00`;
            byHour[key] = (byHour[key] || 0) + 1;

            // Count DOW × hour for heatmap (Mon=0..Sun=6 in display order)
            if (log.date) {
              // DA-4: เพิ่ม T00:00:00 เพื่อป้องกัน timezone shift เมื่อ parse date string
              const dow = new Date(log.date + "T00:00:00").getDay(); // 0=Sun..6=Sat
              const displayDow = dow === 0 ? 6 : dow - 1; // Mon=0..Sun=6
              const dhKey = `${displayDow}-${String(h).padStart(2,"0")}`;
              byDayHour[dhKey] = (byDayHour[dhKey] || 0) + 1;
            }
          }
        }

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

      // Sort byHour chronologically
      const byHourArray = Object.entries(byHour)
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => a.hour.localeCompare(b.hour));

      setData({
        total: actualTotal,
        totalLoaded: worklogs.length,
        byEmployee: toArray(byEmployee),
        byMainDuty: toArray(byMainDuty),
        byMinorTask: toArray(byMinorTask),
        byDate: byDateArray,
        byHour: byHourArray,
        byDayHour,
        recent: [...worklogs].sort((a, b) => {
          const dateCmp = (b.date || "").localeCompare(a.date || "");
          if (dateCmp !== 0) return dateCmp;
          return (b.time || "").localeCompare(a.time || "");
        }).slice(0, 10),
        scope: isAdmin
          ? selectedEmployee === "all"
            ? "all"
            : "filtered"
          : "user",
        fiscalYear: getThaiFiscalYearDates(fiscalYear),
        dateRange,
        uidToName,
      });

      // Staff leaderboard — DA-3: คำนวณจาก allWorklogsInRange ที่ได้มาแล้ว (ไม่ต้อง query แยก)
      if (!isAdmin) {
        const lbByEmp = {};
        allWorklogsInRange.forEach((log) => {
          const empId = log.employeeId;
          if (empId) lbByEmp[empId] = (lbByEmp[empId] || 0) + 1;
        });
        const lb = Object.entries(lbByEmp)
          .map(([uid, count]) => ({
            uid,
            label: uidToName[uid] || uid,
            count,
          }))
          .sort((a, b) => b.count - a.count);
        setLeaderboard(lb);
      }
    }

    if (user) {
      loadStats();
    }
  }, [fiscalYear, user, timeFilter, selectedEmployee, showAllData, customStart, customEnd]);

  // Reset showAllData when filters change to save quota
  useEffect(() => {
    setShowAllData(false);
  }, [fiscalYear, timeFilter, selectedEmployee, customStart, customEnd]);

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
                aria-pressed={timeFilter === filter.key}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 ${
                  timeFilter === filter.key
                    ? "bg-slate-950 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {filter.label}
              </button>
            ))}

            {/* Load All Data Button (for expanding quota) */}
            <button
              onClick={() => actualCount > 300 && setShowAllData(!showAllData)}
              disabled={actualCount <= 300}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition border ${
                showAllData
                  ? "bg-amber-100 text-amber-700 border-amber-300"
                  : actualCount > 300
                    ? "bg-white text-amber-600 border-amber-300 hover:bg-amber-50 animate-pulse"
                    : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
              }`}
              title={
                actualCount <= 300
                  ? "ข้อมูลในช่วงนี้ไม่เกิน 300 รายการ"
                  : showAllData
                    ? "กำลังแสดงข้อมูลทั้งหมด (ใช้ quota มาก)"
                    : `มี ${actualCount} รายการ - คลิกเพื่อแสดงทั้งหมด`
              }
            >
              {actualCount <= 300
                ? `✓ ครบแล้ว (${actualCount})`
                : showAllData
                  ? `แสดงทั้งหมด (${actualCount}${hasMoreData ? "+" : ""})`
                  : `โหลดเพิ่ม (${actualCount}${hasMoreData ? "+" : ""})`}
            </button>

            {/* Custom Date Range Button */}
            <button
              onClick={() => {
                setPendingCustomStart(customStart || getToday().slice(0, 7) + "-01");
                setPendingCustomEnd(customEnd || getToday());
                setShowCustomDateModal(true);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                timeFilter === "custom"
                  ? "bg-slate-950 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {timeFilter === "custom" && customStart ? `${customStart} → ${customEnd}` : "กำหนดช่วงเอง"}
            </button>

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
          {actualCount > 0 && (
            <span className="ml-2">
              • จำนวน: {actualCount}
              {hasMoreData ? "+" : ""} รายการ
              {actualCount > 300 && !showAllData && (
                <span className="text-amber-600 ml-1">
                  (แสดง 300 รายการล่าสุด)
                </span>
              )}
            </span>
          )}
        </div>
      </section>

      {/* Custom Date Range Modal */}
      {showCustomDateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-labelledby="custom-date-modal-title">
          <div className="apple-panel w-full max-w-sm p-6">
            <h3 id="custom-date-modal-title" className="text-lg font-semibold text-slate-950 mb-4">กำหนดช่วงเวลาเอง</h3>
            <div className="space-y-3">
              <div>
                <label htmlFor="custom-date-start" className="text-sm font-medium text-slate-700 block mb-1">วันเริ่มต้น</label>
                <input
                  id="custom-date-start"
                  type="date"
                  value={pendingCustomStart}
                  onChange={(e) => setPendingCustomStart(e.target.value)}
                  className="apple-input w-full"
                />
              </div>
              <div>
                <label htmlFor="custom-date-end" className="text-sm font-medium text-slate-700 block mb-1">วันสิ้นสุด</label>
                <input
                  id="custom-date-end"
                  type="date"
                  value={pendingCustomEnd}
                  onChange={(e) => setPendingCustomEnd(e.target.value)}
                  className="apple-input w-full"
                />
              </div>
              {pendingCustomStart && pendingCustomEnd && (() => {
                const days = Math.round((new Date(pendingCustomEnd) - new Date(pendingCustomStart)) / 86400000);
                return days > 90 ? (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
                    ⚠️ ช่วงวันที่เลือก <strong>{days} วัน</strong> อาจใช้ Firestore quota มาก
                    ระบบจะดึงข้อมูลสูงสุด 1,000 รายการ
                  </div>
                ) : null;
              })()}
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => {
                  if (pendingCustomStart && pendingCustomEnd && pendingCustomStart <= pendingCustomEnd) {
                    setCustomStart(pendingCustomStart);
                    setCustomEnd(pendingCustomEnd);
                    setTimeFilter("custom");
                    setShowCustomDateModal(false);
                  }
                }}
                disabled={!pendingCustomStart || !pendingCustomEnd || pendingCustomStart > pendingCustomEnd}
                className="apple-button flex-1"
              >
                ยืนยัน
              </button>
              <button
                onClick={() => setShowCustomDateModal(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {error ? (
        <div className="mb-6 rounded-2xl bg-red-50 p-4 text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-5 md:grid-cols-3">
        <MetricCard
          label={t("dashboard.totalRecords")}
          value={`${actualCount}${hasMoreData ? "+" : ""}`}
          hint={
            actualCount > 300 && !showAllData
              ? `แสดง 300 จาก ${actualCount}${hasMoreData ? "+" : ""} รายการ`
              : data?.scope === "all"
                ? t("common.all")
                : t("dashboard.byEmployee")
          }
        />
        <MetricCard
          label={t("dashboard.fiscalPeriod")}
          value={data?.dateRange?.start ?? data?.fiscalYear?.startDate ?? "…"}
          hint={
            data?.dateRange?.end || data?.fiscalYear?.endDate
              ? `${t("common.to") || "to"} ${data?.dateRange?.end || data?.fiscalYear?.endDate}`
              : ""
          }
        />
        <MetricCard
          label={t("dashboard.topDuty")}
          value={topDuty}
          hint={t("dashboard.byMainDuty")}
        />
      </section>
      {/* Limit Warning Modal */}
      {showLimitModal && (
        <div role="alert" aria-live="assertive" className="my-6 rounded-2xl bg-amber-50 border border-amber-200 p-5">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-1">
                แสดงข้อมูลบางส่วน
              </h3>
              <p className="text-sm text-amber-800 mb-3">
                ช่วงเวลาที่เลือกมี{" "}
                <strong>
                  {actualCount}
                  {hasMoreData ? "+" : ""} รายการ
                </strong>
                <br />
                กำลังแสดง <strong>300 รายการล่าสุด</strong> เพื่อประหยัด quota
                <br />
                <span className="text-xs text-amber-700">
                  กดโหลดเพิ่มเพื่อดูข้อมูลทั้งหมด
                  {hasMoreData
                    ? " (อาจมีมากกว่า 1000 รายการ)"
                    : ` (${actualCount} รายการ)`}
                </span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAllData(true)}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition"
                >
                  โหลดทั้งหมด ({actualCount} รายการ)
                </button>
                <button
                  onClick={() => setShowLimitModal(false)}
                  className="px-4 py-2 bg-white text-amber-700 border border-amber-300 rounded-lg text-sm font-medium hover:bg-amber-50 transition"
                >
                  ปิด (แสดง 300 รายการ)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DA-1: Data truncation warning for charts */}
      {dataWarning && (
        <div className="my-4 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-2 text-sm text-amber-800">
          <span>⚠️</span>
          <span>{dataWarning}</span>
        </div>
      )}

      {/* แถว 1: สัดส่วนงานตามหัวข้อหลัก (pie) + จำนวนงานตามหัวข้อรอง */}
      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <WorkloadByDutyChart data={data?.byMainDuty || []} />
        <MinorTaskDistribution data={data?.byMinorTask || []} />
      </section>

      {/* แถว 2: แนวโน้มงานรายวัน (เต็มความกว้าง ตามตัวกรอง) */}
      <section className="mt-5">
        <DailyWorkloadTrend 
          data={data?.byDate || []} 
          dateRange={data?.byDate?.length > 0 ? `${data.byDate[0]?.date} - ${data.byDate[data.byDate.length-1]?.date}` : ''}
        />
      </section>

      {/* แถว 2.5: Workload Heatmap + งานตามช่วงเวลา */}
      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <WorkloadHeatmap data={data?.byDayHour || {}} />
        <HourOfDayChart data={data?.byHour || []} />
      </section>

      {/* แถว 3: จำนวนงานตามหัวข้อหลัก + จำนวนงานตามหัวข้อรอง */}
      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <BarList
          title={t("dashboard.byMainDuty")}
          items={data?.byMainDuty || []}
        />
        <BarList
          title={t("dashboard.byMinorTask")}
          items={data?.byMinorTask || []}
        />
      </section>

      {/* แถว 4: Admin/Superadmin — สถิติการลงงานทุกคน + Top 3 */}
      {/*        Staff — สถิติส่วนตัวในกลุ่ม */}
      <section className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        {(user?.role === "admin" || user?.role === "superadmin") ? (
          <div className="apple-panel p-6">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950 mb-4">
              สถิติการลงงานของทีม
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-600">Staff ทั้งหมด</span>
                <span className="text-2xl font-bold text-slate-950">{staffList.length} คน</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-600">งานรวมในช่วงที่เลือก</span>
                <span className="text-2xl font-bold text-slate-950">{actualCount} งาน</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-xl">
                <span className="text-indigo-700">เฉลี่ยงานต่อคน</span>
                <span className="text-2xl font-bold text-indigo-700">
                  {(data?.byEmployee?.length || 0) > 0 ? (actualCount / data.byEmployee.length).toFixed(1) : "0"} งาน/คน
                </span>
              </div>
              <div className="pt-1">
                <h3 className="text-sm font-medium text-slate-700 mb-2">Top 3 ลงงานมากสุด</h3>
                <div className="space-y-2">
                  {(data?.byEmployee?.slice(0, 3) || []).map((emp, idx) => (
                    <div key={emp.label} className="flex items-center gap-3 p-2 rounded-xl bg-slate-50">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? "bg-yellow-100 text-yellow-700" :
                        idx === 1 ? "bg-slate-200 text-slate-600" :
                        "bg-orange-100 text-orange-600"
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="flex-1 text-sm text-slate-700 truncate">{emp.label}</span>
                      <span className="text-sm font-semibold text-slate-950">{emp.count} งาน</span>
                    </div>
                  ))}
                </div>
              </div>
              {(data?.byEmployee?.length || 0) > 3 && (
                <div className="pt-1">
                  <h3 className="text-sm font-medium text-slate-500 mb-2">ทั้งหมด ({data.byEmployee.length} คน)</h3>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {(data?.byEmployee || []).map((emp, idx) => (
                      <div key={emp.label} className="flex items-center gap-2 px-2 py-1 text-sm">
                        <span className="w-5 text-slate-400 text-xs">{idx + 1}.</span>
                        <span className="flex-1 text-slate-600 truncate">{emp.label}</span>
                        <span className="font-medium text-slate-800">{emp.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (() => {
          const myUid = user?.uid || "";
          const myEntry = leaderboard.find(e => e.uid === myUid);
          const myRankIdx = leaderboard.findIndex(e => e.uid === myUid);
          const myCount = myEntry?.count ?? actualCount;
          const myRank = myRankIdx >= 0 ? myRankIdx + 1 : null;
          const myName = myEntry?.label || user?.displayName || user?.email || "";
          return (
            <div className="apple-panel p-6">
              <h2 className="text-xl font-semibold tracking-tight text-slate-950 mb-4">
                สถิติงานของฉัน
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-600">งานของฉันในช่วงนี้</span>
                  <span className="text-2xl font-bold text-slate-950">{myCount} งาน</span>
                </div>
                {myRank !== null && leaderboard.length > 1 && (
                  <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-xl">
                    <span className="text-indigo-700">อันดับในกลุ่ม</span>
                    <span className="text-2xl font-bold text-indigo-700">
                      #{myRank} / {leaderboard.length} คน
                    </span>
                  </div>
                )}
                {leaderboard.length > 1 && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-700 mb-2 mt-2">ลำดับทั้งหมดในช่วงนี้</h3>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {leaderboard.map((emp, idx) => (
                        <div
                          key={emp.uid}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm ${
                            emp.uid === myUid ? "bg-indigo-50 font-semibold" : ""
                          }`}
                        >
                          <span className="w-5 text-slate-400 text-xs">{idx + 1}.</span>
                          <span className={`flex-1 truncate ${emp.uid === myUid ? "text-indigo-700" : "text-slate-600"}`}>
                            {emp.label} {emp.uid === myUid ? "← ฉัน" : ""}
                          </span>
                          <span className={emp.uid === myUid ? "text-indigo-700 font-bold" : "text-slate-700"}>{emp.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {leaderboard.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-2">กำลังโหลดข้อมูลกลุ่ม…</p>
                )}
              </div>
            </div>
          );
        })()}

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
