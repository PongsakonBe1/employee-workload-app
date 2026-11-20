"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, getDocsFromServer, query, where } from "firebase/firestore";
import { AppShell } from "../../components/AppShell";
import { useAuth } from "../../components/AuthProvider";
import CalendarWorkspace from "../../components/calendar/CalendarWorkspace";
import { GlassButton } from "../../components/ui/GlassControls";
import { adaptLegacyCalendarForDisplay } from "../../lib/calendarDataAdapter";
import { calendarDates, calendarRange, calendarToday } from "../../lib/calendarView";
import { canUseProductionCalendarCreate, createProductionCalendarSubmission } from "../../lib/calendarProductionCreate";
import { PRODUCTION_CALENDAR_API_ORIGIN } from "../../lib/calendarServerProtocol";
import { createTrustedCalendarTransport } from "../../lib/calendarTrustedTransport";
import { auth, db } from "../../lib/firebase";

const emptyCalendar = { rules: [], events: [] };
const cacheFor = 120_000;
const rows = snapshot => snapshot.docs.map(document => ({ ...document.data(), id: document.id }));

function CalendarContent({ user }) {
  const userId = user.uid;
  const [initialDate] = useState(calendarToday);
  const [range, setRange] = useState(null);
  const [revision, setRevision] = useState(0);
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState(false);
  const cacheRef = useRef(new Map());
  const [loading, setLoading] = useState(true);
  const [writeState, setWriteState] = useState({ saving: false, phase: null, draft: null });
  const [readBack, setReadBack] = useState(null);
  const writeGeneration = useRef(0);
  const canCreate = canUseProductionCalendarCreate({
    flag: process.env.NEXT_PUBLIC_CALENDAR_PRODUCTION_CREATE,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    apiOrigin: process.env.NEXT_PUBLIC_API_URL,
    user,
  });
  const writer = useMemo(() => {
    if (!canCreate) return null;
    const getUser = () => auth.currentUser?.uid === userId ? auth.currentUser : null;
    return createProductionCalendarSubmission({
      transport: createTrustedCalendarTransport({ getUser, origin: PRODUCTION_CALENDAR_API_ORIGIN, readiness: true }),
      isCurrent: () => Boolean(getUser()),
      onState: setWriteState,
    });
  }, [canCreate, userId]);

  const setVisibleRange = useCallback((start, end) => {
    setRange(previous => previous?.start === start && previous?.end === end ? previous : { start, end });
  }, []);

  function refresh() {
    cacheRef.current.clear();
    setRevision(current => current + 1);
  }

  async function create(input) {
    const result = await writer.create(input);
    writeGeneration.current++;
    setReadBack("pending");
    refresh();
    return result;
  }

  useEffect(() => {
    if (!range) return;
    let current = true;
    const generation = writeGeneration.current;
    const stillCurrent = () => current && generation === writeGeneration.current;
    const cache = cacheRef.current;
    function cachedRead(key, reference) {
      const existing = cache.get(key);
      if (existing && existing.expires > Date.now()) return existing.promise;
      const entry = {
        expires: Date.now() + cacheFor,
        promise: getDocsFromServer(reference).then(rows).catch(error => {
          if (cache.get(key) === entry) cache.delete(key);
          throw error;
        })
      };
      cache.delete(key);
      cache.set(key, entry);
      if (cache.size > 8) cache.delete(cache.keys().next().value);
      return entry.promise;
    }
    setLoading(true);
    setError(false);
    const months = [...new Set(calendarDates(range.start, range.end).map(date => date.slice(0, 7)))];
    const exams = months.map(month => {
      const { start, end } = calendarRange(`${month}-01`, "month");
      // Range queries on date use the existing single-field index. Filtering active
      // exams locally also keeps dated documents that have no historical timeSlot.
      return cachedRead(month, query(collection(db, "dlExamSchedules"), where("date", ">=", start), where("date", "<=", end)));
    });
    Promise.all([
      cachedRead("classes", query(collection(db, "classroomSchedules"), where("isActive", "==", true))),
      cachedRead("people", query(collection(db, "users"), where("active", "==", true))),
      Promise.all(exams)
    ]).then(([classroomSchedules, users, byMonth]) => {
      if (stillCurrent()) {
        setSnapshot(adaptLegacyCalendarForDisplay({ classroomSchedules, users, dlExamSchedules: byMonth.flat() }));
        setReadBack(null);
      }
    }).catch(() => {
      if (stillCurrent()) {
        setError(true);
        setSnapshot(null);
        setReadBack(previous => previous ? "failed" : null);
      }
    }).finally(() => {
      if (stillCurrent()) setLoading(false);
    });
    return () => { current = false; };
  }, [range, revision]);

  const controls = <>
    {loading && <p className="ui-caption" role="status">กำลังโหลดตาราง…</p>}
    {error && <div className="cal-import-dataset-note">
      <p role="alert">{readBack === "failed" ? "บันทึกแล้ว แต่โหลดตารางกลับมาไม่สำเร็จ" : "โหลดตารางไม่สำเร็จ"}</p>
      <GlassButton mode="quick" onClick={refresh}>ลองอีกครั้ง</GlassButton>
    </div>}
    {!loading && !error && snapshot?.unavailable > 0 && <p className="ui-caption" role="status">มี {snapshot.unavailable} รายการที่วัน เวลา หรือห้องไม่ครบ</p>}
  </>;

  return <CalendarWorkspace
    frame={{ embedded: true }}
    initialDate={initialDate}
    stateKey={`live-calendar-${userId}`}
    externalCalendar={{
      production: true, sourceName: "ตารางและการใช้ห้อง",
      identity: { id: userId }, data: snapshot?.data || emptyCalendar,
      people: snapshot?.people || [], controls, onRangeChange: setVisibleRange,
      canCreate, saving: writeState.saving, writePhase: writeState.phase,
      uncertainDraft: writeState.draft, writeTarget: canCreate ? "ปฏิทินที่ใช้งานจริง" : "",
      onCreate: writer ? create : undefined,
    }}
  />;
}

export default function LiveCalendar() {
  const { user } = useAuth();
  return <AppShell showBreadcrumb={false}>
    {user && <CalendarContent key={user.uid} user={user} />}
  </AppShell>;
}
