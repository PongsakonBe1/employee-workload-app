"use client";

import { AppShell } from "../../components/AppShell";
import RoomEquipmentStatus from "../../components/RoomEquipmentStatus";

export default function ResourcesPage() {
  return <AppShell showBreadcrumb={false}>
    <RoomEquipmentStatus directory />
  </AppShell>;
}
