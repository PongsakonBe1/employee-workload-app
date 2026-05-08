"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../../components/AppShell";
import { MetricCard } from "../../components/MetricCard";
import { apiFetch } from "../../lib/api";

function BarList({ title, items }) {
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <div className="apple-panel p-6">
      <h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
      <div className="mt-6 space-y-4">
        {items.slice(0, 8).map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between gap-4 text-sm">
              <span className="truncate font-medium text-slate-700">{item.label}</span>
              <span className="font-semibold text-slate-950">{item.count}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-slate-950" style={{ width: `${(item.count / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [fiscalYear, setFiscalYear] = useState("2569");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch(`/stats/summary?fiscalYear=${encodeURIComponent(fiscalYear)}`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [fiscalYear]);

  const topDuty = useMemo(() => data?.byMainDuty?.[0]?.label || "—", [data]);

  return (
    <AppShell>
      <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Fiscal-year dashboard</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
            Workload overview
          </h1>
          <p className="mt-4 max-w-2xl text-slate-600">
            Summary comes from MongoDB records seeded from the Excel workbook and newly created workload logs.
          </p>
        </div>

        <div className="apple-panel p-3">
          <label className="apple-label">Fiscal year</label>
          <input
            className="apple-input w-40"
            value={fiscalYear}
            onChange={(event) => setFiscalYear(event.target.value)}
          />
        </div>
      </section>

      {error ? <div className="mb-6 rounded-2xl bg-red-50 p-4 text-red-700">{error}</div> : null}

      <section className="grid gap-5 md:grid-cols-3">
        <MetricCard label="Total records" value={data?.total ?? "…"} hint={data?.scope === "all" ? "All employees" : "Your records"} />
        <MetricCard label="Fiscal period" value={data ? `${data.fiscalYear.startDate}` : "…"} hint={data ? `to ${data.fiscalYear.endDate}` : ""} />
        <MetricCard label="Top duty" value={topDuty} hint="Highest record count" />
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <BarList title="By employee" items={data?.byEmployee || []} />
        <BarList title="By main duty" items={data?.byMainDuty || []} />
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <BarList title="Top minor tasks" items={data?.byMinorTask || []} />

        <div className="apple-panel p-6">
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">Recent records</h2>
          <div className="mt-5 overflow-hidden rounded-3xl border border-slate-100 bg-white/70">
            {(data?.recent || []).map((item) => (
              <div key={item.id} className="border-b border-slate-100 p-4 last:border-0">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-semibold text-slate-950">{item.mainDuty}</p>
                  <p className="text-xs text-slate-500">{item.date} {item.time}</p>
                </div>
                <p className="mt-1 text-sm text-slate-500">{item.employeeNickname} · {item.minorTask || "No minor task"}</p>
                {item.comment ? <p className="mt-2 text-sm text-slate-600">{item.comment}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
