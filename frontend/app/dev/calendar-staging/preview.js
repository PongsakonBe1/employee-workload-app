"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CalendarPreview from "../calendar/workspace";
import { GlassButton } from "../../../components/ui/GlassControls";
import { createCalendarStagingClient } from "../../../lib/calendarStagingClient";
import { validateCalendarStagingConfig, STAGING_PROJECT } from "../../../lib/calendarStagingConfig";
import { calendarStagingAuthError } from "../../../lib/calendarStagingAuthError";
const empty = {
  rules: [],
  events: []
};
async function bounded(task) {
  let timer;
  try {
    return await Promise.race([task, new Promise((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error("timeout"), {
        code: "timeout"
      })), 12000);
    })]);
  } finally {
    clearTimeout(timer);
  }
}
export default function StagingCalendar() {
  const [config, setConfig] = useState(null),
    [signedIn, setSignedIn] = useState(false),
    [range, setRange] = useState(null),
    [snapshot, setSnapshot] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  const client = useRef(null),
    operation = useRef(0);
  useEffect(() => {
    let active = true;
    const operations = operation,
      controller = new AbortController();
    fetch("/dev-staging-config.json", {
      cache: "no-store",
      signal: controller.signal
    }).then(response => {
      if (!response.ok) throw new Error("config unavailable");
      return response.json();
    }).then(value => {
      const approved = validateCalendarStagingConfig(value);
      if (active) setConfig(approved);
    }).catch(() => {
      if (active) setError("ยังไม่มี configuration ของ staging ที่ตรวจยืนยันแล้ว");
    });
    return () => {
      active = false;
      operations.current++;
      controller.abort();
      client.current?.close().catch(() => {});
      client.current = null;
    };
  }, []);
  const changeRange = useCallback((start, end) => setRange(previous => previous?.start === start && previous.end === end ? previous : {
    start,
    end
  }), []);
  async function login() {
    if (!config || busy) return;
    const current = ++operation.current;
    setBusy(true);
    setError("");
    setSnapshot(null);
    setSignedIn(false);
    try {
      await client.current?.close();
      client.current = createCalendarStagingClient(config);
      await client.current.login();
      if (current === operation.current) setSignedIn(true);
    } catch (failure) {
      if (current === operation.current) {
        setError(calendarStagingAuthError(failure));
        client.current?.close().catch(() => {});
        client.current = null;
      }
    } finally {
      if (current === operation.current) setBusy(false);
    }
  }
  async function logout() {
    operation.current++;
    setSignedIn(false);
    setSnapshot(null);
    setError("");
    setBusy(false);
    const previous = client.current;
    client.current = null;
    await previous?.close().catch(() => {});
  }
  useEffect(() => {
    if (!signedIn || !range || !client.current) return;
    const current = ++operation.current;
    let active = true;
    setBusy(true);
    setSnapshot(null);
    setError("");
    bounded(client.current.reader.read(range.start, range.end)).then(result => {
      if (active && current === operation.current) setSnapshot(result);
    }).catch(failure => {
      if (!active || current !== operation.current) return;
      setError(failure.code === "permission-denied" ? "Google เข้าสู่ระบบแล้ว แต่ยังไม่มีสิทธิ์อ่าน staging โปรดรอผู้ดูแลกำหนดสิทธิ์แล้วกดโหลดใหม่" : failure.code === "failed-precondition" ? "ดัชนี staging ยังไม่พร้อม โปรดรอแล้วโหลดใหม่" : "อ่าน staging ไม่สำเร็จ จึงล้างตารางเก่าไว้ก่อน กรุณาลองใหม่");
      if (failure.code === "timeout") {
        client.current?.close().catch(() => {});
        client.current = null;
        setSignedIn(false);
      }
    }).finally(() => {
      if (active && current === operation.current) setBusy(false);
    });
    return () => {
      active = false;
    };
  }, [signedIn, range, revision]);
  const stats = client.current?.reader.stats();
  const controls = <section className="cal-import-dataset-note cal-emulator-controls" aria-label="เชื่อม staging อ่านอย่างเดียว"><strong>Staging · ข้อมูลสังเคราะห์ · อ่านอย่างเดียว</strong><p>{STAGING_PROJECT} · แยกจากระบบใช้งานจริง ใช้ Google ของผู้ทดสอบ ทุกบทบาทเพิ่ม แก้ไข ลบ หรือนำเข้าไม่ได้</p><div className="cal-dialog-actions">{signedIn ? <><GlassButton onClick={logout}>ออกจากระบบ staging</GlassButton><GlassButton disabled={busy} onClick={() => {
          client.current.reader.refresh();
          setRevision(value => value + 1);
        }}>โหลดข้อมูล staging ใหม่</GlassButton></> : <GlassButton variant="prominent" disabled={!config || busy} onClick={login}>เข้าสู่ staging ด้วย Google</GlassButton>}</div><p role="status">{busy ? "กำลังเชื่อม staging…" : snapshot ? `อ่าน staging สำเร็จ · ${snapshot.data.rules.length} ตารางเรียน / ${snapshot.data.events.length} รอบสอบ` : signedIn ? "Google เข้าสู่ระบบแล้ว รออ่านข้อมูล" : "ยังไม่เข้าสู่ระบบ staging"}</p>{stats && <p className="ui-caption" data-staging-queries={stats.identity + stats.directory + stats.classrooms + stats.months}>คำขออ่าน {stats.identity + stats.directory + stats.classrooms + stats.months} ครั้ง · cache {stats.cachedMonths.length} เดือน · ไม่ใช่จำนวน billed reads</p>}{error && <p className="cal-form-error" role="alert">{error}</p>}{snapshot?.issues.length > 0 && <p role="alert">มี {snapshot.issues.length} รายการข้อมูลไม่ครบและยังไม่แสดง ปฏิทินนี้ยังใช้ยืนยันห้องว่างไม่ได้</p>}</section>;
  return <CalendarPreview externalCalendar={{
    data: snapshot?.data || empty,
    people: snapshot?.people || [],
    identity: snapshot?.identity,
    controls,
    onRangeChange: changeRange,
    label: "Development · Staging อ่านอย่างเดียว",
    sourceName: "Staging"
  }} />;
}
