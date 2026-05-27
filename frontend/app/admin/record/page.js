"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  PlusCircle,
  User,
  Calendar,
  Clock,
  CheckCircle,
  Sparkles,
  Shield,
  AlertCircle,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { AppShell } from "../../../components/AppShell";
import { useAuth } from "../../../components/AuthProvider";
import { db } from "../../../lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { logSystemAction, SystemActions } from "../../../lib/systemLog";
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

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nowTime() {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export default function AdminRecordPage() {
  const t = useTranslations("worklog");
  const router = useRouter();
  const { user } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastSaved, setLastSaved] = useState(null);

  // Form state
  const [form, setForm] = useState({
    employeeId: "",
    date: today(),
    time: nowTime(),
    recipient: "",
    minorTask: "",
    mainDuty: "",
    dutyGroup: "",
    comment: "",
  });

  // Redirect non-admin users (allow admin and superadmin)
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  // Debug log
  useEffect(() => {
    console.log("[AdminRecord] State:", {
      user: user?.email,
      role: user?.role,
      isAdmin,
    });
  }, [user, isAdmin]);

  useEffect(() => {
    // รอ loading เสร็จก่อนค่อย redirect
    if (!loading && user && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [user, isAdmin, loading, router]);

  // Load staff list (for admin and superadmin)
  useEffect(() => {
    if (isAdmin) {
      console.log("[AdminRecord] Loading staff...");
      loadStaff();
    }
  }, [isAdmin, user]);

  // Force stop loading ถ้าเกิน 5 วินาที
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.log("[AdminRecord] Force stopping loading after timeout");
        setLoading(false);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [loading]);

  async function loadStaff() {
    try {
      setLoading(true);
      console.log("[AdminRecord] Querying staff and admin...");

      // ดึงทั้ง staff และ admin (เพื่อให้ admin บันทึกงานให้ตัวเองได้)
      const staffQuery = query(
        collection(db, "users"),
        where("role", "==", "staff"),
      );
      const adminQuery = query(
        collection(db, "users"),
        where("role", "==", "admin"),
      );

      const [staffSnapshot, adminSnapshot] = await Promise.all([
        getDocs(staffQuery),
        getDocs(adminQuery),
      ]);

      // รวมผลลัพธ์
      const allUsers = [];
      staffSnapshot.forEach((doc) =>
        allUsers.push({ id: doc.id, ...doc.data() }),
      );
      adminSnapshot.forEach((doc) =>
        allUsers.push({ id: doc.id, ...doc.data() }),
      );

      console.log(
        "[AdminRecord] Staff:",
        staffSnapshot.size,
        "Admin:",
        adminSnapshot.size,
      );

      // กรอง active ที่ client side และกรองข้อมูลซ้ำ
      const allStaff = allUsers.filter((u) => u.active !== false); // แสดงทั้ง active และไม่มี field active

      // กรองข้อมูลซ้ำ (ตาม email)
      const seenEmails = new Set();
      const staff = allStaff.filter((u) => {
        if (seenEmails.has(u.email)) {
          return false;
        }
        seenEmails.add(u.email);
        return true;
      });

      // เรียงลำดับ: admin ก่อน (เพื่อให้ admin เจอตัวเองง่าย) แล้วตามด้วย staff ตามชื่อ
      staff.sort((a, b) => {
        // admin ก่อน
        if (a.role === "admin" && b.role !== "admin") return -1;
        if (a.role !== "admin" && b.role === "admin") return 1;
        // เรียงตามชื่อ
        const nameA = (
          a.displayName ||
          a.fullName ||
          a.nickname ||
          a.email
        ).toLowerCase();
        const nameB = (
          b.displayName ||
          b.fullName ||
          b.nickname ||
          b.email
        ).toLowerCase();
        return nameA.localeCompare(nameB);
      });

      console.log("[AdminRecord] Staff loaded:", staff.length);
      setStaffList(staff);
    } catch (err) {
      console.error("[AdminRecord] Error loading staff:", err);
      console.error("[AdminRecord] Error code:", err.code);
      setError("โหลดรายชื่อพนักงานไม่สำเร็จ: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleMinorTaskChange = useCallback((minorTask) => {
    const mainDuty = getMainDutyFromMinorTask(minorTask);
    const dutyGroup = getDutyGroupFromMinorTask(minorTask);
    setForm((current) => ({ ...current, minorTask, mainDuty, dutyGroup }));
  }, []);

  const handleCommentSuggestion = useCallback((suggestion) => {
    setForm((current) => ({ ...current, comment: suggestion }));
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

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.employeeId) {
      setError("กรุณาเลือกพนักงาน");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const validation = validateWorklogForm(form);
      if (!validation.valid) {
        throw new Error(Object.values(validation.errors)[0]);
      }

      const selectedStaff = staffList.find((s) => s.id === form.employeeId);

      // ใช้ชื่อที่แสดง (displayName) ก่อน ถ้าไม่มีค่อยใช้ชื่อเล่น
      const employeeDisplayName =
        selectedStaff?.displayName ||
        selectedStaff?.nickname ||
        selectedStaff?.fullName?.split(" ")?.[0] ||
        "";

      const worklogData = {
        date: form.date,
        time: form.time,
        employeeId: form.employeeId,
        employeeEmail: selectedStaff?.email || "",
        employeeNickname: selectedStaff?.nickname || "",
        employeeDisplayName: employeeDisplayName,
        employeeFullName: selectedStaff?.fullName || "",
        recipient: sanitizeInput(form.recipient) || "-",
        dutyGroup: form.dutyGroup,
        mainDuty: form.mainDuty,
        minorTask: form.minorTask,
        comment: sanitizeInput(form.comment) || "",
        status: "บันทึกโดยผู้ดูแลระบบ",
        source: "admin-created",
        createdBy: user.uid,
        createdByEmail: user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "worklogs"), worklogData);

      // Log action
      const staffName =
        staffList.find((s) => s.id === form.employeeId)?.name ||
        form.employeeId;
      await logSystemAction(
        SystemActions.ADMIN_CREATE_WORKLOG,
        `Admin created worklog for ${staffName}: ${form.date} ${form.time} - ${form.recipient}`,
        form.employeeId,
      );

      setSuccess(true);
      setMessage(t("form.saved"));
      setLastSaved(new Date());
      
      // Trigger refresh ของ RoomEquipmentStatus หลังบันทึกปกติ
      const comment = (form.comment || '').toLowerCase();
      const minorTask = (form.minorTask || '').toLowerCase();
      
      // ตรวจสอบการยืม/คืนหูฟัง
      if (minorTask.includes('ยืมหูฟัง') || minorTask.includes('คืนหูฟัง')) {
        for (let i = 1; i <= 12; i++) {
          const equipment = `ICIT${String(i).padStart(2, '0')}`;
          if (comment.includes(equipment)) {
            const newStatus = minorTask.includes('ยืม') ? 'in_use' : 'available';
            window.dispatchEvent(new CustomEvent('equipmentStatusUpdated', {
              detail: { equipmentType: 'headphones', equipment, status: newStatus }
            }));
            break;
          }
        }
      }
      
      // ตรวจสอบการยืม/คืนปลั๊กไฟ
      if (minorTask.includes('ยืมปลั๊กไฟ') || minorTask.includes('คืนปลั๊กไฟ')) {
        for (let i = 21; i <= 23; i++) {
          const equipment = `ICIT${i}`;
          if (comment.includes(equipment)) {
            const newStatus = minorTask.includes('ยืม') ? 'in_use' : 'available';
            window.dispatchEvent(new CustomEvent('equipmentStatusUpdated', {
              detail: { equipmentType: 'power', equipment, status: newStatus }
            }));
            break;
          }
        }
      }
      
      // ตรวจสอบการเปิด/ปิดห้อง
      if (minorTask.includes('เปิดห้อง') || minorTask.includes('ปิดห้อง')) {
        const rooms = ['401', '402', '406', '407'];
        rooms.forEach(room => {
          if (comment.includes(room)) {
            const newStatus = minorTask.includes('เปิด') ? 'in_use' : 'available';
            window.dispatchEvent(new CustomEvent('roomStatusUpdated', {
              detail: { room, status: newStatus }
            }));
          }
        });
      }
      
      setTimeout(() => {
        setSuccess(false);
        setMessage("");
      }, 3000);

      // Reset form but keep date/time
      setForm({
        employeeId: "",
        date: form.date,
        time: nowTime(),
        recipient: "",
        minorTask: "",
        mainDuty: "",
        dutyGroup: "",
        comment: "",
      });
    } catch (err) {
      console.error("Error creating worklog:", err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Scroll to form helper - must be before early returns
  const formRef = useRef(null);
  const scrollToForm = useCallback(() => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const suggestions = useMemo(() => {
    return getCommentSuggestions(form.minorTask);
  }, [form.minorTask]);

  const hasSuggestions = useMemo(() => {
    return hasCommentSuggestions(form.minorTask);
  }, [form.minorTask]);

  // รอ loading เสร็จก่อนแสดงผล
  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="apple-panel px-8 py-6 text-center">
            <div className="animate-pulse">
              <div className="h-8 w-8 bg-slate-200 rounded-full mx-auto mb-3"></div>
            </div>
            <p className="text-slate-600">กำลังโหลด...</p>
            <p className="text-xs text-slate-400 mt-2">
              กำลังโหลดข้อมูลพนักงาน...
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  // ถ้าไม่ใช่ admin/superadmin ให้แสดงข้อความแทน
  if (!user || !isAdmin) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="apple-panel px-8 py-6 text-center">
            <p className="text-slate-600">ไม่มีสิทธิ์เข้าถึง</p>
            <p className="text-xs text-slate-400 mt-2">
              คุณต้องเป็นผู้ดูแลระบบจึงจะเข้าถึงหน้านี้ได้
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

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
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700 shadow-xl animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Room Equipment Status - Collapsible */}
      <div className="mb-5">
        <RoomEquipmentStatusCollapsible />
      </div>

      <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr] pb-24 lg:pb-0">
        {/* ── Right: Form + QuickLog ── order-first on mobile */}
        <div className="order-first lg:order-last flex flex-col gap-4">
          {/* Quick Log */}
          <div className="apple-panel p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={15} className="text-amber-500" />
              <span className="text-sm font-semibold text-slate-700">บันทึกด่วน</span>
              <button
                type="button"
                onClick={scrollToForm}
                className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition"
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M4 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                กรอกเอง
              </button>
            </div>
            {!form.employeeId ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400">
                กรุณาเลือกพนักงานก่อนใช้ Quick Log
              </div>
            ) : (
              <QuickLogButtons
                targetUser={staffList.find(s => s.id === form.employeeId)}
                onLogSuccess={(msg, type) => {
                  setMessage(msg);
                  if (type === 'error') {
                    setError(msg);
                    setSuccess(false);
                  } else {
                    setSuccess(true);
                    setError('');
                    setLastSaved(new Date());
                    setTimeout(() => {
                      setSuccess(false);
                      setMessage('');
                    }, 3000);
                  }
                }}
              />
            )}
          </div>

          {/* Form */}
          <form ref={formRef} id="worklog-form" onSubmit={handleSubmit} className="apple-panel p-4 lg:p-5">
            {/* Staff Selector */}
            <div className="mb-4">
              <label className="apple-label flex items-center gap-2">
                <User size={16} />
                เลือกพนักงาน *
              </label>
              {loading ? (
                <div className="apple-input bg-slate-50 text-slate-400">
                  กำลังโหลด...
                </div>
              ) : staffList.length === 0 ? (
                <div className="apple-input bg-red-50 text-red-600">
                  ไม่พบพนักงานในระบบ
                </div>
              ) : (
                <select
                  className="apple-input"
                  value={form.employeeId}
                  onChange={(e) =>
                    setForm({ ...form, employeeId: e.target.value })
                  }
                  required
                >
                  <option value="">-- เลือกพนักงาน --</option>
                  {staffList.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.displayName ||
                        staff.fullName ||
                        staff.nickname ||
                        staff.email}{" "}
                      {staff.username && `(${staff.username})`}
                      {staff.role === "admin" && " [แอดมิน]"}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* DateTime Row */}
            <div className="mb-4">
              <DateTimeRow form={form} setForm={setForm} />
            </div>

            {/* Minor Task */}
            <div className="mb-4">
              <label className="apple-label">หัวข้อรอง (Minor Task) *</label>
              <MinorTaskSelector
                value={form.minorTask}
                onChange={handleMinorTaskChange}
              />
              {form.minorTask && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-slate-400">หัวข้อหลัก:</span>
                  <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">{form.mainDuty}</span>
                </div>
              )}
            </div>

            {/* Main Duty & Duty Group */}
            <div className="grid gap-4 md:grid-cols-2 mb-4">
              <div>
                <label className="apple-label">งานในหน้าที่หลัก</label>
                <input
                  type="text"
                  className="apple-input bg-slate-50"
                  value={form.mainDuty}
                  readOnly
                  placeholder="เลือกหัวข้อรองเพื่อแสดงงานหลัก"
                />
              </div>
              <div>
                <label className="apple-label">กลุ่มงาน</label>
                <input
                  type="text"
                  className="apple-input bg-slate-50"
                  value={form.dutyGroup}
                  readOnly
                  placeholder="-"
                />
              </div>
            </div>

            {/* Recipient */}
            <div className="mb-4">
              <label className="apple-label">ผู้รับบริการ / ผู้ติดต่อ</label>
              <input
                type="text"
                className="apple-input"
                value={form.recipient}
                onChange={(e) =>
                  setForm({ ...form, recipient: e.target.value })
                }
                placeholder="ชื่อผู้รับบริการ (ถ้ามี)"
              />
            </div>

            {/* Comment */}
            <div className="mb-4">
              <label className="apple-label">รายละเอียด / หมายเหตุ</label>
              <textarea
                className="apple-input min-h-[100px]"
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
                placeholder="รายละเอียดเพิ่มเติม..."
              />
              {hasSuggestions && (
                <div className="mt-2">
                  <CommentSuggestions
                    suggestions={suggestions}
                    onSelect={(suggestion) =>
                      setForm({ ...form, comment: suggestion })
                    }
                  />
                </div>
              )}
            </div>

            {lastSaved && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                <CheckCircle2 size={12} />
                บันทึกล่าสุด {lastSaved.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
              </div>
            )}

            {/* Submit Button - desktop */}
            <button
              type="submit"
              disabled={submitting || !form.employeeId || !form.minorTask}
              className="apple-button mt-5 w-full disabled:opacity-40 hidden lg:flex items-center justify-center gap-2"
            >
              {submitting ? <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />{t("form.saving")}</> : t("form.save")}
            </button>

            <p className="mt-4 text-xs text-slate-400 text-center">
              งานที่บันทึกโดย admin จะมีสถานะ "บันทึกโดยผู้ดูแลระบบ"
              และไม่ถูกล็อกเวลา
            </p>
          </form>
        </div>

        {/* ── Left: Sidebar ── */}
        <div className="flex flex-col gap-4 order-last lg:order-first">
          {/* 1. วันที่/เวลา — desktop บนสุด */}
          <div className="hidden lg:block rounded-2xl bg-white border border-slate-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">วันนี้</p>
            <p className="text-2xl font-bold text-slate-900 leading-tight">
              {new Date().toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <p className="text-sm text-slate-400 mt-0.5">ปี {new Date().getFullYear() + 543}</p>
          </div>

          {/* 2. วิธีบันทึก — desktop only */}
          <div className="hidden lg:block rounded-2xl bg-slate-950 p-5 text-white">
            <p className="text-sm font-semibold mb-3">วิธีบันทึก</p>
            <ol className="text-sm leading-7 text-white/70 list-decimal list-inside space-y-0.5">
              <li>เลือก <span className="text-white font-medium">พนักงาน</span></li>
              <li>เลือก <span className="text-white font-medium">หัวข้อรอง</span></li>
              <li>ระบบกรอก <span className="text-white font-medium">หัวข้อหลัก</span> อัตโนมัติ</li>
              <li>กด <span className="text-white font-medium">บันทึก</span></li>
            </ol>
            <p className="text-[11px] text-white/30 mt-3">เคล็ด: กดค้าง quick log เพื่อยืนยันก่อนบันทึก</p>
          </div>

          {/* 3. Admin notice — ล่างสุด */}
          <div className="rounded-2xl bg-emerald-950 p-5 text-white">
            <div className="flex items-start gap-3">
              <Sparkles size={18} className="mt-0.5 flex-shrink-0 text-emerald-400" />
              <div>
                <p className="text-sm font-semibold">สิทธิพิเศษของ Admin</p>
                <ul className="mt-2 text-sm leading-6 text-white/75 list-disc list-inside space-y-1">
                  <li>บันทึกงานแทนพนักงานได้ทุกคน</li>
                  <li>ไม่ถูกล็อกเวลา แก้ไขได้ตลอด</li>
                  <li>ระบุสถานะ "บันทึกโดยผู้ดูแลระบบ"</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Staff count */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-700">
              พนักงานที่ใช้งานได้
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">
              {staffList.length} คน
            </p>
          </div>
        </div>
      </section>

      {/* ── Sticky Save Bar — mobile only ── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-3">
        <button
          type="button"
          disabled={submitting || !form.employeeId || !form.minorTask}
          onClick={() => { document.getElementById('worklog-form')?.requestSubmit(); }}
          className="apple-button w-full disabled:opacity-40 flex items-center justify-center gap-2 py-3.5 text-base"
        >
          {submitting
            ? <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />กำลังบันทึก...</>
            : !form.employeeId
              ? <span className="text-white/60">เลือกพนักงานก่อนบันทึก</span>
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
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* Collapsed row */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-700">
            <Calendar size={16} />
            <span className="text-sm font-medium">
              {new Date(form.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <Clock size={16} />
            <span className="text-sm font-medium">{form.time}</span>
          </div>
          {isToday && (
            <span className="ml-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              วันนี้
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Expanded controls */}
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100">
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="text-[11px] font-medium text-slate-500 mb-1.5 block">วันที่</label>
              <input
                type="date"
                className="apple-input"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-500 mb-1.5 block">เวลา</label>
              <input
                type="time"
                className="apple-input"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </div>
          </div>
          {isToday && (
            <button
              type="button"
              onClick={() => setForm({ ...form, time: timeNow })}
              className="mt-3 text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Clock size={13} />
              ใช้เวลาปัจจุบัน ({timeNow})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
