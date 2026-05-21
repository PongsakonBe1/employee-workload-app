"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  LayoutGrid,
  Download,
  ListChecks,
  LogOut,
  PlusCircle,
  Shield,
  Settings,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import { Breadcrumb } from "./Breadcrumb";
import { NotificationBell } from "./NotificationBell";

const getNav = (t, role) => {
  const isAdmin = role === "admin";
  const isSuperadmin = role === "superadmin";
  const isStaff = role === "staff";

  const items = [
    { href: "/dashboard", label: t("navigation.dashboard"), icon: LayoutGrid },
    { href: "/worklogs", label: t("navigation.worklogs"), icon: ListChecks },
    { href: "/export", label: t("navigation.export"), icon: Download },
    { href: "/profile", label: "โปรไฟล์", icon: User },
  ];

  // Show Record Work for staff only (admin uses admin/record instead)
  if (isStaff) {
    items.splice(1, 0, {
      href: "/worklogs/new",
      label: t("navigation.newWorklog"),
      icon: PlusCircle,
    });
  }

  // Show Admin menu for admin and superadmin
  if (isAdmin || isSuperadmin) {
    // ใส่ 'บันทึกงานให้พนักงาน' หลัง 'แดชบอร์ด' (index 1)
    items.splice(1, 0, {
      href: "/admin/record",
      label: "บันทึกงานให้พนักงาน",
      icon: UserPlus,
    });
    items.push({
      href: "/admin/users",
      label: "จัดการผู้ใช้",
      icon: Users,
    });
    // หมายเหตุ: จัดการระบบเป็นไอคอนแยกต่างหาก (ไม่มีชื่อ)
  }

  return items;
};

export function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, pendingApproval, logout } = useAuth();
  const t = useTranslations();

  useEffect(() => {
    if (!loading) {
      if (pendingApproval && pathname !== "/pending") {
        router.replace("/pending");
      } else if (!user && !pendingApproval) {
        const isAdminPage = pathname?.startsWith("/admin");
        const isLoginPage = pathname === "/login";
        if (!isAdminPage && !isLoginPage) {
          router.replace("/login");
        }
      }
    }
  }, [loading, user, pendingApproval, pathname, router]);

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <div className="px-8 py-6 text-sm font-medium apple-panel text-slate-600">
          {t("common.loading")}
        </div>
      </main>
    );
  }

  if (!user || pendingApproval) {
    return null;
  }

  return (
    <div className="min-h-screen px-5 py-5 sm:px-8">
      {/* Profile Alert Banner for Staff without displayName */}
      {user?.role === "staff" &&
        !user?.displayName &&
        pathname !== "/profile" && (
          <div className="flex items-center justify-between px-5 py-3 mx-auto mb-4 border max-w-7xl rounded-2xl bg-amber-50 border-amber-200">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 text-white rounded-xl bg-amber-500">
                <User size={18} />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-900">
                  กรุณาตั้งชื่อที่ใช้ลงงาน (ภาษาไทย)
                </p>
                <p className="text-xs text-amber-700">
                  ชื่อนี้จะแสดงใน Dashboard และรายงานงาน เช่น พงศกร, สมชาย
                  (ไม่ต้องมีนามสกุล)
                </p>
              </div>
            </div>
            <Link
              href="/profile"
              className="px-4 py-2 text-sm font-medium text-white transition rounded-lg bg-amber-600 hover:bg-amber-700"
            >
              ไปตั้งชื่อ →
            </Link>
          </div>
        )}

      <header className="relative z-50 mx-auto mb-8 flex max-w-7xl items-center justify-between rounded-[2rem] border border-white/70 bg-white/70 px-5 py-4 shadow-sm backdrop-blur-2xl">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 overflow-hidden text-white rounded-2xl bg-slate-950">
            <Image src="/labboy-logo.png" alt="labboy logo" width={32} height={32} className="object-contain" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950">
              labboy Workload
            </p>
            <p className="text-xs text-slate-500">
              {t("metadata.description")}
            </p>
          </div>
        </Link>

        <div className="items-center hidden gap-2 lg:flex">
          {getNav(t, user?.role).map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-white hover:text-slate-950"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {/* Notification Bell - ทุก role */}
          <NotificationBell />

          {/* Settings icon for admin/superadmin - tooltip style */}
          {(user?.role === "admin" || user?.role === "superadmin") && (
            <Link
              href="/admin/system"
              className="relative p-3 transition border rounded-full border-slate-200 bg-white/80 text-slate-600 hover:text-slate-950 group"
              title="จัดการระบบ"
            >
              <Settings size={18} />
              {/* Tooltip */}
              <span className="absolute px-2 py-1 mt-2 text-xs text-white transition -translate-x-1/2 rounded opacity-0 pointer-events-none top-full left-1/2 bg-slate-800 group-hover:opacity-100 whitespace-nowrap">
                จัดการระบบ
              </span>
            </Link>
          )}
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-slate-950">
              {user.displayName || user.nickname || user.fullName || "User"}
            </p>
            <p className="text-xs text-slate-500">{user.role}</p>
          </div>
          <button
            onClick={logout}
            className="p-3 transition border rounded-full border-slate-200 bg-white/80 text-slate-600 hover:text-slate-950"
            title={t("navigation.logout")}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <nav className="grid grid-cols-2 gap-2 mx-auto mb-6 max-w-7xl lg:hidden">
        {getNav(t, user?.role).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-medium ${
                active
                  ? "bg-slate-950 text-white"
                  : "bg-white/70 text-slate-600"
              }`}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="mx-auto max-w-7xl">
        <Breadcrumb />
        {children}
      </main>

      <footer className="mx-auto mt-8 mb-4 max-w-7xl text-center text-xs text-slate-400">
        labboy Workload Recorder &mdash; v1.5.0
      </footer>
    </div>
  );
}
