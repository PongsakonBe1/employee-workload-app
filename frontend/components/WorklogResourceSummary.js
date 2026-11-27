"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Bell, ChevronDown, ChevronRight } from "lucide-react";
import { EQUIPMENT_LABELS } from "../lib/equipmentCatalog";
import { RESOURCE_ROOM_IDS } from "../lib/resourceStatusIndex";
import { equipmentStatusLabels, roomDisplayState, roomStatusLabels } from "../lib/resourcePresentation";
import { summarizeEquipment } from "../lib/worklogResourceSummary";

function noticeText({ minutes }) {
  return minutes > 0 ? `ปิดใน ${minutes} นาที` : "พ้นเวลาตามตาราง";
}

export function MobileRoomClosureNotice({ notices }) {
  const notice = notices[0];
  if (!notice) return null;
  return <p className="record-mobile-room-notice" data-overdue={notice.minutes <= 0}>
    <Bell size={15} aria-hidden="true" />
    <strong>ห้อง {notice.room} · {noticeText(notice)}</strong>
    <time>{notice.endTime}</time>
    {notices.length > 1 && <small>อีก {notices.length - 1} ห้อง</small>}
  </p>;
}

function EquipmentMeter({ label, counts }) {
  const segments = Object.entries(equipmentStatusLabels);
  return <li className="record-equipment-meter">
    <strong>{label}</strong>
    <div className="record-equipment-counts">
      {segments.map(([state, name]) => <span key={state}>{name} <b>{counts[state]}</b></span>)}
    </div>
    <div className="record-equipment-track" aria-hidden="true">
      {segments.map(([state]) => counts[state] > 0 && <span key={state} data-state={state} style={{ flexGrow: counts[state] }} />)}
    </div>
  </li>;
}

export function WorklogResourceSummary({ schedule, retrySchedule, notices, resourceStatus }) {
  const titleId = useId();
  const detailId = useId();
  const [expanded, setExpanded] = useState(false);
  const { status, loading, error, retry } = resourceStatus;
  const rooms = status?.roomStatus ?? {};
  const openCount = RESOURCE_ROOM_IDS.filter(room => rooms[room] === "in_use").length;
  const unknownCount = RESOURCE_ROOM_IDS.filter(room => roomDisplayState(rooms[room]) === "unknown").length;
  const equipment = status && summarizeEquipment(status.equipmentCatalog ?? [], status.equipmentStatus ?? {}, status.equipmentConditions ?? {});
  const counts = Object.values(equipment ?? {});
  const readyCount = counts.reduce((sum, item) => sum + item.ready, 0);
  const issueCount = counts.reduce((sum, item) => sum + item.issue, 0);
  let summary = error ? "ยังยืนยันสถานะไม่ได้" : "กำลังโหลด…";
  if (status) summary = [
    `เปิด ${openCount} ห้อง`, `อุปกรณ์พร้อม ${readyCount}`, issueCount > 0 && `ต้องตรวจ ${issueCount}`,
    unknownCount > 0 && `ยังไม่ยืนยัน ${unknownCount} ห้อง`,
  ].filter(Boolean).join(" · ");

  return <section className="record-resource-summary" aria-labelledby={titleId} data-expanded={expanded}>
    <h2 id={titleId} className="record-resource-title">สถานะห้องและอุปกรณ์</h2>
    <p className="record-resource-at-a-glance">{summary}</p>
    <button type="button" className="record-resource-disclosure" aria-expanded={expanded} aria-controls={detailId} onClick={() => setExpanded(value => !value)}>
      <span><strong>สถานะห้องและอุปกรณ์</strong><small>{summary}</small></span>
      <ChevronDown size={17} aria-hidden="true" />
    </button>
    <div id={detailId} className="record-resource-summary-body">
      {loading && <p className="ui-caption" role="status">กำลังโหลดสถานะห้องและอุปกรณ์…</p>}
      {error && <div className="record-resource-feedback">
        <p role="status">ยังยืนยันสถานะห้องและอุปกรณ์ไม่ได้</p>
        <button type="button" className="record-link" onClick={retry}>ลองโหลดสถานะอีกครั้ง</button>
      </div>}
      {status && <>
        {notices.length > 0 && <ul className="record-room-notices" aria-label="เตือนปิดห้องเรียน">
          {notices.map(notice => <li key={notice.room} data-overdue={notice.minutes <= 0}>
            <Bell size={15} aria-hidden="true" />
            <strong>ห้อง {notice.room} · {noticeText(notice)}</strong><time>{notice.endTime}</time>
          </li>)}
        </ul>}
        {schedule.status === "error" && <div className="record-resource-feedback">
          <p role="status">ยังยืนยันเวลาปิดห้องไม่ได้</p>
          <button type="button" className="record-link" onClick={retrySchedule}>ลองโหลดตารางวันนี้อีกครั้ง</button>
        </div>}
        {schedule.unavailable > 0 && <p className="ui-caption">ตารางวันนี้มีข้อมูลไม่ครบ จึงยังยืนยันเวลาปิดห้องไม่ได้</p>}
        {["3", "4"].map(floor => <ul key={floor} className="record-live-rooms" aria-label={`สถานะห้องชั้น ${floor}`}>
          {RESOURCE_ROOM_IDS.filter(room => room.startsWith(floor)).map(room => {
            const state = roomDisplayState(rooms[room]);
            return <li key={room} data-state={state}><strong>ห้อง {room}</strong><span>{roomStatusLabels[state]}</span></li>;
          })}
        </ul>)}
        <ul className="record-live-equipment" aria-label="สถานะอุปกรณ์">
          {Object.entries(EQUIPMENT_LABELS).map(([kind, label]) => <EquipmentMeter key={kind} label={label} counts={equipment[kind]} />)}
        </ul>
      </>}
      <Link href="/resources" prefetch={false} className="record-link">ดูทรัพยากรทั้งหมด <ChevronRight size={15} aria-hidden="true" /></Link>
    </div>
  </section>;
}
