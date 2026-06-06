"use client";

import { useState } from "react";
import { AppShell } from "../../components/AppShell";
import { useAuth } from "../../components/AuthProvider";
import { ProfileStats } from "../../components/ProfileStats";
import { db } from "../../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { User, Save, Lock, BarChart3 } from "lucide-react";
import { isAdminRole } from "../../lib/authUtils";

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    fullName: user?.fullName || "",
    displayName: user?.displayName || "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const isAdmin = isAdminRole(user);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);
      const updatePayload = { fullName: form.fullName };
      // ITEM-3A: เฉพาะ admin/superadmin แก้ displayName ได้ (SA lock rules)
      if (isAdmin) updatePayload.displayName = form.displayName || form.fullName;
      await updateDoc(doc(db, "users", user.uid), updatePayload);

      // อัพเดต context
      setUser({ ...user, ...form });
      setMessage("บันทึกสำเร็จ!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("Error updating profile:", err);
      setMessage("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-slate-600">กรุณาเข้าสู่ระบบ</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-500 text-white mb-4">
            <User size={24} />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            แก้ไขโปรไฟล์
          </h1>
          <p className="mt-2 text-slate-600">อัพเดตข้อมูลส่วนตัวของคุณ</p>
        </div>

        {/* ITEM-3B: Stats + Radar + Badges */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={20} className="text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900">สถิติของฉัน</h2>
          </div>
          <ProfileStats user={user} />
        </section>

        <div className="apple-panel p-8">
          {message && (
            <div
              className={`mb-6 p-4 rounded-xl ${message.includes("สำเร็จ") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ITEM-3A: displayName — admin แก้ได้, staff ดูอย่างเดียว */}
            <div>
              <label className="apple-label">
                ชื่อที่ใช้ลงงาน (ภาษาไทย)
              </label>
              {isAdmin ? (
                <>
                  <input
                    type="text"
                    className="apple-input"
                    value={form.displayName}
                    onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                    placeholder="เช่น พงศกร"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    ชื่อนี้จะแสดงในหน้า Dashboard และรายงานงาน
                  </p>
                </>
              ) : (
                <div className="flex items-center gap-2 rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3">
                  <Lock size={14} className="text-slate-400 shrink-0" />
                  <span className="text-slate-700 font-medium">{user.displayName || user.fullName || "—"}</span>
                  <span className="ml-auto text-xs text-slate-400">แก้ไขโดย Admin เท่านั้น</span>
                </div>
              )}
            </div>

            <div>
              <label className="apple-label">ชื่อ-นามสกุลเต็ม (ภาษาไทย)</label>
              <input
                type="text"
                className="apple-input"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="เช่น พงศกร ราวังวง"
              />
              <p className="mt-1 text-xs text-slate-500">
                ข้อมูลเพิ่มเติม (ไม่บังคับ)
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <p className="text-sm text-slate-500 mb-4">
                <strong>อีเมล:</strong> {user.email}
              </p>
              <p className="text-sm text-slate-500 mb-4">
                <strong>สิทธิ์:</strong>{" "}
                {user.role === "staff" ? "พนักงาน" : user.role}
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="apple-button w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
            </button>
          </form>
        </div>
      </section>
    </AppShell>
  );
}
