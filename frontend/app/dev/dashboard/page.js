import { notFound } from "next/navigation";
import PlanningWorkspace from "./workspace";
import "./planning.css";
export const metadata = {
  title: "Development — ภาพรวมงาน",
  robots: {
    index: false,
    follow: false
  }
};
export default function DashboardPreview() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <PlanningWorkspace mode="dashboard" />;
}
