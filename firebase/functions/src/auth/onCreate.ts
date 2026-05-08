import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Trigger when new user is created
 * - Validates email domain (@icit.kmutnb.ac.th)
 * - Creates user profile in Firestore
 * - Sends welcome notification
 */
const REGION = "asia-southeast1";

export const onUserCreated = functions
  .region(REGION)
  .auth.user()
  .onCreate(async (user) => {
    const db = admin.firestore();
    const { uid, email, displayName } = user;

    // Validate email domain
    if (!email || !email.endsWith("@icit.kmutnb.ac.th")) {
      // Delete unauthorized user
      await admin.auth().deleteUser(uid);
      console.log(`Deleted unauthorized user: ${email}`);
      throw new Error(
        "Unauthorized email domain. Only @icit.kmutnb.ac.th allowed.",
      );
    }

    // Extract username from email
    const username = email.split("@")[0];

    // Check if user already exists in database (from seed data)
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      // Create new user profile
      const userData = {
        uid,
        username,
        email,
        nickname: displayName || username,
        fullName: displayName || username,
        role: "staff", // Default role
        active: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection("users").doc(uid).set(userData);
      console.log(`Created user profile: ${username}`);
    } else {
      // Update last login
      await db.collection("users").doc(uid).update({
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Create audit log
    await db.collection("auditLogs").add({
      type: "USER_CREATED",
      userId: uid,
      username,
      email,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: { displayName },
    });

    return { success: true };
  });

/**
 * HTTP function to check if user exists and get their role
 */
export const getUserProfile = functions
  .region(REGION)
  .https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(context.auth.uid).get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "User profile not found",
      );
    }

    return {
      uid: context.auth.uid,
      ...userDoc.data(),
    };
  });
