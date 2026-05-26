"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
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
      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        {/* Room Equipment Status - Top */}
        <div className="lg:col-span-2">
          <RoomEquipmentStatus />
        </div>
        {/* Left panel - Info */}
        <div className="apple-panel p-8">
          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-500 text-white">
            <Shield size={24} />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Admin / บันทึกงานแทน
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            บันทึกงานให้พนักงาน
          </h1>
          <p className="mt-5 text-slate-600">
            บันทึกงานแทนพนักงานในกรณีที่พนักงานไม่สามารถบันทึกเองได้ เช่น
            ลืมรหัสผ่าน, ลาป่วย, หรือระบบมีปัญหา
          </p>

          {/* Staff count */}
          <div className="mt-6 rounded-3xl bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-700">
              พนักงานที่ใช้งานได้
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">
              {staffList.length} คน
            </p>
          </div>

          {/* Admin notice */}
          <div className="mt-6 rounded-3xl bg-emerald-950 p-5 text-white">
            <div className="flex items-start gap-3">
              <Sparkles
                size={20}
                className="mt-0.5 flex-shrink-0 text-emerald-400"
              />
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
        </div>

        {/* Right panel - Form */}
        <form onSubmit={handleSubmit} className="apple-panel p-6 sm:p-8">
          {success && (
            <div className="mb-6 flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              <CheckCircle size={18} />
              บันทึกงานสำเร็จ!
            </div>
          )}

          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Select Staff */}
            <div className="md:col-span-2 mb-2">
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

            {/* Date */}
            <div>
              <label className="apple-label flex items-center gap-2">
                <Calendar size={16} />
                วันที่ *
              </label>
              <input
                type="date"
                className="apple-input"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>

            {/* Time */}
            <div>
              <label className="apple-label flex items-center gap-2">
                <Clock size={16} />
                เวลา *
              </label>
              <input
                type="time"
                className="apple-input"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                required
              />
            </div>

            {/* Quick Log Section */}
            <div className="md:col-span-2">
              {!form.employeeId ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400">
                  กรุณาเลือกพนักงานก่อนใช้ Quick Log
                </div>
              ) : (
                <QuickLogButtons
                  targetUser={staffList.find(s => s.id === form.employeeId)}
                  onLogSuccess={(message, type) => {
                    setMessage(message);
                    if (type === 'error') {
                      setError(message);
                      setSuccess(false);
                    } else {
                      setSuccess(true);
                      setError('');
                      setTimeout(() => {
                        setSuccess(false);
                        setMessage('');
                      }, 3000);
                    }
                  }}
                />
              )}
            </div>

            {/* Minor Task */}
            <div className="md:col-span-2">
              <label className="apple-label">หัวข้อรอง (Minor Task) *</label>
              <MinorTaskSelector
                value={form.minorTask}
                onChange={handleMinorTaskChange}
              />
            </div>

            {/* Main Duty (Auto-populated) */}
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

            {/* Duty Group (Auto-populated) */}
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

            {/* Recipient */}
            <div className="md:col-span-2">
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
            <div className="md:col-span-2">
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
          </div>

          {/* Success/Error Messages */}
          {success && message && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-700">{message}</span>
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || !form.employeeId || !form.minorTask}
            className="apple-button mt-8 w-full disabled:opacity-50"
          >
            {submitting ? t("form.saving") : t("form.save")}
          </button>

          <p className="mt-4 text-xs text-slate-400 text-center">
            งานที่บันทึกโดย admin จะมีสถานะ "บันทึกโดยผู้ดูแลระบบ"
            และไม่ถูกล็อกเวลา
          </p>
        </form>
      </section>
    </AppShell>
  );
}
