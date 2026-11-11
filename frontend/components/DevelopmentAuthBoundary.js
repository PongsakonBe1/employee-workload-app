"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { calendarStagingEntryEnabled } from "../lib/calendarStagingEntry";
import { StagingRouteGuard, StagingWorkspaceProvider } from "./staging/StagingWorkspaceProvider";
const AuthProvider = dynamic(() => import("./AuthProvider").then(module => module.AuthProvider));

// The emulator page owns an isolated in-memory Auth client, without legacy login writes.
export function DevelopmentAuthBoundary({
  children
}) {
  const pathname = usePathname();
  if (calendarStagingEntryEnabled(process.env.NODE_ENV, process.env.NEXT_PUBLIC_CALENDAR_STAGING_ENTRY)) return <StagingWorkspaceProvider><StagingRouteGuard>{children}</StagingRouteGuard></StagingWorkspaceProvider>;
  if (process.env.NODE_ENV === "development" && ["/dev/calendar-readonly","/dev/calendar-staging","/dev/calendar-write","/dev/calendar-staging-write"].includes(pathname)) return children;
  return <AuthProvider>{children}</AuthProvider>;
}
