import { notFound } from "next/navigation";
import CalendarPreview from "./workspace";
import "./calendar.css";

export const metadata = { title: "Development — Calendar · Liquid Glass", robots: { index: false, follow: false } };
export default function CalendarPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <CalendarPreview />;
}
