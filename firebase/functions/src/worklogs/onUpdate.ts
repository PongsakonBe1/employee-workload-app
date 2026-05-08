import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * When worklog is updated:
 * - Check if locked (prevent edits after 23:59)
 * - Create audit log with before/after
 * - Update timestamp
 */
const REGION = "asia-southeast1";

export const onWorklogUpdated = functions
  .region(REGION)
  .firestore.document("worklogs/{worklogId}")
  .onUpdate(async (change, context) => {
    const db = admin.firestore();
    const worklogId = context.params.worklogId;
    const before = change.before.data();
    const after = change.after.data();

    // Check if record is locked
    if (before.locked) {
      // Revert to original data
      await change.after.ref.update(before);
      console.error(`Attempted to edit locked worklog: ${worklogId}`);
      return;
    }

    // Update timestamp
    await change.after.ref.update({
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create audit log with changes
    const changes: Record<string, { before: any; after: any }> = {};
    const fieldsToTrack = [
      "recipient",
      "minorTask",
      "mainDuty",
      "comment",
      "status",
    ];

    for (const field of fieldsToTrack) {
      if (before[field] !== after[field]) {
        changes[field] = {
          before: before[field],
          after: after[field],
        };
      }
    }

    if (Object.keys(changes).length > 0) {
      await db.collection("auditLogs").add({
        type: "WORKLOG_UPDATED",
        worklogId,
        userId: after.employeeId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: {
          changes,
          date: after.date,
        },
      });

      console.log(`Worklog updated: ${worklogId}`);
    }
  });
