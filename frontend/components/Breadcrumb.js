"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronRight, Home } from "lucide-react";

const routeMap = {
  "/dashboard": { label: "navigation.dashboard", parent: null },
  "/worklogs": { label: "navigation.worklogs", parent: "/dashboard" },
  "/worklogs/new": { label: "navigation.newWorklog", parent: "/worklogs" },
  "/export": { label: "navigation.export", parent: "/dashboard" },
  "/admin": { label: "navigation.admin", parent: "/dashboard" },
  "/admin/users": { label: "admin.users.title", parent: "/admin" },
  "/admin/audit-logs": { label: "admin.auditLogs.title", parent: "/admin" },
};

export function Breadcrumb() {
  const pathname = usePathname();
  const t = useTranslations();

  // Don't show on home or login
  if (pathname === "/" || pathname === "/login") return null;

  // Build breadcrumb trail
  const trail = [];
  let current = pathname;

  while (current && routeMap[current]) {
    trail.unshift({
      path: current,
      label: routeMap[current].label,
    });
    current = routeMap[current].parent;
  }

  if (trail.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-4 flex items-center gap-1.5 text-sm text-slate-500"
    >
      <Link
        href="/dashboard"
        className="flex items-center gap-1 rounded-md px-1.5 py-1 transition hover:bg-slate-100 hover:text-slate-700"
      >
        <Home size={14} />
        <span className="sr-only">{t("navigation.dashboard")}</span>
      </Link>

      {trail.map((item, index) => (
        <div key={item.path} className="flex items-center gap-1.5">
          <ChevronRight size={14} className="text-slate-300" />
          {index === trail.length - 1 ? (
            <span className="font-medium text-slate-700" aria-current="page">
              {t(item.label)}
            </span>
          ) : (
            <Link
              href={item.path}
              className="rounded-md px-1.5 py-1 transition hover:bg-slate-100 hover:text-slate-700"
            >
              {t(item.label)}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
