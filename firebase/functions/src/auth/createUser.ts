import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Cloud Function to create or migrate user
 * - Handles whitelist emails with special roles
 * - Handles UID migration (when user logs in with new UID but same email)
 * - Only callable by authenticated users for themselves
 */
const REGION = "asia-southeast1";

// Whitelist emails that can bypass domain restriction
const WHITELIST_EMAILS = ["pongsagon.be1@gmail.com", "pongsakon.be1@gmail.com"];

// Role mapping for whitelist emails
const EMAIL_ROLES: Record<string, string> = {
  "pongsagon.be1@gmail.com": "superadmin",
  "pongsakon.be1@gmail.com": "superadmin",
};

/**
 * Create or migrate user profile
 * Called from frontend AuthProvider when user logs in
 */
export const createOrMigrateUser = functions
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
    const { uid, email, displayName, photoURL } = data;
    const authUid = context.auth.uid;

    // Verify the caller is creating their own profile
    if (authUid !== uid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Can only create your own user profile",
      );
    }

    // Validate email
    if (!email) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Email is required",
      );
    }

    const isWhitelisted = WHITELIST_EMAILS.includes(email);
    const isICIT = email.endsWith("@icit.kmutnb.ac.th");

    // Check if user exists by UID
    const userDoc = await db.collection("users").doc(uid).get();

    if (userDoc.exists) {
      // User exists - just update lastLoginAt
      await db.collection("users").doc(uid).update({
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        action: "updated",
        user: {
          uid,
          ...userDoc.data(),
        },
      };
    }

    // Check if user exists by email (UID migration case)
    const emailQuery = await db
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (!emailQuery.empty) {
      // User exists with different UID - migrate
      const existingDoc = emailQuery.docs[0];
      const existingData = existingDoc.data();
      const oldUid = existingDoc.id;

      console.log(`[Auth] Migrating user ${email} from ${oldUid} to ${uid}`);

      // Create new document with new UID
      const migratedData = {
        ...existingData,
        uid,
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
        migratedFrom: oldUid,
        migratedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection("users").doc(uid).set(migratedData);

      // Optionally: Delete old document or mark as migrated
      // await db.collection("users").doc(oldUid).delete();

      console.log(`[Auth] Migrated user ${email} to new UID ${uid}`);

      return {
        success: true,
        action: "migrated",
        user: {
          ...migratedData,
          uid, // uid ต้องอยู่หลัง spread เพื่อให้แน่ใจว่าเป็นค่าที่ถูกต้อง
        },
      };
    }

    // New user - check if whitelisted or ICIT domain
    if (!isWhitelisted && !isICIT) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Email domain not allowed. Only @icit.kmutnb.ac.th or whitelisted emails.",
      );
    }

    if (isWhitelisted) {
      // Create whitelisted user with special role
      const username = email.split("@")[0];
      const role = EMAIL_ROLES[email] || "staff";

      const userData = {
        uid,
        email,
        username,
        nickname: displayName || username,
        fullName: displayName || "",
        displayName: displayName || "",
        photoURL: photoURL || "",
        role,
        active: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
        isWhitelisted: true,
      };

      await db.collection("users").doc(uid).set(userData);

      console.log(`[Auth] Created whitelisted user ${email} with role ${role}`);

      return {
        success: true,
        action: "created",
        user: userData,
      };
    }

    // ICIT domain - create pending user
    const username = email.split("@")[0];
    const pendingUser = {
      uid,
      email,
      username,
      nickname: displayName || username,
      fullName: displayName || "",
      displayName: displayName || "",
      photoURL: photoURL || "",
      requestedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "pending",
    };

    await db.collection("pendingUsers").doc(uid).set(pendingUser);

    console.log(`[Auth] Created pending user ${email}`);

    return {
      success: true,
      action: "pending",
      user: pendingUser,
    };
  });

/**
 * Admin function to approve pending user
 * Can be called by admin or superadmin
 */
export const approvePendingUser = functions
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
    const { pendingUserId, role = "staff" } = data;
    const approverUid = context.auth.uid;

    // Check if approver is admin
    const approverDoc = await db.collection("users").doc(approverUid).get();
    if (!approverDoc.exists) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Approver not found",
      );
    }

    const approverData = approverDoc.data();
    if (!approverData || !["admin", "superadmin"].includes(approverData.role)) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only admin can approve users",
      );
    }

    // Get pending user
    const pendingDoc = await db
      .collection("pendingUsers")
      .doc(pendingUserId)
      .get();
    if (!pendingDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Pending user not found",
      );
    }

    const pendingData = pendingDoc.data();
    if (!pendingData) {
      throw new functions.https.HttpsError(
        "not-found",
        "Pending user data not found",
      );
    }

    // Only superadmin can create admin
    if (role === "admin" && approverData.role !== "superadmin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only superadmin can create admin users",
      );
    }

    // Create approved user
    const userData = {
      uid: pendingData.uid,
      email: pendingData.email,
      username: pendingData.username,
      nickname: pendingData.nickname,
      fullName: pendingData.fullName,
      displayName: pendingData.displayName,
      photoURL: pendingData.photoURL || "",
      role,
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      approvedBy: approverUid,
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("users").doc(pendingUserId).set(userData);
    await db.collection("pendingUsers").doc(pendingUserId).delete();

    // Create notification for the approved user
    await db.collection("notifications").add({
      type: "user_approved",
      title: "บัญชีได้รับการอนุมัติ",
      message: `บัญชีของคุณได้รับการอนุมัติแล้ว สามารถเข้าใช้งานระบบได้เลย`,
      userId: pendingUserId,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[Auth] Approved user ${pendingData.email} with role ${role}`);

    return {
      success: true,
      user: userData,
    };
  });
