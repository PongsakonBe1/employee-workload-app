"use client";

import { useEffect, useState } from "react";
import { collection, getDocsFromServer, query, where } from "firebase/firestore";
import { adaptLegacyCalendarForDisplay } from "../lib/calendarDataAdapter";
import { calendarWeekday, expandCalendar, validCalendarDate } from "../lib/calendarView";
import { assignedDlRounds } from "../lib/dlQuickLog";
import { db } from "../lib/firebase";

const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const rows = snapshot => snapshot.docs.map(document => ({ ...document.data(), id: document.id }));
const loading = { status: "loading", items: [] };
const empty = { status: "idle", items: [] };

export function useWorklogRecordContext(employeeId, date, revision) {
  const [worklogs, setWorklogs] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const validDate = validCalendarDate(date);
  const worklogKey = employeeId && validDate ? JSON.stringify([employeeId, date, revision]) : null;

  useEffect(() => {
    if (!worklogKey) return;
    let current = true;
    const selected = query(collection(db, "worklogs"), where("employeeId", "==", employeeId), where("date", "==", date));
    getDocsFromServer(selected).then(snapshot => {
      const items = rows(snapshot).sort((a, b) =>
        (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0) ||
        (b.createdAt?.nanoseconds ?? 0) - (a.createdAt?.nanoseconds ?? 0) ||
        String(b.time ?? "").localeCompare(String(a.time ?? "")));
      if (current) setWorklogs({ key: worklogKey, items: items.slice(0, 3), count: items.length, status: "ready" });
    }).catch(() => {
      if (current) setWorklogs({ key: worklogKey, status: "error", items: [] });
    });
    return () => { current = false; };
  }, [date, employeeId, worklogKey]);

  useEffect(() => {
    if (!validDate) return;
    let current = true;
    const day = weekdays[calendarWeekday(date)];
    Promise.all([
      getDocsFromServer(query(collection(db, "classroomSchedules"), where("isActive", "==", true), where("dayOfWeek", "==", day))),
      getDocsFromServer(query(collection(db, "dlExamSchedules"), where("date", "==", date))),
    ]).then(([classroom, dl]) => {
      const dlRecords = rows(dl);
      const { data, unavailable } = adaptLegacyCalendarForDisplay({ classroomSchedules: rows(classroom), dlExamSchedules: dlRecords, users: [] });
      const items = expandCalendar(data, { start: date, end: date });
      if (current) setSchedule({ date, items, dlRecords, unavailable, status: "ready" });
    }).catch(() => {
      if (current) setSchedule({ date, status: "error", items: [] });
    });
    return () => { current = false; };
  }, [date, validDate]);

  const selectedSchedule = validDate ? (schedule?.date === date ? schedule : loading) : empty;
  return {
    worklogs: worklogKey ? (worklogs?.key === worklogKey ? worklogs : loading) : empty,
    schedule: selectedSchedule,
    dlRounds: selectedSchedule.status === "ready" ? assignedDlRounds(selectedSchedule.items, selectedSchedule.dlRecords, employeeId) : [],
  };
}
