"use client";

import dynamic from "next/dynamic";
import { calendarStagingEntryEnabled } from "../../lib/calendarStagingEntry";
import LiveCalendar from "./live";
import "../../components/calendar/calendar.css";
const StagingCalendar = dynamic(() => import("../staging/CalendarEntry"), { ssr: false });

export default function CalendarPage() {
  return calendarStagingEntryEnabled(process.env.NODE_ENV, process.env.NEXT_PUBLIC_CALENDAR_STAGING_ENTRY) ? <StagingCalendar /> : <LiveCalendar />;
}
