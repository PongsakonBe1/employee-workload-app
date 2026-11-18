"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "./AuthProvider";
import { Breadcrumb } from "./Breadcrumb";
import { NotificationBell } from "./NotificationBell";
import { WorkspaceFrame } from "./ui/WorkspaceFrame";

export function AppShell({ children, showBreadcrumb = true }) {
  const pathname = usePathname(), router = useRouter();
  const { user, loading, pendingApproval, logout } = useAuth();
  const t = useTranslations();
  // Appearance never supplies identity; keep the existing authentication redirects.
  useEffect(() => {
    if (!loading) {
      if (pendingApproval && pathname !== "/pending") router.replace("/pending");
      else if (!user && !pendingApproval && pathname !== "/login") router.replace("/login");
    }
  }, [loading, user, pendingApproval, pathname, router]);
  if (loading) return <main className="ui-loading" aria-busy="true"><div className="apple-panel p-6" role="status">{t("common.loading")}</div></main>;
  if (!user || pendingApproval) return null;
  return <WorkspaceFrame
    user={user} pathname={pathname}
    onLogout={logout} notificationSlot={<NotificationBell />}
  >
    {showBreadcrumb && <Breadcrumb />}
    {children}
  </WorkspaceFrame>;
}
