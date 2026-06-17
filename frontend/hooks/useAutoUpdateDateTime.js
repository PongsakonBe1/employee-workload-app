"use client";

import { useEffect, useRef, useCallback } from "react";
import { today, nowTime } from "../lib/dateUtils";

/**
 * Hook สำหรับอัปเดตวันที่และเวลาอัตโนมัติเมื่อเปิดหน้าค้างไว้บน desktop
 * 
 * - ทำงานเฉพาะบน desktop (screen width >= 1024px)
 * - อัปเดตทุกนาที
 * - ใช้ visibility API เพื่อหยุดเมื่อแท็บไม่แอคทีฟ แล้ resumed เมื่อกลับมา
 * 
 * @param {Function} setForm - setState function สำหรับอัปเดต form
 * @param {boolean} enabled - เปิด/ปิดการทำงาน (default: true)
 */
export function useAutoUpdateDateTime(setForm, enabled = true) {
  const intervalRef = useRef(null);
  const isDesktopRef = useRef(false);

  const updateDateTime = useCallback(() => {
    // ตรวจสอบว่าเป็น desktop หรือไม่ (lg breakpoint = 1024px)
    const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
    isDesktopRef.current = isDesktop;

    if (!isDesktop || !enabled) return;

    // อัปเดตเฉพาะถ้าเป็นวันนี้ (ไม่ต้องอัปเดตถ้าผู้ใช้เลือกวันอื่น)
    setForm((current) => {
      const currentDate = current.date;
      const newDate = today();
      const newTime = nowTime();

      // ถ้าเป็นวันนี้และเวลาเปลี่ยน ให้อัปเดต
      if (currentDate === newDate && current.time !== newTime) {
        return { ...current, time: newTime };
      }

      // ถ้าวันเปลี่ยน (ข้ามวัน) ให้อัปเดตทั้งวันและเวลา
      if (currentDate !== newDate) {
        return { ...current, date: newDate, time: newTime };
      }

      return current;
    });
  }, [setForm, enabled]);

  useEffect(() => {
    if (!enabled) return;

    // ตรวจสอบครั้งแรกว่าเป็น desktop หรือไม่
    const checkDesktop = () => {
      const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
      isDesktopRef.current = isDesktop;
      return isDesktop;
    };

    if (!checkDesktop()) return;

    // สร้าง interval อัปเดตทุกนาที
    intervalRef.current = setInterval(updateDateTime, 60000); // 60 วินาที

    // ใช้ Page Visibility API เพื่อจัดการเมื่อแท็บไม่แอคทีฟ
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // หยุด interval เมื่อแท็บไม่แอคทีฟ
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        // กลับมาแอคทีฟ: อัปเดตทันทีแล้วเริ่ม interval ใหม่
        updateDateTime();
        if (!intervalRef.current && checkDesktop()) {
          intervalRef.current = setInterval(updateDateTime, 60000);
        }
      }
    };

    // จัดการเมื่อ resize หน้าจอ
    const handleResize = () => {
      const isDesktop = checkDesktop();
      if (isDesktop && !intervalRef.current) {
        // เปลี่ยนเป็น desktop: เริ่ม interval
        intervalRef.current = setInterval(updateDateTime, 60000);
      } else if (!isDesktop && intervalRef.current) {
        // เปลี่ยนเป็น mobile: หยุด interval
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("resize", handleResize);
    };
  }, [updateDateTime, enabled]);
}
