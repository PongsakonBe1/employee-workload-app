import { notFound } from "next/navigation";
import HistoryPreview from "./workspace";
import "./history.css";
export const metadata = {
  title: "Development — Work History · Review 10",
  robots: {
    index: false,
    follow: false
  }
};
export default function HistoryPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <HistoryPreview />;
}
