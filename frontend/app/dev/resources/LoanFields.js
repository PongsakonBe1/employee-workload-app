"use client";

import { EQUIPMENT_CONDITIONS } from "../../../lib/equipmentPreview";
export function LoanFields({
  device,
  recipient,
  onRecipient,
  condition,
  onCondition,
  error,
  inputRef
}) {
  return <>
    <label className="ui-field">
      <span>{device.student ? "รหัสผู้ยืมเดิม" : "รหัสนักศึกษา 13 หลัก"}</span>
      <input className="apple-input record-student" name="record-student" ref={inputRef} type="text" inputMode="numeric" autoComplete="off" spellCheck={false} pattern="[0-9]{13}" readOnly={Boolean(device.student)} value={device.student || recipient} aria-required={!device.student} aria-invalid={Boolean(error) && !device.student} aria-describedby="record-student-hint record-dialog-error" onChange={event => onRecipient(event.target.value)} />
    </label>
    <p className="ui-caption" id="record-student-hint">{device.student ? "คืนให้ผู้ยืมเดิมโดยไม่ต้องสแกนซ้ำ" : "รับเฉพาะตัวเลข 0–9 ไม่รับตัวอักษรหรือเลขไทย"}</p>
    {device.student && <label className="ui-field resource-condition-field">
      <span>สภาพตอนคืน <small>ระบุเมื่อได้ตรวจจริง</small></span>
      <select className="apple-input" name="return-condition" aria-label="สภาพตอนคืน" value={condition} onChange={event => onCondition(event.target.value)}>{Object.entries(EQUIPMENT_CONDITIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <small className="ui-caption">{condition === "lost" ? "ปิดรายการยืมและบันทึกสูญหาย อุปกรณ์จะไม่พร้อมยืม" : "ยังไม่ระบุจะไม่ถูกนับเป็นคืนสมบูรณ์ และคงสภาพล่าสุดในทะเบียน"}</small>
    </label>}
    <p className="record-error" id="record-dialog-error" role="alert">{error}</p>
  </>;
}
