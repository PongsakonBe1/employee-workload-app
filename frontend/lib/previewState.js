"use client";

import { useEffect, useState } from "react";

// Tab-local fixture drafts only. No disk persistence, auth state, tokens or service access.
const drafts = new Map();
export const hasPreviewState = key => typeof window !== "undefined" && drafts.has(key);
export function usePreviewState(key, initialValue) {
  const [value, setValue] = useState(() => hasPreviewState(key) ? drafts.get(key) : typeof initialValue === "function" ? initialValue() : initialValue);
  useEffect(() => { drafts.set(key, value); }, [key, value]);
  return [value, setValue];
}
