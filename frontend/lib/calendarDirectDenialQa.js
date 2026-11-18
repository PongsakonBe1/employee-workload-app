// Developer QA only. The SDK adapter supplies durable reservations; never a production authorization boundary.
export const TRUSTED_CUTOVER_FROZEN_HASH = "6c6b85f57289cdc2be618d690014fa073ee0fc5eb87e219be7473f6b01758f31";
export const TRUSTED_CUTOVER_SNAPSHOT_HASH = "fbc37be6e2148afb9caba350a193de7a6dc7e671a151c21791a0f9ecdcdeb6d7";
export const TRUSTED_CUTOVER_RULES_HASH = "4762054e74b3723bc4345f351b01bb43ee450ae8c7e6a399c4fd6473b717a1c7";
export const TRUSTED_CUTOVER_MANUAL_ID = "cal-243f284d20db1177c4803856e245007ba43c5d03106455808da63dc5ec12262c";
export const TRUSTED_CUTOVER_MANUAL_OPERATION = "op-0e1541aeccab4d6912d36016d3984a20bdbfb964768173999845fc93311bc74b";
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export async function cutoverValueHash(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(canonical(value))));
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, "0")).join("");
}
const fail = code => Object.assign(new Error(code), { code });
export async function validateCalendarDirectDenialPacket(frozen, proof, { expectedFrozenHash = TRUSTED_CUTOVER_FROZEN_HASH, expectedSnapshotHash = TRUSTED_CUTOVER_SNAPSHOT_HASH } = {}) {
  if (await cutoverValueHash(frozen) !== expectedFrozenHash || frozen.target !== "labboy-workload-app-staging" || frozen.database !== "(default)" || frozen.cloudExecutionApproved !== false || frozen.operations?.length !== 5 || frozen.operations[0]?.id !== "manual" || frozen.operations[0]?.kind !== "create" || frozen.operations[0]?.entries?.length !== 1) throw fail("cutover-frozen-mismatch");
  if (proof.target !== frozen.target || proof.frozenHash !== expectedFrozenHash || proof.snapshotHash !== expectedSnapshotHash || proof.candidateRulesHash !== TRUSTED_CUTOVER_RULES_HASH || proof.sourceCommit !== "2aa1bd27f1795890871297d1ffdf0d1d6acdd2e5" || proof.completed !== 0 || proof.gateRevision !== 17 || !/^[0-9a-f]{64}$/.test(proof.auditHash || "") || typeof proof.auditedAt !== "string" || typeof proof.readerChecksApproved !== "boolean" || typeof proof.directWriteProbeApproved !== "boolean") throw fail("cutover-proof-mismatch");
}
export function calendarDirectDenialProofFresh(proof, now = Date.now()) {
  const age = now - Date.parse(proof?.auditedAt);
  return Number.isFinite(age) && age >= -5000 && age <= 120000;
}
// Rebind a reviewed packet to an existing Auth session without login, RPCs or reservations.
// Freshness, profile and durable attempt checks remain mandatory inside each action.
export async function resumeCalendarDirectDenialSession(client, packet) {
  const reviewed = structuredClone(packet);
  await validateCalendarDirectDenialPacket(reviewed.frozen, reviewed.proof, reviewed);
  if (!client || !(reviewed.proof.readerChecksApproved || reviewed.proof.directWriteProbeApproved)) return null;
  const alias = client.alias(reviewed.frozen);
  if (!["staff", "superadmin"].includes(alias)) return null;
  return { alias, controller: client.controller(reviewed) };
}
export function createCalendarDirectDenialQa(transport, { frozen: input, proof: inputProof, expectedFrozenHash = TRUSTED_CUTOVER_FROZEN_HASH, expectedSnapshotHash = TRUSTED_CUTOVER_SNAPSHOT_HASH, now = Date.now }) {
  if (transport.projectId !== "labboy-workload-app-staging" || transport.origin !== "http://127.0.0.1:4311") throw fail("cutover-target-mismatch");
  const frozen = structuredClone(input), proof = structuredClone(inputProof), attempted = new Set();let busy = false;
  const ready = validateCalendarDirectDenialPacket(frozen, proof, { expectedFrozenHash, expectedSnapshotHash });
  // Keep rejected preparation promises observable only through the action, avoiding an unhandled rejection.
  ready.catch(() => {});
  const freshness = () => {
    if (!calendarDirectDenialProofFresh(proof, now())) throw fail("cutover-proof-expired");
  };
  async function action(kind) {
    await ready;freshness();
    if (busy) throw fail("cutover-busy");
    if (kind === "denial" ? proof.directWriteProbeApproved !== true : proof.readerChecksApproved !== true) throw fail("cutover-action-not-approved");
    const user = transport.getUser(), alias = Object.entries(frozen.identities || {}).find(([, uid]) => uid === user?.uid)?.[0];
    if (!user || !["staff", "superadmin"].includes(alias) || kind === "denial" && alias !== "superadmin") throw fail("cutover-actor-mismatch");
    const key = kind === "denial" ? "direct-denial" : "reader-" + alias;
    if (attempted.has(key)) throw fail("cutover-attempt-consumed");
    attempted.add(key);busy = true;
    const active = () => { if (transport.getUser() !== user) throw fail("session-changed");freshness(); };
    try {
      await transport.reserve(key);active();
      const profile = await transport.profile(user.uid);active();
      if (profile?.role !== alias || profile.active !== true || profile.calendarWriter !== (alias === "superadmin")) throw fail("cutover-profile-drift");
      if (kind === "reader") { const result = await transport.reader(user.uid);active();if (result?.complete !== true) throw fail("cutover-reader-incomplete");return { outcome: "reader-verified", alias, writes: 0 }; }
      const health = await transport.health();active();
      if (health?.ok !== true || health.projectId !== transport.projectId || health.mode !== "staging" || health.protocol !== 1 || health.writesEnabled !== false || health.connectivityEnabled !== false || health.emulator !== false) throw fail("cutover-peer-mismatch");
      const manual = frozen.operations[0];
      if (await transport.schedule(manual.entries[0].id)) throw fail("cutover-target-exists");active();
      for (const [collection, id] of [["calendarWriteState", "main"], ["calendarWriteOperations", manual.operationId]]) {
        let denied = false;
        try { await transport.restrictedRead(collection, id); }
        catch (error) { if (error.code === "permission-denied") denied = true;else throw error; }
        active();if (!denied) throw fail("cutover-restricted-read-allowed");
      }
      active();
      try {
        await transport.rawCommit(manual, user.uid);
        // Success is a defect even when it happens to match the planned manual record.
        return { outcome: "unexpected-write", stop: true, auditRequired: true };
      } catch (error) {
        if (error.code === "permission-denied") {
          try { active(); } catch { return { outcome: "permission-denied", stop: true, auditRequired: true }; }
          return { outcome: "permission-denied", stop: false, auditRequired: true };
        }
        return { outcome: "uncertain", stop: true, auditRequired: true };
      }
    } finally { busy = false; }
  }
  return { verifyReader: () => action("reader"), probeDenial: () => action("denial") };
}
