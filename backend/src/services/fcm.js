/**
 * Firebase Cloud Messaging Service
 * ใช้สำหรับส่ง Push Notification ไปยัง Android/iOS/Web
 * 
 * SA Note: ใช้ firebase-admin SDK ซึ่ง bypass Firestore Rules โดย default
 * ต้องตั้งค่า FIREBASE_SERVICE_ACCOUNT_JSON ใน Environment Variables
 */

import admin from "firebase-admin";
import { env } from "../config/env.js";

let firebaseApp = null;
let firestoreDb = null;

/**
 * Initialize Firebase Admin SDK
 * เรียกครั้งเดียวตอน server start
 */
export function initFirebase() {
  if (firebaseApp) return firebaseApp;

  try {
    // Parse service account JSON จาก env var
    const serviceAccount = JSON.parse(env.firebaseServiceAccountJson);

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    firestoreDb = admin.firestore();
    console.log("✅ Firebase Admin initialized successfully");

    return firebaseApp;
  } catch (error) {
    console.error("❌ Failed to initialize Firebase Admin:", error.message);
    throw error;
  }
}

/**
 * ส่ง Push Notification ไปยังหลาย tokens พร้อมกัน
 * @param {string[]} tokens - Array ของ FCM tokens
 * @param {string} title - หัวข้อ notification
 * @param {string} body - เนื้อหา notification
 * @param {Object} data - Custom data (optional)
 * @returns {Promise<admin.messaging.BatchResponse>}
 */
export async function sendToTokens(tokens, title, body, data = {}) {
  if (!tokens || tokens.length === 0) {
    throw new Error("No FCM tokens provided");
  }

  initFirebase();

  const message = {
    tokens,
    notification: { title, body },
    data: Object.entries(data).reduce((acc, [key, value]) => {
      acc[key] = String(value);
      return acc;
    }, {}),
    android: {
      priority: "high",
      notification: {
        channelId: "default",
        priority: "high",
        defaultSound: true,
        defaultVibrateTimings: true,
      },
    },
    apns: {
      payload: {
        aps: {
          alert: { title, body },
          sound: "default",
          badge: 1,
        },
      },
    },
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(
      `📤 FCM sent: ${response.successCount} success, ${response.failureCount} failed`
    );

    // Log failures สำหรับ debug
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`  Token ${idx} failed:`, resp.error?.message);
        }
      });
    }

    return response;
  } catch (error) {
    console.error("❌ FCM send failed:", error.message);
    throw error;
  }
}

/**
 * ดึง FCM tokens ทั้งหมดจาก users collection
 * @returns {Promise<string[]>} Array ของ tokens ที่ไม่ null/empty
 */
export async function getAllFCMTokens() {
  initFirebase();

  try {
    const usersSnapshot = await firestoreDb
      .collection("users")
      .where("fcmToken", "!=", null)
      .get();

    const tokens = [];
    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.fcmToken && data.fcmToken.trim() !== "") {
        tokens.push(data.fcmToken);
      }
    });

    console.log(`📱 Found ${tokens.length} FCM tokens`);
    return tokens;
  } catch (error) {
    console.error("❌ Failed to get FCM tokens:", error.message);
    throw error;
  }
}

/**
 * ดึง FCM tokens เฉพาะ user ที่ยังไม่ได้ลง worklog วันนี้
 * @param {string} date - วันที่ในรูปแบบ YYYY-MM-DD
 * @returns {Promise<Array<{uid: string, token: string, displayName: string}>>}
 */
export async function getUsersWithoutTodayLog(date) {
  initFirebase();

  try {
    // 1. ดึง users ทั้งหมดที่มี fcmToken
    const usersSnapshot = await firestoreDb
      .collection("users")
      .where("fcmToken", "!=", null)
      .get();

    const usersWithToken = [];
    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.fcmToken && data.fcmToken.trim() !== "") {
        usersWithToken.push({
          uid: doc.id,
          token: data.fcmToken,
          displayName: data.displayName || data.nickname || data.fullName || "",
        });
      }
    });

    if (usersWithToken.length === 0) {
      return [];
    }

    // 2. ดึง worklogs วันนี้
    const worklogsSnapshot = await firestoreDb
      .collection("worklogs")
      .where("date", "==", date)
      .get();

    const loggedUserIds = new Set();
    worklogsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.employeeId) {
        loggedUserIds.add(data.employeeId);
      }
    });

    // 3. Filter เฉพาะ user ที่ยังไม่ได้ลง
    const usersWithoutLog = usersWithToken.filter(
      (user) => !loggedUserIds.has(user.uid)
    );

    console.log(
      `📊 Users: ${usersWithToken.length} total, ${usersWithoutLog.length} without logs today`
    );

    return usersWithoutLog;
  } catch (error) {
    console.error("❌ Failed to get users without logs:", error.message);
    throw error;
  }
}

/**
 * ดึง reminder settings จาก Firestore
 * @returns {Promise<{reminderTime: string, reminderDays: string[]}>}
 */
export async function getReminderSettings() {
  initFirebase();

  try {
    const settingsDoc = await firestoreDb
      .collection("settings")
      .doc("system")
      .get();

    if (!settingsDoc.exists) {
      // Default settings
      return {
        reminderTime: "17:00",
        reminderDays: ["mon", "tue", "wed", "thu", "fri"],
      };
    }

    const data = settingsDoc.data();
    return {
      reminderTime: data.pushReminderTime || data.reminderTime || "17:00",
      reminderDays: data.reminderDays || ["mon", "tue", "wed", "thu", "fri"],
      enabled: data.enablePushNotifications !== false,
    };
  } catch (error) {
    console.error("❌ Failed to get reminder settings:", error.message);
    console.warn("⚠️ Using default reminder settings due to Firestore error");
    return {
      reminderTime: "17:00",
      reminderDays: ["mon", "tue", "wed", "thu", "fri"],
      enabled: true,
    };
  }
}

/**
 * ตรวจสอบว่าวันนี้อยู่ใน reminderDays หรือไม่
 * @param {string[]} reminderDays - Array ของวัน เช่น ["mon", "tue"]
 * @returns {boolean}
 */
export function isReminderDay(reminderDays) {
  const dayMap = {
    0: "sun",
    1: "mon",
    2: "tue",
    3: "wed",
    4: "thu",
    5: "fri",
    6: "sat",
  };

  const today = dayMap[new Date().getDay()];
  return reminderDays.includes(today);
}

/**
 * ตรวจสอบว่าเวลาปัจจุบันตรงกับ reminderTime หรือไม่ (±5 นาที)
 * @param {string} reminderTime - เวลาในรูปแบบ "HH:MM"
 * @returns {boolean}
 */
export function isReminderTime(reminderTime) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const [hour, minute] = reminderTime.split(":").map(Number);
  const targetTime = hour * 60 + minute;

  // อนุญาต ±5 นาที
  const diff = Math.abs(currentTime - targetTime);
  return diff <= 5;
}
