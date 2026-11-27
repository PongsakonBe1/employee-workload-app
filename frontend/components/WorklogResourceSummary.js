"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Bell, ChevronRight } from "lucide-react";
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

const resourcePages = [["rooms", "ห้อง"], ...Object.entries(EQUIPMENT_LABELS)];

function EquipmentPage({ counts }) {
  const segments = Object.entries(equipmentStatusLabels);
  const total = counts.ready + counts.inUse + counts.issue;
  if (!total) return <p className="record-resource-feedback">ยังไม่มีอุปกรณ์ประเภทนี้</p>;

  return <div className="record-equipment-meter">
    <p className="record-equipment-available"><strong>{counts.ready}</strong> พร้อมใช้ จาก {total} ชิ้น</p>
    <div className="record-equipment-track" aria-hidden="true">
      {segments.map(([state]) => counts[state] > 0 && <span key={state} data-state={state} style={{ flexGrow: counts[state] }} />)}
    </div>
    <dl className="record-equipment-counts">
      {segments.map(([state, name]) => <div key={state} data-attention={state === "issue" && counts.issue > 0}>
        <dt>{name}</dt><dd>{counts[state]}</dd>
      </div>)}
    </dl>
  </div>;
}

function ResourceStatusWidget({ status }) {
  const widgetId = useId();
  const viewport = useRef(null);
  const active = useRef(0);
  const [page, setPage] = useState(0);
  const rooms = status.roomStatus ?? {};
  const openCount = RESOURCE_ROOM_IDS.filter(room => rooms[room] === "in_use").length;
  const equipment = summarizeEquipment(status.equipmentCatalog ?? [], status.equipmentStatus ?? {}, status.equipmentConditions ?? {});
  const issueCount = Object.values(equipment).reduce((sum, item) => sum + item.issue, 0);

  useEffect(() => {
    const node = viewport.current;
    let width = node.clientWidth;
    const observer = new ResizeObserver(() => {
      if (width === node.clientWidth) return;
      width = node.clientWidth;
      node.scrollLeft = active.current * width;
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function selectPage(index) {
    const node = viewport.current;
    active.current = index;
    setPage(index);
    node.scrollLeft = index * node.clientWidth;
  }

  function followScroll(event) {
    const { scrollLeft, clientWidth } = event.currentTarget;
    if (!clientWidth) return;
    const index = Math.min(resourcePages.length - 1, Math.max(0, Math.round(scrollLeft / clientWidth)));
    if (index === active.current) return;
    active.current = index;
    setPage(index);
  }

  function onPageKey(event, index) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const next = (index + offset + resourcePages.length) % resourcePages.length;
    selectPage(next);
    event.currentTarget.parentElement.children[next].focus({ preventScroll: true });
  }

  return <div className="record-status-widget">
    <div className="record-status-pages" role="group" aria-label="เลือกสถานะตามประเภท">
      {resourcePages.map(([kind, label], index) => <button key={kind} type="button" id={`${widgetId}-${kind}-label`}
        aria-pressed={page === index} aria-controls={`${widgetId}-${kind}`} onClick={() => selectPage(index)} onKeyDown={event => onPageKey(event, index)}>
        <strong>{label}</strong><small>{kind === "rooms" ? <>เปิด <b>{openCount}</b></> : <>พร้อม <b>{equipment[kind].ready}</b></>}</small>
      </button>)}
    </div>
    {issueCount > 0 && <p className="record-status-issue-total" data-attention="true">อุปกรณ์ต้องตรวจ {issueCount} ชิ้น</p>}
    <p className="sr-only" role="status">กำลังดูสถานะ{resourcePages[page][1]}</p>
    <div className="record-status-viewport" ref={viewport} onScroll={followScroll}>
      {resourcePages.map(([kind], index) => <section key={kind} className="record-status-slide"
        id={`${widgetId}-${kind}`} aria-labelledby={`${widgetId}-${kind}-label`} aria-hidden={page !== index}>
        {kind === "rooms" ? ["3", "4"].map(floor => <div className="record-resource-group" key={floor}>
          <h3>ห้องชั้น {floor}</h3>
          <ul className="record-live-rooms" aria-label={`สถานะห้องชั้น ${floor}`}>
            {RESOURCE_ROOM_IDS.filter(room => room.startsWith(floor)).map(room => {
              const state = roomDisplayState(rooms[room]);
              return <li key={room} data-state={state}><strong>ห้อง {room}</strong><span>{roomStatusLabels[state]}</span></li>;
            })}
          </ul>
        </div>) : <EquipmentPage counts={equipment[kind]} />}
      </section>)}
    </div>
  </div>;
}

export function WorklogResourceSummary({ schedule, retrySchedule, notices, resourceStatus }) {
  const titleId = useId();
  const { status, loading, error, retry } = resourceStatus;

  return <section className="record-resource-summary" aria-labelledby={titleId}>
    <header className="record-resource-header">
      <h2 id={titleId}>สถานะห้องและอุปกรณ์</h2>
      <Link href="/resources" prefetch={false} className="record-link record-resource-directory-link">ดูทรัพยากรทั้งหมด <ChevronRight size={15} aria-hidden="true" /></Link>
    </header>
    <div className="record-resource-summary-body">
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
        <ResourceStatusWidget status={status} />
      </>}
    </div>
  </section>;
}
