import { notFound } from "next/navigation";
import TemplatesWorkspace from "./workspace";
import "./templates.css";
export const metadata = {
  title: "Development — เทมเพลตและ Combo",
  robots: {
    index: false,
    follow: false
  }
};
export default function TemplatesPreview() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <TemplatesWorkspace />;
}
