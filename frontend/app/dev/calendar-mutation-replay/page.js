import { notFound } from "next/navigation";
import ReplayQa from "./replay";
export const metadata = { title: "Development — Mutation Receipt Replay", robots: { index: false, follow: false } };
export default function Page() {
  if (process.env.NODE_ENV !== "development" || process.env.NEXT_PUBLIC_CALENDAR_STAGING_ENTRY !== "1") notFound();
  return <ReplayQa />;
}
