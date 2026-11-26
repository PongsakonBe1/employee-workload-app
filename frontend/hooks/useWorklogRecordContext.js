"use client";

import { useEffect, useState } from "react";
import { collection, getDocsFromServer, query, where } from "firebase/firestore";
import { adaptLegacyCalendarForDisplay } from "../lib/calendarDataAdapter";
import { calendarWeekday, expandCalendar, validCalendarDate } from "../lib/calendarView";
import { assignedDlRounds } from "../lib/dlQuickLog";
import { db } from "../lib/firebase";
import { bangkokRoomClock } from "../lib/worklogResourceSummary";

const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const rows = snapshot => snapshot.docs.map(document => ({ ...document.data(), id: document.id }));
const loading = { status: "loading", items: [] };
const empty = { status: "idle", items: [] };

export const recordStatusRefreshMs = 5 * 60_000;

export function useBangkokRoomClock() {
  const [clock, setClock] = useState(null);
  useEffect(() => {
    let timer;
    function sync() {
      clearTimeout(timer);
      if (document.hidden) return;
      const now = new Date();
      setClock(bangkokRoomClock(now));
      timer = setTimeout(sync, 60_000 - now.getTime() % 60_000);
    }
    sync();
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  return clock;
}

function useDaySchedule(date, refreshEveryMs = 0) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (!date) return;
    let current = true;
    let pending = false;
    let refreshTimer;
    const day = weekdays[calendarWeekday(date)];

    async function load() {
      if (pending) return;
      pending = true;
      try {
        const [classroom, dl] = await Promise.all([
          getDocsFromServer(query(collection(db, "classroomSchedules"), where("isActive", "==", true), where("dayOfWeek", "==", day))),
          getDocsFromServer(query(collection(db, "dlExamSchedules"), where("date", "==", date))),
        ]);
        const dlRecords = rows(dl);
        const { data, unavailable } = adaptLegacyCalendarForDisplay({ classroomSchedules: rows(classroom), dlExamSchedules: dlRecords, users: [] });
        const items = expandCalendar(data, { start: date, end: date });
        if (current) setResult({ date, attempt, items, dlRecords, unavailable, status: "ready" });
      } catch {
        if (current) setResult({ date, attempt, status: "error", items: [] });
      } finally {
        pending = false;
      }
    }

    function refresh() {
      clearTimeout(refreshTimer);
      if (!document.hidden) refreshTimer = setTimeout(load, 400);
    }

    load();
    const interval = refreshEveryMs ? setInterval(refresh, refreshEveryMs) : null;
    if (refreshEveryMs) {
      window.addEventListener("focus", refresh);
      document.addEventListener("visibilitychange", refresh);
    }
    return () => {
      current = false;
      clearTimeout(refreshTimer);
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [date, attempt, refreshEveryMs]);

  const schedule = result?.date === date && result?.attempt === attempt ? result : loading;
  return { schedule: date ? schedule : empty, retry: () => setAttempt(value => value + 1) };
}

export function useWorklogRecordContext(employeeId, date, revision, operationalDate) {
  const [worklogs, setWorklogs] = useState(null);
  const validDate = validCalendarDate(date);
  const worklogKey = employeeId && validDate ? JSON.stringify([employeeId, date, revision]) : null;
  const { schedule: todaySchedule, retry: retryTodaySchedule } = useDaySchedule(operationalDate, recordStatusRefreshMs);
  const { schedule: otherSchedule } = useDaySchedule(operationalDate && validDate && date !== operationalDate ? date : null);
  const selectedSchedule = date === operationalDate ? todaySchedule : otherSchedule;

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

  return {
    worklogs: worklogKey ? (worklogs?.key === worklogKey ? worklogs : loading) : empty,
    schedule: selectedSchedule,
    todaySchedule,
    retryTodaySchedule,
    dlRounds: selectedSchedule.status === "ready" ? assignedDlRounds(selectedSchedule.items, selectedSchedule.dlRecords, employeeId) : [],
  };
}
