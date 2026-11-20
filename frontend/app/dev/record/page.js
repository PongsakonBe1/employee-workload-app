import { notFound } from "next/navigation";
import RecordPreview from "./workspace";
import "./record.css";

export const metadata = { title: "Development — Record · Review 10", robots: { index: false, follow: false } };

export default function RecordPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <RecordPreview />;
}
