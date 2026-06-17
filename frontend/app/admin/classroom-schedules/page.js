"use client";

import { AppShell } from "../../../components/AppShell";
import ScheduleManager from "../../../components/ScheduleManager";

export default function ClassroomSchedulesPage() {
  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <ScheduleManager />
      </div>
    </AppShell>
  );
}
