"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PlanningWorkspaceView } from "../app/dev/dashboard/PlanningWorkspaceView";
import { useAnalyticsPages } from "../hooks/useAnalyticsPages";
import { analyticsActor, analyticsPerson, ANALYTICS_PAGE_SIZE, createAnalyticsReader, filterAnalyticsTeamRows } from "../lib/analyticsWorklogs";
import { DEFAULT_ASSESSMENT_MAPPING } from "../lib/assessmentPreview";
import { calendarToday } from "../lib/calendarView";
import { getMainDutyFromMinorTask, MINOR_TASKS } from "../lib/commentSuggestions";
import { auth, db } from "../lib/firebase";
import { planningAdmin, planningData, planningRange } from "../lib/planningPreview";
import { AppShell } from "./AppShell";
import { useAuth } from "./AuthProvider";
import { GlassButton } from "./ui/GlassControls";

const catalog = MINOR_TASKS.map(label => ({ label, major: getMainDutyFromMinorTask(label) }));
const noProfiles = {};

export function AnalyticsWorkspace({ mode }) {
  return <AppShell showBreadcrumb={false}><ActiveAnalytics mode={mode} /></AppShell>;
}

function ActiveAnalytics({ mode }) {
  const { user } = useAuth();
  const router = useRouter();
  const actor = analyticsActor(user, auth.currentUser?.uid);

  if (!actor) return <p className="planning-warning" role="alert">บัญชีนี้ยังไม่มีสิทธิ์ดูข้อมูลภาระงาน</p>;
  if (mode === "staff" && !planningAdmin(actor)) {
    return <section className="planning-panel">
      <h1>หน้านี้สำหรับผู้ดูแล</h1>
      <p>Staff ดูข้อมูลของตนเองได้ในภาพรวมงาน</p>
      <GlassButton onClick={() => router.push("/dashboard")}>เปิดภาพรวมงาน</GlassButton>
    </section>;
  }
  return <ConnectedAnalytics key={`${actor.id}:${actor.role}`} mode={mode} actor={actor} user={user} navigate={href => router.push(href)} />;
}

function ConnectedAnalytics({ mode, actor: { id, role }, user, navigate }) {
  const actor = useMemo(() => ({ id, role }), [id, role]);
  const admin = planningAdmin(actor);
  const reader = useMemo(() => createAnalyticsReader(db, () => auth.currentUser?.uid, actor), [actor]);
  const person = analyticsPerson(id, user);
  const [selection, setSelection] = useState(() => {
    const anchor = calendarToday();
    return { mode: "week", anchor, range: planningRange("week", anchor) };
  });
  const [directory, setDirectory] = useState({ data: null, error: false });
  const [employee, setEmployee] = useState("all");
  const [pageCount, setPageCount] = useState(1);
  const [retry, setRetry] = useState(0);
  const [directoryAttempt, setDirectoryAttempt] = useState(0);
  const [taskView, setTaskView] = useState("popular");

  useEffect(() => {
    if (!admin) return;
    let current = true;
    reader.directory().then(
      data => { if (current) setDirectory({ data, error: false }); },
      () => { if (current) setDirectory({ data: null, error: true }); }
    );
    return () => { current = false; };
  }, [reader, admin, directoryAttempt]);

  const people = directory.data?.people || [person];
  const selectedEmployee = employee === "all" || people.some(person => person.id === employee) ? employee : "all";
  const page = useAnalyticsPages(!admin || directory.data ? reader : null, selection.range, selectedEmployee, pageCount, retry);
  // Keep unknown historical owners separate from accounts that are known to be inactive.
  const rows = filterAnalyticsTeamRows(page.rows, directory.data?.inactiveIds);
  const result = {
    ...planningData(rows, people, selection.range, actor, selectedEmployee, page.pages * ANALYTICS_PAGE_SIZE),
    partial: Boolean(page.cursor)
  };
  const error = directory.error ? "โหลดรายชื่อเจ้าหน้าที่ไม่สำเร็จ" : page.error ? "โหลดบันทึกงานไม่สำเร็จ" : "";

  return <PlanningWorkspaceView
    mode={mode} actor={actor} person={person} people={people} tasks={catalog} navigate={navigate}
    selection={selection} setSelection={value => { setPageCount(1);setSelection(value); }}
    employee={selectedEmployee} setEmployee={value => { setPageCount(1);setEmployee(value); }}
    result={result} loading={page.loading || admin && !directory.data && !directory.error} error={error}
    onLoadMore={() => setPageCount(page.pages + 1)}
    onRetry={() => {
      if (directory.error) {
        setDirectory({ data: null, error: false });
        setDirectoryAttempt(value => value + 1);
      } else setRetry(value => value + 1);
    }}
    taskView={taskView} setTaskView={setTaskView} profiles={noProfiles}
    assessmentMapping={DEFAULT_ASSESSMENT_MAPPING} reader={reader}
  />;
}
