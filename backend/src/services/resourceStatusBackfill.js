import { equipmentCatalog } from "../../../frontend/lib/equipmentCatalog.js";
import { RESOURCE_STATUS_INDEX_PATH, RESOURCE_STATUS_INDEX_VERSION, worklogResourceEvents, worklogResourceIndex, worklogResourceTask, worklogResourceTime } from "../../../frontend/lib/resourceStatusIndex.js";

const timestampMillis = value => value instanceof Date ? value.getTime() : value?.toMillis?.();
const sameKeys = (left, right) => Array.isArray(left) && left.length === right.length &&
  left.every((value, index) => value === right[index]);

const indexFields = ["minorTask", "room", "equipment", "comment", "equipmentCondition", "createdAt", "date", "time", "resourceKeys", "resourceConditionKeys", "resourceRecordedAt"];

function needsIndex(data, fields) {
  if (!fields.resourceKeys.length && !data.resourceKeys?.length && !data.resourceConditionKeys?.length) return false;
  return !sameKeys(data.resourceKeys, fields.resourceKeys) || !sameKeys(data.resourceConditionKeys, fields.resourceConditionKeys) ||
    timestampMillis(data.resourceRecordedAt) !== timestampMillis(fields.resourceRecordedAt);
}

export async function dryRunResourceStatusBackfill(db, documentId, { documentLimit = 5000, catalogLimit = 150 } = {}) {
  if (![documentLimit, catalogLimit].every(limit => Number.isSafeInteger(limit) && limit > 0)) {
    throw Error("A positive document and catalog limit are required");
  }
  const catalogRows = await db.collection("equipmentItems").select("name", "minorTask", "location", "active", "order", "updatedAt", "createdAt").limit(catalogLimit).get();
  const catalog = equipmentCatalog(catalogRows.docs.map(doc => doc.data()));
  const equipmentKind = new Map(catalog.equipment.map(item => [item.id, item.kind]));
  const report = {
    complete: false, inspected: 0, resourceTasks: 0, changesNeeded: 0,
    issues: { missingResourceCode: 0, equipmentMismatch: 0, invalidRecordedDate: 0, assumedMidnight: 0 },
    catalog: { inspected: catalogRows.size, complete: catalogRows.size < catalogLimit, invalid: catalog.invalid, conflicts: catalog.conflicts }
  };

  const ordered = db.collection("worklogs").orderBy(documentId).select(...indexFields);
  let cursor;
  while (report.inspected < documentLimit) {
    const limit = Math.min(documentLimit - report.inspected, 200);
    const query = cursor ? ordered.startAfter(cursor) : ordered;
    const snapshot = await query.limit(limit).get();
    report.inspected += snapshot.size;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const task = worklogResourceTask(data.minorTask);
      const events = worklogResourceEvents(data);
      if (task) {
        report.resourceTasks++;
        if (!events.length) {
          report.issues.missingResourceCode++;
          continue;
        }
        if (events.some(event => event.kind !== "room" && equipmentKind.get(event.id) !== event.kind)) {
          report.issues.equipmentMismatch++;
        }
      }
      try {
        const { timestamp, assumedTime } = events.length ? worklogResourceTime(data) : {};
        if (assumedTime) report.issues.assumedMidnight++;
        if (needsIndex(data, worklogResourceIndex(data, timestamp))) report.changesNeeded++;
      } catch {
        report.issues.invalidRecordedDate++;
      }
    }
    if (snapshot.size < limit) {
      report.complete = true;
      break;
    }
    cursor = snapshot.docs.at(-1);
  }
  return report;
}

// Used only by the local setup script. A conflicting document revision stops
// the migration before marking the read model ready; rerunning skips saved rows.
export async function backfillResourceStatus(db, documentId, { documentLimit = 5000 } = {}) {
  const worklogs = db.collection("worklogs");
  const status = db.doc(RESOURCE_STATUS_INDEX_PATH);
  const existing = (await status.get()).data();
  if (existing && existing.version !== RESOURCE_STATUS_INDEX_VERSION) throw Error("Different resource index version is installed");
  await status.set({ version: RESOURCE_STATUS_INDEX_VERSION, ready: false });

  const ordered = worklogs.orderBy(documentId).select(...indexFields);
  const pageSize = 200;
  let cursor;
  let inspected = 0;
  let candidates = 0;
  let indexed = 0;
  for (;;) {
    const query = cursor ? ordered.startAfter(cursor) : ordered;
    const snapshot = await query.limit(pageSize).get();
    if (inspected + snapshot.size > documentLimit) throw Error("Worklog backfill exceeded the approved document limit");
    inspected += snapshot.size;
    const batch = db.batch();
    let changes = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const fields = worklogResourceIndex(data);
      // Clear inconsistent indices if a previous run found an older revision.
      if (!fields.resourceKeys.length && !data.resourceKeys?.length && !data.resourceConditionKeys?.length) continue;
      candidates += Number(fields.resourceKeys.length > 0);
      if (!needsIndex(data, fields)) continue;
      batch.update(doc.ref, fields, { lastUpdateTime: doc.updateTime });
      changes++;
    }
    if (changes) await batch.commit();
    indexed += changes;
    if (snapshot.size < pageSize) break;
    cursor = snapshot.docs.at(-1);
  }
  await status.set({ version: RESOURCE_STATUS_INDEX_VERSION, ready: true });
  return { inspected, candidates, indexed };
}
