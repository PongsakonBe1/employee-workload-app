import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * HTTP function to query audit logs (admin only)
 */
const REGION = "asia-southeast1";

export const getAuditLogs = functions
  .region(REGION)
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    const db = admin.firestore();

    // Check admin role
    const userDoc = await db.collection("users").doc(context.auth.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin access required",
      );
    }

    const { limit = 50, startAfter, filters = {} } = data;

    let query = db
      .collection("auditLogs")
      .orderBy("timestamp", "desc")
      .limit(limit);

    if (startAfter) {
      const startAfterDoc = await db
        .collection("auditLogs")
        .doc(startAfter)
        .get();
      query = query.startAfter(startAfterDoc);
    }

    if (filters.type) {
      query = query.where("type", "==", filters.type);
    }

    if (filters.userId) {
      query = query.where("userId", "==", filters.userId);
    }

    const snapshot = await query.get();
    const logs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { logs, count: logs.length };
  });
