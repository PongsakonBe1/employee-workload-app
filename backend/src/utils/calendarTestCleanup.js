// One approved synthetic schedule only. This is not a general maintenance or deletion API.
import { createHash } from "node:crypto";
export const APPROVED_TEST_ID = "cal-dc669cf2a875f8f8f7b8f7563d044e25ea5df9dfd02791b6d0ac8fdb3dd01f95";
export const APPROVED_TEST_UPDATE_TIME = "2026-11-10T03:46:11.433569Z";
export const CLEANUP_OPERATION_ID = "op-" + createHash("sha256").update("approved-staging-test-cleanup:" + APPROVED_TEST_ID + ":" + APPROVED_TEST_UPDATE_TIME).digest("hex");
const guard = reason => {
  throw Object.assign(new Error(reason), {
    cleanupGuard: reason
  });
};
const text = value => ({
  stringValue: value
});
const integer = value => ({
  integerValue: String(value)
});
export function buildCalendarTestCleanup({
  projectId,
  uid,
  schedule,
  gate,
  audit,
  expectedUpdateTime = APPROVED_TEST_UPDATE_TIME
}) {
  if (!["labboy-workload-app-staging", "demo-calendar-test-cleanup"].includes(projectId)) guard("unapproved-project");
  if (projectId === "labboy-workload-app-staging" && expectedUpdateTime !== APPROVED_TEST_UPDATE_TIME) guard("unapproved-version-override");
  if (typeof expectedUpdateTime !== "string" || expectedUpdateTime.length > 40 || !Number.isFinite(Date.parse(expectedUpdateTime))) guard("invalid-expected-version");
  if (typeof uid !== "string" || !uid || uid.includes("/")) guard("invalid-operator");
  const prefix = `projects/${projectId}/databases/(default)/documents`;
  const target = `${prefix}/classroomSchedules/${APPROVED_TEST_ID}`;
  const gateName = `${prefix}/calendarWriteState/main`,
    auditName = `${prefix}/calendarMaintenance/${CLEANUP_OPERATION_ID}`;
  if (schedule?.name !== target || gate?.name !== gateName) guard("unexpected-document");
  const row = schedule.fields || {},
    state = gate.fields || {};
  const expected = {
    subject: "ทดสอบ staging",
    room: "402",
    dayOfWeek: "friday",
    startTime: "10:00",
    endTime: "11:00",
    validFrom: "2026-11-20",
    validTo: "2026-11-20",
    createdBy: uid
  };
  if (Object.entries(expected).some(([key, value]) => row[key]?.stringValue !== value)) guard("approved-test-fields-changed");
  const sourceOperation = row.operationId?.stringValue;
  if (!/^op-[0-9a-f]{64}$/.test(sourceOperation || "")) guard("invalid-source-operation");
  const revision = Number(state.revision?.integerValue);
  if (audit) {
    const history = audit.fields || {};
    if (audit.name !== auditName || history.action?.stringValue !== "deactivate-approved-test" || history.target?.stringValue !== `classroomSchedules/${APPROVED_TEST_ID}` || history.actor?.stringValue !== uid || history.previousUpdateTime?.stringValue !== expectedUpdateTime || history.sourceOperation?.stringValue !== sourceOperation || history.beforeRevision?.integerValue !== "1" || history.afterRevision?.integerValue !== "2" || history.previousActive?.booleanValue !== true || history.nextActive?.booleanValue !== false) guard("audit-mismatch");
    if (row.isActive?.booleanValue !== false || !Number.isSafeInteger(revision) || revision < 2) guard("post-cleanup-state-changed");
    return {
      alreadyApplied: true,
      writes: [],
      revision
    };
  }
  if (row.isActive?.booleanValue !== true || schedule.updateTime !== expectedUpdateTime) guard("approved-test-version-changed");
  if (revision !== 1 || state.operationId?.stringValue !== sourceOperation || state.updatedBy?.stringValue !== uid || !gate.updateTime) guard("revision-or-operator-changed");
  return {
    alreadyApplied: false,
    revision: 1,
    writes: [{
      update: {
        name: target,
        fields: {
          isActive: {
            booleanValue: false
          }
        }
      },
      updateMask: {
        fieldPaths: ["isActive"]
      },
      currentDocument: {
        updateTime: expectedUpdateTime
      }
    }, {
      update: {
        name: gateName,
        fields: {
          revision: integer(2),
          operationId: text(CLEANUP_OPERATION_ID),
          updatedBy: text(uid)
        }
      },
      updateMask: {
        fieldPaths: ["revision", "operationId", "updatedBy"]
      },
      updateTransforms: [{
        fieldPath: "updatedAt",
        setToServerValue: "REQUEST_TIME"
      }],
      currentDocument: {
        updateTime: gate.updateTime
      }
    }, {
      update: {
        name: auditName,
        fields: {
          action: text("deactivate-approved-test"),
          target: text(`classroomSchedules/${APPROVED_TEST_ID}`),
          actor: text(uid),
          previousActive: {
            booleanValue: true
          },
          nextActive: {
            booleanValue: false
          },
          previousUpdateTime: text(expectedUpdateTime),
          sourceOperation: text(sourceOperation),
          beforeRevision: integer(1),
          afterRevision: integer(2)
        }
      },
      updateTransforms: [{
        fieldPath: "createdAt",
        setToServerValue: "REQUEST_TIME"
      }],
      currentDocument: {
        exists: false
      }
    }]
  };
}
