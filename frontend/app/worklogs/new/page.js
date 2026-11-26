"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Clock, Zap } from "lucide-react";
import { Toast } from "../../../components/Toast";
import { AppShell } from "../../../components/AppShell";
import { useAuth } from "../../../components/AuthProvider";
import { RecordHeading, WorklogRecordReview, WorklogRecordWorkspace } from "../../../components/WorklogRecordWorkspace";
import { MinorTaskSelector } from "../../../components/MinorTaskSelector";
import { CommentSuggestions } from "../../../components/CommentSuggestions";
import QuickLogButtons from "../../../components/QuickLogButtons";
import { Calendar as CalendarIcon } from "lucide-react";
import RoomEquipmentStatus from "../../../components/RoomEquipmentStatus";
import ICloudCalendarStrip from "../../../components/iCloudCalendarStrip";
import ScheduleAlertBanner from "../../../components/ScheduleAlertBanner";
import { getMainDutyFromMinorTask } from "../../../lib/commentSuggestions";
import { validateWorklogForm, sanitizeInput } from "../../../lib/validation";
import { auth, db } from "../../../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { logSystemAction, SystemActions } from "../../../lib/systemLog";
import { today, nowTime } from "../../../lib/dateUtils";
import { getDutyGroupFromMinorTask } from "../../../lib/worklogUtils";
import { withWorklogResourceIndex } from "../../../lib/resourceStatusIndex";
import { useAutoUpdateDateTime } from "../../../hooks/useAutoUpdateDateTime";
import { worklogEntryPath } from "../../../lib/authUtils";

const workspaceEnabled = process.env.NEXT_PUBLIC_WORKLOG_WORKSPACE === "1";

export default function NewWorkLogPage() {
  const { user } = useAuth();
  return <WorklogRecord key={user?.uid || "anonymous"} user={user} />;
}

function WorklogRecord({ user }) {
  const t = useTranslations("worklog");
  const router = useRouter();
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
  const [draftRestored, setDraftRestored] = useState(false);
  const [mode, setMode] = useState("quick");
  const [review, setReview] = useState(null);
  const [recordRevision, setRecordRevision] = useState(0);
  const submitLock = useRef(false);
  const employeeLabel = user?.displayName || user?.nickname || user?.fullName || "ผู้ใช้งาน";
  const draftKey = workspaceEnabled ? (user?.uid ? `worklogDraft:${user.uid}` : null) : "worklogDraft";
  
  // Mobile toggle: show form or calendar
  const [showCalendarMobile, setShowCalendarMobile] = useState(false);

  // Auto-update date/time every minute on desktop mode
  useAutoUpdateDateTime(setForm, !workspaceEnabled || (mode === "quick" && !form.dateTimeEdited));

  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(timeout);
  }, [message]);

  // Send Admins arriving through the personal form to their recording workspace.
  useEffect(() => {
    if (user?.role === "admin") {
      router.replace(worklogEntryPath(user.role));
    }
  }, [user, router]);

  // Restore draft from localStorage on mount
  useEffect(() => {
    if (!draftKey) return;
    let savedDraft;
    try { savedDraft = localStorage.getItem(draftKey); } catch { return; }
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
  }, [draftKey]);

  // Auto-save draft every 30 seconds or when form changes significantly
  useEffect(() => {
    if (!draftKey || !(form.recipient || form.minorTask || form.comment)) return;
    const saveDraft = () => {
      const draft = {
        recipient: form.recipient,
        minorTask: form.minorTask,
        mainDuty: form.mainDuty,
        dutyGroup: form.dutyGroup,
        comment: form.comment,
        timestamp: Date.now(),
      };
      try {
        localStorage.setItem(draftKey, JSON.stringify(draft));
      } catch { /* An unavailable local draft store must not block Firestore writes. */ }
    };

    // Save immediately if recipient, minorTask, or comment changed
    const timeoutId = setTimeout(saveDraft, 2000);
    return () => clearTimeout(timeoutId);
  }, [
    draftKey,
    form.recipient,
    form.minorTask,
    form.comment,
    form.mainDuty,
    form.dutyGroup,
  ]);

  // Clear draft after successful submit
  const clearDraft = () => {
    try { if (draftKey) localStorage.removeItem(draftKey); } catch { /* Save already committed. */ }
  };

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



  // Handle comment suggestion selection
  const handleCommentSuggestion = useCallback((suggestion) => {
    setForm((current) => ({
      ...current,
      comment: suggestion,
    }));
  }, []);

  function onSubmit(event) {
    event.preventDefault();
    if (submitLock.current) return;
    const validation = validateWorklogForm(form);
    if (!validation.valid) {
      setError(Object.values(validation.errors)[0]);
      return;
    }
    setError("");
    if (workspaceEnabled) setReview({ fields: { ...form }, employeeId: user?.uid, employeeLabel });
    else void save(form, user?.uid);
  }

  async function save(fields, employeeId) {
    if (submitLock.current) return;
    submitLock.current = true;
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (!employeeId || auth.currentUser?.uid !== employeeId || user?.uid !== employeeId || user.role === "admin") {
        throw new Error("บัญชีเปลี่ยนหรือยังไม่พร้อมบันทึกงาน กรุณาเข้าสู่ระบบอีกครั้ง");
      }
      const validation = validateWorklogForm(fields);
      if (!validation.valid) {
        throw new Error(Object.values(validation.errors)[0]);
      }

      // ใช้ชื่อที่แสดง (displayName) ก่อน ถ้าไม่มีค่อยใช้ nickname
      const employeeDisplayName =
        user?.displayName ||
        user?.nickname ||
        user?.fullName?.split(" ")?.[0] ||
        "";

      const worklog = withWorklogResourceIndex({
        date: fields.date,
        time: fields.time,
        recipient: sanitizeInput(fields.recipient),
        dutyGroup: fields.dutyGroup,
        mainDuty: fields.mainDuty,
        minorTask: fields.minorTask,
        comment: sanitizeInput(fields.comment),
        employeeId: user.uid,
        employeeNickname: user.nickname || "",
        employeeDisplayName: employeeDisplayName,
        employeeFullName: user.fullName || "",
        status: "บันทึกแล้ว",
        createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, "worklogs"), worklog);
      setRecordRevision(current => current + 1);
      if (worklog.resourceKeys.length) window.dispatchEvent(new Event("worklogUpdated"));

      // Log action
      await logSystemAction(
        SystemActions.CREATE_WORKLOG,
        `Created worklog: ${fields.date} ${fields.time}`,
        user.uid,
      );

      clearDraft();
      setReview(null);
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

    } catch (err) {
      setError(err.message);
    } finally {
      submitLock.current = false;
      setSaving(false);
    }
  }

  const textareaRef = useRef(null);
  const formRef = useRef(null);
  const minorTaskRef = useRef(null);

  // Auto-grow the legacy textarea.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(80, el.scrollHeight)}px`;
  }, [form.comment]);

  if (workspaceEnabled) {
    return <AppShell showBreadcrumb={false}>
      <RecordHeading />
      <Toast message={message} error={review ? "" : error} info={draftRestored ? "กู้คืนร่างอัตโนมัติแล้ว" : ""} onDismissMessage={() => setMessage("")} onDismissError={() => setError("")} />
      <WorklogRecordWorkspace form={form} setForm={setForm} mode={mode} setMode={setMode} person={{ id: user?.uid, label: employeeLabel }}
        busy={saving} onReview={onSubmit} revision={recordRevision}
        onQuickResult={(value, type) => {
          if (type === "error") { setError(value); return; }
          setError("");
          setMessage(value || "บันทึกสำเร็จ");
          setRecordRevision(current => current + 1);
        }} />
      <WorklogRecordReview review={review} saving={saving} error={review ? error : ""}
        onClose={() => { if (!submitLock.current) { setReview(null); setError(""); } }}
        onConfirm={() => { if (review) void save(review.fields, review.employeeId); }} />
    </AppShell>;
  }

  return (
    <AppShell>
      <ScheduleAlertBanner />

      <Toast
        message={message}
        error={error}
        info={draftRestored ? "กู้คืนร่างอัตโนมัติแล้ว" : ""}
        onDismissMessage={() => setMessage("")}
        onDismissError={() => setError("")}
      />

      {/* ── Status bar — full width, always on top ── */}
      <div className="mb-4">
        <RoomEquipmentStatusCollapsible />
      </div>

      {/* Mobile Toggle Button */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setShowCalendarMobile(!showCalendarMobile)}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-50 text-blue-600 rounded-xl font-medium hover:bg-blue-100 transition"
        >
          <CalendarIcon className="w-5 h-5" />
          {showCalendarMobile ? 'กลับไปบันทึกงาน' : 'ดูตารางห้องเรียน'}
        </button>
      </div>

      <section className={`grid gap-5 lg:grid-cols-[1.2fr_1fr] pb-24 lg:pb-0`}>

        {/* ── Left: Calendar (ซ้าย - ใหญ่กว่า) ── */}
        <div className={`flex-col gap-4 order-first ${showCalendarMobile ? 'flex' : 'hidden lg:flex'}`}>
          
          {/* iCloud Calendar Strip — Day View (iOS Light) */}
          <ICloudCalendarStrip />

          {/* Lock Notice */}
          <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 flex items-center gap-3">
            <Clock size={15} className="text-amber-400 shrink-0" />
            <p className="text-sm text-amber-700">
              แก้ไขได้ถึง <strong>23:59</strong> วันที่{' '}
              <strong>{new Date(form.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</strong>
            </p>
          </div>
        </div>

        {/* ── Right: Form (ขวา - เล็กกว่า) ── */}
        <div className={`flex-col gap-4 order-last ${showCalendarMobile ? 'hidden' : 'flex'} lg:flex`}>

          {/* Quick Log - Original Template Buttons */}
          <div className="apple-panel p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={15} className="text-amber-500" />
              <span className="text-sm font-semibold text-slate-700">บันทึกด่วน</span>
              <button
                type="button"
                onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition"
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M4 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                กรอกเอง
              </button>
            </div>
            <QuickLogButtons onLogSuccess={(msg) => {
              setMessage(msg || 'บันทึกสำเร็จ');
              setTimeout(() => setMessage(''), 3000);
            }} />
          </div>

          {/* Form */}
          <form ref={formRef} onSubmit={onSubmit} className="apple-panel p-5 sm:p-6 lg:sticky lg:top-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">บันทึกงานแบบกรอกฟอร์ม</p>
            <DateTimeRow form={form} setForm={setForm} t={t} />
            
            {/* Recipient */}
            <div className="mt-4">
              <label className="apple-label">{t('form.recipient')}</label>
              <input
                className="apple-input"
                value={form.recipient}
                onChange={(e) => setForm((c) => ({ ...c, recipient: e.target.value }))}
                placeholder={t('form.recipientPlaceholder')}
              />
            </div>

            {/* Minor Task */}
            <div className="mt-4" ref={minorTaskRef}>
              <MinorTaskSelector
                value={form.minorTask}
                onChange={handleMinorTaskChange}
                label={t('form.minorTask')}
                placeholder={t('form.minorTaskPlaceholder')}
              />
            </div>

            {/* Comment */}
            <div className="mt-4">
              <label className="apple-label">{t('form.comment')}</label>
              <CommentSuggestions
                minorTask={form.minorTask}
                selected={form.comment}
                onSelect={handleCommentSuggestion}
              />
              <textarea
                ref={textareaRef}
                className="apple-input mt-2 resize-none"
                style={{ minHeight: '80px' }}
                value={form.comment}
                onChange={(e) => setForm((c) => ({ ...c, comment: e.target.value }))}
                placeholder={t('form.commentPlaceholder')}
              />
            </div>

            <button
              disabled={saving || !form.minorTask}
              className="apple-button mt-5 w-full disabled:opacity-40 hidden lg:flex items-center justify-center gap-2"
            >
              {saving ? <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />{t('form.saving')}</> : t('form.save')}
            </button>
          </form>
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
  return <RoomEquipmentStatus />;
}

function DateTimeRow({ form, setForm, t }) {
  const [open, setOpen] = useState(false);
  const isToday = form.date === new Date().toISOString().slice(0, 10);
  const timeNow = `${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}`;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between text-left rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 hover:bg-slate-100 transition"
      >
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-slate-400" />
          <span className="text-sm text-slate-700">
            {isToday ? 'วันนี้' : new Date(form.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
            <span className="text-slate-400 ml-2">{form.time}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {(!isToday || form.time !== timeNow) && (
            <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">ปรับแล้ว</span>
          )}
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
            className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="apple-label">{t('form.date')}</label>
            <input className="apple-input w-full" type="date" value={form.date}
              onChange={(e) => setForm((c) => ({ ...c, date: e.target.value }))} />
          </div>
          <div>
            <label className="apple-label">{t('form.time')}</label>
            <input className="apple-input w-full" type="time" value={form.time}
              onChange={(e) => setForm((c) => ({ ...c, time: e.target.value }))} />
          </div>
        </div>
      )}
    </div>
  );
}
