"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { CheckCircle2, Sparkles, Clock } from "lucide-react";
import { AppShell } from "../../../components/AppShell";
import { useAuth } from "../../../components/AuthProvider";
import { apiFetch } from "../../../lib/api";
import { MinorTaskSelector } from "../../../components/MinorTaskSelector";
import { CommentSuggestions } from "../../../components/CommentSuggestions";
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

  return (
    <AppShell>
      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        {/* Left panel - Info */}
        <div className="apple-panel p-8">
          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-950 text-white">
            <Sparkles size={24} />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            {t("newRecord")}
          </p>
          <h1 className="mt-3 text-5xl font-semibold tracking-tight text-slate-950">
            {t("title")}
          </h1>
          <p className="mt-5 text-slate-600">
            {t("form.recipientPlaceholder")}
          </p>

          {/* Draft indicator */}
          {(lastSaved || draftRestored) && (
            <div
              className={`mt-6 rounded-3xl p-4 ${draftRestored ? "bg-blue-50 border border-blue-200" : "bg-slate-50"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    size={18}
                    className={
                      draftRestored ? "text-blue-600" : "text-slate-500"
                    }
                  />
                  <span
                    className={`text-sm ${draftRestored ? "text-blue-700 font-medium" : "text-slate-600"}`}
                  >
                    {draftRestored
                      ? "กู้คืนข้อมูลที่บันทึกไว้อัตโนมัติ"
                      : lastSaved
                        ? `บันทึกร่างล่าสุด: ${lastSaved.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`
                        : ""}
                  </span>
                </div>
                {(form.recipient || form.minorTask || form.comment) && (
                  <button
                    onClick={() => {
                      clearDraft();
                      setForm((c) => ({
                        ...c,
                        recipient: "",
                        minorTask: "",
                        mainDuty: "",
                        dutyGroup: "main",
                        comment: "",
                      }));
                    }}
                    className="text-xs text-slate-400 hover:text-red-600 transition"
                  >
                    ล้างร่าง
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Lock deadline notice */}
          <div className="mt-6 rounded-3xl bg-amber-50 border border-amber-200 p-5">
            <div className="flex items-start gap-3">
              <Clock
                size={20}
                className="text-amber-600 mt-0.5 flex-shrink-0"
              />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  หมายเหตุการแก้ไข
                </p>
                <p className="mt-1 text-sm text-amber-700 leading-relaxed">
                  คุณสามารถแก้ไขรายการได้จนถึง <strong>23:59</strong>{" "}
                  ของวันที่บันทึก หลังจากนั้นรายการจะถูกล็อกและไม่สามารถแก้ไขได้
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-3xl bg-slate-950 p-5 text-white">
            <p className="text-sm font-semibold">วิธีการบันทึก</p>
            <ol className="mt-2 text-sm leading-6 text-white/75 list-decimal list-inside space-y-1">
              <li>
                เลือก <strong>หัวข้อรอง (Minor Task)</strong> เป็นหลัก
              </li>
              <li>
                ระบบจะกรอก <strong>หัวข้อหลัก</strong> ให้อัตโนมัติ
              </li>
              <li>
                เลือก <strong>รายละเอียด</strong> จากตัวเลือกที่แนะนำ
                หรือเขียนเอง
              </li>
              <li>
                กด <strong>บันทึก</strong> เมื่อเสร็จสิ้น
              </li>
            </ol>
          </div>
        </div>

        {/* Right panel - Form */}
        <form onSubmit={onSubmit} className="apple-panel p-6 sm:p-8">
          {message ? (
            <div className="mb-6 flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              <CheckCircle2 size={18} />
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {/* Date & Time */}
          <div className="flex flex-col gap-5 sm:flex-row">
            <div className="min-w-0 flex-1">
              <label className="apple-label">{t("form.date")}</label>
              <input
                className="apple-input w-full min-w-0 max-w-full"
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((c) => ({ ...c, date: e.target.value }))
                }
              />
            </div>
            <div className="min-w-0 flex-1">
              <label className="apple-label">{t("form.time")}</label>
              <input
                className="apple-input w-full min-w-0 max-w-full"
                type="time"
                value={form.time}
                onChange={(e) =>
                  setForm((c) => ({ ...c, time: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Recipient */}
          <div className="mt-5">
            <label className="apple-label">{t("form.recipient")}</label>
            <input
              className="apple-input"
              value={form.recipient}
              onChange={(e) =>
                setForm((c) => ({ ...c, recipient: e.target.value }))
              }
              placeholder={t("form.recipientPlaceholder")}
            />
          </div>

          {/* Minor Task - PRIMARY FIELD */}
          <div className="mt-5">
            <MinorTaskSelector
              value={form.minorTask}
              onChange={handleMinorTaskChange}
              label={t("form.minorTask")}
              placeholder={t("form.minorTaskPlaceholder")}
            />
          </div>

          {/* Main Duty - Auto-populated, read-only display */}
          {form.minorTask && (
            <div className="mt-5">
              <label className="apple-label">{t("form.mainDuty")}</label>
              <div className="apple-input bg-slate-50 text-slate-700 flex items-center">
                <span className="text-slate-950 font-medium">
                  {form.mainDuty}
                </span>
                <span className="ml-auto text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded-full">
                  กรอกอัตโนมัติ
                </span>
              </div>
            </div>
          )}

          {/* Comment with Suggestions */}
          <div className="mt-5">
            <label className="apple-label">{t("form.comment")}</label>
            <textarea
              className="apple-input min-h-24 resize-y"
              value={form.comment}
              onChange={(e) =>
                setForm((c) => ({ ...c, comment: e.target.value }))
              }
              placeholder={t("form.commentPlaceholder")}
            />

            {/* Comment Suggestions */}
            {hasSuggestions && (
              <CommentSuggestions
                suggestions={suggestions}
                selected={form.comment}
                onSelect={handleCommentSuggestion}
              />
            )}
          </div>

          {/* Lock Deadline Notice */}
          <div className="mt-6 flex items-center gap-3 text-sm text-slate-500 bg-slate-50 rounded-2xl p-4">
            <Clock size={16} />
            <span>
              รายการนี้จะถูกล็อกเวลา{" "}
              {lockDeadline.toLocaleTimeString("th-TH", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              น. ของวันที่ {new Date(form.date).toLocaleDateString("th-TH")}
            </span>
          </div>

          {/* Submit Button */}
          <button
            disabled={saving || !form.minorTask}
            className="apple-button mt-8 w-full disabled:opacity-50"
          >
            {saving ? t("form.saving") : t("form.save")}
          </button>
        </form>
      </section>
    </AppShell>
  );
}
