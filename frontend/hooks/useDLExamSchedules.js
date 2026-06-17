"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

/**
 * Hook สำหรับจัดการตารางสอบ/คุมสอบ Digital Literacy
 */
export function useDLExamSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * ดึงตารางสอบทั้งหมด
   */
  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, "dlExamSchedules"),
        where("isActive", "==", true),
        orderBy("date", "asc"),
        orderBy("timeSlot", "asc")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSchedules(data);
      return data;
    } catch (err) {
      console.error("Error fetching DL exam schedules:", err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * ดึงตารางสอบวันนี้
   */
  const fetchTodayExams = useCallback(async () => {
    try {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);

      const q = query(
        collection(db, "dlExamSchedules"),
        where("isActive", "==", true),
        where("date", "==", todayStr),
        orderBy("timeSlot", "asc")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      return data;
    } catch (err) {
      console.error("Error fetching today exams:", err);
      return [];
    }
  }, []);

  /**
   * ดึงตารางสอบที่ตัวเองคุมสอบ (สำหรับแจ้งเตือน)
   */
  const fetchMyProctoringDuties = useCallback(async (userId) => {
    try {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);

      const q = query(
        collection(db, "dlExamSchedules"),
        where("isActive", "==", true),
        where("date", "==", todayStr),
        where("proctors", "array-contains", userId),
        orderBy("timeSlot", "asc")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      return data;
    } catch (err) {
      console.error("Error fetching my proctoring duties:", err);
      return [];
    }
  }, []);

  /**
   * ดึงตารางสอบที่กำลังจะถึง (X วัน)
   */
  const fetchUpcomingExams = useCallback(async (days = 7) => {
    try {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + days);

      const todayStr = today.toISOString().slice(0, 10);
      const futureStr = futureDate.toISOString().slice(0, 10);

      const q = query(
        collection(db, "dlExamSchedules"),
        where("isActive", "==", true),
        where("date", ">=", todayStr),
        where("date", "<=", futureStr),
        orderBy("date", "asc"),
        orderBy("timeSlot", "asc")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUpcomingExams(data);
      return data;
    } catch (err) {
      console.error("Error fetching upcoming exams:", err);
      return [];
    }
  }, []);

  /**
   * สร้างตารางสอบใหม่
   */
  const createSchedule = async (scheduleData) => {
    try {
      const docRef = await addDoc(collection(db, "dlExamSchedules"), {
        ...scheduleData,
        isActive: true,
        createdAt: serverTimestamp(),
      });
      await fetchSchedules();
      return docRef.id;
    } catch (err) {
      console.error("Error creating exam schedule:", err);
      throw err;
    }
  };

  /**
   * อัปเดตตารางสอบ
   */
  const updateSchedule = async (id, updateData) => {
    try {
      await updateDoc(doc(db, "dlExamSchedules", id), {
        ...updateData,
        updatedAt: serverTimestamp(),
      });
      await fetchSchedules();
    } catch (err) {
      console.error("Error updating exam schedule:", err);
      throw err;
    }
  };

  /**
   * ลบตารางสอบ (soft delete)
   */
  const deleteSchedule = async (id) => {
    try {
      await updateDoc(doc(db, "dlExamSchedules", id), {
        isActive: false,
        deletedAt: serverTimestamp(),
      });
      await fetchSchedules();
    } catch (err) {
      console.error("Error deleting exam schedule:", err);
      throw err;
    }
  };

  /**
   * ดึงตารางสอบตามเดือน
   */
  const fetchExamsByMonth = useCallback(async (year, month) => {
    try {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = month === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, "0")}-01`;

      const q = query(
        collection(db, "dlExamSchedules"),
        where("isActive", "==", true),
        where("date", ">=", startDate),
        where("date", "<", endDate),
        orderBy("date", "asc"),
        orderBy("timeSlot", "asc")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      return data;
    } catch (err) {
      console.error("Error fetching exams by month:", err);
      return [];
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchSchedules();
    fetchUpcomingExams();
  }, [fetchSchedules, fetchUpcomingExams]);

  return {
    schedules,
    upcomingExams,
    loading,
    error,
    fetchSchedules,
    fetchUpcomingExams,
    fetchTodayExams,
    fetchMyProctoringDuties,
    fetchExamsByMonth,
    createSchedule,
    updateSchedule,
    deleteSchedule,
  };
}

export default useDLExamSchedules;
