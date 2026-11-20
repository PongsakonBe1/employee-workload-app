import { calendarRange } from "./calendarView.js";

export const WORKLOG_HISTORY_READ_LIMIT = 500;

export function worklogHistoryRange(filters, month = null) {
  const from = filters.from || "";
  const to = filters.to || "";
  const monthRange = month && calendarRange(month, "month");
  const start = monthRange && from <= monthRange.start ? monthRange.start : from;
  const end = monthRange && (!to || to >= monthRange.end) ? monthRange.end : to;
  return { start, end, empty: Boolean(start && end && start > end) };
}

export function worklogHistoryMonth(filters, month) {
  if (!worklogHistoryRange(filters, month).empty) return month;
  const edge = filters.from > month ? filters.from : filters.to;
  return edge ? calendarRange(edge, "month").start : month;
}
