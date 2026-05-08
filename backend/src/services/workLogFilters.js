import { parseDateOnly } from "../utils/fiscalYear.js";

export function buildWorkLogFilter(query, user) {
  const filter = {};

  if (user.role !== "admin") {
    filter.employeeUsername = user.username;
  } else if (query.employee) {
    filter.employeeUsername = String(query.employee).trim();
  }

  if (query.from || query.to) {
    filter.date = {};
    if (query.from) filter.date.$gte = parseDateOnly(query.from);
    if (query.to) {
      const to = parseDateOnly(query.to);
      filter.date.$lt = new Date(to.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  if (query.mainDuty) filter.mainDuty = String(query.mainDuty).trim();
  if (query.minorTask) filter.minorTask = String(query.minorTask).trim();
  if (query.status) filter.status = String(query.status).trim();

  if (query.search) {
    const regex = new RegExp(String(query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { recipient: regex },
      { comment: regex },
      { mainDuty: regex },
      { minorTask: regex },
      { employeeNickname: regex }
    ];
  }

  return filter;
}
