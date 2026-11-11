"use client";

import dynamic from "next/dynamic";
import { calendarStagingEntryEnabled } from "../../lib/calendarStagingEntry";
const StagingCalendar = dynamic(() => import("../staging/CalendarEntry"), { ssr: false });
const LegacyCalendar = dynamic(() => import("./legacy"));

export default function CalendarPage() {
  return calendarStagingEntryEnabled(process.env.NODE_ENV, process.env.NEXT_PUBLIC_CALENDAR_STAGING_ENTRY) ? <StagingCalendar /> : <LegacyCalendar />;
}
