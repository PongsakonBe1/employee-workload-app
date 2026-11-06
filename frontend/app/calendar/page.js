"use client";

import { AppShell } from "../../components/AppShell";
import RoomUsageCalendar from "../../components/RoomUsageCalendar";

export default function CalendarPage() {
  return <AppShell>
    <div className="ui-page-heading">
      <h1>ตารางและการใช้ห้อง</h1>
      <p>ตารางเรียนและการสอบ จากข้อมูลตารางเดิม</p>
    </div>
    <section className="apple-panel p-4 sm:p-6"><RoomUsageCalendar /></section>
  </AppShell>;
}
