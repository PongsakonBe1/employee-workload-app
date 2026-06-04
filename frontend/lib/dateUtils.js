/**
 * Shared date/time utility functions.
 *
 * Consolidates helpers that were previously duplicated across
 * worklogs/new, admin/record, dashboard, and export pages.
 */

/** Current date as YYYY-MM-DD. */
export function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Current time as HH:mm. */
export function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Format a Date object to YYYY-MM-DD in local timezone. */
export function toLocalDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Thai fiscal-year start/end dates (input in Buddhist Era, e.g. 2569). */
export function getThaiFiscalYearDates(fy) {
  const year = parseInt(fy) - 543;
  return {
    start: `${year - 1}-10-01`,
    end: `${year}-09-30`,
  };
}

/** Today as YYYY-MM-DD (alias for `today()`). */
export function getToday() {
  return today();
}

/** Start/end of the current week (Sun-Sat). */
export function getThisWeek() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - dayOfWeek);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toLocalDateStr(start), end: toLocalDateStr(end) };
}

/** Start/end of the current calendar month. */
export function getThisMonth() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: toLocalDateStr(start), end: toLocalDateStr(end) };
}

/** Start/end of the current calendar quarter. */
export function getThisQuarter() {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  const start = new Date(now.getFullYear(), q * 3, 1);
  const end = new Date(now.getFullYear(), q * 3 + 3, 0);
  return { start: toLocalDateStr(start), end: toLocalDateStr(end) };
}

/** Lock time = 23:59 on the given YYYY-MM-DD date string. */
export function getLockTime(dateStr) {
  const date = new Date(dateStr);
  date.setHours(23, 59, 0, 0);
  return date;
}
