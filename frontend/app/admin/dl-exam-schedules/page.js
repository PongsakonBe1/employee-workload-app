"use client";

import { AppShell } from "../../../components/AppShell";
import DLExamManager from "../../../components/DLExamManager";

export default function DLExamSchedulesPage() {
  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <DLExamManager />
      </div>
    </AppShell>
  );
}
