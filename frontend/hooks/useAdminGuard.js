"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/AuthProvider";
import { isAdminRole, isSuperAdminRole } from "../lib/authUtils";

/**
 * Guard hook for admin-only pages.
 *
 * Redirects non-admin users to /dashboard once auth loading completes.
 * Returns `{ user, isAdmin, isSuperAdmin }` for the caller to use.
 *
 * @param {{ waitForLoading?: boolean }} opts
 *   waitForLoading (default true) — when true the redirect only fires after
 *   a local loading flag becomes false, preventing flicker during auth hydration.
 *   Pass `false` to redirect as soon as `user` is available.
 */
export function useAdminGuard({ waitForLoading = true } = {}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const isAdmin = isAdminRole(user);
  const isSuperAdmin = isSuperAdminRole(user);

  useEffect(() => {
    if (waitForLoading && authLoading) return;
    if (user && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [user, isAdmin, authLoading, waitForLoading, router]);

  return { user, isAdmin, isSuperAdmin, loading: authLoading };
}
