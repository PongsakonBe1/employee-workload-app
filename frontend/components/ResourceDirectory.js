"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Download, Search } from "lucide-react";
import { EQUIPMENT_LABELS } from "../lib/equipmentCatalog";
import { Dialog } from "./ui/Dialog";
import { GlassButton, GlassControlGroup } from "./ui/GlassControls";
import { ReviewSymbol } from "./ui/ReviewSymbol";
import "../app/dev/record/record.css";
import "../app/dev/resources/resources.css";

const symbols = { room: "door", headphones: "headphones", power: "plug", usb: "usb" };

function resourceState(item) {
  if (item.type === "room") return item.inUse ? ["เปิดอยู่", "green"] : ["ปิดอยู่", "neutral"];
  if (item.inUse) return ["กำลังใช้งาน", "blue"];
  if (item.unknown) return ["ต้องตรวจสถานะ", "neutral"];
  if (item.condition === "damaged") return ["ชำรุด", "amber"];
  if (item.condition === "lost") return ["สูญหาย", "red"];
  return ["พร้อมใช้งาน", "green"];
}

function resourceTitle(item) {
  return item.type === "room" ? `ห้อง ${item.id}` : item.id;
}

function Details({ item, admin }) {
  const [label, tone] = resourceState(item);
  const room = item.type === "room";
  return <>
    <div className="equipment-inspector-title">
      <span className="ui-nav-symbol" data-tone={room ? "purple" : "green"}><ReviewSymbol name={symbols[item.type]} /></span>
      <div><strong>{resourceTitle(item)}</strong><small>{room ? item.os || item.location : item.label}</small></div>
    </div>
    <span className="record-badge" data-tone={tone}>{label}</span>
    <dl>
      <dt>สังกัด</dt><dd>{item.location}</dd>
      <dt>ประเภท</dt><dd>{room ? item.id.startsWith("3") ? "แลกเปลี่ยนความรู้" : "ห้องเรียน" : EQUIPMENT_LABELS[item.type]}</dd>
      {!room && <><dt>สภาพล่าสุด</dt><dd>{item.unknown ? "ยังไม่ยืนยัน" : { damaged: "ชำรุด", lost: "สูญหาย", normal: "สมบูรณ์" }[item.condition] || "ยังไม่มีบันทึก"}</dd></>}
    </dl>
    <div className="equipment-inspector-actions">
      <Link className="record-link" href="/worklogs/new">ไปที่บันทึกด่วน <ArrowRight size={15} aria-hidden="true" /></Link>
      <Link className="record-link" href="/worklogs">ประวัติงาน</Link>
      {admin && !room && <Link className="record-link" href="/admin/equipment-items">ทะเบียนอุปกรณ์</Link>}
    </div>
  </>;
}

export function ResourceDirectory({ rooms, equipment, admin, loading, error, retry, onExport, history }) {
  const [tab, setTab] = useState("rooms");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const term = search.trim().toLocaleLowerCase("th");
  const items = (tab === "rooms" ? rooms : equipment).filter(item =>
    [resourceTitle(item), item.label, item.location, item.os].some(value => value?.toLocaleLowerCase("th").includes(term))
  );
  const selected = items.find(item => item.id === selectedId);
  const groups = new Map();
  for (const item of items) {
    const group = item.type === "room" ? item.location : EQUIPMENT_LABELS[item.type];
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(item);
  }

  function choose(item) {
    setSelectedId(item.id);
    setDetailOpen(matchMedia("(max-width:900px)").matches);
  }

  return <>
    <div className="ui-page-heading resource-page-heading">
      <div><h1>ห้องและทรัพยากร</h1><p>ตรวจสถานะห้องและอุปกรณ์</p></div>
      {admin && <div className="resource-heading-actions">
        <GlassButton mode="quick" onClick={onExport} disabled={loading || error}>
          <Download size={16} aria-hidden="true" /> ส่งออกสถานะ
        </GlassButton>
        <GlassButton mode="quick" onClick={() => setExportOpen(true)}>ส่งออกประวัติ</GlassButton>
      </div>}
    </div>
    <section className="resource-toolbar" aria-label="ตัวกรองทรัพยากร">
      <GlassControlGroup mode="quick" label="ประเภททรัพยากร">
        <button type="button" aria-pressed={tab === "rooms"} onClick={() => { setTab("rooms"); setSelectedId(null); }}>ห้องบริการ</button>
        <button type="button" aria-pressed={tab === "equipment"} onClick={() => { setTab("equipment"); setSelectedId(null); }}>อุปกรณ์</button>
      </GlassControlGroup>
      <label className="resource-search">
        <Search size={17} aria-hidden="true" />
        <input type="search" placeholder={tab === "rooms" ? "ค้นหาห้อง รหัส หรือสังกัด" : "ค้นหาอุปกรณ์ รหัส หรือสังกัด"} aria-label="ค้นหาทรัพยากร" value={search} onChange={event => setSearch(event.target.value)} />
      </label>
    </section>
    {loading ? <p role="status">กำลังโหลดสถานะ…</p> : error ? <div className="resource-empty">
      <p role="alert">โหลดสถานะล่าสุดไม่สำเร็จ</p>
      <GlassButton mode="quick" onClick={retry}>ลองอีกครั้ง</GlassButton>
    </div> : <div className="equipment-master-detail resource-master-detail resource-directory-layout">
      <div className="resource-floors">
        {!items.length && <p className="resource-empty">{term ? "ไม่พบทรัพยากรตามคำค้นหา" : "ยังไม่มีรายการทรัพยากร"}</p>}
        {[...groups].map(([name, group]) => <section key={name}>
          <h2>{name}</h2>
          <div className="resource-room-grid">
            {group.map(item => {
              const [label, tone] = resourceState(item);
              return <button type="button" className="resource-card" aria-pressed={selected?.id === item.id} key={item.id} onClick={() => choose(item)}>
                <span className="ui-nav-symbol resource-symbol" data-tone={item.type === "room" && !item.inUse ? "purple" : "green"}><ReviewSymbol name={symbols[item.type]} /></span>
                <strong>{resourceTitle(item)}</strong>
                <small>{item.type === "room" ? item.os : item.location}</small>
                <span className="record-badge" data-tone={tone}>{label}</span>
                <span className="resource-intent">ดูรายละเอียด <ArrowRight size={14} aria-hidden="true" /></span>
              </button>;
            })}
          </div>
        </section>)}
      </div>
      <aside className="equipment-inspector" aria-label="รายละเอียดทรัพยากร">
        <h2>รายละเอียดทรัพยากร</h2>
        {selected ? <Details item={selected} admin={admin} /> : <p className="ui-caption">เลือกรายการเพื่อดูรายละเอียด</p>}
      </aside>
    </div>}
    <Dialog open={Boolean(detailOpen && selected && !loading && !error)} title="รายละเอียดทรัพยากร" onClose={() => setDetailOpen(false)} className="equipment-inspector-content">
      {selected && <Details item={selected} admin={admin} />}
    </Dialog>
    {admin && <Dialog open={exportOpen} title="ส่งออกประวัติยืม–คืน" onClose={() => setExportOpen(false)} busy={history.exporting} footer={
      <GlassButton mode="quick" variant="prominent" disabled={history.exporting || !history.start || !history.end || history.start > history.end} onClick={history.onExport}>ดาวน์โหลด CSV</GlassButton>
    }>
      <div className="resource-history-range">
        <label className="ui-field"><span>จากวันที่</span><input type="date" value={history.start} onChange={event => history.setStart(event.target.value)} className="apple-input" /></label>
        <label className="ui-field"><span>ถึงวันที่</span><input type="date" value={history.end} onChange={event => history.setEnd(event.target.value)} className="apple-input" /></label>
      </div>
    </Dialog>}
  </>;
}
