"use client";

import { GlassButton } from "../../../components/ui/GlassControls";
import { ReviewSymbol } from "../../../components/ui/ReviewSymbol";
import { roomState } from "../../../lib/resourceWorklog";
import { canBorrowEquipment, canReturnEquipment, equipmentState, EQUIPMENT_CONDITIONS, EQUIPMENT_KINDS } from "../../../lib/equipmentPreview";
export function ResourceDetails({
  kind,
  item,
  admin,
  onAction,
  onHistory,
  onEdit
}) {
  if (!item) return <p className="ui-caption">ไม่มีรายการตามตัวกรอง</p>;
  const room = kind === "room",
    state = room ? roomState(item) : equipmentState(item);
  const symbols = {
    headphones: "headphones",
    plug: "plug",
    usb: "usb"
  };
  const canAct = room || canBorrowEquipment(item) || canReturnEquipment(item);
  return <>
    <div className="equipment-inspector-title"><span className="ui-nav-symbol" data-tone={room ? "purple" : "green"}><ReviewSymbol name={room ? "door" : symbols[item.kind]} size={24} /></span><div><strong>{room ? `ห้อง ${item.id}` : item.name}</strong><small>{room ? `ชั้น ${item.floor}` : item.assetCode}</small></div></div>
    <span className="record-badge" data-tone={state.tone}>{state.label}</span>
    {room ? <dl><dt>รายละเอียด</dt><dd>{item.detail}</dd><dt>ประเภท</dt><dd>{item.floor === "3" ? "แลกเปลี่ยนความรู้" : "ห้องเรียน"}</dd><dt>สังกัด</dt><dd>ชั้น {item.floor}</dd></dl> : <dl><dt>สังกัดปัจจุบัน</dt><dd>{item.location}</dd><dt>ประเภท</dt><dd>{EQUIPMENT_KINDS[item.kind]}</dd><dt>สภาพล่าสุดที่ทราบ</dt><dd>{EQUIPMENT_CONDITIONS[item.condition]}</dd><dt>บาร์โค้ด</dt><dd>{item.barcode || "ไม่ได้ระบุ"}</dd><dt>ลำดับแสดงผล</dt><dd>{item.order}</dd></dl>}
    <div className="equipment-inspector-actions"><GlassButton mode="quick" variant="prominent" disabled={!canAct} onClick={onAction}>{room ? item.open ? "ปิดห้อง" : "เปิดห้อง" : item.student ? "คืนรายการนี้" : canAct ? "ยืมรายการนี้" : "ยังไม่พร้อมยืม"}</GlassButton><GlassButton mode="quick" onClick={onHistory}>ดูประวัติ</GlassButton>{!room && admin && <GlassButton mode="quick" onClick={onEdit}>แก้ไขทะเบียน</GlassButton>}</div>
    {!room && <p className="ui-caption resource-note">การย้ายสังกัดเปลี่ยนรายการปัจจุบัน ประวัติเดิมคงข้อมูลขณะทำรายการ</p>}
  </>;
}
