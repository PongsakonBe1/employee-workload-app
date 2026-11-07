"use client";

import { useRef, useState } from "react";
import { Dialog } from "../../../components/ui/Dialog";
import { GlassButton } from "../../../components/ui/GlassControls";
import { LoanFields } from "./LoanFields";
import { recordLedger, useRecordLedger } from "../record/store";
import { deviceWorklog, roomWorklog } from "../../../lib/resourceWorklog";
import { canBorrowEquipment, canReturnEquipment, equipmentState, EQUIPMENT_CONDITIONS } from "../../../lib/equipmentPreview";
export function ResourceDialog({
  action,
  actor,
  person,
  dateTime,
  onClose,
  onSaved
}) {
  const {
      data
    } = useRecordLedger(),
    input = useRef(null);
  const [recipient, setRecipient] = useState(""),
    [condition, setCondition] = useState("unknown"),
    [error, setError] = useState("");
  const item = action?.type === "room" ? data.rooms.find(row => row.id === action.id) : data.devices.find(row => row.id === action?.id);
  function submit(event) {
    event.preventDefault();
    const result = action.type === "room" ? roomWorklog(item, dateTime) : deviceWorklog(item, recipient, condition, dateTime);
    if (!result.entry) {
      setError(result.message);
      input.current?.focus();
      input.current?.scrollIntoView({
        block: "center",
        behavior: "instant"
      });
      return;
    }
    try {
      recordLedger.transact({
        actor,
        requestId: action.requestId,
        expectedRevision: action.revision,
        entries: [{
          ...result.entry,
          person: person.displayName,
          employeeId: actor.id
        }]
      });
      onSaved("บันทึกข้อมูลตัวอย่างแล้ว");
      onClose();
    } catch (failure) {
      setError(failure.message);
    }
  }
  return <Dialog open={Boolean(action && item)} onClose={onClose} title={action?.type === "room" ? `ห้อง ${item?.id}` : item?.name || "อุปกรณ์"} className="record-dialog" description="Development · ใช้ข้อมูลชุดเดียวกับบันทึกงานและประวัติ">
    {item && <form onSubmit={submit} noValidate>
      {action.type === "room" ? <><p className="resource-dialog-status">{item.open ? "เปิดอยู่" : "ปิดอยู่"} · {item.detail}</p><p className="record-error" role="alert">{error}</p><GlassButton mode="quick" variant="prominent" type="submit">{item.open ? "ปิดห้อง" : "เปิดห้อง"}</GlassButton></> : <>
        <p className="resource-dialog-status">{equipmentState(item).label} · {item.assetCode} · {item.location}</p>
        <p className="ui-caption">สภาพล่าสุดที่ทราบ: {EQUIPMENT_CONDITIONS[item.condition]}</p>
        {canBorrowEquipment(item) || canReturnEquipment(item) ? <><LoanFields device={item} recipient={recipient} condition={condition} inputRef={input} error={error} onCondition={setCondition} onRecipient={value => {
            if (/^[0-9]*$/.test(value)) {
              setRecipient(value);
              setError("");
            } else {
              setRecipient("");
              setError("ใช้เฉพาะตัวเลข 0–9 กรุณาตรวจภาษาแป้นพิมพ์");
            }
          }} /><div className="record-form-actions"><GlassButton mode="quick" onClick={onClose}>ยกเลิก</GlassButton><GlassButton mode="quick" variant="prominent" type="submit">{item.student ? "บันทึกคืน" : "บันทึกยืม"}</GlassButton></div></> : <p className="ui-caption">ยังไม่พร้อมให้ยืม กรุณาตรวจสภาพหรือสถานะใช้งานในทะเบียน</p>}
      </>}
    </form>}
  </Dialog>;
}
