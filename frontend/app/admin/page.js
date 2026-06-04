"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Users,
  FileText,
  Shield,
  BarChart3,
  Settings,
  ChevronRight,
  PlusCircle,
  Cog,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { useAuth } from "../../components/AuthProvider";
import { isAdminRole } from "../../lib/authUtils";

const adminModules = [
  {
    id: "users",
    title: "จัดการผู้ใช้",
    titleEn: "User Management",
    description: "ดูและจัดการพนักงานทั้งหมดในระบบ อนุมัติคำขอเข้าใช้งาน",
    descriptionEn: "View and manage all system users, approve pending requests",
    icon: Users,
    href: "/admin/users",
    color: "bg-blue-500",
  },
  {
    id: "record",
    title: "บันทึกงานให้พนักงาน",
    titleEn: "Record Work for Staff",
    description: "บันทึกงานแทนพนักงานในกรณีฉุกเฉิน",
    descriptionEn: "Create work logs on behalf of staff members",
    icon: PlusCircle,
    href: "/admin/record",
    color: "bg-rose-500",
  },
  {
    id: "audit",
    title: "ประวัติการใช้งาน",
    titleEn: "Audit Logs",
    description: "ดูบันทึกการกระทำทั้งหมดในระบบ",
    descriptionEn: "View all system activity logs",
    icon: FileText,
    href: "/admin/audit-logs",
    color: "bg-emerald-500",
  },
  {
    id: "staff-analytics",
    title: "Staff Analytics",
    titleEn: "Staff Analytics",
    description: "ประสิทธิภาพพนักงาน 6 มิติ — Radar Chart, Rankings, เปรียบเทียบ",
    descriptionEn: "Staff efficiency radar — 6 metrics, rankings, compare mode",
    icon: TrendingUp,
    href: "/admin/staff-analytics",
    color: "bg-indigo-600",
  },
  {
    id: "equipment-health",
    title: "สุขภาพอุปกรณ์",
    titleEn: "Equipment Health",
    description: "ติดตามสภาพหูฟัง ปลั๊กไฟ — ชำรุด / สูญหาย รายเดือน",
    descriptionEn: "Track equipment condition — damaged / lost reports",
    icon: BarChart3,
    href: "/admin/equipment-health",
    color: "bg-amber-600",
  },
  {
    id: "stats",
    title: "สถิติรวม",
    titleEn: "Statistics",
    description: "ดูสถิติการทำงานของพนักงานทั้งหมด",
    descriptionEn: "View overall employee workload statistics",
    icon: BarChart3,
    href: "/dashboard",
    color: "bg-violet-500",
  },
  {
    id: "settings",
    title: "ตั้งค่าระบบ",
    titleEn: "System Settings",
    description: "จัดการตั้งค่าระบบ การแจ้งเตือน การสำรองข้อมูล",
    descriptionEn: "Manage system settings, notifications, and backups",
    icon: Cog,
    href: "/admin/settings",
    color: "bg-amber-500",
  },
];

export default function AdminPage() {
  const t = useTranslations();
  const router = useRouter();
  const { user } = useAuth();

  // Redirect non-admin users (allow admin and superadmin)
  const isAdmin = isAdminRole(user);

  useEffect(() => {
    if (user && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [user, router, isAdmin]);

  if (!user || !isAdmin) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="apple-panel px-8 py-6 text-center">
            <Shield className="mx-auto mb-4 h-12 w-12 text-slate-400" />
            <p className="text-slate-600">{t("common.loading")}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Shield size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Admin
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
              {t("admin.title")}
            </h1>
          </div>
        </div>
        <p className="ml-[60px] text-slate-600">
          จัดการระบบและดูข้อมูลทั้งหมดของพนักงาน
        </p>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {adminModules.map((module) => {
          const Icon = module.icon;
          return (
            <a
              key={module.id}
              href={module.href}
              className="apple-panel group flex items-start gap-5 p-6 transition hover:shadow-lg"
            >
              <div
                className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-white transition-transform group-hover:scale-110 ${module.color}`}
              >
                <Icon size={28} />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-slate-950">
                  {module.title}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {module.description}
                </p>
              </div>
              <ChevronRight
                className="mt-1 text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-600"
                size={24}
              />
            </a>
          );
        })}
      </div>

      {/* Quick Stats */}
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-slate-950">
          ภาพรวมระบบ
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="apple-panel p-5">
            <p className="text-sm text-slate-500">พนักงานทั้งหมด</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">8</p>
          </div>
          <div className="apple-panel p-5">
            <p className="text-sm text-slate-500">งานที่บันทึกวันนี้</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">-</p>
          </div>
          <div className="apple-panel p-5">
            <p className="text-sm text-slate-500">งานรอการล็อก</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">-</p>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
