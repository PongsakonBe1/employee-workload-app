import { validateCalendarStagingConfig } from "./calendarStagingConfig.js";
const failed = code => Object.assign(new Error(code), { code });
// One read-only named client survives navigation; logout invalidates all in-flight results.
export function createCalendarStagingSession(createClient) {
  let client = null, generation = 0, state = { status: "signed-out", user: null, errorCode: null };
  const listeners = new Set();
  const emit = next => { state = next;for (const listener of listeners) listener(state); };
  return {
    getState: () => state,
    subscribe(listener) { listeners.add(listener);return () => listeners.delete(listener); },
    async login(config) {
      const current = ++generation, previous = client;client = null;
      emit({ status: "connecting", user: null, errorCode: null });
      let candidate = null;
      try {
        await previous?.close();
        const approved = validateCalendarStagingConfig(config);
        if (current !== generation) throw failed("session-changed");
        candidate = createClient(approved, { writer: false, roleQa: false, roleWriteQa: false });
        if (!candidate || "create" in candidate || "roleWriteQa" in candidate) throw failed("read-only-client-required");
        client = candidate;
        await candidate.login();
        const user = await candidate.identity();
        if (current !== generation || client !== candidate) throw failed("session-changed");
        if (!user || user.active !== true || !["staff", "admin", "superadmin"].includes(user.role)) throw failed("permission-denied");
        emit({ status: "ready", user, errorCode: null });
        return user;
      } catch (error) {
        if (current === generation) { client = null;emit({ status: "error", user: null, errorCode: error.code || "sign-in-failed" }); }
        await candidate?.close().catch(() => {});
        throw error;
      }
    },
    async logout() {
      generation++;const previous = client;client = null;
      emit({ status: "signed-out", user: null, errorCode: null });
      await previous?.close().catch(() => {});
    },
    async read(start, end) {
      if (!client || state.status !== "ready") throw failed("unauthenticated");
      const activeClient = client, current = generation;
      try {
        const result = await activeClient.reader.read(start, end);
        if (current !== generation || client !== activeClient) throw failed("session-changed");
        if (["role", "displayName", "active", "calendarWriter"].some(key => result.identity[key] !== state.user[key])) emit({ status: "ready", user: result.identity, errorCode: null });
        return result;
      } catch (error) {
        if (error.code === "permission-denied" && current === generation) {
          generation++;client = null;emit({ status: "error", user: null, errorCode: "permission-denied" });await activeClient.close().catch(() => {});
        }
        throw error;
      }
    },
    refresh() { client?.reader.refresh(); },
    stats: () => client?.reader.stats() || null
  };
}
