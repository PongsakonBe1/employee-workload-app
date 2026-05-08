"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { AppShell } from "../../../components/AppShell";
import { apiFetch } from "../../../lib/api";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nowTime() {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export default function NewWorkLogPage() {
  const [categories, setCategories] = useState(null);
  const [form, setForm] = useState({
    date: today(),
    time: nowTime(),
    recipient: "",
    dutyGroup: "main",
    mainDuty: "",
    minorTask: "",
    comment: "",
    status: "บันทึกแล้ว"
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/categories").then((data) => {
      setCategories(data);
      const firstGroup = data.dutyGroups?.[0];
      setForm((current) => ({
        ...current,
        dutyGroup: firstGroup?.key || "main",
        mainDuty: firstGroup?.duties?.[0] || ""
      }));
    });
  }, []);

  const selectedGroup = useMemo(
    () => categories?.dutyGroups?.find((group) => group.key === form.dutyGroup),
    [categories, form.dutyGroup]
  );

  const minorOptions = useMemo(() => {
    const mapped = categories?.minorTasksByDuty?.[form.mainDuty] || [];
    return mapped.length ? mapped : categories?.minorTasks || [];
  }, [categories, form.mainDuty]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await apiFetch("/worklogs", {
        method: "POST",
        body: JSON.stringify(form)
      });

      setMessage("Workload record saved successfully.");
      setForm((current) => ({
        ...current,
        recipient: "",
        minorTask: "",
        comment: "",
        time: nowTime()
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="apple-panel p-8">
          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-950 text-white">
            <Sparkles size={24} />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">New record</p>
          <h1 className="mt-3 text-5xl font-semibold tracking-tight text-slate-950">
            Save your daily workload.
          </h1>
          <p className="mt-5 text-slate-600">
            The minor-task field maps the small items from your Excel workbook, including headphone borrowing,
            classroom opening/closing, ICIT account, Microsoft Authenticator, software, Gmail, Wi-Fi and print top-up.
          </p>

          <div className="mt-8 rounded-3xl bg-slate-950 p-5 text-white">
            <p className="text-sm font-semibold">Mapping decision</p>
            <p className="mt-2 text-sm leading-6 text-white/75">
              Main duties stay in <strong>mainDuty</strong>. Smaller operational activities are saved in
              <strong> minorTask</strong> so reports can count them independently.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="apple-panel p-6 sm:p-8">
          {message ? (
            <div className="mb-6 flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              <CheckCircle2 size={18} />
              {message}
            </div>
          ) : null}

          {error ? <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="apple-label">Date</label>
              <input className="apple-input" type="date" value={form.date} onChange={(e) => update("date", e.target.value)} />
            </div>
            <div>
              <label className="apple-label">Time</label>
              <input className="apple-input" type="time" value={form.time} onChange={(e) => update("time", e.target.value)} />
            </div>
          </div>

          <div className="mt-5">
            <label className="apple-label">Recipient / requester</label>
            <input
              className="apple-input"
              value={form.recipient}
              onChange={(e) => update("recipient", e.target.value)}
              placeholder="Student ID, staff username, room number, or name"
            />
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="apple-label">Duty group</label>
              <select
                className="apple-input"
                value={form.dutyGroup}
                onChange={(e) => {
                  const nextGroup = categories.dutyGroups.find((group) => group.key === e.target.value);
                  setForm((current) => ({
                    ...current,
                    dutyGroup: e.target.value,
                    mainDuty: nextGroup?.duties?.[0] || "",
                    minorTask: ""
                  }));
                }}
              >
                {(categories?.dutyGroups || []).map((group) => (
                  <option key={group.key} value={group.key}>{group.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="apple-label">Main duty</label>
              <select
                className="apple-input"
                value={form.mainDuty}
                onChange={(e) => update("mainDuty", e.target.value)}
              >
                {(selectedGroup?.duties || []).map((duty) => (
                  <option key={duty} value={duty}>{duty}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5">
            <label className="apple-label">Minor task</label>
            <input
              className="apple-input"
              list="minorTasks"
              value={form.minorTask}
              onChange={(e) => update("minorTask", e.target.value)}
              placeholder="Choose or type a minor task"
            />
            <datalist id="minorTasks">
              {minorOptions.map((task) => <option key={task} value={task} />)}
            </datalist>
          </div>

          <div className="mt-5">
            <label className="apple-label">Comment</label>
            <textarea
              className="apple-input min-h-32 resize-y"
              value={form.comment}
              onChange={(e) => update("comment", e.target.value)}
              placeholder="Details, problem, room number, software name, or resolution"
            />
          </div>

          <div className="mt-5">
            <label className="apple-label">Status</label>
            <select className="apple-input" value={form.status} onChange={(e) => update("status", e.target.value)}>
              <option value="บันทึกแล้ว">บันทึกแล้ว</option>
              <option value="รอดำเนินการ">รอดำเนินการ</option>
              <option value="กำลังดำเนินการ">กำลังดำเนินการ</option>
              <option value="ปิดงานแล้ว">ปิดงานแล้ว</option>
            </select>
          </div>

          <button disabled={saving} className="apple-button mt-8 w-full">
            {saving ? "Saving…" : "Save workload"}
          </button>
        </form>
      </section>
    </AppShell>
  );
}
