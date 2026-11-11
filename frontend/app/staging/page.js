import { Suspense } from "react";
import { notFound } from "next/navigation";
import { calendarStagingEntryEnabled } from "../../lib/calendarStagingEntry";
import StagingHome from "./Home";
import "../../components/calendar/calendar.css";
export const metadata = { title: "Staging — Workspace", robots: { index: false, follow: false } };
export default function Page() {
  if (!calendarStagingEntryEnabled(process.env.NODE_ENV, process.env.NEXT_PUBLIC_CALENDAR_STAGING_ENTRY)) notFound();
  return <Suspense fallback={<main role="status">กำลังเปิด staging…</main>}><StagingHome /></Suspense>;
}
