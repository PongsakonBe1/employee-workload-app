"use client";

import { useMemo, useState } from "react";
import { PlanningWorkspaceView } from "./PlanningWorkspaceView";
import { useRouter } from "next/navigation";
import { WorkspaceFrame } from "../../../components/ui/WorkspaceFrame";
import { Dialog } from "../../../components/ui/Dialog";
import { GlassButton } from "../../../components/ui/GlassControls";
import { usePreviewState } from "../previewState";
import { useRecordLedger } from "../record/store";
import { people, tasks } from "../record/fixtures";
import { previewDestination } from "../../../lib/previewNavigation";
import { planningRange, planningData } from "../../../lib/planningPreview";
import { DEFAULT_ASSESSMENT_MAPPING } from "../../../lib/assessmentPreview";
export default function PlanningWorkspace({
  mode
}) {
  const router = useRouter(),
    {
      data,
      revision
    } = useRecordLedger();
  const [role, setRole] = usePreviewState("record.role", "staff"),
    [personId, setPersonId] = usePreviewState("record.person", people[0].id);
  const [dateTime] = usePreviewState("record.datetime", {
    date: "2026-11-06",
    time: "10:55"
  });
  const person = people.find(item => item.id === personId) || people[0],
    actor = {
      id: person.id,
      role
    };
  const [selection, setSelection] = usePreviewState("planning.selection", () => ({
    mode: "week",
    anchor: dateTime.date,
    range: planningRange("week", dateTime.date)
  }));
  const [employee, setEmployee] = usePreviewState("planning.employee", "all"),
    [profiles, setProfiles] = usePreviewState("planning.jd", {});
  const [pageSize, setPageSize] = useState(1000);
  const [unavailable, setUnavailable] = useState(false);
  const [taskView, setTaskView] = usePreviewState("planning.taskView", "popular");
  const [assessmentMapping, setAssessmentMapping] = usePreviewState("planning.assessment.mapping", {
    ...DEFAULT_ASSESSMENT_MAPPING
  });
  const [stress, setStress] = usePreviewState("planning.stress", false);
  const [stressPersonOnly, setStressPersonOnly] = usePreviewState("planning.stressPersonOnly", false);
  const stressRows = useMemo(() => Array.from({
    length: 1005
  }, (_, index) => ({
    id: `planning-stress-${String(index).padStart(4, "0")}`,
    employeeId: people[stressPersonOnly ? 0 : index % people.length].id,
    date: "2026-11-06",
    time: "09:00",
    minorTask: tasks[index % tasks.length].label,
    comment: "ข้อมูลสังเคราะห์สำหรับตรวจการโหลดหลายหน้า",
    comboGroupId: index < 4 ? "planning-stress-combo" : null
  })), [stressPersonOnly]);
  const rawLogs = stress ? stressRows : data.logs;
  const result = useMemo(() => planningData(rawLogs, people, selection.range, {
    id: person.id,
    role
  }, employee, pageSize), [rawLogs, selection.range, person.id, role, employee, pageSize]);
  function setScope(nextRole, nextPerson = person.id) {
    setRole(nextRole);
    setPersonId(nextPerson);
    setEmployee("all");
    setPageSize(1000);
  }
  function navigate(href) {
    const destination = previewDestination(href);
    if (destination) router.push(destination);
    else setUnavailable(true);
  }
  return <WorkspaceFrame user={{
    uid: person.id,
    displayName: person.displayName,
    initial: person.initial,
    role
  }} pathname={mode === "staff" ? "/admin/staff-analytics" : "/dashboard"} glassMode="quick" onNavigate={navigate}>
      <PlanningWorkspaceView key={`${role}:${person.id}`} mode={mode} actor={actor} person={person} people={people} tasks={tasks}
        result={result} selection={selection} setSelection={value => { setSelection(value); setPageSize(1000); }}
        employee={employee} setEmployee={value => { setEmployee(value); setPageSize(1000); }} onLoadMore={() => setPageSize(value => value + 1000)}
        navigate={navigate} taskView={taskView} setTaskView={setTaskView} profiles={profiles} setProfiles={setProfiles}
        assessmentMapping={assessmentMapping} setAssessmentMapping={setAssessmentMapping} rawLogs={rawLogs} preview stress={stress} revision={revision}>
      <details className="planning-test-controls"><summary>ตัวเลือกตรวจแบบ · Development</summary><label className="ui-field"><span>บทบาทตัวอย่าง</span><select className="apple-input" aria-label="บทบาทตัวอย่าง" value={role} onChange={event => setScope(event.target.value)}>{["staff", "admin", "superadmin"].map(value => <option key={value}>{value}</option>)}</select></label><label className="ui-field"><span>เจ้าหน้าที่ตัวอย่าง</span><select className="apple-input" aria-label="เจ้าหน้าที่ตัวอย่าง" value={person.id} onChange={event => setScope(role, event.target.value)}>{people.map(item => <option value={item.id} key={item.id}>{item.displayName}</option>)}</select></label><label className="planning-test-toggle"><input type="checkbox" checked={stress} onChange={event => {
            setStress(event.target.checked);
            setPageSize(1000);
          }} />ชุดทดสอบ 1,005 กิจกรรม (6 พ.ย. 2569)</label>{stress && <label className="planning-test-toggle"><input type="checkbox" checked={stressPersonOnly} onChange={event => {
            setStressPersonOnly(event.target.checked);
            setPageSize(1000);
          }} />รวมชุดทดสอบไว้ที่เจ้าหน้าที่ A (1,005 บันทึก)</label>}<p className="ui-caption">เริ่มใหม่เมื่อ refresh · ใช้ role จำลอง ไม่ใช่ Auth จริง · ไม่มี Firebase requests · ชุดทดสอบปริมาณมากไม่เขียนทับบันทึกงาน</p></details>
      </PlanningWorkspaceView>
      {unavailable && <Dialog open onClose={() => setUnavailable(false)} title="หน้านี้ยังไม่พร้อมใน develop"><p>ส่วนนี้ยังอยู่นอกเฟสที่ย้ายมา ตรวจเฉพาะหน้าที่เปิดใช้ใน development ได้ก่อน</p><GlassButton mode="quick" onClick={() => navigate("/worklogs")}>เปิดประวัติงาน</GlassButton></Dialog>}
  </WorkspaceFrame>;
}
