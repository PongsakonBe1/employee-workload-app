import { describe, expect, it } from "vitest";
import { APPROVED_TEST_ID, APPROVED_TEST_UPDATE_TIME, CLEANUP_OPERATION_ID, buildCalendarTestCleanup } from "./calendarTestCleanup.js";
function snapshot(projectId = "labboy-workload-app-staging") {
  const prefix = `projects/${projectId}/databases/(default)/documents`;
  const string = value => ({
    stringValue: value
  });
  return {
    projectId,
    uid: "synthetic-operator",
    schedule: {
      name: `${prefix}/classroomSchedules/${APPROVED_TEST_ID}`,
      updateTime: APPROVED_TEST_UPDATE_TIME,
      fields: {
        subject: string("ทดสอบ staging"),
        room: string("402"),
        dayOfWeek: string("friday"),
        startTime: string("10:00"),
        endTime: string("11:00"),
        validFrom: string("2026-11-20"),
        validTo: string("2026-11-20"),
        createdBy: string("synthetic-operator"),
        operationId: string("op-" + "a".repeat(64)),
        isActive: {
          booleanValue: true
        }
      }
    },
    gate: {
      name: `${prefix}/calendarWriteState/main`,
      updateTime: "2026-11-10T03:46:11.433569Z",
      fields: {
        revision: {
          integerValue: "1"
        },
        operationId: string("op-" + "a".repeat(64)),
        updatedBy: string("synthetic-operator")
      }
    }
  };
}
describe("single approved staging test cleanup", () => {
  it("deactivates only the approved field and guards both document versions atomically", () => {
    const input = snapshot(),
      plan = buildCalendarTestCleanup(input);
    expect(plan.writes).toHaveLength(3);
    expect(plan.writes[0].update.fields).toEqual({
      isActive: {
        booleanValue: false
      }
    });
    expect(plan.writes[0].updateMask.fieldPaths).toEqual(["isActive"]);
    expect(plan.writes[0].currentDocument.updateTime).toBe(APPROVED_TEST_UPDATE_TIME);
    expect(plan.writes[1].currentDocument.updateTime).toBe(input.gate.updateTime);
    expect(plan.writes[2].currentDocument).toEqual({
      exists: false
    });
    expect(plan.writes.every(write => !write.delete)).toBe(true);
  });
  it.each(["labboy-workload-app", "arbitrary-project", "demo-calendar-writer"])("rejects unapproved project %s", project => {
    expect(() => buildCalendarTestCleanup(snapshot(project))).toThrow("unapproved-project");
  });
  it("rejects changes to identity, room, date, title and activity", () => {
    for (const [key, value] of Object.entries({
      room: "401",
      subject: "Real schedule",
      validTo: "2027-03-14",
      createdBy: "other-operator"
    })) {
      const input = snapshot();
      input.schedule.fields[key] = {
        stringValue: value
      };
      expect(() => buildCalendarTestCleanup(input)).toThrow("approved-test-fields-changed");
    }
    const inactive = snapshot();
    inactive.schedule.fields.isActive.booleanValue = false;
    expect(() => buildCalendarTestCleanup(inactive)).toThrow("approved-test-version-changed");
  });
  it("rejects a stale or absent schedule version", () => {
    for (const value of [undefined, "2026-11-10T04:00:00Z"]) {
      const input = snapshot();
      input.schedule.updateTime = value;
      expect(() => buildCalendarTestCleanup(input)).toThrow("approved-test-version-changed");
    }
  });
  it("does not allow overriding the approved staging timestamp", () => {
    expect(() => buildCalendarTestCleanup({
      ...snapshot(),
      expectedUpdateTime: "2026-11-10T04:00:00Z"
    })).toThrow("unapproved-version-override");
  });
  it("rejects newer revisions and mismatched original operations", () => {
    const input = snapshot();
    input.gate.fields.revision.integerValue = "2";
    expect(() => buildCalendarTestCleanup(input)).toThrow("revision-or-operator-changed");
    input.gate.fields.revision.integerValue = "1";
    input.gate.fields.operationId.stringValue = "op-" + "b".repeat(64);
    expect(() => buildCalendarTestCleanup(input)).toThrow("revision-or-operator-changed");
  });
  it("refuses a different document path", () => {
    const input = snapshot();
    input.schedule.name += "-different";
    expect(() => buildCalendarTestCleanup(input)).toThrow("unexpected-document");
  });
  it("is idempotent only when matching audit evidence and inactive state are present", () => {
    const input = snapshot(),
      plan = buildCalendarTestCleanup(input);
    input.audit = plan.writes[2].update;
    input.schedule.fields.isActive.booleanValue = false;
    input.gate.fields.revision.integerValue = "3";
    expect(buildCalendarTestCleanup(input)).toMatchObject({
      alreadyApplied: true,
      writes: [],
      revision: 3
    });
    input.audit.fields.actor.stringValue = "other";
    expect(() => buildCalendarTestCleanup(input)).toThrow("audit-mismatch");
    expect(CLEANUP_OPERATION_ID).toMatch(/^op-[0-9a-f]{64}$/);
  });
  it("does not deactivate again if someone later restored the test", () => {
    const input = snapshot();
    input.audit = buildCalendarTestCleanup(input).writes[2].update;
    expect(() => buildCalendarTestCleanup(input)).toThrow("post-cleanup-state-changed");
  });
  it("rejects tampered activity values in the maintenance audit", () => {
    const input = snapshot();
    input.audit = buildCalendarTestCleanup(input).writes[2].update;
    input.schedule.fields.isActive.booleanValue = false;
    input.gate.fields.revision.integerValue = "2";
    input.audit.fields.previousActive.booleanValue = false;
    expect(() => buildCalendarTestCleanup(input)).toThrow("audit-mismatch");
  });
});
