import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();

// Set default region to asia-southeast1 (Singapore - closest to Thailand)
const REGION = "asia-southeast1";

// ⚠️ DISABLED: All triggers disabled to save quota
// export * from "./auth/onCreate";
// export * from "./auth/createUser";
// export * from "./worklogs/onCreate";
// export * from "./worklogs/onUpdate";
// export * from "./worklogs/onDelete";
// export * from "./audit/onWorklogChange";
// export * from "./scheduled/lockWorklogs";

// Health check function with explicit region
export const healthCheck = functions.region(REGION).https.onCall(() => {
  return {
    status: "ok",
    timestamp: admin.firestore.Timestamp.now(),
    service: "icit-workload-functions",
  };
});
