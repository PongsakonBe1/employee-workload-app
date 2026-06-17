"use client";

import { CheckCircle2, AlertCircle, X } from "lucide-react";

/**
 * Floating toast container for success / error / info messages.
 *
 * Replaces near-identical markup in worklogs/new and admin/record.
 *
 * @param {{ message?: string, error?: string, info?: string,
 *           onDismissMessage?: () => void, onDismissError?: () => void,
 *           onDismissInfo?: () => void }} props
 */
export function Toast({
  message,
  error,
  info,
  onDismissMessage,
  onDismissError,
  onDismissInfo,
}) {
  if (!message && !error && !info) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-4 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 pointer-events-none"
    >
      {message && (
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-xl animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={16} className="shrink-0" />
          <span className="flex-1">{message}</span>
          {onDismissMessage && (
            <button
              type="button"
              onClick={onDismissMessage}
              className="ml-2 shrink-0 opacity-80 hover:opacity-100"
              aria-label="ปิดข้อความ"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}
      {error && (
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-red-600 px-4 py-3 text-sm text-white shadow-xl animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={16} className="shrink-0" />
          <span className="flex-1">{error}</span>
          {onDismissError && (
            <button
              type="button"
              onClick={onDismissError}
              className="ml-2 shrink-0 opacity-80 hover:opacity-100"
              aria-label="ปิดข้อผิดพลาด"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}
      {info && (
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-slate-800 px-4 py-3 text-sm text-white shadow-xl animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={14} className="shrink-0 text-slate-300" />
          <span className="flex-1">{info}</span>
          {onDismissInfo && (
            <button
              type="button"
              onClick={onDismissInfo}
              className="ml-2 shrink-0 opacity-80 hover:opacity-100"
              aria-label="ปิด"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
