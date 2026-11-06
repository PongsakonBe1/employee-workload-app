"use client";

import { AppShell } from "../../components/AppShell";
import RoomEquipmentStatus from "../../components/RoomEquipmentStatus";

export default function ResourcesPage() {
  return <AppShell>
    <div className="ui-page-heading">
      <h1>ห้องและทรัพยากร</h1>
      <p>สถานะจาก component ห้องและอุปกรณ์เดิม</p>
    </div>
    <RoomEquipmentStatus />
  </AppShell>;
}
