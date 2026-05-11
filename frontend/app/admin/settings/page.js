"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Settings,
  Save,
  Bell,
  Lock,
  Database,
  Users,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Trash2,
  Shield,
  ChevronRight,
} from "lucide-react";
import { AppShell } from "../../../components/AppShell";
import { useAuth } from "../../../components/AuthProvider";
import { db } from "../../../lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";

const DEFAULT_SETTINGS = {
  // Time Lock Settings
  lockTime: "23:59",
  autoLockEnabled: true,
  allowEditDays: 3,
  
  // Notification Settings
  enableDeadlineReminder: true,
  reminderTime: "22:00",
  enableSlackNotifications: false,
  slackWebhookUrl: "",
  
  // Backup Settings
  backupFrequency: "daily", // daily, weekly, monthly
  backupRetentionCount: 7,
  
  // User Settings
  defaultUserRole: "staff",
  requireAdminApproval: true,
  allowedEmailDomain: "@icit.kmutnb.ac.th",
  
  // Export Settings
  exportFormat: "csv", // csv only
  defaultFiscalYearStart: "10-01", // MM-DD
  
  // Security Settings
  sessionTimeoutMinutes: 30,
  maxLoginAttempts: 5,
  enable2FAForAdmin: false,
  logIpAddress: true,
  
  // Display Settings
  defaultLanguage: "th",
  dateFormat: "DD/MM/YYYY",
  itemsPerPage: 20,
};

export default function SettingsPage() {
  const t = useTranslations();
  const router = useRouter();
  const { user } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("general");
  const [stats, setStats] = useState({
    totalWorklogs: 0,
    totalUsers: 0,
    backupSize: "-",
  });

  const isSuperAdmin = user?.role === "superadmin";
  const isAdmin = user?.role === "admin" || isSuperAdmin;

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/dashboard");
      return;
    }
    loadSettings();
    loadStats();
  }, [isAdmin, router]);

  async function loadSettings() {
    try {
      const docRef = doc(db, "settings", "system");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSettings({ ...DEFAULT_SETTINGS, ...docSnap.data() });
      }
    } catch (err) {
      console.error("Error loading settings:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const worklogsQuery = query(collection(db, "worklogs"), limit(1));
      const usersQuery = query(collection(db, "users"), where("active", "==", true));
      
      const [worklogsSnap, usersSnap] = await Promise.all([
        getDocs(worklogsQuery),
        getDocs(usersQuery),
      ]);

      setStats({
        totalWorklogs: worklogsSnap.size,
        totalUsers: usersSnap.size,
        backupSize: "-",
      });
    } catch (err) {
      console.error("Error loading stats:", err);
    }
  }

  async function saveSettings() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const docRef = doc(db, "settings", "system");
      await setDoc(docRef, {
        ...settings,
        updatedAt: new Date(),
        updatedBy: user.uid,
      });

      setMessage("บันทึกการตั้งค่าสำเร็จ");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError("ไม่สามารถบันทึกการตั้งค่าได้: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function triggerBackup() {
    // ในอนาคตจะเชื่อมต่อกับ Cloud Function
    alert("ฟีเจอร์นี้จะเชื่อมต่อกับ Cloud Function สำหรับสำรองข้อมูล");
  }

  function updateSetting(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  const tabs = [
    { id: "general", label: "ทั่วไป", icon: Settings },
    { id: "notifications", label: "การแจ้งเตือน", icon: Bell },
    { id: "backup", label: "สำรองข้อมูล", icon: Database },
    { id: "security", label: "ความปลอดภัย", icon: Shield },
  ];

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-slate-600">ไม่มีสิทธิ์เข้าถึง</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="mb-6">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Settings size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Admin
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
              ตั้งค่าระบบ
            </h1>
          </div>
        </div>
        <p className="text-slate-600">
          จัดการการตั้งค่าระบบและการกำหนดค่าต่างๆ
        </p>
      </section>

      {message && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle size={18} />
          {message}
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
        {/* Sidebar Tabs */}
        <div className="apple-panel p-4 h-fit">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${
                    activeTab === tab.id
                      ? "bg-slate-950 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={18} />
                  <span className="font-medium">{tab.label}</span>
                  {activeTab === tab.id && (
                    <ChevronRight size={16} className="ml-auto" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="w-full apple-button flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
            </button>
          </div>
        </div>

        {/* Settings Content */}
        <div className="apple-panel p-6">
          {loading ? (
            <div className="text-center py-12 text-slate-500">กำลังโหลด...</div>
          ) : (
            <>
              {/* General Settings */}
              {activeTab === "general" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-slate-950 flex items-center gap-2">
                    <Settings size={20} />
                    การตั้งค่าทั่วไป
                  </h2>

                  {/* User Defaults */}
                  <div className="space-y-4 border-b border-slate-100 pb-6">
                    <h3 className="font-medium text-slate-900">ผู้ใช้เริ่มต้น</h3>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="apple-label">บทบาทเริ่มต้น</label>
                        <select
                          className="apple-input"
                          value={settings.defaultUserRole}
                          onChange={(e) => updateSetting("defaultUserRole", e.target.value)}
                        >
                          <option value="staff">พนักงาน (Staff)</option>
                          <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                        </select>
                      </div>

                      <div>
                        <label className="apple-label">โดเมนอีเมลที่อนุญาต</label>
                        <input
                          type="text"
                          className="apple-input"
                          value={settings.allowedEmailDomain}
                          onChange={(e) => updateSetting("allowedEmailDomain", e.target.value)}
                          placeholder="@icit.kmutnb.ac.th"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="requireApproval"
                        className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        checked={settings.requireAdminApproval}
                        onChange={(e) => updateSetting("requireAdminApproval", e.target.checked)}
                      />
                      <label htmlFor="requireApproval" className="text-sm text-slate-700">
                        ต้องการอนุมัติจาก admin ก่อนใช้งาน
                      </label>
                    </div>
                  </div>

                  {/* Time Lock */}
                  <div className="space-y-4 border-b border-slate-100 pb-6">
                    <h3 className="font-medium text-slate-900 flex items-center gap-2">
                      <Lock size={18} />
                      การล็อกเวลา
                    </h3>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <label className="apple-label">เวลาล็อก (HH:MM)</label>
                        <input
                          type="time"
                          className="apple-input"
                          value={settings.lockTime}
                          onChange={(e) => updateSetting("lockTime", e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="apple-label">วันย้อนหลังที่แก้ไขได้</label>
                        <input
                          type="number"
                          className="apple-input"
                          value={settings.allowEditDays}
                          onChange={(e) => updateSetting("allowEditDays", parseInt(e.target.value))}
                          min="1"
                          max="30"
                        />
                      </div>

                      <div className="flex items-end pb-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-5 h-5 rounded border-slate-300"
                            checked={settings.autoLockEnabled}
                            onChange={(e) => updateSetting("autoLockEnabled", e.target.checked)}
                          />
                          <span className="text-sm text-slate-700">เปิดใช้งานการล็อกอัตโนมัติ</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Export */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-slate-900 flex items-center gap-2">
                      <FileSpreadsheet size={18} />
                      การส่งออกข้อมูล
                    </h3>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="apple-label">รูปแบบการส่งออก</label>
                        <select className="apple-input bg-slate-50" disabled>
                          <option value="csv">CSV (ค่าเริ่มต้น)</option>
                        </select>
                        <p className="text-xs text-slate-400 mt-1">รองรับเฉพาะ CSV เท่านั้น</p>
                      </div>

                      <div>
                        <label className="apple-label">วันเริ่มปีงบประมาณ (MM-DD)</label>
                        <input
                          type="text"
                          className="apple-input"
                          value={settings.defaultFiscalYearStart}
                          onChange={(e) => updateSetting("defaultFiscalYearStart", e.target.value)}
                          placeholder="10-01"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications */}
              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-slate-950 flex items-center gap-2">
                    <Bell size={20} />
                    การแจ้งเตือน
                  </h2>

                  <div className="space-y-4 border-b border-slate-100 pb-6">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="enableReminder"
                        className="w-5 h-5 rounded border-slate-300"
                        checked={settings.enableDeadlineReminder}
                        onChange={(e) => updateSetting("enableDeadlineReminder", e.target.checked)}
                      />
                      <label htmlFor="enableReminder" className="text-sm text-slate-700">
                        เปิดใช้งานการแจ้งเตือนใกล้ 23:59
                      </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="apple-label">เวลาแจ้งเตือนล่วงหน้า</label>
                        <input
                          type="time"
                          className="apple-input"
                          value={settings.reminderTime}
                          onChange={(e) => updateSetting("reminderTime", e.target.value)}
                          disabled={!settings.enableDeadlineReminder}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium text-slate-900">การแจ้งเตือน Slack</h3>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="enableSlack"
                        className="w-5 h-5 rounded border-slate-300"
                        checked={settings.enableSlackNotifications}
                        onChange={(e) => updateSetting("enableSlackNotifications", e.target.checked)}
                      />
                      <label htmlFor="enableSlack" className="text-sm text-slate-700">
                        เปิดใช้งานการแจ้งเตือน Slack
                      </label>
                    </div>

                    <div>
                      <label className="apple-label">Slack Webhook URL</label>
                      <input
                        type="text"
                        className="apple-input"
                        value={settings.slackWebhookUrl}
                        onChange={(e) => updateSetting("slackWebhookUrl", e.target.value)}
                        placeholder="https://hooks.slack.com/services/..."
                        disabled={!settings.enableSlackNotifications}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Backup */}
              {activeTab === "backup" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-slate-950 flex items-center gap-2">
                    <Database size={20} />
                    การสำรองข้อมูล
                  </h2>

                  <div className="grid gap-4 md:grid-cols-3 mb-6">
                    <div className="apple-panel p-4 text-center">
                      <p className="text-sm text-slate-500">จำนวนรายการงาน</p>
                      <p className="text-2xl font-semibold text-slate-950">{stats.totalWorklogs}</p>
                    </div>
                    <div className="apple-panel p-4 text-center">
                      <p className="text-sm text-slate-500">จำนวนผู้ใช้</p>
                      <p className="text-2xl font-semibold text-slate-950">{stats.totalUsers}</p>
                    </div>
                    <div className="apple-panel p-4 text-center">
                      <p className="text-sm text-slate-500">ขนาดข้อมูล</p>
                      <p className="text-2xl font-semibold text-slate-950">{stats.backupSize}</p>
                    </div>
                  </div>

                  <div className="space-y-4 border-b border-slate-100 pb-6">
                    <h3 className="font-medium text-slate-900">ตั้งค่าการสำรอง</h3>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="apple-label">ความถี่การสำรอง</label>
                        <select
                          className="apple-input"
                          value={settings.backupFrequency}
                          onChange={(e) => updateSetting("backupFrequency", e.target.value)}
                        >
                          <option value="daily">รายวัน</option>
                          <option value="weekly">รายสัปดาห์</option>
                          <option value="monthly">รายเดือน</option>
                        </select>
                      </div>

                      <div>
                        <label className="apple-label">จำนวน backup ที่เก็บไว้</label>
                        <input
                          type="number"
                          className="apple-input"
                          value={settings.backupRetentionCount}
                          onChange={(e) => updateSetting("backupRetentionCount", parseInt(e.target.value))}
                          min="1"
                          max="30"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium text-slate-900">ดำเนินการ</h3>

                    <div className="flex gap-3">
                      <button
                        onClick={triggerBackup}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-950 text-white rounded-xl hover:bg-slate-800 transition"
                      >
                        <Download size={18} />
                        สำรองข้อมูลตอนนี้
                      </button>

                      {isSuperAdmin && (
                        <button
                          onClick={() => alert("ฟีเจอร์กู้คืนข้อมูลจะเชื่อมต่อกับ Cloud Function")}
                          className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
                        >
                          <Trash2 size={18} />
                          กู้คืนข้อมูล
                        </button>
                      )}
                    </div>

                    <p className="text-sm text-slate-500">
                      การสำรองข้อมูลจะทำงานอัตโนมัติผ่าน Firebase Cloud Functions
                    </p>
                  </div>
                </div>
              )}

              {/* Security */}
              {activeTab === "security" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-slate-950 flex items-center gap-2">
                    <Shield size={20} />
                    ความปลอดภัย
                  </h2>

                  <div className="space-y-4 border-b border-slate-100 pb-6">
                    <h3 className="font-medium text-slate-900">การเข้าสู่ระบบ</h3>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="apple-label">ระยะเวลา Session (นาที)</label>
                        <input
                          type="number"
                          className="apple-input"
                          value={settings.sessionTimeoutMinutes}
                          onChange={(e) => updateSetting("sessionTimeoutMinutes", parseInt(e.target.value))}
                          min="5"
                          max="480"
                        />
                      </div>

                      <div>
                        <label className="apple-label">จำนวนครั้ง Login ผิดพลาดสูงสุด</label>
                        <input
                          type="number"
                          className="apple-input"
                          value={settings.maxLoginAttempts}
                          onChange={(e) => updateSetting("maxLoginAttempts", parseInt(e.target.value))}
                          min="3"
                          max="10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium text-slate-900">การตรวจสอบสิทธิ์</h3>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="enable2FA"
                        className="w-5 h-5 rounded border-slate-300"
                        checked={settings.enable2FAForAdmin}
                        onChange={(e) => updateSetting("enable2FAForAdmin", e.target.checked)}
                        disabled={!isSuperAdmin}
                      />
                      <label htmlFor="enable2FA" className="text-sm text-slate-700">
                        บังคับใช้ 2FA สำหรับ Admin (เฉพาะ Superadmin)
                      </label>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="logIp"
                        className="w-5 h-5 rounded border-slate-300"
                        checked={settings.logIpAddress}
                        onChange={(e) => updateSetting("logIpAddress", e.target.checked)}
                      />
                      <label htmlFor="logIp" className="text-sm text-slate-700">
                        บันทึก IP Address ใน Audit Log
                      </label>
                    </div>
                  </div>

                  {isSuperAdmin && (
                    <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                      <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
                        <Shield size={16} />
                        คุณกำลังใช้งานในฐานะ Superadmin
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        คุณมีสิทธิ์จัดการผู้ใช้ทั้งหมดรวมถึงลบบัญชี Admin และ Staff
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
