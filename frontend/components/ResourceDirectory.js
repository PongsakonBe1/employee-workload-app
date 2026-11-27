"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, Download, Search } from "lucide-react";
import { EQUIPMENT_LABELS } from "../lib/equipmentCatalog";
import { equipmentDisplayState, equipmentStatusLabels, roomDisplayState, roomStatusLabels } from "../lib/resourcePresentation";
import { Dialog } from "./ui/Dialog";
import { GlassButton, GlassControlGroup } from "./ui/GlassControls";
import { ReviewSymbol } from "./ui/ReviewSymbol";
import "../app/dev/record/record.css";
import "../app/dev/resources/resources.css";

const symbols = { room: "door", headphones: "headphones", power: "plug", usb: "usb" };
const tones = { in_use: "green", available: "neutral", unknown: "amber", ready: "green", inUse: "blue", issue: "amber" };

function resourceState(item) {
  if (item.type === "room") return roomDisplayState(item.status);
  return equipmentDisplayState(item.status, item.condition);
}

function StatusBadge({ item }) {
  const state = resourceState(item);
  const condition = { damaged: "ชำรุด", lost: "สูญหาย" }[item.condition];
  const label = state === "issue" && !item.unknown && condition ? condition : (roomStatusLabels[state] ?? equipmentStatusLabels[state]);
  return <span className="record-badge" data-tone={tones[state]}>{label}</span>;
}

function resourceTitle(item) {
  return item.type === "room" ? `ห้อง ${item.id}` : item.id;
}

function Details({ item, admin }) {
  const room = item.type === "room";
  return <>
    <div className="equipment-inspector-title">
      <span className="ui-nav-symbol" data-tone="neutral" aria-hidden="true"><ReviewSymbol name={symbols[item.type]} /></span>
      <div><strong>{resourceTitle(item)}</strong><small>{room ? item.os || item.location : item.label}</small></div>
    </div>
    <StatusBadge item={item} />
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const term = search.trim().toLocaleLowerCase("th");
  const roomsTab = tab === "rooms";
  const filters = roomsTab ? roomStatusLabels : equipmentStatusLabels;
  const items = (roomsTab ? rooms : equipment).filter(item =>
    (statusFilter === "all" || resourceState(item) === statusFilter) &&
    [resourceTitle(item), item.label, item.location, item.os].some(value => value?.toLocaleLowerCase("th").includes(term)));
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

  function changeTab(next) {
    if (next === tab) return;
    setTab(next);
    setSearch("");
    setStatusFilter("all");
    setSelectedId(null);
    setDetailOpen(false);
  }

  return <>
    <div className="ui-page-heading resource-page-heading">
      <div><h1>ห้องและทรัพยากร</h1></div>
      {admin && <div className="resource-heading-actions">
        <GlassButton mode="quick" onClick={onExport} disabled={loading || error}>
          <Download size={16} aria-hidden="true" /> ส่งออกสถานะ
        </GlassButton>
        <GlassButton mode="quick" onClick={() => setExportOpen(true)}>ส่งออกประวัติ</GlassButton>
      </div>}
    </div>
    <section className="resource-toolbar resource-directory-toolbar" aria-label="ตัวกรองทรัพยากร">
      <GlassControlGroup mode="quick" label="ประเภททรัพยากร">
        <button type="button" aria-pressed={roomsTab} onClick={() => changeTab("rooms")}>ห้อง</button>
        <button type="button" aria-pressed={!roomsTab} onClick={() => changeTab("equipment")}>อุปกรณ์</button>
      </GlassControlGroup>
      <label className="resource-search">
        <Search size={17} aria-hidden="true" />
        <input type="search" placeholder={roomsTab ? "ค้นหาเลขห้องหรือชั้น" : "ค้นหาอุปกรณ์ รหัส หรือสังกัด"} aria-label="ค้นหาทรัพยากร" value={search} onChange={event => setSearch(event.target.value)} />
      </label>
      <div className="resource-directory-filter"><label htmlFor="resource-status-filter">สถานะ</label>
        <select id="resource-status-filter" className="apple-input" value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setSelectedId(null); }}>
          <option value="all">ทุกสถานะ</option>
          {Object.entries(filters).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
    </section>
    {!roomsTab && !loading && !error && <ul className="resource-availability" aria-label="อุปกรณ์พร้อมใช้แยกตามชนิด">
      {Object.entries(EQUIPMENT_LABELS).map(([kind, label]) => <li key={kind}>
        <strong>{label}</strong><span>พร้อมใช้ <b>{equipment.filter(item => item.type === kind && resourceState(item) === "ready").length}</b></span>
      </li>)}
    </ul>}
    {loading ? <p role="status">กำลังโหลดสถานะ…</p> : error ? <div className="resource-empty">
      <p role="alert">โหลดสถานะล่าสุดไม่สำเร็จ</p>
      <GlassButton mode="quick" onClick={retry}>ลองอีกครั้ง</GlassButton>
    </div> : <div className="equipment-master-detail resource-master-detail resource-directory-layout">
      <div className="resource-floors">
        {!items.length && <p className="resource-empty">{term || statusFilter !== "all" ? "ไม่พบทรัพยากรที่ตรงกับตัวกรอง" : "ยังไม่มีรายการทรัพยากร"}</p>}
        {[...groups].map(([name, group]) => <section key={name}>
          <h2>{name}</h2>
          <div className="resource-room-grid">
            {group.map(item => <button type="button" className="resource-card resource-directory-row" aria-pressed={selected?.id === item.id} key={item.id} onClick={() => choose(item)}>
              <span className="resource-directory-name"><strong>{resourceTitle(item)}</strong>
                {(roomsTab ? item.os : item.location) && <small>{roomsTab ? item.os : item.location}</small>}
              </span>
              <StatusBadge item={item} />
              <ChevronRight size={15} aria-hidden="true" />
            </button>)}
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
