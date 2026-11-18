"use client";
import { useEffect, useRef, useState } from "react";
import { calendarDirectDenialProofFresh, resumeCalendarDirectDenialSession } from "../../../lib/calendarDirectDenialQa.js";
import { createCalendarDirectDenialClient } from "../../../lib/calendarDirectDenialClient.js";
import { calendarSmokeApproved, calendarSmokeFresh } from "../../../lib/calendarTrustedSmoke.js";
import styles from "./qa.module.css";

export default function CutoverQa() {
  const clientRef = useRef(null), qaRef = useRef(null);
  const [origin, setOrigin] = useState(""), [frozen, setFrozen] = useState(null), [proof, setProof] = useState(null);
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [alias, setAlias] = useState(null), [confirmed, setConfirmed] = useState(false), [status, setStatus] = useState("ยังไม่ได้โหลดไฟล์ ไม่มีการเชื่อม Firebase");
  const [fresh, setFresh] = useState(false);
  const [smokeFresh, setSmokeFresh] = useState(false), [smokeResults, setSmokeResults] = useState([]);
  useEffect(() => { setOrigin(window.location.origin);return () => { const client = clientRef.current;clientRef.current = null;qaRef.current = null;client?.close().catch(() => {}); }; }, []);
  useEffect(() => {
    const update = () => { setFresh(calendarDirectDenialProofFresh(proof));setSmokeFresh(calendarSmokeFresh(proof)); };update();
    const timer = setInterval(update, 1000);return () => clearInterval(timer);
  }, [proof]);
  useEffect(() => {
    let active = true;setReady(false);setConfirmed(false);setAlias(null);qaRef.current = null;
    if (frozen && proof) resumeCalendarDirectDenialSession(clientRef.current, { frozen, proof }).then(session => {
      if (active) {
        const role = session?.alias || (calendarSmokeApproved(proof) ? clientRef.current?.alias(frozen) : null);
        setReady(true);setAlias(role || null);qaRef.current = session?.controller || null;
        setStatus(role ? "ใช้ Google session เดิม " + role + " · ยังไม่ตรวจสิทธิ์หรือส่งคำขอทดสอบ" : "ไฟล์ตรง frozen review · ยังไม่ส่งคำขอทดสอบ");
      }
    }).catch(() => { if (active) setStatus("ไฟล์ไม่ตรง review จึงปิดคำสั่งทั้งหมด"); });
    return () => { active = false; };
  }, [frozen, proof]);
  async function load(event, assign) {
    const file = event.target.files?.[0];setReady(false);
    try { if (!file || file.size > 256 * 1024) throw new Error("File rejected");assign(JSON.parse(await file.text())); }
    catch { assign(null);setStatus("อ่าน JSON ไม่สำเร็จหรือไฟล์เกิน 256 KB"); }
    finally { event.target.value = ""; }
  }
  async function login() {
    setBusy(true);
    try {
      if (!ready || origin !== "http://127.0.0.1:4311" || !(proof.readerChecksApproved || proof.directWriteProbeApproved || calendarSmokeApproved(proof))) throw new Error("Not approved");
      if (!clientRef.current) {
        const response = await fetch("/dev/staging-web-config", { cache: "no-store", credentials: "omit" });if (!response.ok) throw new Error("Config unavailable");
        clientRef.current = createCalendarDirectDenialClient(await response.json());
      }
      await clientRef.current.login();const role = clientRef.current.alias(frozen);if (!role) throw new Error("Unreviewed identity");
      setAlias(role);qaRef.current = clientRef.current.controller({ frozen, proof });setStatus("เข้าสู่ session " + role + " แล้ว · ยังไม่ส่ง SDK write probe");
    } catch { setAlias(null);qaRef.current = null;setStatus("เข้าสู่ QA ไม่สำเร็จ ตรวจไฟล์ บัญชี และ origin ที่อนุมัติ"); }
    finally { setBusy(false); }
  }
  async function run(kind) {
    setBusy(true);
    try {
      if (!ready || !calendarDirectDenialProofFresh(proof) || !qaRef.current || kind === "denial" && !confirmed) throw new Error("Not ready");
      const result = await (kind === "reader" ? qaRef.current.verifyReader() : qaRef.current.probeDenial());
      if (result.outcome === "reader-verified") setStatus("Reader " + result.alias + " ผ่าน · ไม่เขียนข้อมูล");
      else if (result.outcome === "permission-denied") setStatus("SDK batch ถูกปฏิเสธ · ต้อง audit checkpoint 0 ซ้ำเพื่อยืนยันว่าไม่มีข้อมูลเปลี่ยน" + (result.stop ? " · session เปลี่ยน ให้หยุด" : ""));
      else setStatus("หยุดทดสอบ: " + (result.outcome === "unexpected-write" ? "SDK เขียนได้ผิดคาด" : "ยังยืนยันผลไม่ได้") + " · ห้ามส่งซ้ำ ให้ตรวจ audit");
    } catch { setStatus("หยุดก่อนยืนยันผล: เงื่อนไข ไฟล์ session หรือสิทธิ์ทดลองไม่ผ่าน · ไม่ส่งซ้ำอัตโนมัติ"); }
    finally { setBusy(false);setConfirmed(false); }
  }
  async function runSmoke() {
    setBusy(true);
    try {
      if (!ready || !confirmed || !calendarSmokeFresh(proof)) throw new Error("Not ready");
      const results = await clientRef.current.writerSmoke({ frozen, proof }, setSmokeResults);
      setStatus(results.length === 8 ? "Writer smoke ผ่าน 8/8 · ปิด writer และตรวจ audit" : "Staff ได้ HTTP 403 · ต่อที่แท็บ Superadmin");
    } catch {
      setStatus("หยุด writer smoke · ตรวจผลที่ยืนยันได้และปิด writer · ห้ามส่งซ้ำ");
    } finally { setBusy(false);setConfirmed(false); }
  }
  const allowedOrigin = origin === "http://127.0.0.1:4311";
  return <main data-trusted-cutover-qa className={styles.root}>
    <h1>Trusted Calendar · Cutover QA</h1>
    <p>Development เท่านั้น · labboy-workload-app-staging · เครื่องมือนี้ไม่ deploy Rules หรือเปิด trusted writer</p>
    <p>โหลดไฟล์ในหน่วยความจำเพื่อเทียบ hash ไม่อัปโหลดไฟล์ไป server ไม่แสดง UID และไม่เก็บ token</p>
    <fieldset disabled={busy}><legend>ไฟล์ที่ตรวจรับแล้ว</legend>
      <label style={{ display: "block", marginBottom: 16 }}>Frozen operations JSON <input type="file" accept="application/json,.json" onChange={event => load(event, setFrozen)} /></label>
      <label style={{ display: "block" }}>Fresh cutover proof JSON <input type="file" accept="application/json,.json" onChange={event => load(event, setProof)} /></label>
    </fieldset>
    {!allowedOrigin && <p>คำสั่ง Firebase ปิด: ต้องใช้ http://127.0.0.1:4311 เท่านั้น</p>}
    <p>Reader approval: {proof?.readerChecksApproved === true ? "มีใน proof" : "ยังไม่มี"} · SDK batch approval: {proof?.directWriteProbeApproved === true ? "มีใน proof" : "ยังไม่มี"}</p>
    <button disabled={!ready || !allowedOrigin || busy || !(proof?.readerChecksApproved || proof?.directWriteProbeApproved || calendarSmokeApproved(proof))} onClick={login}>เข้าสู่ Google staging / สลับบัญชี</button>
    <p>บัญชีทดสอบที่ตรงกับไฟล์: {alias || "ยังไม่เข้าสู่ QA"} · ตรวจสิทธิ์จริงก่อนเริ่มแต่ละคำสั่ง</p>
    {ready && !(calendarSmokeApproved(proof) ? smokeFresh : fresh) && <p role="status">Proof หมดอายุหรือเวลายังไม่ถูกต้อง · ปิดคำสั่งทดสอบไว้ โหลด proof จาก audit รอบที่อนุมัติใหม่ได้โดยใช้ Google session เดิม</p>}
    <button disabled={!ready || !fresh || !alias || busy || proof?.readerChecksApproved !== true} onClick={() => run("reader")}>ตรวจ reader หนึ่งครั้ง · ไม่เขียนข้อมูล</button>
    {!calendarSmokeApproved(proof) && <fieldset disabled={busy}><legend>SDK batch ที่คาดว่าต้องถูกปฏิเสธ</legend>
      <p>หนึ่ง batch: manual 7 มิ.ย. 2570 ห้อง 401 09:00–10:00, receipt เดิมที่ตรึงไว้ และ gate +1 หาก Rules ผิดอาจ commit ทั้งสามเอกสาร ต้องหยุดและ audit ทันที ไม่มีคำสั่งลบหรือย้อนข้อมูล</p>
      <label><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> มีคำอนุมัติเฉพาะ batch นี้และพร้อมตรวจ audit หลังส่ง</label>
      <p><button disabled={!ready || !fresh || alias !== "superadmin" || !confirmed || busy || proof?.directWriteProbeApproved !== true} onClick={() => run("denial")}>ทดลอง SDK denial หนึ่งครั้ง</button></p>
    </fieldset>}
    {calendarSmokeApproved(proof) && <fieldset disabled={busy}><legend>Trusted writer smoke · staging</legend>
      <p>Staff 1 คำขอ · Superadmin 7 คำขอ · หยุดทันทีหากผลผิดคาด</p>
      <label><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> ยืนยันช่วงทดสอบที่อนุมัติและพร้อมปิด writer หลังส่ง</label>
      <p><button disabled={!ready || !smokeFresh || !allowedOrigin || !alias || !confirmed || smokeResults.length > 0} onClick={runSmoke}>ส่งชุด smoke ด้วยบัญชี {alias || "ทดสอบ"}</button></p>
      {smokeResults.length > 0 && <ul>{smokeResults.map(result => <li key={result.id}>{result.id} · HTTP {result.status}</li>)}</ul>}
    </fieldset>}
    <p role="status" aria-live="polite" aria-busy={busy}>{busy ? "กำลังตรวจ · ปุ่มทดลองปิดระหว่างรอผล" : status}</p>
    <p>Attempt จองใน IndexedDB ก่อนคำขอแรก Reload ไม่คืนสิทธิ์ทดลอง หาก slot ถูกใช้หรือ storage ใช้ไม่ได้จะหยุด ไม่มีปุ่ม reset</p>
  </main>;
}
