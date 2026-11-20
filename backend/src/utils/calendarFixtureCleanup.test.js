import { describe, it, expect } from "vitest";
import { FIXTURE_TARGETS, FIXTURE_MAINTENANCE_ID, encodeCleanupValue, buildCalendarFixtureCleanup } from "./calendarFixtureCleanup.js";
import { CLEANUP_OPERATION_ID } from "./calendarTestCleanup.js";
function snapshot(projectId = "labboy-workload-app-staging") {
  const prefix = `projects/${projectId}/databases/(default)/documents`,
    uid = "synthetic-operator";
  return {
    projectId,
    uid,
    records: FIXTURE_TARGETS.map(row => ({
      name: `${prefix}/${row.collection}/${row.id}`,
      fields: encodeCleanupValue(row.data).mapValue.fields,
      updateTime: "2026-11-10T03:00:00.123456Z"
    })),
    gate: {
      name: prefix + "/calendarWriteState/main",
      fields: encodeCleanupValue({
        revision: 2,
        operationId: CLEANUP_OPERATION_ID,
        updatedBy: uid
      }).mapValue.fields,
      updateTime: "2026-11-10T04:00:00.123456Z"
    }
  };
}
describe("approved initial fixture cleanup", () => {
  it("updates exactly the five approved active flags with preconditions, gate and a create-only audit", () => {
    const input = snapshot(),
      plan = buildCalendarFixtureCleanup(input);
    expect(plan.writes).toHaveLength(7);
    for (const write of plan.writes.slice(0, 5)) {
      expect(write.update.fields).toEqual({
        isActive: {
          booleanValue: false
        }
      });
      expect(write.updateMask.fieldPaths).toEqual(["isActive"]);
      expect(write.currentDocument.updateTime).toBeTruthy();
    }
    expect(plan.writes[5].currentDocument.updateTime).toBe(input.gate.updateTime);
    expect(plan.writes[6].currentDocument).toEqual({
      exists: false
    });
    expect(plan.writes.every(write => !write.delete && !write.update.name.includes("/users/") && !write.update.name.includes("dl-inactive"))).toBe(true);
  });
  it.each(["labboy-workload-app", "demo-calendar-writer"])("refuses target %s", project => expect(() => buildCalendarFixtureCleanup(snapshot(project))).toThrow("unapproved-project"));
  it("refuses changed course, date, participants, proctors or an extra field", () => {
    for (const [index, key, value] of [[0, "subject", "Imported real class"], [1, "date", "2026-11-20"], [2, "studentCount", 90], [3, "proctors", ["other"]], [4, "extra", "unexpected"]]) {
      const input = snapshot();
      input.records[index].fields[key] = encodeCleanupValue(value);
      expect(() => buildCalendarFixtureCleanup(input)).toThrow("fixture-content-changed");
    }
  });
  it("refuses missing, duplicate or unrelated documents", () => {
    const missing = snapshot();
    missing.records.pop();
    expect(() => buildCalendarFixtureCleanup(missing)).toThrow("unexpected-fixture-targets");
    const duplicate = snapshot();
    duplicate.records[4] = duplicate.records[0];
    expect(() => buildCalendarFixtureCleanup(duplicate)).toThrow("unexpected-fixture-targets");
    const unrelated = snapshot();
    unrelated.records[0].name += "-other";
    expect(() => buildCalendarFixtureCleanup(unrelated)).toThrow("unexpected-fixture-targets");
  });
  it("requires revision 2, the prior approved cleanup operation and the same operator", () => {
    for (const patch of [{
      revision: 3
    }, {
      operationId: "op-" + "b".repeat(64)
    }, {
      updatedBy: "other"
    }]) {
      const input = snapshot();
      Object.assign(input.gate.fields, encodeCleanupValue(patch).mapValue.fields);
      expect(() => buildCalendarFixtureCleanup(input)).toThrow("revision-or-operator-changed");
    }
  });
  it("refuses already inactive fixtures without a matching audit", () => {
    const input = snapshot();
    input.records[1].fields.isActive.booleanValue = false;
    expect(() => buildCalendarFixtureCleanup(input)).toThrow("fixture-status-or-version-changed");
  });
  it("requires every source updateTime", () => {
    const input = snapshot();
    delete input.records[2].updateTime;
    expect(() => buildCalendarFixtureCleanup(input)).toThrow("fixture-status-or-version-changed");
  });
  it("is idempotent after matching audit and supports later unrelated revisions", () => {
    const input = snapshot();
    input.audit = buildCalendarFixtureCleanup(input).writes[6].update;
    input.audit.fields.createdAt = {
      timestampValue: "2026-11-10T05:00:00.123456Z"
    };
    for (const row of input.records) row.fields.isActive.booleanValue = false;
    input.gate.fields.revision.integerValue = "4";
    expect(buildCalendarFixtureCleanup(input)).toEqual({
      alreadyApplied: true,
      revision: 4,
      writes: []
    });
    expect(input.audit.name.endsWith(FIXTURE_MAINTENANCE_ID)).toBe(true);
    input.audit.fields.count.integerValue = "4";
    expect(() => buildCalendarFixtureCleanup(input)).toThrow("audit-mismatch");
  });
  it("does not automatically deactivate a fixture restored after cleanup", () => {
    const input = snapshot();
    input.audit = buildCalendarFixtureCleanup(input).writes[6].update;
    for (const row of input.records) row.fields.isActive.booleanValue = false;
    input.records[0].fields.isActive.booleanValue = true;
    input.gate.fields.revision.integerValue = "3";
    expect(() => buildCalendarFixtureCleanup(input)).toThrow("post-cleanup-state-changed");
  });
});
