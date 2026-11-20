import { notFound } from "next/navigation";
import DevelopmentWorkspace from "./workspace";

export const metadata = { title: "Development — UI Foundation", robots: { index: false, follow: false } };

export default function DevelopmentUIPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <DevelopmentWorkspace />;
}
