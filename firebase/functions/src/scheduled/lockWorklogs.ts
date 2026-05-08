import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Scheduled function to lock worklogs at 23:59 every day
 * Runs every minute to check for records that need locking
 *
 * Note: This is a simplified version. For production, use a more precise scheduler
 */
const REGION = "asia-southeast1";

export const lockWorklogs = functions
  .region(REGION)
  .pubsub.schedule("59 23 * * *") // Run at 23:59 every day
  .timeZone("Asia/Bangkok") // Thailand timezone
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = new Date();
    const today = now.toISOString().split("T")[0]; // YYYY-MM-DD

    console.log(`Locking worklogs for date: ${today}`);

    // Find all unlocked worklogs from today
    const worklogsRef = db.collection("worklogs");
    const query = worklogsRef
      .where("date", "==", today)
      .where("locked", "==", false);

    const snapshot = await query.get();

    if (snapshot.empty) {
      console.log("No worklogs to lock");
      return null;
    }

    // Batch lock all worklogs
    const batch = db.batch();
    let lockCount = 0;

    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        locked: true,
        lockedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      lockCount++;
    });

    await batch.commit();

    // Create audit log for bulk lock
    await db.collection("auditLogs").add({
      type: "WORKLOGS_LOCKED",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: {
        date: today,
        count: lockCount,
      },
    });

    console.log(`Locked ${lockCount} worklogs for ${today}`);
    return null;
  });

/**
 * HTTP function to manually lock/unlock worklogs (admin only)
 */
export const manualLockWorklog = functions
  .region(REGION)
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    const { worklogId, locked } = data;

    if (!worklogId || typeof locked !== "boolean") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "worklogId and locked status required",
      );
    }

    const db = admin.firestore();

    // Verify admin role
    const userDoc = await db.collection("users").doc(context.auth.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin access required",
      );
    }

    // Update worklog
    const worklogRef = db.collection("worklogs").doc(worklogId);
    const worklogDoc = await worklogRef.get();

    if (!worklogDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Worklog not found");
    }

    await worklogRef.update({
      locked,
      lockedAt: locked ? admin.firestore.FieldValue.serverTimestamp() : null,
      lockedBy: locked ? context.auth.uid : null,
    });

    // Create audit log
    await db.collection("auditLogs").add({
      type: locked ? "WORKLOG_LOCKED_MANUAL" : "WORKLOG_UNLOCKED_MANUAL",
      worklogId,
      userId: context.auth.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: {
        previousState: worklogDoc.data()?.locked,
        newState: locked,
      },
    });

    return { success: true, worklogId, locked };
  });
