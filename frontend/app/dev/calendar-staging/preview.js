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
export default function StagingCalendar({ writable = false, roleQa = false, roleWriteQa = false }) {
  const [config, setConfig] = useState(null),
    [signedIn, setSignedIn] = useState(false),
    [range, setRange] = useState(null),
    [snapshot, setSnapshot] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [roleResult, setRoleResult] = useState(null), [probing, setProbing] = useState(false);
  const [writeQaResult, setWriteQaResult] = useState(null), [qaRunning, setQaRunning] = useState(false), [staffAuditConfirmed, setStaffAuditConfirmed] = useState(false);
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
    setRoleResult(null);
    setWriteQaResult(null);setStaffAuditConfirmed(false);
    try {
      await client.current?.close();
      client.current = createCalendarStagingClient(config, { writer: writable, roleQa, roleWriteQa });
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
    setRoleResult(null);
    setWriteQaResult(null);setStaffAuditConfirmed(false);
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
    setRoleResult(null);
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
  async function create(input) {
    if (!writable || saving || qaRunning || !(roleWriteQa ? client.current?.roleWriteQa : client.current?.create)) throw Object.assign(new Error("ยังไม่พร้อมบันทึก"), { code: "calendar-write-validation" });
    const current = operation.current;
    setSaving(true);
    try {
      const result = roleWriteQa ? await client.current.roleWriteQa.create(input, staffAuditConfirmed) : await client.current.create(input);
      if (roleWriteQa && current === operation.current) setWriteQaResult({ step: "superadmin-create", created: result.created, skipped: result.skipped, repeated: result.repeated });
      if (current === operation.current) { setSnapshot(null);setRevision(value => value + 1); }
      return result;
    } finally { setSaving(false); }
  }
  const stats = client.current?.reader.stats();
  async function runWriteQa(step) {
    if (!roleWriteQa || !client.current?.roleWriteQa || busy || saving || qaRunning || !signedIn) return;
    const current = operation.current;
    setQaRunning(true);
    try {
      const result = await (step === "staff" ? client.current.roleWriteQa.staffDenial() : client.current.roleWriteQa.repeat());
      if (current === operation.current) setWriteQaResult({ step, ...result });
    } catch (failure) {
      if (current === operation.current) setWriteQaResult({ step, outcome: "stopped", code: failure.code || "unknown", stop: true });
    } finally { setQaRunning(false); }
  }
  async function probeRole() {
    if (!roleQa || !signedIn || probing || busy || saving || !client.current?.probeWriterReads) return;
    const current = operation.current;
    setRoleResult(null);setProbing(true);
    try {
      const result = await bounded(client.current.probeWriterReads());
      if (current === operation.current) setRoleResult(result);
    } catch {
      if (current === operation.current) setRoleResult({ error: "session-or-read-failed" });
    } finally { setProbing(false); }
  }
  const controls = <section className="cal-import-dataset-note cal-emulator-controls" aria-label={writable ? "เชื่อม staging เพิ่มตาราง" : "เชื่อม staging อ่านอย่างเดียว"}><strong>Staging · ข้อมูลสังเคราะห์ · {writable ? "เพิ่ม/นำเข้ารายการใหม่" : "อ่านอย่างเดียว"}</strong><p>{STAGING_PROJECT} · แยกจากระบบใช้งานจริง · {writable ? "เพิ่มใหม่ได้เฉพาะ Admin/Superadmin ที่เปิดสิทธิ์ writer ยังแก้ไข/ลบไม่ได้" : "ใช้ Google ของผู้ทดสอบ ทุกบทบาทเพิ่ม แก้ไข ลบ หรือนำเข้าไม่ได้"}</p><div className="cal-dialog-actions">{signedIn ? <><GlassButton disabled={saving || qaRunning} onClick={logout}>ออกจากระบบ staging</GlassButton><GlassButton disabled={busy || saving || qaRunning} onClick={() => {
          client.current.reader.refresh();
          setRevision(value => value + 1);
        }}>โหลดข้อมูล staging ใหม่</GlassButton></> : <GlassButton variant="prominent" disabled={!config || busy} onClick={login}>เข้าสู่ staging ด้วย Google</GlassButton>}</div>{writable && <p className="ui-caption">ก่อนบันทึกจะตรวจข้อมูลล่าสุดอีกครั้ง คำขอส่วนนี้ไม่รวมในตัวนับการอ่านปฏิทิน</p>}<p role="status">{saving ? "กำลังบันทึกรายการที่ยืนยันแล้ว…" : busy ? "กำลังเชื่อม staging…" : snapshot ? `อ่าน staging สำเร็จ · ${snapshot.data.rules.length} ตารางเรียน / ${snapshot.data.events.length} รอบสอบ` : signedIn ? "Google เข้าสู่ระบบแล้ว รออ่านข้อมูล" : "ยังไม่เข้าสู่ระบบ staging"}</p>{stats && <p className="ui-caption" data-staging-queries={stats.identity + stats.directory + stats.classrooms + stats.months}>คำขออ่านปฏิทิน {stats.identity + stats.directory + stats.classrooms + stats.months} ครั้ง · cache {stats.cachedMonths.length} เดือน · ไม่ใช่จำนวน billed reads</p>}{error && <p className="cal-form-error" role="alert">{error}</p>}{snapshot?.issues.length > 0 && <p role="alert">มี {snapshot.issues.length} รายการข้อมูลไม่ครบและยังไม่แสดง ปฏิทินนี้ยังใช้ยืนยันห้องว่างไม่ได้</p>}</section>;
  const qaControls = roleQa ? <>{controls}<section className="cal-import-dataset-note" aria-label="ตรวจสิทธิ์ staging QA"><strong>Role QA · อ่านอย่างเดียว</strong><p>บทบาทที่อ่านจาก server: {snapshot?.identity.role || "ยังไม่ได้อ่าน"} · ไม่ส่งคำขอเขียนตารางหรือ profile</p><GlassButton disabled={!signedIn || !snapshot || busy || saving || probing} onClick={probeRole}>ตรวจสิทธิ์อ่าน writer (QA)</GlassButton>{roleResult && <pre aria-label="ผลตรวจสิทธิ์อ่าน writer">{JSON.stringify(roleResult, null, 2)}</pre>}</section></> : controls;
  const writeControls = roleWriteQa ? <>{qaControls}<section className="cal-import-dataset-note" aria-label="ทดสอบการเขียน fixture ที่อนุมัติ"><strong>Approved write QA · สูงสุด 1 ตาราง / 1 receipt</strong><p>QA-ROLE-CLOUD-CREATE · 23 เม.ย. 2570 · ห้อง 402 · 10:00–11:00 · ครั้งเดียว · ผู้สอนว่าง</p><p>Staff ต้องถูกปฏิเสธก่อน ตรวจ audit ว่ายัง revision 9 แล้วจึงใช้ Superadmin เพิ่มผ่านฟอร์มปกติ หากผลผิดคาดให้หยุดทันที</p><GlassButton disabled={!snapshot || busy || saving || qaRunning || snapshot.identity?.role !== "staff" || Boolean(writeQaResult)} onClick={() => runWriteQa("staff")}>ทดสอบ Staff raw SDK (ครั้งเดียว)</GlassButton><label className="ui-check"><input type="checkbox" checked={staffAuditConfirmed} disabled={!snapshot || busy || saving || qaRunning || snapshot.identity?.role !== "superadmin" || Boolean(writeQaResult)} onChange={event => setStaffAuditConfirmed(event.target.checked)} />ยืนยัน Staff ถูกปฏิเสธและตรวจ audit แล้ว (revision 9)</label><GlassButton disabled={!snapshot || busy || saving || qaRunning || snapshot.identity?.role !== "superadmin" || writeQaResult?.created !== 1} onClick={() => runWriteQa("repeat")}>ส่ง fixture เดิมซ้ำผ่าน writer (QA)</GlassButton>{qaRunning && <p role="status">กำลังส่งคำขอ QA · ไม่ส่งซ้ำระหว่างรอผล</p>}{writeQaResult && <pre aria-label="ผลทดสอบการเขียน QA">{JSON.stringify(writeQaResult, null, 2)}</pre>}</section></> : qaControls;
  return <CalendarPreview externalCalendar={{
    data: snapshot?.data || empty,
    canCreate: Boolean(writable && !busy && !saving && !qaRunning && snapshot?.complete && snapshot.identity?.calendarWriter === true && ["admin", "superadmin"].includes(snapshot.identity.role) && (!roleWriteQa || snapshot.identity.role === "superadmin" && staffAuditConfirmed && !writeQaResult)),
    onCreate: create, saving, writeTarget: writable ? "Staging" : "",
    people: snapshot?.people || [],
    identity: snapshot?.identity,
    controls: writeControls,
    onRangeChange: changeRange,
    label: writable ? "Development · Staging เพิ่ม/นำเข้ารายการใหม่" : "Development · Staging อ่านอย่างเดียว",
    sourceName: "Staging"
  }} />;
}
