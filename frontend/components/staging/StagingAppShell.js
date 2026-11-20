"use client";
import { useRouter } from "next/navigation";
import { WorkspaceFrame } from "../ui/WorkspaceFrame";
import { resolveStagingHref } from "../../lib/calendarStagingEntry";
import { StagingSessionGate, useStagingWorkspace } from "./StagingWorkspaceProvider";
export function StagingAppShell({ children, pathname = "/dashboard" }) {
  const { user, logout } = useStagingWorkspace(), router = useRouter();
  return <StagingSessionGate>{user && <WorkspaceFrame user={{ ...user, uid: user.id }} pathname={pathname} onLogout={logout} onNavigate={href => router.push(href)} resolveHref={resolveStagingHref} glassMode="quick">{children}</WorkspaceFrame>}</StagingSessionGate>;
}
