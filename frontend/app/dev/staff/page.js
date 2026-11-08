import { notFound } from "next/navigation";
import PlanningWorkspace from "../dashboard/workspace";
import "../dashboard/planning.css";
export const metadata = {
  title: "Development — การกระจายงานของทีม",
  robots: {
    index: false,
    follow: false
  }
};
export default function StaffPreview() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <PlanningWorkspace mode="staff" />;
}
