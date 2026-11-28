import { addCalendarDays, calendarToday, validCalendarDate } from "./calendarView.js";
import { worklogCategory } from "./analytics.js";

export function profileWorklogsInScope(worklogs, scope, today = calendarToday()) {
  if (scope === "recent") return worklogs;
  const start = scope === "last90" ? addCalendarDays(today, -89) : `${today.slice(0, 7)}-01`;
  return worklogs.filter(({ date }) => validCalendarDate(date) && date >= start && date <= today);
}

export function recentProfileTopicWorklogs(worklogs, topic) {
  return worklogs.filter(worklog => worklogCategory(worklog) === topic)
    .sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")) ||
      String(b.time ?? "").localeCompare(String(a.time ?? "")))
    .slice(0, 5);
}
