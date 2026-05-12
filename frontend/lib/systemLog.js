"use client";

import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase";
import { auth } from "./firebase";

/**
 * บันทึก system log สำหรับ superadmin ตรวจสอบ
 * @param {string} action - ประเภท action (CREATE_WORKLOG, UPDATE_WORKLOG, DELETE_WORKLOG, etc.)
 * @param {string} details - รายละเอียดเพิ่มเติม
 * @param {string} targetUser - user ที่ถูกกระทำ (optional)
 */
export async function logSystemAction(action, details = "", targetUser = null) {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("[SystemLog] No current user, skipping log");
      return;
    }

    await addDoc(collection(db, "systemLogs"), {
      timestamp: new Date(),
      userId: currentUser.uid,
      userEmail: currentUser.email,
      userName: currentUser.displayName || currentUser.email,
      action,
      details,
      targetUser, // user ที่ถูกกระทำ (เช่น admin สร้าง worklog ให้ staff คนไหน)
      type: "action",
    });

    console.log(`[SystemLog] ${action}: ${details}`);
  } catch (err) {
    // ไม่ throw error เพื่อไม่ให้ block การทำงานหลัก
    console.error("[SystemLog] Error:", err);
  }
}

// Predefined action types
export const SystemActions = {
  // Auth
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  
  // Worklogs - Staff
  CREATE_WORKLOG: "CREATE_WORKLOG",
  UPDATE_WORKLOG: "UPDATE_WORKLOG",
  DELETE_WORKLOG: "DELETE_WORKLOG",
  
  // Worklogs - Admin
  ADMIN_CREATE_WORKLOG: "ADMIN_CREATE_WORKLOG",
  
  // Export
  REQUEST_EXPORT: "REQUEST_EXPORT",
  APPROVE_EXPORT: "APPROVE_EXPORT",
  REJECT_EXPORT: "REJECT_EXPORT",
  DOWNLOAD_EXPORT: "DOWNLOAD_EXPORT",
  
  // User Management - Admin
  APPROVE_USER: "APPROVE_USER",
  REJECT_USER: "REJECT_USER",
  UPDATE_USER_ROLE: "UPDATE_USER_ROLE",
  DELETE_USER: "DELETE_USER",
  UPDATE_PROFILE: "UPDATE_PROFILE",
};
