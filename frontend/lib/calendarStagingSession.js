import { validateCalendarStagingConfig } from "./calendarStagingConfig.js";
const failed = (code, message = code) => Object.assign(new Error(message), { code });
const writerRole = user => user?.active === true && ["admin", "superadmin"].includes(user.role) && user.calendarWriter === true;
const initialState = () => ({ status: "signed-out", user: null, errorCode: null, canCreate: false, canEdit: false, saving: false, writePhase: null, writeRevision: 0, writeOutcome: null });
// Ignore UI-only row IDs when comparing a retry; the writer derives its own document IDs.
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const fingerprint = input => JSON.stringify(canonical(Object.fromEntries(["rules", "events"].map(key => [key, input[key]?.map(row => Object.fromEntries(Object.entries(row).filter(([field]) => field !== "id")))]))));

// One isolated client survives navigation. Writes are explicitly opt-in; logout invalidates late results.
export function createCalendarStagingSession(createClient, { writable = false, mutable = false, validateConfig = validateCalendarStagingConfig } = {}) {
  writable = writable === true;mutable = writable && mutable === true;
  let client = null, generation = 0, state = initialState(), uncertainDraft = null, writeBlocked = false;
  const listeners = new Set();
  const emit = next => {
    state = { ...next, canCreate: writable && next.status === "ready" && writerRole(next.user) && !writeBlocked, canEdit: mutable && next.status === "ready" && writerRole(next.user) && !writeBlocked };
    for (const listener of listeners) listener(state);
  };
  const active = (expected, expectedClient) => {
    if (expected !== generation || client !== expectedClient) throw failed("session-changed");
  };
  async function submit(kind, input) {
    if (!client || state.status !== "ready") throw failed("unauthenticated");
    if (!(kind === "create" ? state.canCreate : state.canEdit)) throw failed("permission-denied");
    if (state.saving) throw failed("calendar-write-validation", "กำลังบันทึกชุดก่อนหน้า กรุณารอผลก่อน");
    const draft = structuredClone(input);
    if (uncertainDraft && (kind !== uncertainDraft.kind || (kind === "create" ? fingerprint(draft) !== fingerprint(uncertainDraft.input) : JSON.stringify(canonical(draft)) !== JSON.stringify(canonical(uncertainDraft.input))))) throw failed("calendar-write-validation", "ยังยืนยันผลชุดก่อนหน้าไม่ได้ กรุณาตรวจผลหรือส่งชุดเดิมอีกครั้งก่อนเพิ่มชุดใหม่");
    const activeClient = client, current = generation;
    if (typeof activeClient[kind] !== "function") throw failed("calendar-write-validation", "เครื่องมือ QA นี้ยังไม่เปิดใช้");
    let submitted = false;
    emit({ ...state, saving: true });
    try {
      const user = await activeClient.identity();
      active(current, activeClient);
      writeBlocked = !writerRole(user);
      emit({ ...state, user });
      if (!writerRole(user)) throw failed("permission-denied");
      if (["create", "mutate"].includes(kind) && activeClient.prepareWrite) {
        emit({ ...state, writePhase: "connecting" });
        await activeClient.prepareWrite();
        active(current, activeClient);
      }
      submitted = true;
      emit({ ...state, writePhase: "sending" });
      const result = await activeClient[kind](draft);
      active(current, activeClient);
      uncertainDraft = null;
      activeClient.reader.refresh();
      emit({ ...state, writeRevision: state.writeRevision + 1, writeOutcome: { status: "committed", ...result, readBack: "pending" } });
      return result;
    } catch (error) {
      const changed = current !== generation || client !== activeClient;
      if (submitted && (changed || !["calendar-write-validation", "calendar-write-stale", "calendar-write-busy", "permission-denied"].includes(error.code))) {
        if (!changed) { uncertainDraft = { kind, input: draft };emit({ ...state, writeOutcome: { status: "uncertain" } }); }
        throw failed("calendar-write-uncertain", "ยังยืนยันผลบันทึกไม่ได้ กรุณาส่งชุดเดิมอีกครั้ง ระบบจะตรวจ receipt ก่อนเพิ่มรายการ");
      }
      if (!changed && error.code === "permission-denied") { writeBlocked = true;emit({ ...state }); }
      if (!submitted && !["permission-denied", "session-changed", "calendar-write-preflight"].includes(error.code)) throw failed("calendar-write-preflight", "ยังไม่ได้ส่งรายการบันทึก ตรวจการเชื่อมต่อและลองใหม่");
      throw error;
    } finally {
      if (current === generation && client === activeClient) emit({ ...state, saving: false, writePhase: null });
    }
  }
  return {
    getState: () => state,
    subscribe(listener) { listeners.add(listener);return () => listeners.delete(listener); },
    async login(config) {
      const current = ++generation, previous = client;client = null;uncertainDraft = null;writeBlocked = false;
      emit({ ...initialState(), status: "connecting" });
      let candidate = null;
      try {
        await previous?.close();
        const approved = validateConfig(config);
        if (current !== generation) throw failed("session-changed");
        candidate = createClient(approved, { writer: writable, roleQa: false, roleWriteQa: false, ...(mutable ? { mutations: true } : {}) });
        if (!candidate || "roleWriteQa" in candidate || !writable && "create" in candidate || !mutable && "mutate" in candidate) throw failed("read-only-client-required");
        if (mutable && typeof candidate.mutate !== "function") throw failed("mutation-client-required");
        if (writable && typeof candidate.create !== "function") throw failed("writer-client-required");
        client = candidate;
        await candidate.login();
        const user = await candidate.identity();
        active(current, candidate);
        if (!user || user.active !== true || !["staff", "admin", "superadmin"].includes(user.role)) throw failed("permission-denied");
        emit({ ...state, status: "ready", user, errorCode: null });
        return user;
      } catch (error) {
        if (current === generation) { client = null;emit({ ...initialState(), status: "error", errorCode: error.code || "sign-in-failed" }); }
        await candidate?.close().catch(() => {});
        throw error;
      }
    },
    async logout() {
      generation++;const previous = client;client = null;uncertainDraft = null;writeBlocked = false;
      emit(initialState());
      await previous?.close().catch(() => {});
    },
    async read(start, end) {
      if (!client || state.status !== "ready") throw failed("unauthenticated");
      const activeClient = client, current = generation, writeRevision = state.writeRevision;
      try {
        const result = await activeClient.reader.read(start, end);
        active(current, activeClient);
        if (writeRevision !== state.writeRevision) throw failed("session-changed");
        writeBlocked = !writerRole(result.identity);
        const writeOutcome = writeRevision > 0 && writeRevision === state.writeRevision && state.writeOutcome?.status === "committed" ? { ...state.writeOutcome, readBack: "verified" } : state.writeOutcome;
        emit({ ...state, user: result.identity, writeOutcome });
        return result;
      } catch (error) {
        if (current === generation && client === activeClient) {
          if (error.code === "permission-denied") {
            generation++;client = null;uncertainDraft = null;emit({ ...initialState(), status: "error", errorCode: "permission-denied" });await activeClient.close().catch(() => {});
          } else if (error.code !== "session-changed" && writeRevision > 0 && writeRevision === state.writeRevision && state.writeOutcome?.status === "committed") emit({ ...state, writeOutcome: { ...state.writeOutcome, readBack: "failed" } });
        }
        throw error;
      }
    },
    create: input => submit("create", input),
    mutate: input => submit("mutate", input),
    replayQa: input => submit("replayQa", input),
    retryCreate() { return uncertainDraft ? submit(uncertainDraft.kind, uncertainDraft.input) : Promise.reject(failed("calendar-write-validation", "ไม่มีชุดที่รอยืนยันผล")); },
    refresh() { client?.reader.refresh(); },
    stats: () => client?.reader.stats() || null
  };
}
