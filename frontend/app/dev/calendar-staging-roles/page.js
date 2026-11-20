import { notFound } from "next/navigation";
import StagingCalendar from "../calendar-staging/preview";
import "../calendar/calendar.css";
export const metadata = { title: "Development — Staging Role QA", robots: { index: false, follow: false } };
export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <StagingCalendar writable roleQa />;
}
