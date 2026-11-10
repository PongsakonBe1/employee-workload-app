// Approved one-record maintenance, using the CLI's authenticated client without extracting tokens.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { APPROVED_TEST_ID, CLEANUP_OPERATION_ID, buildCalendarTestCleanup } from "../backend/src/utils/calendarTestCleanup.js";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = "labboy-workload-app-staging",
  account = process.argv[2],
  action = process.argv[3] || "inspect";
if (!account?.includes("@") || !["inspect", "apply"].includes(action)) throw new Error("Explicit account and inspect/apply action required");
const directory = path.join(root, ".tools/calendar-staging");
fs.mkdirSync(directory, {
  recursive: true
});
process.chdir(directory);
delete process.env.FIREBASE_TOKEN;
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
const require = createRequire(path.join(process.env.APPDATA, "npm/node_modules/firebase-tools/package.json"));
if (require("./package.json").version !== "15.18.0") throw new Error("CLI compatibility review required");
const {
    Command
  } = require("./lib/command"),
  {
    requireAuth
  } = require("./lib/requireAuth");
const command = new Command("cleanup-approved-staging-test").before(options => {
  if (options.project !== target || options.user?.email !== account) throw new Error("Target/account mismatch");
}).before(requireAuth).action(async () => {
  const {
    Client
  } = require("./lib/apiv2");
  const identity = new Client({
    urlPrefix: "https://identitytoolkit.googleapis.com",
    apiVersion: "v1"
  });
  const lookup = await identity.post(`/projects/${target}/accounts:lookup`, {
    email: [account]
  }, {
    queryParams: {
      fields: "users(localId,emailVerified,providerUserInfo(providerId))"
    }
  });
  const users = lookup.body.users || [];
  if (users.length !== 1 || !users[0].emailVerified || !users[0].providerUserInfo?.some(provider => provider.providerId === "google.com")) throw new Error("Verified operator required");
  const uid = users[0].localId;
  const store = new Client({
    urlPrefix: "https://firestore.googleapis.com",
    apiVersion: "v1"
  });
  const prefix = `/projects/${target}/databases/(default)/documents`;
  const role = await store.get(`${prefix}/users/${uid}`, {
    queryParams: {
      "mask.fieldPaths": "role"
    }
  });
  const active = await store.get(`${prefix}/users/${uid}`, {
    queryParams: {
      "mask.fieldPaths": "active"
    }
  });
  if (!["admin", "superadmin"].includes(role.body.fields?.role?.stringValue) || active.body.fields?.active?.booleanValue !== true) throw new Error("Active administrator required");
  async function snapshot() {
    const gate = (await store.get(prefix + "/calendarWriteState/main")).body;
    const response = await store.post(prefix + ":runQuery", {
      structuredQuery: {
        from: [{
          collectionId: "classroomSchedules"
        }],
        where: {
          fieldFilter: {
            field: {
              fieldPath: "__name__"
            },
            op: "EQUAL",
            value: {
              referenceValue: `projects/${target}/databases/(default)/documents/classroomSchedules/${APPROVED_TEST_ID}`
            }
          }
        },
        select: {
          fields: ["subject", "room", "dayOfWeek", "startTime", "endTime", "validFrom", "validTo", "isActive", "operationId", "createdBy"].map(fieldPath => ({
            fieldPath
          }))
        },
        limit: 1
      }
    });
    const schedule = response.body.find(row => row.document)?.document;
    const auditResponse = await store.get(prefix + "/calendarMaintenance/" + CLEANUP_OPERATION_ID, {
      resolveOnHTTPError: true
    });
    if (![200, 404].includes(auditResponse.status)) throw new Error("Maintenance inspection failed");
    return {
      projectId: target,
      uid,
      schedule,
      gate,
      audit: auditResponse.status === 200 ? auditResponse.body : null
    };
  }
  const before = await snapshot(),
    plan = buildCalendarTestCleanup(before);
  if (action === "apply" && !plan.alreadyApplied) await store.post(prefix + ":commit", {
    writes: plan.writes
  });
  const after = action === "apply" ? await snapshot() : before;
  const verified = buildCalendarTestCleanup(after);
  if (action === "apply" && !verified.alreadyApplied) throw new Error("Cleanup verification failed");
  const query = await store.post(prefix + ":runQuery", {
    structuredQuery: {
      from: [{
        collectionId: "classroomSchedules"
      }],
      where: {
        compositeFilter: {
          op: "AND",
          filters: [{
            fieldFilter: {
              field: {
                fieldPath: "__name__"
              },
              op: "EQUAL",
              value: {
                referenceValue: `projects/${target}/databases/(default)/documents/classroomSchedules/${APPROVED_TEST_ID}`
              }
            }
          }, {
            fieldFilter: {
              field: {
                fieldPath: "isActive"
              },
              op: "EQUAL",
              value: {
                booleanValue: true
              }
            }
          }]
        }
      },
      select: {
        fields: [{
          fieldPath: "__name__"
        }]
      },
      limit: 1
    }
  });
  const activeQueryMatches = query.body.filter(row => row.document).length;
  if (verified.alreadyApplied && activeQueryMatches !== 0) throw new Error("Active query verification failed");
  return {
    action,
    readyForCleanup: !verified.alreadyApplied,
    applied: action === "apply" && !plan.alreadyApplied,
    alreadyApplied: plan.alreadyApplied,
    active: after.schedule.fields.isActive.booleanValue,
    activeQueryMatches,
    revision: verified.revision,
    auditPresent: Boolean(after.audit),
    documentRetained: true,
    productionAccessed: false,
    personalDetailsLogged: false
  };
});
try {
  const result = await command.runner()({
    project: target,
    account,
    json: true,
    nonInteractive: true,
    cwd: directory
  });
  console.log(JSON.stringify({
    success: true,
    target,
    result
  }));
} catch (error) {
  console.log(JSON.stringify({
    success: false,
    target,
    reason: error.cleanupGuard || "inspection-or-conditional-commit-failed",
    rawDetailsWithheld: true
  }));
  process.exitCode = 1;
}
