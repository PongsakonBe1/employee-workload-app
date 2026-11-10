"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "./AuthProvider";

// The emulator page owns an isolated in-memory Auth client, without legacy login writes.
export function DevelopmentAuthBoundary({
  children
}) {
  const pathname = usePathname();
  if (process.env.NODE_ENV === "development" && ["/dev/calendar-readonly","/dev/calendar-staging","/dev/calendar-write","/dev/calendar-staging-write"].includes(pathname)) return children;
  return <AuthProvider>{children}</AuthProvider>;
}
