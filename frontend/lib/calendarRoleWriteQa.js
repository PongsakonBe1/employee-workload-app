// Development QA controller. Every mutation is restricted to one reviewed deterministic fixture.
import { validateRoleWritePlan, prepareRoleWriteFixture } from "../../scripts/calendar-role-write-plan.mjs";
import { prepareCalendarCreate } from "./calendarCreatePlan.js";
export const APPROVED_ROLE_WRITE_SHA = "cc046d34339f6a02bee2c5af99b5036c24dbfae8624baee2f2db3e2f8354ff55";
const normalizedSha = "092f06fbd07867f8dd5b57f1395c318a8f81489d7b55bae35045223d2767bb35";
const fail = message => { throw Object.assign(new Error(message), { code: "qa-write-stopped" }); };
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export function createCalendarRoleWriteQa(transport, proposal) {
  if (transport.projectId !== "labboy-workload-app-staging") fail("QA target mismatch");
  validateRoleWritePlan(proposal);
  const manifest = structuredClone(proposal);
  const plan = (async () => {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(canonical(manifest))));
    if ([...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, "0")).join("") !== normalizedSha) fail("QA manifest mismatch");
    return prepareRoleWriteFixture(manifest);
  })();
  let staffAttempted = false, createAttempted = false, repeatAttempted = false;
  async function context(role) {
    const prepared = await plan, uid = transport.getUid();
    if (!uid) fail("QA session unavailable");
    const profile = await transport.profile(uid);
    if (transport.getUid() !== uid || profile?.role !== role || profile.active !== true || profile.calendarWriter !== (role === "superadmin")) fail("QA role/session mismatch");
    return { prepared, uid, active: () => { if (transport.getUid() !== uid) fail("QA session changed"); } };
  }
  return {
    async staffDenial() {
      if (staffAttempted) fail("Staff QA attempt already consumed");
      staffAttempted = true;
      const current = await context("staff");
      if (await transport.schedule(current.prepared.entries[0].id)) fail("QA fixture already exists; stop before Staff write");
      current.active();
      try {
        await transport.rawCommit(current.prepared, manifest.expectedBefore.revision, current.uid);
        return { outcome: "unexpected-write", stop: true };
      } catch (error) {
        return { outcome: error.code === "permission-denied" ? "permission-denied" : "ambiguous-or-failed", stop: error.code !== "permission-denied" };
      }
    },
    async create(input, staffDeniedAudited) {
      if (createAttempted || staffDeniedAudited !== true) fail("Staff denial audit confirmation required; no retry permitted");
      const expected = await plan, actual = await prepareCalendarCreate(input, []);
      if (actual.operationId !== expected.operationId || actual.entries.length !== 1 || actual.entries[0].id !== expected.entries[0].id) fail("Only the approved one-day QA fixture is allowed");
      createAttempted = true;
      const current = await context("superadmin");
      const [gate, target, receipt] = await Promise.all([transport.gate(), transport.schedule(expected.entries[0].id), transport.receipt(expected.operationId)]);
      if (gate?.revision !== 9 || target || receipt) fail("QA preflight changed; no create sent");
      current.active();
      return transport.create(validateRoleWritePlan(manifest));
    },
    async repeat() {
      if (repeatAttempted) fail("Repeat QA attempt already consumed");
      repeatAttempted = true;
      const current = await context("superadmin");
      const [gate, target, receipt] = await Promise.all([transport.gate(), transport.schedule(current.prepared.entries[0].id), transport.receipt(current.prepared.operationId)]);
      if (gate?.revision !== 10 || gate.operationId !== current.prepared.operationId || gate.updatedBy !== current.uid || target?.operationId !== current.prepared.operationId || target?.createdBy !== current.uid || target?.schemaVersion !== 1 || !Object.entries(current.prepared.entries[0].value).every(([key, value]) => target[key] === value) || receipt?.createdBy !== current.uid || receipt?.count !== 1 || receipt?.skipped !== 0 || receipt?.schemaVersion !== 1) fail("Approved Superadmin fixture/receipt not present; no repeat sent");
      current.active();
      return transport.repeat(validateRoleWritePlan(manifest));
    }
  };
}
