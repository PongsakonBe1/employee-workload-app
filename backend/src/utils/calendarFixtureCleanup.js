// Approved five-record fixture maintenance; no general reset, deletion or user mutation.
import { createHash } from "node:crypto";
import { calendarEmulatorFixtures } from "../../../firebase/calendar-emulator/fixtures.mjs";
import { CLEANUP_OPERATION_ID as PREVIOUS_MAINTENANCE } from "./calendarTestCleanup.js";
export const FIXTURE_BASELINE_HASH = "e10565ec6cc98ddd37591f9d273f63c1021aecad4155b2125ba4a82e1ac25546";
const refs = [["classroomSchedules", "class-one"], ["dlExamSchedules", "dl-morning"], ["dlExamSchedules", "dl-evening"], ["dlExamSchedules", "dl-historic"], ["dlExamSchedules", "dl-december"]];
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const hash = value => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
const fail = code => {
  throw Object.assign(new Error(code), {
    cleanupGuard: code
  });
};
export const FIXTURE_TARGETS = refs.map(([collection, id]) => {
  const found = calendarEmulatorFixtures[collection].find(row => row.id === id);
  if (!found) fail("fixture-definition-missing");
  const {
    id: ignored,
    ...data
  } = found;
  return {
    collection,
    id,
    data: structuredClone(data)
  };
});
export const FIXTURE_MAINTENANCE_ID = "op-" + hash({
  action: "deactivate-initial-calendar-fixtures",
  baseline: FIXTURE_BASELINE_HASH,
  revision: 2
});
export const encodeCleanupValue = value => typeof value === "string" ? {
  stringValue: value
} : typeof value === "boolean" ? {
  booleanValue: value
} : typeof value === "number" ? {
  integerValue: String(value)
} : Array.isArray(value) ? {
  arrayValue: {
    values: value.map(encodeCleanupValue)
  }
} : {
  mapValue: {
    fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encodeCleanupValue(item)]))
  }
};
export function decodeCleanupValue(value) {
  if (value?.stringValue !== undefined) return value.stringValue;
  if (value?.booleanValue !== undefined) return value.booleanValue;
  if (value?.integerValue !== undefined) return Number(value.integerValue);
  if (value?.timestampValue !== undefined) return value.timestampValue;
  if (value?.arrayValue) return (value.arrayValue.values || []).map(decodeCleanupValue);
  if (value?.mapValue) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, item]) => [key, decodeCleanupValue(item)]));
  fail("unexpected-fixture-field-type");
}
export function buildCalendarFixtureCleanup({
  projectId,
  uid,
  records,
  gate,
  audit
}) {
  if (!["labboy-workload-app-staging", "demo-calendar-fixture-cleanup"].includes(projectId)) fail("unapproved-project");
  if (typeof uid !== "string" || !uid || uid.includes("/")) fail("invalid-operator");
  if (hash(FIXTURE_TARGETS) !== FIXTURE_BASELINE_HASH) fail("fixture-definition-drift");
  const prefix = `projects/${projectId}/databases/(default)/documents`;
  const targets = FIXTURE_TARGETS.map(row => `${row.collection}/${row.id}`);
  if (!Array.isArray(records) || records.length !== 5 || new Set(records.map(row => row?.name)).size !== 5 || targets.some(target => !records.some(row => row?.name === prefix + "/" + target))) fail("unexpected-fixture-targets");
  if (gate?.name !== prefix + "/calendarWriteState/main") fail("unexpected-gate");
  const ordered = targets.map(target => records.find(row => row.name === prefix + "/" + target));
  const values = ordered.map((record, index) => ({
    collection: FIXTURE_TARGETS[index].collection,
    id: FIXTURE_TARGETS[index].id,
    data: Object.fromEntries(Object.entries(record.fields || {}).map(([key, item]) => [key, decodeCleanupValue(item)]))
  }));
  const normalized = values.map(row => ({
    ...row,
    data: {
      ...row.data,
      isActive: true
    }
  }));
  if (hash(normalized) !== FIXTURE_BASELINE_HASH) fail("fixture-content-changed");
  const revision = Number(gate.fields?.revision?.integerValue);
  if (audit) {
    const history = decodeCleanupValue({
      mapValue: {
        fields: audit.fields || {}
      }
    });
    if (audit.name !== prefix + "/calendarMaintenance/" + FIXTURE_MAINTENANCE_ID || history.action !== "deactivate-initial-calendar-fixtures" || history.actor !== uid || history.baselineHash !== FIXTURE_BASELINE_HASH || history.beforeRevision !== 2 || history.afterRevision !== 3 || JSON.stringify(history.targets) !== JSON.stringify(targets) || history.count !== 5) fail("audit-mismatch");
    if (values.some(row => row.data.isActive !== false) || !Number.isSafeInteger(revision) || revision < 3) fail("post-cleanup-state-changed");
    return {
      alreadyApplied: true,
      revision,
      writes: []
    };
  }
  if (values.some(row => row.data.isActive !== true) || ordered.some(row => typeof row.updateTime !== "string" || !row.updateTime)) fail("fixture-status-or-version-changed");
  if (revision !== 2 || gate.fields?.operationId?.stringValue !== PREVIOUS_MAINTENANCE || gate.fields?.updatedBy?.stringValue !== uid || !gate.updateTime) fail("revision-or-operator-changed");
  const writes = ordered.map(record => ({
    update: {
      name: record.name,
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
      updateTime: record.updateTime
    }
  }));
  writes.push({
    update: {
      name: gate.name,
      fields: {
        revision: {
          integerValue: "3"
        },
        operationId: {
          stringValue: FIXTURE_MAINTENANCE_ID
        },
        updatedBy: {
          stringValue: uid
        }
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
  });
  const history = {
    action: "deactivate-initial-calendar-fixtures",
    actor: uid,
    baselineHash: FIXTURE_BASELINE_HASH,
    count: 5,
    targets,
    beforeRevision: 2,
    afterRevision: 3,
    beforeVersions: ordered.map((row, index) => ({
      target: targets[index],
      updateTime: row.updateTime
    })),
    previousOperation: PREVIOUS_MAINTENANCE
  };
  writes.push({
    update: {
      name: prefix + "/calendarMaintenance/" + FIXTURE_MAINTENANCE_ID,
      fields: encodeCleanupValue(history).mapValue.fields
    },
    updateTransforms: [{
      fieldPath: "createdAt",
      setToServerValue: "REQUEST_TIME"
    }],
    currentDocument: {
      exists: false
    }
  });
  return {
    alreadyApplied: false,
    revision: 2,
    writes
  };
}
