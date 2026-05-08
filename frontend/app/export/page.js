"use client";

import { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { downloadCsv } from "../../lib/api";

export default function ExportPage() {
  const [fiscalYear, setFiscalYear] = useState("2569");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function exportCsv() {
    setLoading(true);
    setError("");
    setDone("");

    try {
      await downloadCsv(`/export/fiscal-year/${encodeURIComponent(fiscalYear)}.csv`, `icit-workload-fy${fiscalYear}.csv`);
      setDone("CSV exported successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="apple-panel p-8">
          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-950 text-white">
            <FileSpreadsheet size={24} />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Annual export</p>
          <h1 className="mt-3 text-5xl font-semibold tracking-tight text-slate-950">
            Export fiscal-year CSV.
          </h1>
          <p className="mt-5 text-slate-600">
            Export uses Thai fiscal-year boundaries. FY 2569 exports records from 2025-10-01 through 2026-09-30.
          </p>
        </div>

        <div className="apple-panel p-8">
          {error ? <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
          {done ? <div className="mb-6 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">{done}</div> : null}

          <label className="apple-label">Fiscal year</label>
          <input
            className="apple-input"
            value={fiscalYear}
            onChange={(e) => setFiscalYear(e.target.value)}
            placeholder="2569"
          />

          <div className="mt-6 rounded-3xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
            <p className="font-semibold text-slate-950">CSV includes</p>
            <p className="mt-2">
              วันที่, เวลา, ผู้ให้บริการ, ผู้รับบริการ, กลุ่มงาน, หัวข้อการให้บริการ,
              หัวข้อรอง, Comment, สถานะ, แหล่งข้อมูล
            </p>
          </div>

          <button onClick={exportCsv} disabled={loading} className="apple-button mt-8 inline-flex w-full items-center justify-center gap-2">
            <Download size={18} />
            {loading ? "Exporting…" : "Download CSV"}
          </button>
        </div>
      </section>
    </AppShell>
  );
}
