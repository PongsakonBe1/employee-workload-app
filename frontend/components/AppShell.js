"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  Download,
  ListChecks,
  LogOut,
  PlusCircle,
  Shield,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Breadcrumb } from "./Breadcrumb";
import { NotificationBell } from "./NotificationBell";

const getNav = (t, isAdmin) => {
  const items = [
    { href: "/dashboard", label: t("navigation.dashboard"), icon: BarChart3 },
    { href: "/worklogs", label: t("navigation.worklogs"), icon: ListChecks },
    { href: "/export", label: t("navigation.export"), icon: Download },
    { href: "/profile", label: "โปรไฟล์", icon: User },
  ];

  // Only show Record Work for non-admin users
  if (!isAdmin) {
    items.splice(1, 0, {
      href: "/worklogs/new",
      label: t("navigation.newWorklog"),
      icon: PlusCircle,
    });
  }

  // Show Admin menu for admin users
  if (isAdmin) {
    items.push({
      href: "/admin/users",
      label: "จัดการผู้ใช้",
      icon: Users,
    });
    items.push({
      href: "/admin/record",
      label: "บันทึกงานให้พนักงาน",
      icon: UserPlus,
    });
    // ลบเมนู ผู้ดูแลระบบ เพราะมี จัดการผู้ใช้ โดยตรงแล้ว
    // items.push({
    //   href: "/admin",
    //   label: t("navigation.admin"),
    //   icon: Shield,
    // });
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
        // ถ้ารออนุมัติ ให้ไปหน้า pending
        router.replace("/pending");
      } else if (!user && !pendingApproval) {
        // ถ้าไม่มี user และไม่ได้ pending ให้ไป login
        // แต่ถ้าอยู่ในหน้า admin ให้รอสักครู่ก่อน redirect (อาจกำลังโหลด)
        const isAdminPage = pathname?.startsWith("/admin");
        if (!isAdminPage) {
          router.replace("/login");
        } else {
          console.log("[AppShell] On admin page without user, waiting...");
        }
      }
    }
  }, [loading, user, pendingApproval, pathname, router]);

  // Debug log
  useEffect(() => {
    console.log("[AppShell] State:", {
      pathname,
      user: user?.email,
      role: user?.role,
      loading,
      pendingApproval,
    });
  }, [pathname, user, loading, pendingApproval]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="apple-panel px-8 py-6 text-sm font-medium text-slate-600">
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
      <header className="mx-auto mb-8 flex max-w-7xl items-center justify-between rounded-[2rem] border border-white/70 bg-white/70 px-5 py-4 shadow-sm backdrop-blur-2xl">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="relative h-10 w-20 overflow-hidden rounded-2xl bg-slate-950 p-1">
            <Image
              src="/icit-logo.png"
              alt="ICIT logo"
              fill
              className="object-contain p-1"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950">
              ICIT Workload
            </p>
            <p className="text-xs text-slate-500">
              {t("metadata.description")}
            </p>
          </div>
        </Link>

        <div className="hidden items-center gap-2 lg:flex">
          {getNav(t, user?.role === "admin" || user?.role === "superadmin").map(
            (item) => {
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
            },
          )}
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell />
          <LanguageSwitcher />
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-slate-950">
              {user.displayName || user.nickname || user.fullName || "User"}
            </p>
            <p className="text-xs text-slate-500">{user.role}</p>
          </div>
          <button
            onClick={logout}
            className="rounded-full border border-slate-200 bg-white/80 p-3 text-slate-600 transition hover:text-slate-950"
            title={t("navigation.logout")}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <nav className="mx-auto mb-6 grid max-w-7xl grid-cols-2 gap-2 lg:hidden">
        {getNav(t, user?.role === "admin" || user?.role === "superadmin").map(
          (item) => {
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
          },
        )}
      </nav>

      <main className="mx-auto max-w-7xl">
        <Breadcrumb />
        {children}
      </main>
    </div>
  );
}
