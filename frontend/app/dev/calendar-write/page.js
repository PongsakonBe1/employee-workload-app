import { notFound } from "next/navigation";
import EmulatorCalendar from "../calendar-readonly/preview";
import "../calendar/calendar.css";
export const metadata = {
  title: "Development — Calendar Writer Emulator",
  robots: {
    index: false,
    follow: false
  }
};
export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <EmulatorCalendar writable />;
}
