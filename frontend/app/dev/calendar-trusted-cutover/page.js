import { notFound } from "next/navigation";
import CutoverQa from "./qa";
export const metadata = { title: "Development — Trusted Calendar Cutover QA", robots: { index: false, follow: false } };
export default function Page() {
  if (process.env.NODE_ENV !== "development" || process.env.CALENDAR_TRUSTED_DENIAL_UI !== "1") notFound();
  return <CutoverQa />;
}
