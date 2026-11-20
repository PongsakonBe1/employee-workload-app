"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StagingSessionGate, useStagingWorkspace } from "../../../components/staging/StagingWorkspaceProvider";
import { GlassButton } from "../../../components/ui/GlassControls";
import { validateMutationReplayPacket } from "../../../lib/calendarMutationReplayQa";
function Controls() {
  const { canEdit, replayQa, saving, user } = useStagingWorkspace(), [text, setText] = useState(""), [error, setError] = useState(""), [results, setResults] = useState([]), [busy, setBusy] = useState(false), mounted = useRef(true);
  useEffect(() => { mounted.current = true;return () => { mounted.current = false; }; }, []);
  async function load(event) {
    setError("");setText("");setResults([]);
    try { const value = await event.target.files?.[0]?.text();await validateMutationReplayPacket(value);if (mounted.current) setText(value); } catch (failure) { if (mounted.current) setError(failure.message); }
  }
  async function replay() {
    if (!canEdit || busy || !text) return;setBusy(true);setError("");setResults([]);
    try { for (let index = 0; index < 4; index++) { if (!mounted.current) break;const result = await replayQa({ text, index });if (mounted.current) setResults(previous => [...previous, result]); } }
    catch (failure) { if (mounted.current) setError(failure.message || "ตรวจส่งซ้ำไม่สำเร็จ ให้ตรวจ audit ก่อนดำเนินต่อ"); }
    finally { if (mounted.current) setBusy(false); }
  }
  return <main className="ui-page" data-mutation-replay-qa><section className="apple-panel p-6" style={{ maxWidth: 760, margin: "24px auto" }}><p>Development · labboy-workload-app-staging · receipt replay</p><h1>ตรวจส่งซ้ำชุด QA เดิม</h1><p>ใช้หลังครบ 4 คำสั่งและ gate 17 เท่านั้น ตรวจ receipt และรายการ inactive ก่อนเรียก writer ด้วย payload เดิม ไม่มีการอัปโหลดไฟล์ไป server</p><p>บทบาท: {user.role} · {canEdit ? "writer เปิดใช้" : "อ่านอย่างเดียว"}</p><label className="ui-field">ชุดคำสั่ง QA ที่ตรวจแล้ว (JSON)<input type="file" accept="application/json,.json" disabled={busy || saving} onChange={load} /></label><p role="status">{text ? "ไฟล์ตรงกับ SHA256 ที่ตรวจแล้ว" : "ยังไม่ได้เลือกไฟล์"}</p><GlassButton disabled={!canEdit || !text || busy || saving} onClick={replay}>ตรวจ receipt และส่งซ้ำ 4 คำสั่ง</GlassButton>{error && <p role="alert">{error}</p>}<ol aria-live="polite">{results.map((result, index) => <li key={result.operationId}>คำสั่ง {index + 1} · repeated={String(result.repeated)} · changed={result.changed}</li>)}</ol>{results.length === 4 && <p role="status">ตรวจส่งซ้ำครบ 4 receipts · ไม่มีรายการเปลี่ยนเพิ่ม · gate 17</p>}<Link href="/calendar">กลับปฏิทิน staging</Link></section></main>;
}
export default function ReplayQa() { return <StagingSessionGate><Controls /></StagingSessionGate>; }
