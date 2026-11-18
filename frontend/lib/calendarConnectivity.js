import { calendarServerPeer } from "./calendarServerReadiness.js";
import { CALENDAR_SERVER_PROTOCOL } from "./calendarServerProtocol.js";
const fail = code => Object.assign(new Error(code), { code });
export function calendarConnectivityEnabled(mode, entry, flag, write) {
  return mode === "development" && entry === "1" && flag === "1" && write === "0";
}
// Explicit, one-shot read probe. No token is sent until the write-disabled peer matches.
export function createCalendarConnectivityTransport({ getUser, origin, fetcher = fetch }) {
  const peer = calendarServerPeer(origin);
  let pending = false;
  return async () => {
    if (pending) throw fail("calendar-connectivity-busy");
    const user = getUser();
    if (!user?.uid) throw fail("permission-denied");
    const active = () => { if (getUser() !== user) throw fail("session-changed"); };
    async function read(response) {
      if (!response.headers?.get("content-type")?.includes("application/json")) throw fail("unavailable");
      const text = await response.text();active();
      if (text.length > 4096) throw fail("unavailable");
      return JSON.parse(text);
    }
    const validPeer = value => value?.ok === true && value.projectId === peer.projectId && value.mode === peer.mode && value.protocol === CALENDAR_SERVER_PROTOCOL && value.writesEnabled === false;
    const options = () => ({ credentials: "omit", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(20000) });
    pending = true;
    try {
      const health = await fetcher(origin + "/health", { ...options(), method: "GET" });active();
      if (!health.ok) throw fail("unavailable");
      const status = await read(health);
      if (!validPeer(status) || status.connectivityEnabled !== true) throw fail("calendar-connectivity-disabled");
      const token = await user.getIdToken();active();
      const response = await fetcher(origin + "/api/calendar/connectivity", { ...options(), method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: "{}" });active();
      if (!response.ok) throw fail([401, 403].includes(response.status) ? "permission-denied" : response.status === 429 ? "calendar-connectivity-busy" : "unavailable");
      const value = await read(response);
      if (!validPeer(value) || !["auth", "profile", "gate", "classrooms", "exams"].every(key => value.checks?.[key] === true)) throw fail("unavailable");
      return { verified: true };
    } finally { pending = false; }
  };
}
