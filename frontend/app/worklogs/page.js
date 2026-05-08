"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { EmptyState } from "../../components/EmptyState";
import { apiFetch } from "../../lib/api";

export default function WorkLogsPage() {
  const [filters, setFilters] = useState({ search: "", from: "", to: "" });
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load(page = 1) {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      page: String(page),
      limit: "20"
    });

    if (filters.search) params.set("search", filters.search);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);

    try {
      const next = await apiFetch(`/worklogs?${params.toString()}`);
      setData(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(event) {
    event.preventDefault();
    load(1);
  }

  return (
    <AppShell>
      <section className="mb-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">History</p>
          <h1 className="mt-3 text-5xl font-semibold tracking-tight text-slate-950">Workload records</h1>
        </div>
      </section>

      <form onSubmit={submit} className="apple-panel mb-6 grid gap-4 p-4 md:grid-cols-[1.5fr_0.7fr_0.7fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            className="apple-input pl-11"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search duty, minor task, recipient, comment…"
          />
        </div>
        <input className="apple-input" type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        <input className="apple-input" type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        <button className="apple-button" disabled={loading}>{loading ? "Loading…" : "Filter"}</button>
      </form>

      {error ? <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      {data.items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="apple-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/60 text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Employee</th>
                  <th className="px-5 py-4">Main duty</th>
                  <th className="px-5 py-4">Minor task</th>
                  <th className="px-5 py-4">Comment</th>
                  <th className="px-5 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((item) => (
                  <tr key={item.id} className="bg-white/45 align-top">
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">{item.date}<br /><span className="text-xs">{item.time}</span></td>
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-950">{item.employeeNickname}</td>
                    <td className="min-w-72 px-5 py-4 text-slate-700">{item.mainDuty}</td>
                    <td className="min-w-56 px-5 py-4 text-slate-600">{item.minorTask || "—"}</td>
                    <td className="min-w-64 px-5 py-4 text-slate-600">{item.comment || "—"}</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
            <span>Total {data.total.toLocaleString()} records</span>
            <div className="flex gap-2">
              <button
                className="apple-button-secondary py-2"
                disabled={data.page <= 1}
                onClick={() => load(data.page - 1)}
              >
                Previous
              </button>
              <button
                className="apple-button-secondary py-2"
                disabled={data.page >= data.pages}
                onClick={() => load(data.page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
