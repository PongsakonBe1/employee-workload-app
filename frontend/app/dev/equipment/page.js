import { notFound } from "next/navigation";
import ResourcesWorkspace from "../resources/workspace";
import "../resources/resources.css";
import "../record/record.css";
export const metadata = {
  title: "Development — ทะเบียนอุปกรณ์",
  robots: {
    index: false,
    follow: false
  }
};
export default function EquipmentPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <ResourcesWorkspace mode="equipment" />;
}
