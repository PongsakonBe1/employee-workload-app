"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
import { collection, query, where, getDocs } from "firebase/firestore";

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

export default function DashboardPage() {
  const t = useTranslations();
  const { user } = useAuth();
  const [fiscalYear, setFiscalYear] = useState("2569");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStats() {
      const worklogsRef = collection(db, "worklogs");

      // Query based on fiscal year
      const q =
        user?.role === "admin"
          ? query(worklogsRef) // Admin sees all
          : query(worklogsRef, where("employeeId", "==", user.uid));

      const snapshot = await getDocs(q);
      const worklogs = snapshot.docs.map((doc) => doc.data());

      // Calculate stats (client-side)
      const total = worklogs.length;
      const byEmployee = {};
      const byMainDuty = {};
      const byMinorTask = {};
      const byDate = {};

      worklogs.forEach((log) => {
        // Count by employee
        const empName = log.employeeNickname || log.employeeId || "ไม่ระบุ";
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

      setData({
        total,
        byEmployee: toArray(byEmployee),
        byMainDuty: toArray(byMainDuty),
        byMinorTask: toArray(byMinorTask),
        byDate: toArray(byDate),
        recent: worklogs.slice(0, 5),
        scope: user?.role === "admin" ? "all" : "user",
        fiscalYear: {
          startDate: "2025-10-01",
          endDate: "2026-09-30",
        },
      });
    }

    if (user) {
      loadStats();
    }
  }, [fiscalYear, user]);

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
                  {item.employeeNickname} ·{" "}
                  {item.minorTask || t("common.noData")}
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
