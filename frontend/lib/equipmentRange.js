import { addCalendarDays, addCalendarMonths, calendarRange, validCalendarDate } from "./calendarView.js";

export function equipmentRange(date, mode, { start, end } = {}) {
  if (["day", "week", "month"].includes(mode)) return calendarRange(date, mode);
  if (!validCalendarDate(date)) throw Error("วันที่ไม่ถูกต้อง");
  const year = Number(date.slice(0, 4)),
    month = Number(date.slice(5, 7));
  if (mode === "custom") return validCalendarDate(start) && validCalendarDate(end) && start <= end ? { start, end } : null;
  if (mode === "year") return { start: date.slice(0, 4) + "-01-01", end: date.slice(0, 4) + "-12-31" };
  if (mode === "fiscal") return {
    start: `${month >= 10 ? year : year - 1}-10-01`,
    end: `${month >= 10 ? year + 1 : year}-09-30`
  };
  if (mode === "quarter") {
    const start = `${year}-${String(Math.floor((month - 1) / 3) * 3 + 1).padStart(2, "0")}-01`;
    return {
      start,
      end: addCalendarDays(addCalendarMonths(start, 3), -1)
    };
  }
  throw Error("ไม่รองรับช่วงวันที่");
}
