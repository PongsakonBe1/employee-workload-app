"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../../../components/AppShell";
import { useAuth } from "../../../components/AuthProvider";
import { isAdminRole, isSuperAdminRole } from "../../../lib/authUtils";
import { adminSystemHref, systemLogsHref } from "../../../lib/navigation";

export default function LegacyAuditLogsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;
    if (isSuperAdminRole(user)) router.replace(systemLogsHref);
    else router.replace(isAdminRole(user) ? adminSystemHref : "/dashboard");
  }, [loading, router, user]);

  return (
    <AppShell>
      <p role="status">กำลังเปิดประวัติการใช้งาน…</p>
    </AppShell>
  );
}
