"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { StagingAppShell } from "../../components/staging/StagingAppShell";
import { useStagingWorkspace } from "../../components/staging/StagingWorkspaceProvider";
import { stagingEntrySection } from "../../lib/calendarStagingEntry";
export default function StagingHome() {
  const params = useSearchParams(), { user } = useStagingWorkspace();
  const section = stagingEntrySection(params.get("section"), user?.role);
  return <StagingAppShell pathname={section.href}><div className="ui-page-heading"><h1>{section.label}</h1><p>Staging · พื้นที่ทดลองของทีม</p></div><section className="apple-panel p-6"><h2>{section.id === "dashboard" ? "ปฏิทินพร้อมให้ทดลอง" : "ส่วนนี้ยังไม่เปิดในรอบทดสอบ"}</h2><p>{section.id === "dashboard" ? "ดูตารางเรียน ตารางสอบ และรายละเอียดห้อง ผ่านเมนูตาราง" : "กลับไปดูปฏิทินเพื่อทดสอบตารางและการใช้ห้องได้"}</p><Link href="/calendar" className="cal-text-button">เปิดปฏิทิน staging</Link></section></StagingAppShell>;
}
