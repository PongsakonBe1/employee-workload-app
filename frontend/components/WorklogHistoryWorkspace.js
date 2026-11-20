"use client";

import { CalendarDays, ChevronRight, List, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { GlassButton, GlassControlGroup } from "./ui/GlassControls";

export function WorklogHistoryToolbar({ view, onView, onNew, filters, onFilters, onSubmit, loading, canRecord }) {
  const update = ({ target }) => onFilters({ ...filters, [target.name]: target.value });
  return <>
    <div className="ui-page-heading history-heading" data-worklog-workspace="history">
      <div><h1>ประวัติงาน</h1><p>ค้นหา ตรวจรายละเอียด และจัดการรายการงาน</p></div>
      {canRecord && <GlassButton mode="quick" variant="prominent" onClick={onNew}><Plus size={18} aria-hidden="true" /> เพิ่มบันทึก</GlassButton>}
    </div>
    <section className="history-toolbar worklog-history-toolbar" aria-label="มุมมองและตัวกรองประวัติ">
      <GlassControlGroup mode="quick" label="มุมมองประวัติงาน">
        <button type="button" aria-pressed={view === "list"} onClick={() => onView("list")}><List size={16} aria-hidden="true" /> รายการ</button>
        <button type="button" aria-pressed={view === "calendar"} onClick={() => onView("calendar")}><CalendarDays size={16} aria-hidden="true" /> ปฏิทิน</button>
      </GlassControlGroup>
      <form onSubmit={onSubmit}>
        <label className="history-search"><Search size={17} aria-hidden="true" /><input type="search" name="search" value={filters.search} onChange={update} aria-label="ค้นหางาน ผู้รับบริการ หรือเจ้าหน้าที่" placeholder="ค้นหางาน ผู้รับบริการ หรือเจ้าหน้าที่" /></label>
        <div className="worklog-history-range"><input className="apple-input" type="date" name="from" aria-label="จากวันที่" value={filters.from} onChange={update} /><input className="apple-input" type="date" name="to" aria-label="ถึงวันที่" value={filters.to} onChange={update} /></div>
        <GlassButton mode="quick" type="submit" disabled={loading}>ใช้ตัวกรอง</GlassButton>
      </form>
    </section>
  </>;
}

const displayDate = date => {
  const value = new Date(`${date}T12:00:00+07:00`);
  return Number.isFinite(value.getTime()) ? value.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" }) : "ไม่ระบุวันที่";
};

export function WorklogHistoryDetails({ item, displayName, editable, onEdit, onDelete }) {
  if (!item) return <div className="history-detail-empty"><h3>เลือกรายการเพื่อดูรายละเอียด</h3></div>;
  return <div className="history-details">
    <h3>{item.minorTask || "ไม่ระบุหัวข้อรอง"}</h3>
    <dl>
      <dt>ผู้ปฏิบัติงาน</dt><dd>{displayName(item)}</dd>
      <dt>วันที่และเวลา</dt><dd>{displayDate(item.date)} · {item.time || "—"}</dd>
      <dt>งานหลัก</dt><dd>{item.mainDuty || "—"}</dd>
      <dt>ผู้รับบริการ</dt><dd>{item.recipient || "—"}</dd>
      <dt>ห้องหรืออุปกรณ์</dt><dd>{[item.room, item.equipment].filter(Boolean).join(" · ") || "—"}</dd>
      <dt>รายละเอียด</dt><dd>{item.comment || "—"}</dd>
      <dt>สถานะ</dt><dd>{item.status || "—"}</dd>
    </dl>
    {editable && <div className="history-detail-actions">
      <GlassButton mode="quick" onClick={() => onEdit(item)}><Pencil size={14} aria-hidden="true" /> แก้ไข</GlassButton>
      <GlassButton mode="quick" variant="destructive" onClick={() => onDelete(item.id)}><Trash2 size={14} aria-hidden="true" /> ลบ</GlassButton>
    </div>}
  </div>;
}

export function WorklogHistoryList({ items, activeId, onOpen, displayName, selectable, selectedIds, onSelect, ascending, onSort }) {
  return <section className="history-list worklog-history-list" aria-label="รายการงาน">
    <div className="history-table-head"><button type="button" onClick={onSort}>วัน / เวลา {ascending ? "↑" : "↓"}</button><span>ผู้ปฏิบัติงาน</span><span>หัวข้อรอง</span><span>สถานะ</span></div>
    {items.map(item => <div key={item.id} className="history-row" data-selected={activeId === item.id}>
      {selectable(item) && <input type="checkbox" className="ui-checkbox" aria-label={`เลือกบันทึก ${item.minorTask || "งาน"} ${item.time || ""}`} checked={selectedIds.includes(item.id)} onChange={() => onSelect(item.id)} />}
      <button type="button" className="history-row-open" onClick={() => onOpen(item)}>
        <span><strong>{displayDate(item.date)}</strong><small>{item.time || "—"}</small></span>
        <span>{displayName(item)}</span><span><strong>{item.minorTask || "ไม่ระบุหัวข้อรอง"}</strong><small>{item.comment || "ไม่มีรายละเอียดเพิ่มเติม"}</small></span>
        <span className="history-row-state">{item.status || "—"}</span><ChevronRight size={16} aria-hidden="true" />
      </button>
    </div>)}
    {items.length === 0 && <div className="history-empty"><h3>ไม่พบรายการในช่วงที่เลือก</h3><p>ลองเปลี่ยนช่วงวันที่หรือคำค้นหา</p></div>}
  </section>;
}
