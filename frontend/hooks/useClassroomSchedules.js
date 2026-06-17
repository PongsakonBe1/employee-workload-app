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
 * Hook สำหรับจัดการตารางเรียนห้องชั้น 4
 */
export function useClassroomSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [upcomingEndTimes, setUpcomingEndTimes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const FLOOR4_ROOMS = ["401", "402", "406", "407"];
  const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  /**
   * ดึงตารางเรียนทั้งหมด
   */
  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, "classroomSchedules"),
        where("isActive", "==", true),
        orderBy("dayOfWeek", "asc"),
        orderBy("startTime", "asc")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSchedules(data);
      return data;
    } catch (err) {
      console.error("Error fetching schedules:", err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * ดึงตารางเรียนวันนี้
   */
  const fetchTodaySchedules = useCallback(async () => {
    const today = new Date();
    const dayOfWeek = DAYS[today.getDay()];

    try {
      const q = query(
        collection(db, "classroomSchedules"),
        where("isActive", "==", true),
        where("dayOfWeek", "==", dayOfWeek),
        orderBy("startTime", "asc")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTodaySchedules(data);
      return data;
    } catch (err) {
      console.error("Error fetching today schedules:", err);
      return [];
    }
  }, []);

  /**
   * ตรวจสอบว่าห้องกำลังใช้งานอยู่หรือไม่
   */
  const isRoomInUse = useCallback((room, time = null) => {
    const checkTime = time || getCurrentTime();
    const today = new Date();
    const dayOfWeek = DAYS[today.getDay()];

    const roomSchedules = todaySchedules.filter(
      (s) => s.room === room && s.dayOfWeek === dayOfWeek
    );

    return roomSchedules.some((schedule) => {
      return checkTime >= schedule.startTime && checkTime < schedule.endTime;
    });
  }, [todaySchedules]);

  /**
   * ดึงห้องที่ใกล้จะปิด (ภใน X นาที)
   */
  const getUpcomingEndTimes = useCallback((minutes = 15) => {
    const now = new Date();
    const currentTime = getCurrentTime();
    const dayOfWeek = DAYS[now.getDay()];

    const upcoming = todaySchedules.filter((schedule) => {
      if (schedule.dayOfWeek !== dayOfWeek) return false;

      const endTime = schedule.endTime;
      const diff = timeDiffInMinutes(currentTime, endTime);

      return diff > 0 && diff <= minutes;
    });

    setUpcomingEndTimes(upcoming);
    return upcoming;
  }, [todaySchedules]);

  /**
   * สร้างตารางเรียนใหม่
   */
  const createSchedule = async (scheduleData) => {
    try {
      const docRef = await addDoc(collection(db, "classroomSchedules"), {
        ...scheduleData,
        isActive: true,
        createdAt: serverTimestamp(),
      });
      await fetchSchedules();
      await fetchTodaySchedules();
      return docRef.id;
    } catch (err) {
      console.error("Error creating schedule:", err);
      throw err;
    }
  };

  /**
   * อัปเดตตารางเรียน
   */
  const updateSchedule = async (id, updateData) => {
    try {
      await updateDoc(doc(db, "classroomSchedules", id), {
        ...updateData,
        updatedAt: serverTimestamp(),
      });
      await fetchSchedules();
      await fetchTodaySchedules();
    } catch (err) {
      console.error("Error updating schedule:", err);
      throw err;
    }
  };

  /**
   * ลบตารางเรียน (soft delete)
   */
  const deleteSchedule = async (id) => {
    try {
      await updateDoc(doc(db, "classroomSchedules", id), {
        isActive: false,
        deletedAt: serverTimestamp(),
      });
      await fetchSchedules();
      await fetchTodaySchedules();
    } catch (err) {
      console.error("Error deleting schedule:", err);
      throw err;
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchSchedules();
    fetchTodaySchedules();

    // Refresh every 5 minutes
    const interval = setInterval(() => {
      fetchTodaySchedules();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchSchedules, fetchTodaySchedules]);

  return {
    schedules,
    todaySchedules,
    upcomingEndTimes,
    loading,
    error,
    FLOOR4_ROOMS,
    DAYS,
    fetchSchedules,
    fetchTodaySchedules,
    isRoomInUse,
    getUpcomingEndTimes,
    createSchedule,
    updateSchedule,
    deleteSchedule,
  };
}

// Helper functions
function getCurrentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function timeDiffInMinutes(time1, time2) {
  const [h1, m1] = time1.split(":").map(Number);
  const [h2, m2] = time2.split(":").map(Number);
  return (h2 * 60 + m2) - (h1 * 60 + m1);
}

export default useClassroomSchedules;
