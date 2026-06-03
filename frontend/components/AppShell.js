"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  LayoutGrid,
  Download,
  ListChecks,
  LogOut,
  PlusCircle,
  Settings,
  User,
  UserPlus,
  Users,
  Menu,
  X,
  ChevronLeft,
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

const PAGE_LABELS = {
  "/dashboard": "แดชบอร์ด",
  "/worklogs": "รายการงาน",
  "/worklogs/new": "บันทึกงาน",
  "/export": "ส่งออกข้อมูล",
  "/profile": "โปรไฟล์",
  "/admin/record": "บันทึกงานให้พนักงาน",
  "/admin/users": "จัดการผู้ใช้",
  "/admin/system": "จัดการระบบ",
  "/admin/templates": "จัดการ Templates",
  "/admin/settings": "ตั้งค่า",
};

export function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, pendingApproval, logout } = useAuth();
  const t = useTranslations();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const currentPageLabel = PAGE_LABELS[pathname] || "";

  const navItems = user ? getNav(t, user.role) : [];
  const currentNavIdx = navItems.findIndex(n => n.href === pathname);
  const prevPage = currentNavIdx > 0 ? navItems[currentNavIdx - 1] : null;
  const nextPage = currentNavIdx >= 0 && currentNavIdx < navItems.length - 1 ? navItems[currentNavIdx + 1] : null;

  useEffect(() => {
    if (!loading) {
      if (pendingApproval && pathname !== "/pending") {
        router.replace("/pending");
      } else if (!user && !pendingApproval) {
        const isLoginPage = pathname === "/login";
        if (!isLoginPage) {
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

      {/* Mobile nav — prev / title / next */}
      <div className="lg:hidden mx-auto mb-4 max-w-7xl flex items-center gap-2">
        {/* Prev page */}
        <button
          onClick={() => prevPage && router.push(prevPage.href)}
          disabled={!prevPage}
          title={prevPage?.label}
          className="flex flex-col items-center justify-center w-14 h-12 rounded-2xl bg-white/70 text-slate-500 disabled:opacity-25 shrink-0 transition active:scale-95"
        >
          <ChevronLeft size={18} />
          <span className="text-[9px] mt-0.5 leading-none truncate w-12 text-center">{prevPage?.label ?? ''}</span>
        </button>

        {/* Current page — tappable to open drawer */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex-1 flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white/70 hover:bg-white/90 transition"
        >
          <span className="text-sm font-semibold text-slate-800 truncate">{currentPageLabel}</span>
          <Menu size={16} className="text-slate-400 shrink-0 ml-2" />
        </button>

        {/* Next page */}
        <button
          onClick={() => nextPage && router.push(nextPage.href)}
          disabled={!nextPage}
          title={nextPage?.label}
          className="flex flex-col items-center justify-center w-14 h-12 rounded-2xl bg-white/70 text-slate-500 disabled:opacity-25 shrink-0 transition active:scale-95"
        >
          <ChevronLeft size={18} className="rotate-180" />
          <span className="text-[9px] mt-0.5 leading-none truncate w-12 text-center">{nextPage?.label ?? ''}</span>
        </button>
      </div>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          {/* Sheet */}
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-5 border-b border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-900">{user?.displayName || user?.nickname || "User"}</p>
                <p className="text-xs text-slate-400">{user?.role}</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-500">
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {getNav(t, user?.role).map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition ${
                      active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="px-3 py-4 border-t border-slate-100">
              <button
                onClick={() => { setDrawerOpen(false); logout(); }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-medium text-red-500 hover:bg-red-50 transition"
              >
                <LogOut size={18} />
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl">
        <Breadcrumb />
        {children}
      </main>

      <footer className="mx-auto mt-8 mb-4 max-w-7xl text-center text-xs text-slate-400">
        labboy Workload Recorder &mdash; v2.1.0
      </footer>
    </div>
  );
}
