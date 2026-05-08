import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * When worklog is deleted:
 * - Check if locked
 * - Create audit log with full data backup
 * - Soft delete (optional) or log only
 */
const REGION = "asia-southeast1";

export const onWorklogDeleted = functions
  .region(REGION)
  .firestore.document("worklogs/{worklogId}")
  .onDelete(async (snap, context) => {
    const db = admin.firestore();
    const worklogId = context.params.worklogId;
    const worklog = snap.data();

    // Create audit log with full backup
    await db.collection("auditLogs").add({
      type: "WORKLOG_DELETED",
      worklogId,
      userId: worklog.employeeId,
      deletedBy: context.auth?.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: {
        backup: worklog, // Full data backup
        date: worklog.date,
        minorTask: worklog.minorTask,
        mainDuty: worklog.mainDuty,
      },
    });

    console.log(`Worklog deleted: ${worklogId}`);
  });
