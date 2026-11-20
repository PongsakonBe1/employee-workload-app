"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Pencil, Plus, Search, Undo2 } from "lucide-react";
import { WorkspaceFrame } from "../../../components/ui/WorkspaceFrame";
import { GlassButton } from "../../../components/ui/GlassControls";
import { Dialog } from "../../../components/ui/Dialog";
import { ReviewSymbol } from "../../../components/ui/ReviewSymbol";
import { usePreviewState } from "../previewState";
import { recordLedger, useRecordLedger } from "../record/store";
import { people, tasks } from "../record/fixtures";
import { previewDestination } from "../../../lib/previewNavigation";
import { canManageEquipment, canUndoPreview } from "../../../lib/equipmentPreview";
import { templateKind, TEMPLATE_KINDS } from "../../../lib/templatePreview";
import { TemplateEditor } from "./TemplateEditor";
function Details({
  item,
  onEdit,
  onToggle,
  onRecord
}) {
  return item ? <div className="template-detail"><span className="ui-nav-symbol" data-tone={item.tone || "blue"}><ReviewSymbol name={item.symbol || "templates"} size={27} /></span><h2>{item.name}</h2><p className="ui-caption">{TEMPLATE_KINDS[templateKind(item)]} · version {item.version}</p><span className="template-state" data-active={item.isActive}>{item.isActive ? "เปิดใช้" : "หยุดใช้"}</span><dl><div><dt>หัวข้อรอง</dt><dd>{item.isCombo ? "ตามรายการในชุด" : item.minorTask || "ตามห้องที่เลือก"}</dd></div><div><dt>ผู้รับบริการ</dt><dd>{item.requireRecipient ? "ต้องระบุ" : "ถ้ามี"}</dd></div><div><dt>รายละเอียดเพิ่มเติม</dt><dd>{item.requireComment ? "ต้องระบุ" : "ถ้ามี"}</dd></div><div><dt>ลำดับ</dt><dd>{item.order}</dd></div></dl>{item.comment && <p>{item.comment}</p>}{item.isCombo && <section className="template-detail-combo"><h3>{item.comboItems.length} งาน · ผู้ใช้เลือกเอง</h3><ol>{item.comboItems.map((entry, index) => <li key={index}><strong>{entry.name}</strong><small>{entry.minorTask}</small></li>)}</ol><p className="ui-caption">เริ่มต้นไม่เลือกรายการ · 1 งานที่เลือก = 1 บันทึก แม้หัวข้อรองซ้ำกัน</p></section>}<div className="template-detail-actions"><GlassButton mode="quick" onClick={onEdit}><Pencil size={16} aria-hidden="true" />แก้ไขเทมเพลต</GlassButton><GlassButton mode="quick" onClick={onToggle}>{item.isActive ? "หยุดใช้" : "เปิดใช้อีกครั้ง"}</GlassButton><GlassButton mode="quick" onClick={onRecord}><ArrowRight size={16} aria-hidden="true" />เปิดหน้าบันทึกงาน</GlassButton></div></div> : <p className="template-empty">เลือกเทมเพลตเพื่อดูรายละเอียด</p>;
}
export default function TemplatesWorkspace() {
  const router = useRouter(),
    formId = useId(),
    {
      data,
      revision,
      undo
    } = useRecordLedger();
  const [role, setRole] = usePreviewState("record.role", "staff"),
    [personId] = usePreviewState("record.person", people[0].id);
  const person = people.find(item => item.id === personId) || people[0],
    actor = {
      id: person.id,
      role
    },
    admin = canManageEquipment(actor);
  const [query, setQuery] = useState(""),
    [kind, setKind] = useState("all"),
    [active, setActive] = useState("all"),
    [selected, setSelected] = usePreviewState("templates.selected", "account");
  const [dialog, setDialog] = useState(null),
    [status, setStatus] = useState(""),
    [mobile, setMobile] = useState(false);
  useEffect(() => {
    const media = matchMedia("(max-width:900px)"),
      update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const rows = data.templates.filter(item => (kind === "all" || templateKind(item) === kind) && (active === "all" || String(item.isActive) === active) && [item.name, item.minorTask, ...item.comboItems.map(child => child.name)].join(" ").toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "th"));
  const item = data.templates.find(item => item.id === selected),
    current = dialog?.kind === "edit" ? data.templates.find(item => item.id === dialog.id) : null;
  function navigate(href) {
    const target = previewDestination(href);
    if (target) router.push(target);else setStatus("หน้านี้ยังไม่ได้ย้ายมาใน develop");
  }
  function edit(value) {
    setDialog({
      kind: "edit",
      returnDetail: Boolean(mobile && value),
      id: value?.id || null,
      requestId: crypto.randomUUID(),
      revision
    });
  }
  function dismiss() {
    setDialog(dialog?.kind === "edit" && dialog.returnDetail ? {
      kind: "detail"
    } : null);
  }
  function transact(kind, template, requestId, expectedRevision) {
    return recordLedger.transact({
      kind,
      template,
      actor,
      ids: item ? [item.id] : [],
      requestId,
      expectedRevision
    });
  }
  function toggle() {
    try {
      transact("template-toggle", null, crypto.randomUUID(), revision);
      setStatus(item.isActive ? "หยุดใช้ในบันทึกด่วนแล้ว" : "เปิดใช้ในบันทึกด่วนแล้ว");
    } catch (failure) {
      setStatus(failure.message);
    }
  }
  const details = <Details item={item} onEdit={() => edit(item)} onToggle={toggle} onRecord={() => navigate("/worklogs/new")} />;
  return <WorkspaceFrame user={{
    uid: person.id,
    displayName: person.displayName,
    initial: person.initial,
    role
  }} pathname="/admin/templates" glassMode="quick" onNavigate={navigate}><div className="ui-page-heading template-heading"><div><h1>เทมเพลตและ Combo</h1><p>กำหนดงาน ข้อมูลที่ต้องกรอก และรายการที่ปรากฏในบันทึกด่วน</p><small className="ui-caption">Development · catalog ตัวอย่างร่วมกับหน้าบันทึกงาน</small></div>{admin && <GlassButton mode="quick" variant="prominent" onClick={() => edit(null)}><Plus size={18} aria-hidden="true" />สร้างเทมเพลต</GlassButton>}</div>
    {admin ? <><div className="template-toolbar"><label className="template-search"><Search size={18} aria-hidden="true" /><input type="search" aria-label="ค้นหาเทมเพลต" placeholder="ค้นหาชื่อหรือหัวข้อรอง" value={query} onChange={event => setQuery(event.target.value)} /></label><label className="ui-field"><span>ชนิด</span><select className="apple-input" aria-label="กรองชนิดเทมเพลต" value={kind} onChange={event => setKind(event.target.value)}><option value="all">ทุกชนิด</option>{Object.entries(TEMPLATE_KINDS).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label><label className="ui-field"><span>สถานะ</span><select className="apple-input" aria-label="กรองสถานะเทมเพลต" value={active} onChange={event => setActive(event.target.value)}><option value="all">ทุกสถานะ</option><option value="true">เปิดใช้</option><option value="false">หยุดใช้</option></select></label></div><p className="ui-caption template-result-count">{rows.length} เทมเพลต · การดูรายละเอียดไม่สร้างบันทึกงาน</p><div className="template-layout"><section className="template-list" aria-label="รายการเทมเพลต">{rows.map(value => <button className="template-row" key={value.id} data-template={value.id} aria-pressed={selected === value.id} onClick={() => {
            setSelected(value.id);
            if (mobile) setDialog({
              kind: "detail"
            });
          }}><span className="ui-nav-symbol" data-tone={value.tone || "blue"}><ReviewSymbol name={value.symbol || "templates"} size={22} /></span><span><strong>{value.name}</strong><small>{TEMPLATE_KINDS[templateKind(value)]} · {value.isCombo ? value.comboItems.length + " งาน" : value.minorTask || "เลือกห้อง"}</small></span><span className="template-state" data-active={value.isActive}>{value.isActive ? "เปิดใช้" : "หยุดใช้"}</span></button>)}{!rows.length && <p className="template-empty">ไม่พบเทมเพลตตรงกับตัวกรอง</p>}</section>{!mobile && <aside className="template-inspector" aria-label="รายละเอียดเทมเพลต">{details}</aside>}</div>{undo?.kind.startsWith("template-") && canUndoPreview(undo, actor) && <section className="template-undo" aria-label="เลิกทำรายการเทมเพลตล่าสุด"><span>เปลี่ยนเทมเพลตแล้ว</span><GlassButton mode="quick" onClick={() => {
          try {
            recordLedger.undo(actor, undo.id);
            setStatus("เลิกทำการเปลี่ยนเทมเพลตแล้ว");
          } catch (failure) {
            setStatus(failure.message);
          }
        }}><Undo2 size={17} aria-hidden="true" />เลิกทำ</GlassButton></section>}</> : <section className="template-empty"><h2>หน้านี้สำหรับผู้ดูแล</h2><p>Staff ใช้เทมเพลตที่เปิดอยู่ได้จากหน้าบันทึกงาน</p><GlassButton mode="quick" onClick={() => navigate("/worklogs/new")}>เปิดหน้าบันทึกงาน</GlassButton></section>}
    <details className="template-test-controls"><summary>ตัวเลือกตรวจแบบ · Development</summary><label className="ui-field"><span>บทบาทตัวอย่าง</span><select aria-label="บทบาทตัวอย่าง" className="apple-input" value={role} onChange={event => {
          setRole(event.target.value);
          setDialog(null);
        }}>{["staff", "admin", "superadmin"].map(value => <option key={value}>{value}</option>)}</select></label><GlassButton mode="quick" onClick={() => {
        recordLedger.failNext();
        setStatus("คำสั่งครั้งถัดไปจะล้มเหลวในข้อมูลจำลอง");
      }}>จำลองบันทึกไม่สำเร็จครั้งถัดไป</GlassButton><p className="ui-caption">ข้อมูลใน repo · ไม่ใช่ Auth หรือ collection จริง · เริ่มใหม่เมื่อ refresh</p></details><p role="status" className="template-status" aria-live="polite">{status}</p>
    {admin && dialog && <Dialog key={dialog.kind + (dialog.requestId || "")} open onClose={dismiss} title={dialog.kind === "edit" ? current ? "แก้ไขเทมเพลต" : "สร้างเทมเพลต" : "ตัวอย่างเทมเพลต"} className={dialog.kind === "edit" ? "template-editor-dialog" : ""} footer={dialog.kind === "edit" ? <><GlassButton mode="quick" onClick={dismiss}>ยกเลิก</GlassButton><GlassButton mode="quick" variant="prominent" type="submit" form={formId}>บันทึกเทมเพลต</GlassButton></> : undefined}>{dialog.kind === "edit" ? <TemplateEditor formId={formId} current={current} catalog={tasks} initialOrder={Math.max(0, ...data.templates.map(item => item.order)) + 1} onSave={draft => {
        const result = recordLedger.transact({
          kind: current ? "template-update" : "template-create",
          template: draft,
          ids: current ? [current.id] : [],
          actor,
          requestId: dialog.requestId,
          expectedRevision: dialog.revision
        });
        setSelected(result.ids[0]);
        if (!current) {
          setQuery("");
          setKind("all");
          setActive("all");
        }
        setDialog(mobile ? {
          kind: "detail"
        } : null);
        setStatus("บันทึกเทมเพลตตัวอย่างแล้ว");
      }} /> : details}</Dialog>}
  </WorkspaceFrame>;
}
