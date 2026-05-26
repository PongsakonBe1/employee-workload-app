"use client";

import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Zap } from "lucide-react";
import { AppShell } from "../../../components/AppShell";
import { useAuth } from "../../../components/AuthProvider";
import { apiFetch } from "../../../lib/api";
import { MinorTaskSelector } from "../../../components/MinorTaskSelector";
import { CommentSuggestions } from "../../../components/CommentSuggestions";
import QuickLogButtons from "../../../components/QuickLogButtons";
import RoomEquipmentStatus from "../../../components/RoomEquipmentStatus";
import AddMissingTemplates from "../../../components/AddMissingTemplates";
import SmartTemplatesSeeder from "../../../components/SmartTemplatesSeeder";
import {
  getCommentSuggestions,
  getMainDutyFromMinorTask,
  hasCommentSuggestions,
} from "../../../lib/commentSuggestions";
import { validateWorklogForm, sanitizeInput } from "../../../lib/validation";
import { db } from "../../../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { logSystemAction, SystemActions } from "../../../lib/systemLog";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nowTime() {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

// Get lock time (23:59 today)
function getLockTime(dateStr) {
  const date = new Date(dateStr);
  date.setHours(23, 59, 0, 0);
  return date;
}

export default function NewWorkLogPage() {
  const t = useTranslations("worklog");
  const router = useRouter();
  const { user } = useAuth();
  const [categories, setCategories] = useState(null);
  const [form, setForm] = useState({
    date: today(),
    time: nowTime(),
    recipient: "",
    dutyGroup: "main",
    mainDuty: "",
    minorTask: "",
    comment: "",
    // Note: status field removed - auto-handled by system
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastSaved, setLastSaved] = useState(null);
  const [draftRestored, setDraftRestored] = useState(false);

  // Redirect admin users - they don't record worklogs
  useEffect(() => {
    if (user?.role === "admin") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  // Restore draft from localStorage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem("worklogDraft");
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        // Check if draft is not older than 24 hours
        const draftAge = Date.now() - (draft.timestamp || 0);
        if (draftAge < 24 * 60 * 60 * 1000) {
          setForm((current) => ({
            ...current,
            recipient: draft.recipient || "",
            minorTask: draft.minorTask || "",
            mainDuty: draft.mainDuty || "",
            dutyGroup: draft.dutyGroup || "main",
            comment: draft.comment || "",
          }));
          setDraftRestored(true);
          setTimeout(() => setDraftRestored(false), 3000);
        }
      } catch (e) {
        console.error("Failed to restore draft:", e);
      }
    }
  }, []);

  // Auto-save draft every 30 seconds or when form changes significantly
  useEffect(() => {
    const saveDraft = () => {
      const draft = {
        recipient: form.recipient,
        minorTask: form.minorTask,
        mainDuty: form.mainDuty,
        dutyGroup: form.dutyGroup,
        comment: form.comment,
        timestamp: Date.now(),
      };
      localStorage.setItem("worklogDraft", JSON.stringify(draft));
      setLastSaved(new Date());
    };

    // Save immediately if recipient, minorTask, or comment changed
    const timeoutId = setTimeout(saveDraft, 2000);
    return () => clearTimeout(timeoutId);
  }, [
    form.recipient,
    form.minorTask,
    form.comment,
    form.mainDuty,
    form.dutyGroup,
  ]);

  // Clear draft after successful submit
  const clearDraft = () => {
    localStorage.removeItem("worklogDraft");
    setLastSaved(null);
  };

  // Fetch categories on mount
  useEffect(() => {
    apiFetch("/categories").then((data) => {
      setCategories(data);
    });
  }, []);

  // Auto-update mainDuty and dutyGroup when minorTask changes
  const handleMinorTaskChange = useCallback((minorTask) => {
    const mainDuty = getMainDutyFromMinorTask(minorTask);
    const dutyGroup = getDutyGroupFromMinorTask(minorTask);

    setForm((current) => ({
      ...current,
      minorTask,
      mainDuty,
      dutyGroup,
    }));
  }, []);

  function getDutyGroupFromMinorTask(minorTask) {
    const mainDuty = getMainDutyFromMinorTask(minorTask);
    // ทั้งสองหน้าที่หลักถือเป็น "งานในหน้าที่หลัก"
    if (mainDuty === "ดูแลห้องบริการคอมพิวเตอร์") {
      return "งานในหน้าที่หลัก (ห้องบริการ)";
    } else if (mainDuty === "ให้บริการรับแจ้งและแก้ไขปัญหาระบบสารสนเทศ") {
      return "งานในหน้าที่หลัก (รับแจ้งปัญหา)";
    } else if (mainDuty === "คุมสอบ DL") {
      return "งานในหน้าที่หลัก (คุมสอบ DL)";
    }
    return "งานอื่นๆ ที่ได้รับมอบหมาย";
  }

  // Handle comment suggestion selection
  const handleCommentSuggestion = useCallback((suggestion) => {
    setForm((current) => ({
      ...current,
      comment: suggestion,
    }));
  }, []);

  // Get suggestions for current minor task
  const suggestions = useMemo(() => {
    return getCommentSuggestions(form.minorTask);
  }, [form.minorTask]);

  // Check if current minor task has suggestions
  const hasSuggestions = useMemo(() => {
    return hasCommentSuggestions(form.minorTask);
  }, [form.minorTask]);

  // Calculate lock deadline
  const lockDeadline = useMemo(() => {
    return getLockTime(form.date);
  }, [form.date]);

  async function onSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const validation = validateWorklogForm(form);
      if (!validation.valid) {
        throw new Error(Object.values(validation.errors)[0]);
      }

      // ใช้ชื่อที่แสดง (displayName) ก่อน ถ้าไม่มีค่อยใช้ nickname
      const employeeDisplayName =
        user?.displayName ||
        user?.nickname ||
        user?.fullName?.split(" ")?.[0] ||
        "";

      await addDoc(collection(db, "worklogs"), {
        date: form.date,
        time: form.time,
        recipient: sanitizeInput(form.recipient),
        dutyGroup: form.dutyGroup,
        mainDuty: form.mainDuty,
        minorTask: form.minorTask,
        comment: sanitizeInput(form.comment),
        employeeId: user.uid,
        employeeNickname: user.nickname || "",
        employeeDisplayName: employeeDisplayName,
        employeeFullName: user.fullName || "",
        status: "บันทึกแล้ว",
        createdAt: serverTimestamp(),
      });

      // Log action
      await logSystemAction(
        SystemActions.CREATE_WORKLOG,
        `Created worklog: ${form.date} ${form.time} - ${form.recipient}`,
        user.uid,
      );

      clearDraft();
      setMessage(t("form.saved"));
      setForm((current) => ({
        ...current,
        recipient: "",
        minorTask: "",
        mainDuty: "",
        dutyGroup: "main",
        comment: "",
        time: nowTime(),
      }));

      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const textareaRef = useRef(null);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(80, el.scrollHeight)}px`;
  }, [form.comment]);

  return (
    <AppShell>
      <AddMissingTemplates />
      <SmartTemplatesSeeder />

      {/* Toast messages — floating, doesn't push layout */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
        {message && (
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-xl animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 size={16} className="shrink-0" />
            {message}
          </div>
        )}
        {error && (
          <div className="pointer-events-auto rounded-2xl bg-red-600 px-4 py-3 text-sm text-white shadow-xl animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}
        {draftRestored && (
          <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-slate-800 px-4 py-3 text-sm text-white shadow-xl animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 size={14} className="shrink-0 text-slate-300" />
            กู้คืนร่างอัตโนมัติแล้ว
          </div>
        )}
      </div>

      <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr] pb-24 lg:pb-0">

        {/* ── Right: Form ── order-first on mobile */}
        <div className="order-first lg:order-last flex flex-col gap-4">

          {/* Quick Log — prominent card ที่ด้านบนสุด */}
          <div className="apple-panel p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={15} className="text-amber-500" />
              <span className="text-sm font-semibold text-slate-700">บันทึกด่วน</span>
              <span className="ml-auto text-xs text-slate-400">กดครั้งเดียวบันทึกได้เลย</span>
            </div>
            <QuickLogButtons onLogSuccess={(msg, type = 'success') => {
              if (type === 'error') {
                setError(msg);
                setTimeout(() => setError(""), 3000);
              } else {
                setMessage(msg);
                setTimeout(() => setMessage(""), 3000);
              }
            }} />
          </div>

          {/* Form card */}
          <form onSubmit={onSubmit} className="apple-panel p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">บันทึกงานแบบกรอกฟอร์ม</p>

            {/* Date & Time — compact row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="apple-label">{t("form.date")}</label>
                <input
                  className="apple-input w-full min-w-0"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((c) => ({ ...c, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="apple-label">{t("form.time")}</label>
                <input
                  className="apple-input w-full min-w-0"
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm((c) => ({ ...c, time: e.target.value }))}
                />
              </div>
            </div>

            {/* Recipient */}
            <div className="mt-4">
              <label className="apple-label">{t("form.recipient")}</label>
              <input
                className="apple-input"
                value={form.recipient}
                onChange={(e) => setForm((c) => ({ ...c, recipient: e.target.value }))}
                placeholder={t("form.recipientPlaceholder")}
              />
            </div>

            {/* Minor Task */}
            <div className="mt-4">
              <MinorTaskSelector
                value={form.minorTask}
                onChange={handleMinorTaskChange}
                label={t("form.minorTask")}
                placeholder={t("form.minorTaskPlaceholder")}
              />
            </div>

            {/* Main Duty — compact badge instead of full input */}
            {form.minorTask && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-slate-400">หัวข้อหลัก:</span>
                <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">{form.mainDuty}</span>
              </div>
            )}

            {/* Comment */}
            <div className="mt-4">
              <label className="apple-label">{t("form.comment")}</label>
              <CommentSuggestions
                minorTask={form.minorTask}
                selected={form.comment}
                onSelect={handleCommentSuggestion}
              />
              <textarea
                ref={textareaRef}
                className="apple-input mt-2 resize-none overflow-hidden"
                style={{ minHeight: "80px" }}
                value={form.comment}
                onChange={(e) => setForm((c) => ({ ...c, comment: e.target.value }))}
                placeholder={t("form.commentPlaceholder")}
              />
            </div>

            {/* Auto-save indicator — subtle, inside form */}
            {lastSaved && !draftRestored && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                <CheckCircle2 size={12} />
                ร่างบันทึกอัตโนมัติ {lastSaved.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                {(form.recipient || form.minorTask || form.comment) && (
                  <button
                    type="button"
                    onClick={() => { clearDraft(); setForm((c) => ({ ...c, recipient: "", minorTask: "", mainDuty: "", dutyGroup: "main", comment: "" })); }}
                    className="ml-auto text-slate-300 hover:text-red-400 transition"
                  >
                    ล้างร่าง
                  </button>
                )}
              </div>
            )}

            {/* Submit — hidden on mobile (shown in sticky bar below), visible on desktop */}
            <button
              disabled={saving || !form.minorTask}
              className="apple-button mt-5 w-full disabled:opacity-40 hidden lg:flex items-center justify-center gap-2"
            >
              {saving
                ? <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />{t("form.saving")}</>
                : t("form.save")
              }
            </button>
          </form>
        </div>

        {/* ── Left: Sidebar ── below form on mobile, left on desktop */}
        <div className="flex flex-col gap-4 order-last lg:order-first">

          {/* Lock notice — top of sidebar */}
          <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 flex items-center gap-3">
            <Clock size={15} className="text-amber-400 shrink-0" />
            <p className="text-sm text-amber-700">
              แก้ไขได้ถึง <strong>23:59</strong> วันที่{" "}
              <strong>{new Date(form.date).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</strong>
            </p>
          </div>

          {/* Room & Equipment Status — open by default on lg, collapsible on mobile */}
          <RoomEquipmentStatusCollapsible />
        </div>
      </section>

      {/* ── Sticky Save Bar — mobile only ── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-3">
        <button
          form="worklog-form"
          disabled={saving || !form.minorTask}
          onClick={(e) => { e.preventDefault(); document.querySelector('form')?.requestSubmit(); }}
          className="apple-button w-full disabled:opacity-40 flex items-center justify-center gap-2 py-3.5 text-base"
        >
          {saving
            ? <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />กำลังบันทึก...</>
            : !form.minorTask
              ? <span className="text-white/60">เลือกหัวข้อรองก่อนบันทึก</span>
              : "บันทึก"
          }
        </button>
      </div>
    </AppShell>
  );
}

function RoomEquipmentStatusCollapsible() {
  // Default open on desktop (lg = 1024px+), collapsed on mobile
  const [open, setOpen] = useState(() => {
    if (typeof window !== "undefined") return window.innerWidth >= 1024;
    return false;
  });
  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 transition text-sm font-medium text-slate-700"
      >
        <span className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="2" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          สถานะห้องและอุปกรณ์
        </span>
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="border-t border-slate-100">
          <RoomEquipmentStatus />
        </div>
      )}
    </div>
  );
}
