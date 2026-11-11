"use client";
import { useRouter } from "next/navigation";
import CalendarWorkspace from "../../../components/calendar/CalendarWorkspace";
import { previewDestination } from "../../../lib/previewNavigation";
import { calendarPeople, initialCalendar } from "./fixtures";
import { legacyCalendarCache } from "./adapterFixtures";
export default function CalendarPreview({ externalCalendar = null }) {
  const router = useRouter();
  return <CalendarWorkspace externalCalendar={externalCalendar} previewData={{ data: initialCalendar, people: calendarPeople, legacyCache: legacyCalendarCache, onNavigate: href => { const target = previewDestination(href);if (target && target !== "/dev/calendar") { router.push(target);return true; }return href === "/calendar"; } }} />;
}
