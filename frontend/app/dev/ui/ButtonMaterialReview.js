"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2 } from "lucide-react";
import { GlassButton } from "../../../components/ui/GlassControls";
import { Dialog } from "../../../components/ui/Dialog";
import { useButtonMaterial } from "../../../components/ui/ButtonMaterialProvider";

export function ButtonMaterialReview({ mode }) {
  const { engine, setEngine, phase, requestPreview } = useButtonMaterial(), router = useRouter(), id = useId();
  useEffect(() => { requestPreview(); }, [requestPreview]);
  const [recipient, setRecipient] = useState(""), [saved, setSaved] = useState(0), [deleted, setDeleted] = useState(0), [dialog, setDialog] = useState(null);
  return <section id="button-materials" className="apple-panel ui-dev-form ui-button-ab" aria-label="เปรียบเทียบวัสดุปุ่ม A/B">
    <h2 className="ui-section-title">เปรียบเทียบวัสดุปุ่ม A/B</h2>
    <p className="ui-caption">เลือก A · QuickLiquid เป็นค่าเริ่มต้นของหน้าทำงานแล้ว ส่วน B ยังทดลองเทียบได้ที่นี่</p>
    <p className="ui-caption">ข้อความไทยและร่างเดียวกัน · ทดลองกด กรอกข้อมูล และเลื่อนหน้าได้ · ไม่มีข้อมูลจริง</p>
    <div className="ui-button-ab-controls" role="group" aria-label="วัสดุปุ่มสำหรับหน้า develop">
      {[["quick", "QuickLiquid เดิม"], ["zak", "Liquid Glass ใหม่"]].map(([value, label]) => <button key={value} className="ui-choice" type="button" aria-pressed={engine === value} onClick={() => setEngine(value)}>{label}</button>)}
      <span className="ui-caption" data-testid="button-material-ready">{phase === "ready" ? "พร้อมเปรียบเทียบ" : phase === "fallback" ? "ใช้วัสดุเดิมชั่วคราว โหลดหน้าใหม่เพื่อลองอีกครั้ง" : "กำลังเตรียมวัสดุใหม่"}</span>
      <button type="button" className="ui-choice" onClick={() => router.push("/dev/record")}>ทดลองกับหน้าบันทึกงาน</button>
    </div>
    <div className="ui-button-ab-grid">
      {[["quick", "A · QuickLiquid เดิม"], ["zak", "B · Liquid Glass ใหม่"]].map(([value, label]) => <section className="ui-button-ab-case" key={value} aria-label={label}>
        <h3>{label}</h3>
        <form id={id + value} onSubmit={event => { event.preventDefault(); setSaved(count => count + 1); }}>
          <label className="ui-field"><span>ผู้รับบริการตัวอย่าง</span><input className="apple-input" name={value + "-recipient"} required value={recipient} onChange={event => setRecipient(event.target.value)} /></label>
          <div className="ui-button-ab-row">
            <GlassButton mode={mode} engine={value} variant="prominent" type="submit"><Check size={17} aria-hidden="true" />บันทึกตัวอย่าง</GlassButton>
            <GlassButton mode={mode} engine={value} onClick={() => setRecipient("")}>ยกเลิกตัวอย่าง</GlassButton>
          </div>
        </form>
        <div className="ui-button-ab-row">
          <GlassButton mode={mode} engine={value} variant="tinted" icon={<Plus size={17} aria-hidden="true" />}>เพิ่มรายการ</GlassButton>
          <GlassButton mode={mode} engine={value} variant="destructive" onClick={() => setDialog(value)}><Trash2 size={17} aria-hidden="true" />ลบตัวอย่าง</GlassButton>
          <GlassButton mode={mode} engine={value} icon={<Plus size={18} aria-hidden="true" />} aria-label="เพิ่มรายการตัวอย่าง" />
        </div>
        <GlassButton mode={mode} engine={value} disabled>ยังไม่พร้อมบันทึก</GlassButton>
      </section>)}
    </div>
    <p role="status" data-testid="button-material-counts" className="ui-caption">บันทึกตัวอย่าง {saved} ครั้ง · ลบตัวอย่าง {deleted} ครั้ง</p>
    {dialog && <Dialog open title="ยืนยันลบตัวอย่าง" onClose={() => setDialog(null)} description="จำลอง interaction เท่านั้น ไม่ลบข้อมูลในระบบ" footer={<><GlassButton mode={mode} engine={dialog} onClick={() => setDialog(null)}>ยกเลิก</GlassButton><GlassButton mode={mode} engine={dialog} variant="destructive" onClick={() => { setDeleted(count => count + 1); setDialog(null); }}>ยืนยันลบ</GlassButton></>}><p>ทดลองยกเลิก หรือยืนยันเพื่อดูการตอบสนองของวัสดุปุ่ม</p></Dialog>}
  </section>;
}
