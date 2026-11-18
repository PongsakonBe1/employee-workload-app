import { RESOURCE_STATUS_INDEX_PATH, RESOURCE_STATUS_INDEX_VERSION, worklogResourceIndex } from "../../../frontend/lib/resourceStatusIndex.js";

const timestampMillis = value => value instanceof Date ? value.getTime() : value?.toMillis?.();
const sameKeys = (left, right) => Array.isArray(left) && left.length === right.length &&
  left.every((value, index) => value === right[index]);

// Used only by the local setup script. A conflicting document revision stops
// the migration before marking the read model ready; rerunning skips saved rows.
export async function backfillResourceStatus(db, documentId, { documentLimit = 5000 } = {}) {
  const worklogs = db.collection("worklogs");
  const status = db.doc(RESOURCE_STATUS_INDEX_PATH);
  const existing = (await status.get()).data();
  if (existing && existing.version !== RESOURCE_STATUS_INDEX_VERSION) throw Error("Different resource index version is installed");
  await status.set({ version: RESOURCE_STATUS_INDEX_VERSION, ready: false });

  const ordered = worklogs.orderBy(documentId);
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
      if (sameKeys(data.resourceKeys, fields.resourceKeys) && sameKeys(data.resourceConditionKeys, fields.resourceConditionKeys) &&
          timestampMillis(data.resourceRecordedAt) === timestampMillis(fields.resourceRecordedAt)) continue;
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
