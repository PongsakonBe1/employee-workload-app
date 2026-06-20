/**
 * Notification Routes
 * 
 * Endpoints:
 * - POST /api/notify/broadcast - ส่ง push หาทุกคน (superadmin only)
 * - POST /api/notify/daily-reminder - ส่ง reminder เฉพาะคนที่ยังไม่ได้ลง (cron-job.org)
 * - GET /health - Health check สำหรับ Render ping
 */

import { Router } from "express";
import { env } from "../config/env.js";
import {
  initFirebase,
  sendToTokens,
  getAllFCMTokens,
  getUsersWithoutTodayLog,
  getReminderSettings,
  isReminderDay,
  isReminderTime,
} from "../services/fcm.js";

const router = Router();

// Initialize Firebase on module load
try {
  initFirebase();
} catch (error) {
  console.warn("⚠️ Firebase not initialized - notifications will fail");
}

/**
 * Health Check Endpoint
 * ใช้สำหรับ Cron-job.org ping ป้องกัน Render sleep
 * GET /api/notify/health
 */
router.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "icit-workload-backend",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Broadcast Notification
 * ส่ง push notification ไปยังทุก user ที่มี FCM token
 * 
 * Auth: Firebase ID Token + Superadmin role
 * POST /api/notify/broadcast
 * Body: { title: string, body: string, data?: object }
 */
router.post("/broadcast", async (req, res) => {
  try {
    // Verify Firebase ID token + superadmin role
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Missing or invalid Authorization header",
      });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const admin = (await import("firebase-admin")).default;
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // ดึง role จาก Firestore users collection
    const userDoc = await admin.firestore().collection("users").doc(decodedToken.uid).get();
    const userRole = userDoc.exists ? userDoc.data().role : null;
    
    if (userRole !== "superadmin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden - Superadmin role required",
      });
    }

    const { title, body, data = {} } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: title, body",
      });
    }

    // ดึง tokens ทั้งหมด
    const tokens = await getAllFCMTokens();

    if (tokens.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No users with FCM tokens found",
        sentCount: 0,
      });
    }

    // ส่ง notification
    const response = await sendToTokens(tokens, title, body, data);

    return res.status(200).json({
      success: true,
      message: `Broadcast sent to ${response.successCount} users`,
      sentCount: response.successCount,
      failedCount: response.failureCount,
    });
  } catch (error) {
    console.error("❌ Broadcast failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to send broadcast",
      error: error.message,
    });
  }
});

/**
 * Daily Reminder Notification
 * ส่ง reminder เฉพาะ user ที่ยังไม่ได้ลง worklog วันนี้
 *
 * Auth: Cron Secret — รับจาก header "x-cron-secret" หรือ query param "?secret="
 * GET  /api/notify/daily-reminder  (สำหรับ Cron-job.org)
 * POST /api/notify/daily-reminder  (สำหรับ manual trigger)
 */
async function handleDailyReminder(req, res) {
  try {
    const cronSecret = req.headers["x-cron-secret"] || req.query.secret;
    const expectedSecret = env.cronSecret;
    
    if (!cronSecret || !expectedSecret) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Missing cron secret",
      });
    }
    
    // Timing-safe comparison using crypto
    const crypto = await import("crypto");
    const isValid = crypto.timingSafeEqual(
      Buffer.from(cronSecret.padEnd(64, "0").slice(0, 64)),
      Buffer.from(expectedSecret.padEnd(64, "0").slice(0, 64))
    );
    
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Invalid cron secret",
      });
    }

    // ดึง reminder settings
    const { reminderTime, reminderDays, enabled } = await getReminderSettings();

    // ตรวจสอบว่า Push Notification เปิดอยู่
    if (!enabled) {
      return res.status(200).json({
        success: true,
        message: "Push notifications are disabled in settings",
        sentCount: 0,
      });
    }

    // ตรวจสอบว่าวันนี้เป็น reminder day
    if (!isReminderDay(reminderDays)) {
      return res.status(200).json({
        success: true,
        message: "Today is not a reminder day",
        sentCount: 0,
        day: new Date().toLocaleDateString("en-US", { weekday: "long" }),
      });
    }

    // ตรวจสอบเวลา (±5 นาที)
    if (!isReminderTime(reminderTime)) {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}`;
      return res.status(200).json({
        success: true,
        message: `Current time (${currentTime}) does not match reminder time (${reminderTime})`,
        sentCount: 0,
      });
    }

    // ดึงวันที่วันนี้ในรูปแบบ YYYY-MM-DD
    const today = new Date().toISOString().slice(0, 10);

    // ดึง users ที่ยังไม่ได้ลง
    const usersWithoutLog = await getUsersWithoutTodayLog(today);

    if (usersWithoutLog.length === 0) {
      return res.status(200).json({
        success: true,
        message: "All users have logged work today",
        sentCount: 0,
      });
    }

    // ส่ง reminder
    const tokens = usersWithoutLog.map((u) => u.token);
    const title = "⏰ อย่าลืมบันทึกงานวันนี้";
    const body = `สวัสดี! คุณยังไม่ได้บันทึกงานวันนี้ (${today}) กรุณาแวะมาบันทึกงานก่อนเลิกงานนะคะ`;

    const response = await sendToTokens(tokens, title, body, {
      type: "daily_reminder",
      date: today,
    });

    return res.status(200).json({
      success: true,
      message: `Daily reminder sent to ${response.successCount} users`,
      sentCount: response.successCount,
      failedCount: response.failureCount,
      targetUsers: usersWithoutLog.length,
    });
  } catch (error) {
    console.error("❌ Daily reminder failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to send daily reminder",
      error: error.message,
    });
  }
}

router.get("/daily-reminder", handleDailyReminder);
router.post("/daily-reminder", handleDailyReminder);

/**
 * Test Notification (Development only)
 * ส่ง test push ไปยังตัวเอง
 * POST /api/notify/test
 */
router.post("/test", async (req, res) => {
  if (env.nodeEnv === "production") {
    return res.status(403).json({
      success: false,
      message: "Test endpoint not available in production",
    });
  }

  try {
    const { token, title = "Test", body = "Hello from labboy!" } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Missing FCM token",
      });
    }

    const response = await sendToTokens([token], title, body, {
      type: "test",
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      message: "Test notification sent",
      response,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Test failed",
      error: error.message,
    });
  }
});

export { router as notifyRouter };
