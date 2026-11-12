const failure = (code, message) => Object.assign(new Error(message), { code });
export function createTrustedCalendarTransport({ getUser, fetcher = fetch }) {
  let pending = false;
  async function send(kind, input) {
    if (pending) throw failure("calendar-write-validation", "กำลังบันทึกชุดก่อนหน้า");
    const user = getUser(), uid = user?.uid;
    if (!uid) throw failure("permission-denied", "เข้าสู่ระบบก่อนบันทึก");
    pending = true;
    try {
      const body = JSON.stringify(structuredClone(input)), token = await user.getIdToken();
      if (getUser()?.uid !== uid) throw failure("session-changed", "session เปลี่ยนก่อนส่งคำขอ");
      const response = await fetcher(`http://127.0.0.1:4321/api/calendar/${kind}`, { method: "POST", credentials: "omit", redirect: "error", cache: "no-store", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body, signal: AbortSignal.timeout(20000) });
      if (getUser()?.uid !== uid) throw failure("session-changed", "session เปลี่ยนหลังส่งคำขอ ให้ตรวจผลก่อนส่งใหม่");
      const result = await response.json();
      if (!response.ok) {
        if ([401, 403].includes(response.status)) throw failure("permission-denied", "ไม่มีสิทธิ์บันทึกหรือ session หมดอายุ");
        if ([400, 409, 413].includes(response.status) && ["calendar-write-validation", "calendar-write-stale"].includes(result.code)) throw failure(result.code, result.message);
        throw failure("unavailable", "ยังยืนยันผลไม่ได้ ให้ส่งชุดเดิมเพื่อตรวจ receipt");
      }
      const validNumber = n => Number.isSafeInteger(n) && n >= 0 && n <= 100;
      if (!/^op-[0-9a-f]{64}$/.test(result.operationId || "") || typeof result.repeated !== "boolean" ||
          (kind === "create" ? !validNumber(result.created) || !validNumber(result.skipped) : !["edit", "cancel"].includes(result.action) || result.action !== input.action || ![0, 1].includes(result.changed))) throw failure("unavailable", "ผลตอบกลับไม่ครบ ให้ตรวจ receipt ชุดเดิม");
      return result;
    } finally { pending = false; }
  }
  return { create: input => send("create", input), mutate: input => send("mutate", input) };
}
