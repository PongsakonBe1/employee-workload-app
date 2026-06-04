"use client";

import { useEffect } from "react";

/**
 * Force-stop a loading state after `ms` milliseconds to prevent UI hangs.
 *
 * Duplicated in admin/record and admin/users; now centralised.
 *
 * @param {boolean} loading  Current loading flag.
 * @param {(v: boolean) => void} setLoading  Setter for the loading flag.
 * @param {number} [ms=5000]  Timeout in milliseconds.
 */
export function useLoadingTimeout(loading, setLoading, ms = 5000) {
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      setLoading(false);
    }, ms);
    return () => clearTimeout(timer);
  }, [loading, setLoading, ms]);
}
