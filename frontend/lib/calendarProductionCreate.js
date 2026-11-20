import { isAdminRole } from "./authUtils.js";
import { PRODUCTION_CALENDAR_API_ORIGIN, PRODUCTION_CALENDAR_PROJECT } from "./calendarServerProtocol.js";

export function canUseProductionCalendarCreate({ flag, projectId, apiOrigin, user }) {
  return productionCalendarWriterEnabled(flag, projectId) &&
    apiOrigin === PRODUCTION_CALENDAR_API_ORIGIN && user?.active === true && isAdminRole(user);
}

export const productionCalendarWriterEnabled = (flag, projectId) => flag === "1" && projectId === PRODUCTION_CALENDAR_PROJECT;

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}

function fingerprint(kind, input) {
  if (kind === "mutate") return JSON.stringify(canonical(input));
  const rows = key => input[key].map(({ id: _id, ...row }) => canonical(row));
  return JSON.stringify({ rules: rows("rules"), events: rows("events") });
}

const failure = (code, message) => Object.assign(new Error(message), { code });
const settled = new Set(["permission-denied", "calendar-write-validation", "calendar-write-stale", "calendar-write-busy", "calendar-write-preflight"]);

export function createProductionCalendarSubmission({ transport, isCurrent, onState }) {
  let draft = null, draftKind = null, saving = false;

  async function send(kind, input) {
    if (saving) throw failure("calendar-write-validation", "กำลังบันทึกรายการก่อนหน้า");
    if (!isCurrent()) throw failure("permission-denied", "กรุณาเข้าสู่ระบบใหม่ก่อนบันทึก");
    const payload = structuredClone(input);
    if (draft && (draftKind !== kind || fingerprint(kind, draft) !== fingerprint(kind, payload))) {
      throw failure("calendar-write-validation", "ส่งชุดเดิมเพื่อตรวจผลให้เสร็จก่อนบันทึกชุดใหม่");
    }

    saving = true;
    let submitted = false;
    onState({ saving, phase: "connecting", draft });
    try {
      await transport.prepareWrite();
      if (!isCurrent()) throw failure("permission-denied", "บัญชีเปลี่ยนก่อนส่งรายการ");
      onState({ saving, phase: "sending", draft });
      submitted = true;
      const result = await transport[kind](payload);
      if (!isCurrent()) throw failure("session-changed", "บัญชีเปลี่ยนหลังส่งรายการ");
      draft = null;
      return result;
    } catch (error) {
      if (settled.has(error.code)) {
        if (error.code === "calendar-write-stale") draft = null;
        throw error;
      }
      if (!submitted) throw failure("calendar-write-preflight", "ยังไม่ได้ส่งรายการ ตรวจการเชื่อมต่อแล้วลองใหม่");
      if (isCurrent()) {
        draft = payload;
        draftKind = kind;
      }
      throw failure("calendar-write-uncertain", "ยังยืนยันผลไม่ได้ กรุณาส่งชุดเดิมอีกครั้งเพื่อตรวจว่าบันทึกแล้วหรือยัง");
    } finally {
      saving = false;
      onState({ saving, phase: null, draft });
    }
  }

  return { create: input => send("create", input), mutate: input => send("mutate", input), retry: () => draft && send(draftKind, draft) };
}
