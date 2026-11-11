"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CalendarWorkspace from "../../components/calendar/CalendarWorkspace";
import { GlassButton } from "../../components/ui/GlassControls";
import { StagingSessionGate, useStagingWorkspace } from "../../components/staging/StagingWorkspaceProvider";
import { resolveStagingHref } from "../../lib/calendarStagingEntry";
import { calendarToday } from "../../lib/calendarView";
import "../../components/calendar/calendar.css";
const empty = { rules: [], events: [] };
function ConnectedCalendar() {
  const { user, logout, read, refresh, stats } = useStagingWorkspace(), router = useRouter();
  const userId = user?.id;
  const [range, setRange] = useState(null), [snapshot, setSnapshot] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(""), [revision, setRevision] = useState(0);
  const changeRange = useCallback((start, end) => setRange(previous => previous?.start === start && previous.end === end ? previous : { start, end }), []);
  useEffect(() => {
    if (!range || !userId) return;
    let active = true, timer;setBusy(true);setSnapshot(null);setError("");
    Promise.race([read(range.start, range.end), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("timeout")), 12000); })]).then(result => { if (active) setSnapshot(result); }).catch(() => { if (active) setError("อ่านตารางไม่สำเร็จ โปรดโหลดข้อมูลอีกครั้ง"); }).finally(() => { clearTimeout(timer);if (active) setBusy(false); });
    return () => { active = false;clearTimeout(timer); };
  }, [range, userId, read, revision]);
  const counts = stats(), requests = counts ? counts.identity + counts.directory + counts.classrooms + counts.months : 0;
  const controls = <section className="cal-import-dataset-note" aria-label="ปฏิทิน staging อ่านอย่างเดียว"><strong>Staging · อ่านอย่างเดียว</strong><p>ดูตารางเรียน ตารางสอบ และวันหยุดในพื้นที่ทดสอบ</p><GlassButton disabled={busy} onClick={() => { refresh();setRevision(value => value + 1); }}>โหลดข้อมูล staging ใหม่</GlassButton><p role="status">{busy ? "กำลังอ่านตาราง staging…" : snapshot ? `อ่าน staging สำเร็จ · ${snapshot.data.rules.length} ตารางเรียน / ${snapshot.data.events.length} รอบสอบ` : "รออ่านตาราง staging"}</p>{counts && <p className="ui-caption" data-staging-queries={requests}>คำขออ่านปฏิทิน {requests} ครั้ง · cache {counts.cachedMonths.length} เดือน · ไม่ใช่จำนวน billed reads</p>}{error && <p role="alert">{error}</p>}{snapshot?.issues.length > 0 && <p role="alert">มี {snapshot.issues.length} รายการข้อมูลไม่ครบและยังไม่แสดง</p>}<a href="/dev/calendar-staging" target="_blank" rel="noreferrer" className="cal-text-button">เปิดหน้าทดลองเดิม</a></section>;
  return <CalendarWorkspace initialDate={calendarToday()} stateKey={`staging-calendar-${user.id}`} frame={{ integrated: true, user: { ...user, uid: user.id }, pathname: "/calendar", onLogout: logout, resolveHref: resolveStagingHref, onNavigate: href => router.push(href) }} externalCalendar={{ data: snapshot?.data || empty, identity: snapshot?.identity, people: snapshot?.people || [], controls, canCreate: false, onRangeChange: changeRange, sourceName: "Staging", label: "Staging · อ่านอย่างเดียว" }} />;
}
export default function CalendarEntry() { return <StagingSessionGate><ConnectedCalendar /></StagingSessionGate>; }
