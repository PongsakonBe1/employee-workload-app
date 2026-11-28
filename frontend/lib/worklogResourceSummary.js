import { timeMinutes } from "./calendarView.js";
import { EQUIPMENT_LABELS, visibleEquipment } from "./equipmentCatalog.js";
import { RESOURCE_ROOM_IDS } from "./resourceStatusIndex.js";
import { equipmentDisplayState } from "./resourcePresentation.js";

const bangkokDateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});
const noticeMinutes = 15;

export function bangkokRoomClock(now) {
  const parts = Object.fromEntries(bangkokDateTime.formatToParts(now).map(({ type, value }) => [type, value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) };
}

function mergedPeriods(items, room) {
  const periods = items.filter(item => ["classroom", "dl"].includes(item.kind) && item.rooms.includes(room))
    .map(item => ({ start: timeMinutes(item.start), end: timeMinutes(item.end), endTime: item.end }))
    .filter(period => period.end > period.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const merged = [];
  for (const period of periods) {
    const last = merged.at(-1);
    if (!last || period.start > last.end) merged.push(period);
    else if (period.end > last.end) Object.assign(last, { end: period.end, endTime: period.endTime });
  }
  return merged;
}

export function roomClosureNotices(roomStatus, schedule, clock) {
  if (!clock || schedule.status !== "ready" || schedule.date !== clock.date || schedule.unavailable) return [];
  const notices = [];
  for (const room of RESOURCE_ROOM_IDS) {
    if (!room.startsWith("4") || roomStatus[room] !== "in_use") continue;
    const period = mergedPeriods(schedule.items, room).findLast(item => item.start <= clock.minute);
    if (!period) continue;
    const minutes = period.end - clock.minute;
    if (minutes <= noticeMinutes) notices.push({ room, minutes, endTime: period.endTime });
  }
  return notices.sort((a, b) => a.minutes - b.minutes || a.room.localeCompare(b.room));
}

export function worklogEquipmentSummary(catalog, statuses, conditions) {
  const counts = Object.fromEntries(Object.keys(EQUIPMENT_LABELS).map(kind => [kind, { ready: 0, inUse: 0, issue: 0 }]));
  const loans = [], unconfirmed = [], conditionIssues = [];
  const items = visibleEquipment(catalog, statuses);
  for (const item of items) {
    const { id, kind } = item;
    const status = statuses[kind]?.[id];
    const condition = conditions[id];
    const state = equipmentDisplayState(status, condition);
    counts[kind][state]++;
    if (state === "inUse") loans.push(item);
    else if (status !== "available") unconfirmed.push(item);
    else if (state === "issue") conditionIssues.push({ ...item, condition });
  }
  return { counts, loans, unconfirmed, conditionIssues, total: items.length };
}
