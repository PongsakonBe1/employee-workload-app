"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Bell, ChevronDown, ChevronRight, CircleCheck, Clock3, Package } from "lucide-react";
import { EQUIPMENT_LABELS } from "../lib/equipmentCatalog";
import { RESOURCE_ROOM_IDS } from "../lib/resourceStatusIndex";
import { roomDisplayState, roomStatusLabels } from "../lib/resourcePresentation";
import { worklogEquipmentSummary } from "../lib/worklogResourceSummary";

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

const equipmentKinds = Object.entries(EQUIPMENT_LABELS);
const resourcePages = [["returns", "ค้างคืน"], ["rooms", "ห้อง"], ...equipmentKinds];
const conditionLabels = { damaged: "ชำรุด", lost: "สูญหาย" };

function EquipmentItemList({ items }) {
  return <ul className="record-return-items">
    {items.map(item => <li key={item.id}>
      <strong>{item.id}</strong>
      <span>{item.location || "ไม่ระบุสังกัด"}</span>
      {item.condition && <small>{conditionLabels[item.condition]}</small>}
    </li>)}
  </ul>;
}

function ReturnExceptions({ label, items }) {
  if (!items.length) return null;
  return <details className="record-return-exceptions">
    <summary><span>{label} <b>{items.length}</b> ชิ้น</span><ChevronDown size={16} aria-hidden="true" /></summary>
    <EquipmentItemList items={items} />
  </details>;
}

function ReturnOverview({ summary }) {
  const { loans, unconfirmed, conditionIssues, total } = summary;
  const complete = total > 0 && !loans.length && !unconfirmed.length;
  const StatusIcon = complete ? CircleCheck : loans.length ? Clock3 : Package;
  return <>
    <div className="record-return-headline" data-return-state={complete ? "clear" : loans.length ? "pending" : "unknown"}>
      <StatusIcon size={22} aria-hidden="true" />
      <div>
        {loans.length > 0 ? <h3>ค้างคืน <b>{loans.length}</b> ชิ้น</h3>
          : <h3>{complete ? "ไม่มีอุปกรณ์ค้างคืน" : total ? "ยังยืนยันการคืนครบไม่ได้" : "ยังไม่มีอุปกรณ์ในรายการ"}</h3>}
        {loans.length > 0 && unconfirmed.length > 0 && <p>นับเฉพาะชิ้นที่ยืนยันว่าค้างคืน</p>}
      </div>
    </div>
    {equipmentKinds.map(([kind, label]) => {
      const items = loans.filter(item => item.kind === kind);
      return items.length ? <div className="record-return-group" key={kind}>
        <h3>{label}</h3><EquipmentItemList items={items} />
      </div> : null;
    })}
    <ReturnExceptions label="ยังยืนยันสถานะไม่ได้" items={unconfirmed} />
    <ReturnExceptions label="ต้องตรวจสภาพ" items={conditionIssues} />
  </>;
}

function EquipmentPage({ counts, loans, unconfirmed, conditionIssues }) {
  const total = counts.ready + counts.inUse + counts.issue;
  if (!total) return <p className="record-resource-feedback">ยังไม่มีอุปกรณ์ประเภทนี้</p>;

  return <>
    <p className="record-equipment-available"><strong>{counts.ready}</strong> พร้อมใช้ จาก {total} ชิ้น</p>
    {loans.length > 0 && <div className="record-return-group">
      <h3>ค้างคืน {loans.length} ชิ้น</h3><EquipmentItemList items={loans} />
    </div>}
    <ReturnExceptions label="ยังยืนยันสถานะไม่ได้" items={unconfirmed} />
    <ReturnExceptions label="ต้องตรวจสภาพ" items={conditionIssues} />
  </>;
}

function ResourceStatusWidget({ status }) {
  const widgetId = useId();
  const viewport = useRef(null);
  const active = useRef(0);
  const [page, setPage] = useState(0);
  const rooms = status.roomStatus ?? {};
  const openCount = RESOURCE_ROOM_IDS.filter(room => rooms[room] === "in_use").length;
  const equipment = worklogEquipmentSummary(status.equipmentCatalog ?? [], status.equipmentStatus ?? {}, status.equipmentConditions ?? {});

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
    if (event.altKey || event.metaKey || event.ctrlKey || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
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
        <strong>{label}</strong>
        <small>{kind === "returns" ? <b>{equipment.loans.length} ชิ้น</b> : kind === "rooms"
          ? <>เปิด <b>{openCount}</b></> : <>พร้อม <b>{equipment.counts[kind].ready}</b></>}</small>
      </button>)}
    </div>
    <p className="sr-only" role="status">กำลังดู {resourcePages[page][1]}</p>
    <div className="record-status-viewport" ref={viewport} onScroll={followScroll}>
      {resourcePages.map(([kind], index) => <section key={kind} className="record-status-slide"
        id={`${widgetId}-${kind}`} aria-labelledby={`${widgetId}-${kind}-label`} aria-hidden={page !== index} inert={page !== index || undefined}>
        {kind === "returns" ? <ReturnOverview summary={equipment} /> : kind === "rooms" ? ["3", "4"].map(floor => <div className="record-resource-group" key={floor}>
          <h3>ห้องชั้น {floor}</h3>
          <ul className="record-live-rooms" aria-label={`สถานะห้องชั้น ${floor}`}>
            {RESOURCE_ROOM_IDS.filter(room => room.startsWith(floor)).map(room => {
              const state = roomDisplayState(rooms[room]);
              return <li key={room} data-state={state}><strong>ห้อง {room}</strong><span>{roomStatusLabels[state]}</span></li>;
            })}
          </ul>
        </div>) : <EquipmentPage counts={equipment.counts[kind]}
          loans={equipment.loans.filter(item => item.kind === kind)}
          unconfirmed={equipment.unconfirmed.filter(item => item.kind === kind)}
          conditionIssues={equipment.conditionIssues.filter(item => item.kind === kind)} />}
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
