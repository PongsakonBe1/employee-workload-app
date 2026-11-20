import { CALENDAR_SERVER_PROTOCOL, PRODUCTION_CALENDAR_API_ORIGIN, PRODUCTION_CALENDAR_PROJECT, EMULATOR_CALENDAR_API_ORIGIN, EMULATOR_CALENDAR_PROJECT, STAGING_CALENDAR_API_ORIGIN, STAGING_CALENDAR_PROJECT } from "./calendarServerProtocol.js";
const failed = message => Object.assign(new Error(message), { code: "calendar-write-preflight" });
export function calendarServerPeer(origin) {
  if (origin === PRODUCTION_CALENDAR_API_ORIGIN) return { projectId: PRODUCTION_CALENDAR_PROJECT, mode: "production" };
  if (origin === STAGING_CALENDAR_API_ORIGIN) return { projectId: STAGING_CALENDAR_PROJECT, mode: "staging" };
  if (origin === EMULATOR_CALENDAR_API_ORIGIN) return { projectId: EMULATOR_CALENDAR_PROJECT, mode: "emulator" };
  throw failed("API ไม่ตรงกับปลายทางที่ตรวจแล้ว");
}
export function createCalendarServerReadiness({ origin, fetcher = fetch, now = Date.now, pause = ms => new Promise(resolve => setTimeout(resolve, ms)), budgetMs = 90000 }) {
  const peer = calendarServerPeer(origin);
  if (!Number.isFinite(budgetMs) || budgetMs < 1 || budgetMs > 90000) throw failed("ช่วงรอเชื่อมต่อไม่ถูกต้อง");
  return async function prepareWrite() {
    const started = now();
    do {
      let response, value;
      try {
        const healthPath = peer.mode === "production" ? "/api/calendar/health" : "/health";
        response = await fetcher(origin + healthPath, { method: "GET", credentials: "omit", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(Math.max(1, Math.min(10000, budgetMs - (now() - started)))) });
        if (response.ok && response.headers?.get("content-type")?.includes("application/json")) {
          const text = await response.text();
          if (text.length <= 4096) value = JSON.parse(text);
        }
      } catch { /* A warming proxy can return HTML, fail, or time out. No POST has been issued. */ }
      if (value) {
        if (value.projectId !== peer.projectId || value.mode !== peer.mode || value.protocol !== CALENDAR_SERVER_PROTOCOL || value.ok !== true) throw failed("ข้อมูล API ไม่ตรงกับระบบที่เลือก ยังไม่ได้ส่งรายการบันทึก");
        if (value.writesEnabled !== true) throw failed("ระบบยังไม่เปิดรับบันทึก ยังไม่ได้ส่งรายการ");
        return;
      }
      const remaining = budgetMs - (now() - started);
      if (remaining <= 0) break;
      await pause(Math.min(3000, remaining));
    } while (now() - started < budgetMs);
    throw failed("ยังเชื่อมต่อ API ไม่สำเร็จ ยังไม่ได้ส่งรายการบันทึก กรุณาลองใหม่");
  };
}
