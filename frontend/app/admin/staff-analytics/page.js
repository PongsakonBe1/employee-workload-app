import LegacyPage from "./legacy";
import { AnalyticsWorkspace } from "../../../components/AnalyticsWorkspace";
import "../../../app/dev/dashboard/planning.css";
import "../../../app/dev/dashboard/assessment.css";

export default function Page() {
  return process.env.NEXT_PUBLIC_ANALYTICS_WORKSPACE === "1"
    ? <AnalyticsWorkspace mode="staff" />
    : <LegacyPage />;
}
