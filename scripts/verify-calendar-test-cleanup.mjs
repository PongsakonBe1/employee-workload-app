// REST integration for a one-record maintenance commit; synthetic, isolated loopback namespace.
import fs from "node:fs";
import assert from "node:assert/strict";
import { APPROVED_TEST_ID, CLEANUP_OPERATION_ID, buildCalendarTestCleanup } from "../backend/src/utils/calendarTestCleanup.js";
const projectId = "demo-calendar-test-cleanup",
  uid = "synthetic-operator";
const base = `http://127.0.0.1:18080/v1/projects/${projectId}/databases/(default)/documents`;
const str = value => ({
  stringValue: value
});
const report = {
  completed: false,
  projectId,
  checks: [],
  cloudUsed: false
};
async function request(path, method = "GET", body, allowFailure = false) {
  const response = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer owner"
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000)
  });
  if (!allowFailure) assert.ok(response.ok, "Local REST request failed");
  return {
    ok: response.ok,
    status: response.status,
    body: await response.json()
  };
}
const targetPath = "/classroomSchedules/" + APPROVED_TEST_ID,
  gatePath = "/calendarWriteState/main",
  auditPath = "/calendarMaintenance/" + CLEANUP_OPERATION_ID;
const sourceOperation = "op-" + "a".repeat(64);
const fields = {
  subject: str("ทดสอบ staging"),
  room: str("402"),
  dayOfWeek: str("friday"),
  startTime: str("10:00"),
  endTime: str("11:00"),
  validFrom: str("2026-11-20"),
  validTo: str("2026-11-20"),
  createdBy: str(uid),
  operationId: str(sourceOperation),
  isActive: {
    booleanValue: true
  },
  teacher: str("Synthetic preserved field")
};
await request(targetPath, "PATCH", {
  fields
});
await request(gatePath, "PATCH", {
  fields: {
    revision: {
      integerValue: "1"
    },
    operationId: str(sourceOperation),
    updatedBy: str(uid)
  }
});
await request("/classroomSchedules/unrelated", "PATCH", {
  fields: {
    subject: str("Unrelated synthetic schedule"),
    isActive: {
      booleanValue: true
    }
  }
});
await request("/calendarWriteOperations/" + sourceOperation, "PATCH", {
  fields: {
    count: {
      integerValue: "1"
    }
  }
});
const priorAudit = await request(auditPath, "GET", undefined, true);
if (priorAudit.ok) await request(auditPath, "DELETE");
const before = (await request(targetPath)).body,
  unrelated = (await request("/classroomSchedules/unrelated")).body,
  receipt = (await request("/calendarWriteOperations/" + sourceOperation)).body;
const expectedUpdateTime = before.updateTime;
async function state() {
  const audit = await request(auditPath, "GET", undefined, true);
  return {
    projectId,
    uid,
    expectedUpdateTime,
    schedule: (await request(targetPath)).body,
    gate: (await request(gatePath)).body,
    audit: audit.ok ? audit.body : null
  };
}
try {
  const stale = buildCalendarTestCleanup(await state());
  await request(gatePath + "?updateMask.fieldPaths=revision", "PATCH", {
    fields: {
      revision: {
        integerValue: "2"
      }
    }
  });
  assert.equal((await request(":commit", "POST", {
    writes: stale.writes
  }, true)).ok, false);
  assert.equal((await request(targetPath)).body.fields.isActive.booleanValue, true);
  assert.equal((await request(auditPath, "GET", undefined, true)).status, 404);
  report.checks.push({
    name: "concurrent gate mutation prevents the whole commit with no partial schedule/audit write",
    passed: true
  });
  await request(gatePath + "?updateMask.fieldPaths=revision", "PATCH", {
    fields: {
      revision: {
        integerValue: "1"
      }
    }
  });
  const plan = buildCalendarTestCleanup(await state());
  await request(":commit", "POST", {
    writes: plan.writes
  });
  const after = await state();
  assert.equal(after.schedule.fields.isActive.booleanValue, false);
  assert.equal(after.gate.fields.revision.integerValue, "2");
  assert.deepEqual(after.schedule.fields, {
    ...before.fields,
    isActive: {
      booleanValue: false
    }
  });
  assert.deepEqual((await request("/classroomSchedules/unrelated")).body, unrelated);
  assert.deepEqual((await request("/calendarWriteOperations/" + sourceOperation)).body, receipt);
  assert.ok(after.audit.fields.createdAt.timestampValue);
  report.checks.push({
    name: "one inactive field, gate revision and maintenance audit commit together; unrelated data and original receipt retained",
    passed: true
  });
  assert.deepEqual(buildCalendarTestCleanup(after).writes, []);
  assert.equal(buildCalendarTestCleanup(after).alreadyApplied, true);
  report.checks.push({
    name: "repeated cleanup is a verified no-op",
    passed: true
  });
  report.completed = true;
} finally {
  fs.mkdirSync("output/playwright/calendar-staging-test-cleanup", {
    recursive: true
  });
  fs.writeFileSync("output/playwright/calendar-staging-test-cleanup/integration.json", JSON.stringify(report, null, 2));
}
console.log(`PASS cleanup REST integration: ${report.checks.length} groups`);
