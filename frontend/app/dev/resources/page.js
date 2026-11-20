import { notFound } from "next/navigation";
import ResourcesWorkspace from "./workspace";
import "./resources.css";
import "../record/record.css";
export const metadata = {
  title: "Development — ห้องและทรัพยากร",
  robots: {
    index: false,
    follow: false
  }
};
export default function ResourcesPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <ResourcesWorkspace mode="resources" />;
}
