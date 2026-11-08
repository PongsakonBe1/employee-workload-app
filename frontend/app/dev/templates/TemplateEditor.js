"use client";

import { useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { GlassButton } from "../../../components/ui/GlassControls";
import { templateKind } from "../../../lib/templatePreview";
export function TemplateEditor({
  current,
  catalog,
  initialOrder,
  onSave,
  formId
}) {
  const prefix = useId(),
    counter = useRef(current?.comboItems.length || 2),
    form = useRef(null);
  const [draft, setDraft] = useState(() => ({
    name: "",
    minorTask: catalog[0].id,
    comment: "",
    requireRecipient: false,
    requireComment: false,
    isCombo: false,
    isSmart: false,
    order: initialOrder,
    ...current,
    comboItems: (current?.comboItems.length ? current.comboItems : [{
      name: "",
      minorTask: catalog[0].id
    }, {
      name: "",
      minorTask: catalog[0].id
    }]).map((item, index) => ({
      ...item,
      rowKey: `${prefix}-${index}`
    }))
  }));
  const [error, setError] = useState("");
  const set = (key, value) => {
    setDraft(valueDraft => ({
      ...valueDraft,
      [key]: value
    }));
    setError("");
  };
  function itemChange(index, key, value) {
    set("comboItems", draft.comboItems.map((item, i) => i === index ? {
      ...item,
      [key]: value
    } : item));
  }
  function move(index, direction) {
    const items = [...draft.comboItems];
    [items[index], items[index + direction]] = [items[index + direction], items[index]];
    set("comboItems", items);
  }
  function focusItem(index) {
    requestAnimationFrame(() => {
      const input = form.current?.querySelector('[data-field="item-' + index + '"]');
      input?.focus();
      input?.scrollIntoView({
        block: "center"
      });
    });
  }
  function addItem() {
    const index = draft.comboItems.length;
    set("comboItems", [...draft.comboItems, {
      rowKey: prefix + "-" + counter.current++,
      name: "",
      minorTask: catalog[0].id,
      comment: ""
    }]);
    focusItem(index);
  }
  function removeItem(index) {
    set("comboItems", draft.comboItems.filter((_, i) => i !== index));
    focusItem(Math.min(index, draft.comboItems.length - 2));
  }
  return <form ref={form} id={formId} className="template-form" onSubmit={event => {
    event.preventDefault();
    try {
      onSave(draft);
    } catch (failure) {
      setError(failure.message);
      const field = form.current.querySelector(`[data-field="${failure.field}"]`);
      field?.focus();
      field?.scrollIntoView({
        block: "center"
      });
    }
  }} noValidate>
    <section><h3>ข้อมูลเทมเพลต</h3><label className="ui-field"><span>ชื่อเทมเพลต</span><input className="apple-input" data-field="name" value={draft.name} maxLength={100} onChange={event => set("name", event.target.value)} /></label>
      <div className="template-form-grid"><label className="ui-field"><span>ชนิด</span><select className="apple-input" data-field="kind" aria-label="ชนิดเทมเพลต" disabled={Boolean(current?.action)} value={templateKind(draft)} onChange={event => set("isCombo", event.target.value === "combo")}><option value="standard">ทั่วไป</option><option value="combo">Combo</option>{current?.isSmart && <option value="smart">Smart</option>}</select></label><label className="ui-field"><span>ลำดับในบันทึกด่วน</span><input className="apple-input" data-field="order" type="number" min="0" max="9999" value={draft.order} onChange={event => set("order", event.target.value)} /></label></div>
      {!draft.isCombo && !draft.isSmart && <label className="ui-field"><span>หัวข้อรอง</span><select className="apple-input" data-field="minorTask" aria-label="หัวข้อรองของเทมเพลต" value={draft.minorTask} onChange={event => set("minorTask", event.target.value)}>{catalog.map(task => <option key={task.id}>{task.id}</option>)}</select></label>}
      {!draft.isSmart && <label className="ui-field"><span>รายละเอียดตั้งต้น</span><textarea className="apple-input" aria-label="รายละเอียดตั้งต้น" data-field="comment" maxLength={500} value={draft.comment} onChange={event => set("comment", event.target.value)} /></label>}
      {draft.isSmart && <p className="ui-caption">เลือกห้องหรืออุปกรณ์ตามสถานะล่าสุด แล้วใช้เงื่อนไขยืม–คืนและรหัสผู้รับบริการเดิม</p>}
    </section>
    <section><h3>ข้อมูลที่ผู้บันทึกต้องระบุ</h3>{[["requireRecipient", "ต้องระบุผู้รับบริการ"], ["requireComment", "ต้องระบุรายละเอียดเพิ่มเติม"]].map(([field, label]) => <label className="template-checkbox" key={field}><input type="checkbox" checked={draft[field]} disabled={draft.isSmart || field === "requireRecipient" && current?.action === "phone" || field === "requireComment" && ["phone", "assigned"].includes(current?.action)} onChange={event => set(field, event.target.checked)} /><span>{label}</span></label>)}{draft.isCombo && <p className="ui-caption">Combo เริ่มโดยไม่เลือกรายการ ผู้บันทึกเลือกเฉพาะงานที่ทำจริง</p>}</section>
    {draft.isCombo && <section><div className="template-items-heading"><h3>งานใน Combo ({draft.comboItems.length})</h3><GlassButton mode="quick" disabled={draft.comboItems.length >= 30} onClick={addItem}><Plus size={16} aria-hidden="true" />เพิ่มงาน</GlassButton></div>
      {draft.comboItems.map((item, index) => <fieldset className="template-combo-item" key={item.rowKey}><legend>งานที่ {index + 1}</legend><label className="ui-field"><span>ชื่อรายการ</span><input className="apple-input" data-field={`item-${index}`} maxLength={100} value={item.name} onChange={event => itemChange(index, "name", event.target.value)} /></label><label className="ui-field"><span>หัวข้อรอง</span><select className="apple-input" aria-label={`หัวข้อรองงานที่ ${index + 1}`} value={item.minorTask} onChange={event => itemChange(index, "minorTask", event.target.value)}>{catalog.map(task => <option key={task.id}>{task.id}</option>)}</select></label><label className="ui-field"><span>รายละเอียดรายการ</span><input className="apple-input" maxLength={500} value={item.comment || ""} onChange={event => itemChange(index, "comment", event.target.value)} /></label><div className="template-item-tools"><GlassButton mode="quick" aria-label={`ย้ายงาน ${index + 1} ขึ้น`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={17} aria-hidden="true" /></GlassButton><GlassButton mode="quick" aria-label={`ย้ายงาน ${index + 1} ลง`} disabled={index === draft.comboItems.length - 1} onClick={() => move(index, 1)}><ArrowDown size={17} aria-hidden="true" /></GlassButton><GlassButton mode="quick" aria-label={`เอางาน ${index + 1} ออก`} disabled={draft.comboItems.length <= 2} onClick={() => removeItem(index)}><Trash2 size={17} aria-hidden="true" /></GlassButton></div></fieldset>)}
    </section>}
    <p className="template-error" role="alert">{error}</p>
  </form>;
}
