"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "./AuthProvider";

// The emulator page owns an isolated in-memory Auth client, without legacy login writes.
export function DevelopmentAuthBoundary({
  children
}) {
  const pathname = usePathname();
  if (process.env.NODE_ENV === "development" && pathname === "/dev/calendar-readonly") return children;
  return <AuthProvider>{children}</AuthProvider>;
}
