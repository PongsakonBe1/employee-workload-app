"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Bell, ChevronDown, ChevronRight } from "lucide-react";
import { useSharedResourceStatus } from "../hooks/useSharedResourceStatus";
import { recordStatusRefreshMs } from "../hooks/useWorklogRecordContext";
import { EQUIPMENT_LABELS } from "../lib/equipmentCatalog";
import { RESOURCE_ROOM_IDS } from "../lib/resourceStatusIndex";
import { roomClosureNotices, summarizeEquipment } from "../lib/worklogResourceSummary";

const roomLabels = { in_use: "เปิดอยู่", available: "ปิดอยู่" };
const equipmentStates = { ready: "พร้อมใช้", inUse: "กำลังใช้", issue: "มีปัญหา/ต้องตรวจ" };

function noticeText({ minutes }) {
  return minutes > 0 ? `ปิดใน ${minutes} นาที` : "พ้นเวลาตามตาราง";
}

function EquipmentMeter({ label, counts }) {
  const segments = Object.entries(equipmentStates);
  return <li className="record-equipment-meter">
    <strong>{label}</strong>
    <div className="record-equipment-track" aria-hidden="true">
      {segments.map(([state]) => counts[state] > 0 && <span key={state} data-state={state} style={{ flexGrow: counts[state] }} />)}
    </div>
    <div className="record-equipment-counts">
      {segments.map(([state, name]) => <span key={state}>{name} {counts[state]}</span>)}
    </div>
  </li>;
}

export function WorklogResourceSummary({ schedule, retrySchedule, clock }) {
  const titleId = useId();
  const detailId = useId();
  const [expanded, setExpanded] = useState(false);
  const { status, loading, error, retry } = useSharedResourceStatus({ refreshEveryMs: recordStatusRefreshMs });
  const rooms = status?.roomStatus ?? {};
  const notices = roomClosureNotices(rooms, schedule, clock);
  const next = notices[0];
  const openCount = RESOURCE_ROOM_IDS.filter(room => rooms[room] === "in_use").length;
  const unknownCount = RESOURCE_ROOM_IDS.filter(room => !roomLabels[rooms[room]]).length;
  const equipment = status && summarizeEquipment(status.equipmentCatalog ?? [], status.equipmentStatus ?? {}, status.equipmentConditions ?? {});
  const readyCount = equipment ? Object.values(equipment).reduce((sum, counts) => sum + counts.ready, 0) : 0;
  let summary = error ? "ยังยืนยันสถานะไม่ได้" : "กำลังโหลด…";
  if (status) summary = [
    `เปิดอยู่ ${openCount} ห้อง`, `อุปกรณ์พร้อมใช้ ${readyCount}`, unknownCount > 0 && `ยังไม่ยืนยัน ${unknownCount} ห้อง`,
  ].filter(Boolean).join(" · ");
  if (next) summary = `ห้อง ${next.room} · ${noticeText(next)}`;

  return <section className="record-resource-summary" aria-labelledby={titleId} data-expanded={expanded}>
    <h2 id={titleId} className="record-resource-title">สถานะห้องและอุปกรณ์</h2>
    <button type="button" className="record-resource-disclosure" aria-expanded={expanded} aria-controls={detailId} onClick={() => setExpanded(value => !value)}>
      <span><strong>สถานะห้องและอุปกรณ์</strong><small data-alert={Boolean(next)}>{summary}</small></span>
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
        <ul className="record-live-rooms" aria-label="สถานะห้อง">
          {RESOURCE_ROOM_IDS.map(room => <li key={room} data-state={rooms[room]}><strong>ห้อง {room}</strong><span>{roomLabels[rooms[room]] ?? "ยังไม่ยืนยัน"}</span></li>)}
        </ul>
        <ul className="record-live-equipment" aria-label="สถานะอุปกรณ์">
          {Object.entries(EQUIPMENT_LABELS).map(([kind, label]) => <EquipmentMeter key={kind} label={label} counts={equipment[kind]} />)}
        </ul>
      </>}
      <Link href="/resources" prefetch={false} className="record-link">ดูทรัพยากรทั้งหมด <ChevronRight size={15} aria-hidden="true" /></Link>
    </div>
  </section>;
}
