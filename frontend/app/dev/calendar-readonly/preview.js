"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CalendarPreview from "../calendar/workspace";
import { GlassButton } from "../../../components/ui/GlassControls";
import { calendarTestAccounts } from "../../../lib/calendarEmulatorConfig";
import { createCalendarEmulatorClient } from "../../../lib/calendarEmulatorClient";
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
      })), 8000);
    })]);
  } finally {
    clearTimeout(timer);
  }
}
export default function EmulatorCalendar() {
  const [local, setLocal] = useState(false),
    [account, setAccount] = useState("directory-a"),
    [signedIn, setSignedIn] = useState(false);
  const [range, setRange] = useState(null),
    [snapshot, setSnapshot] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  const client = useRef(null),
    operation = useRef(0);
  useEffect(() => {
    const operations = operation;
    const allowed = ["localhost", "127.0.0.1"].includes(location.hostname);
    setLocal(allowed);
    return () => {
      operations.current++;
      client.current?.close().catch(() => {});
      client.current = null;
    };
  }, []);
  const changeRange = useCallback((start, end) => setRange(previous => previous?.start === start && previous.end === end ? previous : {
    start,
    end
  }), []);
  async function login() {
    if (!local || busy) return;
    const current = ++operation.current;
    setSnapshot(null);
    setSignedIn(false);
    setError("");
    setBusy(true);
    try {
      await client.current?.close();
      client.current = createCalendarEmulatorClient({
        local: true
      });
      await bounded(client.current.login(account));
      if (current === operation.current) setSignedIn(true);
    } catch {
      if (current === operation.current) {
        setError("เชื่อม Auth Emulator ไม่สำเร็จ ตรวจว่า Emulator และข้อมูลทดสอบพร้อมแล้ว");
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
      setError(failure.code === "permission-denied" ? "บัญชีนี้ไม่มีสิทธิ์อ่านปฏิทิน" : failure.code === "too-many-records" ? failure.message : "อ่าน Emulator ไม่สำเร็จ ไม่แสดงข้อมูลเก่าค้างไว้ กรุณาลองโหลดใหม่");
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
  const controls = <section className="cal-import-dataset-note cal-emulator-controls" aria-label="เชื่อม Emulator อ่านอย่างเดียว">
    <strong>Auth + Firestore Emulator · ข้อมูลสังเคราะห์ · อ่านอย่างเดียว</strong>
    <p>แยกจากบัญชีและฐานข้อมูลจริง ทุกบทบาทไม่สามารถเพิ่ม แก้ไข ลบ หรือนำเข้าข้อมูลในโหมดนี้</p>
    {!local ? <p role="status">โหมดนี้ใช้ได้เฉพาะ localhost บนเครื่องพัฒนา ลิงก์ภายนอกยังใช้ปฏิทินตัวอย่างเดิมได้</p> : <>
      <div className="cal-form-grid"><label className="ui-field"><span>บัญชีทดสอบ</span><select className="apple-input" value={account} disabled={busy || signedIn} onChange={event => setAccount(event.target.value)}>{calendarTestAccounts.map(person => <option key={person.id} value={person.id}>{person.label}</option>)}</select></label><div className="cal-dialog-actions">
        {!signedIn ? <GlassButton disabled={busy} onClick={login}>เข้าสู่ระบบจำลอง</GlassButton> : <><GlassButton aria-label="ออกจากระบบจำลอง" onClick={logout}>ออกจากระบบ</GlassButton><GlassButton aria-label="โหลดข้อมูลใหม่" disabled={busy} onClick={() => {
              client.current.reader.refresh();
              setRevision(value => value + 1);
            }}>โหลดใหม่</GlassButton></>}
      </div></div>
      <p role="status">{busy ? "กำลังอ่าน Emulator…" : snapshot ? `อ่านสำเร็จ · ${snapshot.data.rules.length} ตารางเรียน / ${snapshot.data.events.length} รอบสอบ` : signedIn ? "รอโหลดข้อมูล" : "ยังไม่เข้าสู่ระบบจำลอง"}</p>
      {stats && <p className="ui-caption" data-read-queries={stats.identity + stats.directory + stats.classrooms + stats.months}>คำขออ่าน {stats.identity + stats.directory + stats.classrooms + stats.months} ครั้ง · cache {stats.cachedMonths.length} เดือน · ไม่ใช่จำนวน billed reads</p>}
    </>}
    {error && <p className="cal-form-error" role="alert">{error}</p>}
    {snapshot?.issues.length > 0 && <p role="alert">มี {snapshot.issues.length} รายการที่ข้อมูลไม่ครบและยังไม่แสดง ปฏิทินนี้อาจไม่ครบสำหรับตัดสินใจเรื่องห้องว่าง</p>}
  </section>;
  return <CalendarPreview externalCalendar={{
    data: snapshot?.data || empty,
    people: snapshot?.people || [],
    identity: snapshot?.identity,
    controls,
    onRangeChange: changeRange
  }} />;
}
