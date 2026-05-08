import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * When worklog is created:
 * - Validate data
 * - Set default status
 * - Create audit log
 */
const REGION = "asia-southeast1";

export const onWorklogCreated = functions
  .region(REGION)
  .firestore.document("worklogs/{worklogId}")
  .onCreate(async (snap, context) => {
    const db = admin.firestore();
    const worklogId = context.params.worklogId;
    const worklog = snap.data();

    // Validate required fields
    if (!worklog.date || !worklog.time || !worklog.minorTask) {
      console.error(`Invalid worklog data: ${worklogId}`);
      return;
    }

    // Calculate lock time (23:59 of the record date)
    const recordDate = new Date(worklog.date);
    const lockTime = new Date(recordDate);
    lockTime.setHours(23, 59, 0, 0);

    // Update worklog with metadata
    await snap.ref.update({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      locked: false,
      lockTime: admin.firestore.Timestamp.fromDate(lockTime),
      createdBy: worklog.employeeId || context.auth?.uid,
    });

    // Create audit log
    await db.collection("auditLogs").add({
      type: "WORKLOG_CREATED",
      worklogId,
      userId: worklog.employeeId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: {
        date: worklog.date,
        minorTask: worklog.minorTask,
        mainDuty: worklog.mainDuty,
      },
    });

    console.log(`Worklog created: ${worklogId}`);
  });
