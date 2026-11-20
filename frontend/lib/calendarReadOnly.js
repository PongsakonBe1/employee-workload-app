// Session-scoped read orchestration. The transport has no write capability.
import { adaptCalendarDocuments } from "./calendarDataAdapter.js";
import { addCalendarDays, calendarDates, validCalendarDate } from "./calendarView.js";
export const CALENDAR_READ_LIMIT = 200;
export function calendarReadMonths(start, end) {
  calendarDates(start, end);
  const months = [];
  for (let month = start.slice(0, 7); month <= end.slice(0, 7);) {
    const year = Number(month.slice(0, 4)),
      number = Number(month.slice(5));
    const next = number === 12 ? `${year + 1}-01` : `${year}-${String(number + 1).padStart(2, "0")}`;
    months.push({
      key: month,
      start: month + "-01",
      end: addCalendarDays(next + "-01", -1)
    });
    month = next;
  }
  return months;
}
const failure = (code, message) => Object.assign(new Error(message), {
  code
});
export function createCalendarReadOnly(transport, {
  now = Date.now,
  ttl = 120000
} = {}) {
  let uid = null,
    generation = 0,
    base = null;
  const months = new Map(),
    counts = {
      identity: 0,
      directory: 0,
      classrooms: 0,
      months: 0
    };
  function reset(nextUid) {
    generation++;
    uid = nextUid;
    base = null;
    months.clear();
  }
  function assertSession(expected) {
    if (!uid || expected !== generation) throw failure("session-changed", "เซสชันเปลี่ยน กรุณาโหลดข้อมูลใหม่");
  }
  function bounded(records) {
    if (!Array.isArray(records) || records.length > CALENDAR_READ_LIMIT) throw failure("too-many-records", "ข้อมูลเกินขอบเขตทดสอบ ยังไม่แสดงผลบางส่วน");
    return records;
  }
  function entry(cache, load) {
    if (cache && cache.expires > now()) return cache;
    const result = {
      expires: now() + ttl,
      promise: Promise.resolve().then(load)
    };
    return result;
  }
  return {
    setSession(nextUid) {
      if (nextUid !== uid) reset(nextUid);
    },
    clear() {
      reset(null);
    },
    async read(start, end) {
      const windows = calendarReadMonths(start, end),
        current = generation,
        currentUid = uid;
      if (!currentUid) throw failure("unauthenticated", "เข้าสู่ระบบจำลองก่อนอ่านปฏิทิน");
      base = entry(base, async () => {
        counts.identity++;
        const identity = await transport.identity(currentUid);
        assertSession(current);
        if (!identity || identity.id !== currentUid || identity.active !== true || !["staff", "admin", "superadmin"].includes(identity.role)) throw failure("permission-denied", "บัญชีนี้ไม่มีสิทธิ์อ่านปฏิทิน");
        counts.directory++;
        counts.classrooms++;
        const [users, classroomSchedules] = await Promise.all([transport.directory(), transport.classrooms()]);
        assertSession(current);
        return {
          identity,
          users: bounded(users),
          classroomSchedules: bounded(classroomSchedules)
        };
      });
      const pendingBase = base;
      try {
        const common = await pendingBase.promise;
        assertSession(current);
        const entries = windows.map(window => {
          const cached = entry(months.get(window.key), async () => {
            counts.months++;
            const records = bounded(await transport.exams(window.start, window.end));
            assertSession(current);
            if (records.some(record => !validCalendarDate(record.date) || record.date < window.start || record.date > window.end)) throw failure("invalid-range", "ข้อมูลที่อ่านได้อยู่นอกช่วงที่ร้องขอ");
            return records;
          });
          months.set(window.key, cached);
          cached.promise.catch(() => {
            if (months.get(window.key) === cached) months.delete(window.key);
          });
          return cached.promise;
        });
        const batches = await Promise.all(entries);
        assertSession(current);
        const result = adaptCalendarDocuments({
          ...common,
          dlExamSchedules: batches.flat()
        });
        return {
          ...result,
          identity: common.identity,
          range: {
            start,
            end
          },
          loadedAt: now()
        };
      } catch (error) {
        if (base === pendingBase) base = null;
        throw error;
      }
    },
    refresh() {
      reset(uid);
    },
    stats: () => ({
      ...counts,
      cachedMonths: [...months.keys()]
    })
  };
}
