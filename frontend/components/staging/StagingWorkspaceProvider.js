"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createCalendarStagingClient } from "../../lib/calendarStagingClient";
import { createCalendarStagingSession } from "../../lib/calendarStagingSession";
import { validateCalendarStagingConfig } from "../../lib/calendarStagingConfig";
import { calendarStagingEntryPath, calendarStagingWriteEnabled, calendarStagingMutationEnabled, resolveStagingHref } from "../../lib/calendarStagingEntry";
import { calendarStagingAuthError } from "../../lib/calendarStagingAuthError";
import { GlassButton } from "../ui/GlassControls";
import { STAGING_PROJECT, STAGING_APP } from "../../lib/calendarStagingConfig";
import { TRUSTED_EMULATOR_CONFIG, validateTrustedCalendarConfig } from "../../lib/calendarTrustedConfig";
const emulatorMode = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_CALENDAR_MUTATION_EMULATOR === "1";
const trustedServer = emulatorMode && process.env.NEXT_PUBLIC_CALENDAR_TRUSTED_SERVER === "1";
const Context = createContext(null);
export function StagingWorkspaceProvider({ children }) {
  const writeEnabled = calendarStagingWriteEnabled(process.env.NODE_ENV, process.env.NEXT_PUBLIC_CALENDAR_STAGING_ENTRY, process.env.NEXT_PUBLIC_CALENDAR_STAGING_WRITE);
  const mutationEnabled = calendarStagingMutationEnabled(process.env.NODE_ENV, process.env.NEXT_PUBLIC_CALENDAR_STAGING_ENTRY, process.env.NEXT_PUBLIC_CALENDAR_STAGING_WRITE, process.env.NEXT_PUBLIC_CALENDAR_STAGING_MUTATIONS);
  const [emulatorAccount, setEmulatorAccount] = useState("admin");
  const accountRef = useRef(emulatorAccount);accountRef.current = emulatorAccount;
  const sessionRef = useRef(null);
  if (!sessionRef.current) sessionRef.current = createCalendarStagingSession((config, options) => createCalendarStagingClient(config, { ...options, ...(emulatorMode ? { emulatorAccount: accountRef.current } : {}), ...(trustedServer ? { trustedServer: true } : {}) }), { writable: writeEnabled, mutable: mutationEnabled, ...(trustedServer ? { validateConfig: validateTrustedCalendarConfig } : {}) });
  const session = sessionRef.current;
  const [state, setState] = useState(session.getState()), [config, setConfig] = useState(null), [configError, setConfigError] = useState(false), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const unsubscribe = session.subscribe(setState);setState(session.getState());
    return () => { unsubscribe();session.logout().catch(() => {}); };
  }, [session]);
  useEffect(() => {
    if (emulatorMode) { setConfig(trustedServer ? TRUSTED_EMULATOR_CONFIG : { projectId: STAGING_PROJECT, appId: STAGING_APP, authDomain: `${STAGING_PROJECT}.firebaseapp.com`, apiKey: "demo-mutation-emulator-placeholder" });return; }
    let active = true;const controller = new AbortController();setConfig(null);setConfigError(false);
    fetch("/dev-staging-config.json", { cache: "no-store", signal: controller.signal }).then(response => { if (!response.ok) throw new Error("Staging config unavailable");return response.json(); }).then(value => { const approved = validateCalendarStagingConfig(value);if (active) setConfig(approved); }).catch(() => { if (active) setConfigError(true); });
    return () => { active = false;controller.abort(); };
  }, [attempt]);
  const login = useCallback(() => config ? session.login(config) : Promise.reject(new Error("Staging configuration required")), [session, config]);
  const logout = useCallback(() => session.logout(), [session]);
  const create = useCallback(input => session.create(input), [session]);
  const mutate = useCallback(input => session.mutate(input), [session]);
  const replayQa = useCallback(input => session.replayQa(input), [session]);
  const retryCreate = useCallback(() => session.retryCreate(), [session]);
  const read = useCallback((start, end) => session.read(start, end), [session]);
  const refresh = useCallback(() => session.refresh(), [session]);
  const stats = useCallback(() => session.stats(), [session]);
  const retryConfig = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    if (!state.saving && state.writeOutcome?.status !== "uncertain") return;
    const warn = event => { event.preventDefault();event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);return () => window.removeEventListener("beforeunload", warn);
  }, [state.saving, state.writeOutcome]);
  const value = useMemo(() => ({ ...state, writeEnabled, mutationEnabled, emulatorMode, emulatorAccount, setEmulatorAccount, mutate: state.canEdit ? mutate : undefined, replayQa: state.canEdit ? replayQa : undefined, configReady: Boolean(config), configError, login, logout, read, refresh, stats, retryConfig, create: state.canCreate ? create : undefined, retryCreate: state.canCreate ? retryCreate : undefined }), [state, writeEnabled, mutationEnabled, emulatorAccount, mutate, replayQa, config, configError, login, logout, read, refresh, stats, retryConfig, create, retryCreate]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useStagingWorkspace() {
  const context = useContext(Context);if (!context) throw new Error("Staging workspace provider required");return context;
}
export function StagingSessionGate({ children }) {
  const { user, status, errorCode, configReady, configError, login, retryConfig, writeEnabled, emulatorMode, emulatorAccount, setEmulatorAccount } = useStagingWorkspace();
  if (user && status === "ready") return children;
  return <main className="ui-loading" data-staging-entry><section className="apple-panel p-6" style={{ maxWidth: 520, width: "100%" }}><p className="ui-caption">{writeEnabled ? "Staging · เพิ่มใหม่เฉพาะผู้ทดสอบที่มีสิทธิ์" : "Staging · อ่านอย่างเดียว"}</p><h1>{emulatorMode ? "ปฏิทิน Emulator · ข้อมูลสังเคราะห์" : "พื้นที่ทดลองปฏิทิน"}</h1>{emulatorMode && <label className="ui-field">บทบาททดสอบ<select className="apple-input" value={emulatorAccount} onChange={event => setEmulatorAccount(event.target.value)}><option value="admin">Admin จำลอง</option><option value="staff">Staff จำลอง</option><option value="superadmin">Superadmin จำลอง</option></select></label>}<p>เข้าสู่ระบบด้วยบัญชีผู้ทดสอบ เพื่อดูตารางเรียนและตารางสอบ</p>{configError ? <><p role="alert">ยังเชื่อมต่อพื้นที่ staging ไม่ได้</p><GlassButton onClick={retryConfig}>ตรวจการเชื่อมต่ออีกครั้ง</GlassButton></> : <GlassButton variant="prominent" disabled={!configReady || status === "connecting"} onClick={() => login().catch(() => {})}>{emulatorMode ? "เข้าสู่ Emulator" : "เข้าสู่ staging ด้วย Google"}</GlassButton>}<p role="status">{status === "connecting" ? "กำลังเข้าสู่ staging…" : configReady ? "ยังไม่เข้าสู่ระบบ staging" : "กำลังเตรียมพื้นที่ staging…"}</p>{errorCode && <p role="alert">{errorCode === "permission-denied" ? "บัญชีนี้ยังไม่มีสิทธิ์อ่านพื้นที่ staging" : calendarStagingAuthError({ code: errorCode })}</p>}</section></main>;
}
export function StagingRouteGuard({ children }) {
  const pathname = usePathname(), router = useRouter();
  const allowed = calendarStagingEntryPath(pathname) || pathname === "/dev/calendar-staging" || process.env.NODE_ENV === "development" && pathname === "/dev/calendar-mutation-replay";
  useEffect(() => { if (!allowed) router.replace(resolveStagingHref(pathname)); }, [allowed, pathname, router]);
  return allowed ? children : <main className="ui-loading" role="status">กำลังเปิดพื้นที่ staging…</main>;
}
