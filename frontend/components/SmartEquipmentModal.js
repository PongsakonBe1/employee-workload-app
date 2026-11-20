"use client";

import { useState, useLayoutEffect, useId, useRef } from 'react';
import { Dialog } from './ui/Dialog';
import { GlassButton } from './ui/GlassControls';
import '../app/dev/record/record.css';
import './smart-equipment-modal.css';
import { Headphones, Plug, Usb, User, Clock, RotateCcw, Ban } from 'lucide-react';
import { useSharedResourceStatus } from "../hooks/useSharedResourceStatus";
import { equipmentLoanKind, equipmentLoanState, equipmentLoanTask, isEquipmentStudentCode, STUDENT_CODE_HINT } from '../lib/equipmentLoan';
import { visibleEquipment } from '../lib/equipmentCatalog';

const loanPresentation = {
  available: { label: "พร้อมยืม", action: "ยืมใช้งาน", tone: "green" },
  in_use: { label: "กำลังยืม", action: "คืนอุปกรณ์", tone: "amber" },
  inactive: { label: "หยุดใช้", action: "ยืมไม่ได้", tone: "red" },
  damaged: { label: "ชำรุด", action: "ยืมไม่ได้", tone: "red" },
  lost: { label: "สูญหาย", action: "ยืมไม่ได้", tone: "red" },
  unknown: { label: "ยังไม่ทราบ", action: "ตรวจสอบสถานะ", tone: "neutral" },
};

const canSelect = state => state === "available" || state === "in_use";

export default function SmartEquipmentModal({ 
  isOpen, 
  onClose, 
  onSelect, 
  templateName,
  templateMinorTask,
  isSmart
}) {
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [recipient, setRecipient] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const recipientRef = useRef(null);
  const savingRef = useRef(false);
  const recipientId = useId();
  const scannerHintId = useId();
  const errorId = useId();
  // ITEM-1: Return condition state
  const [returnCondition, setReturnCondition] = useState('normal');
  const [returnNote, setReturnNote] = useState('');

  // กำหนดประเภทอุปกรณ์
  const tName = templateName || '';
  const tTask = templateMinorTask || '';
  const equipmentType = equipmentLoanKind({ name: tName, minorTask: tTask, isSmart });
  const isHeadphones = equipmentType === 'headphones';
  const isUsb = equipmentType === 'usb';
  const { status, loading, error: statusError, retry } = useSharedResourceStatus({ enabled: isOpen });
  const equipmentStatus = status?.equipmentStatus?.[equipmentType] ?? {};
  const equipmentDetails = status?.details ?? {};
  const equipmentConditionMap = status?.equipmentConditions ?? {};
  const equipmentList = equipmentType ? visibleEquipment(status?.equipmentCatalog ?? [], status?.equipmentStatus ?? {}, {
    kind: equipmentType, template: `${tName} ${tTask}`
  }) : [];
  const items = equipmentList.map(item => ({ ...item, state: equipmentLoanState(item, equipmentStatus, equipmentConditionMap) }));
  const selectedItem = items.find(item => item.id === selectedEquipment);
  const selectedStatus = selectedItem?.state;
  const returning = selectedStatus === 'in_use';
  const originalBorrower = equipmentDetails[selectedEquipment]?.user || '';
  const noteRequired = returning && (returnCondition === 'damaged' || returnCondition === 'lost');
  const canConfirm = Boolean(selectedItem && !loading && !statusError && !saving && (returning ? !noteRequired || returnNote.trim() : selectedStatus === 'available' && isEquipmentStudentCode(recipient)));

  useLayoutEffect(() => {
    if (isOpen && selectedStatus === 'available' && !loading) recipientRef.current?.focus();
  }, [isOpen, selectedEquipment, selectedStatus, loading]);

  const handleSelect = item => {
    if (savingRef.current || loading || statusError || !canSelect(item.state)) return;
    const equipment = item.id;
    setSelectedEquipment(equipment);
    setReturnCondition('normal');
    setReturnNote('');
    setError('');
    if (selectedEquipment !== equipment) setRecipient('');
    else recipientRef.current?.focus();
  };

  const handleConfirm = async () => {
    if (savingRef.current || loading || statusError || !canSelect(selectedStatus)) return;
    if (!returning && !isEquipmentStudentCode(recipient)) {
      setError('กรุณากรอกรหัสนักศึกษาเป็นเลข 0–9 ครบ 13 หลัก');
      recipientRef.current?.focus();
      return;
    }
    if (noteRequired && !returnNote.trim()) {
      setError('กรุณาระบุรายละเอียดสภาพอุปกรณ์');
      return;
    }
    const minorTask = equipmentLoanTask(equipmentType, returning);
    if (!minorTask) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      await onSelect(`${minorTask} ${selectedEquipment}`, selectedEquipment, minorTask, returning ? originalBorrower : recipient, returning ? returnCondition : 'normal', returning ? returnNote.trim() : '');
      onClose();
    } catch {
      setError('ยังยืนยันการบันทึกไม่ได้ กรุณาเปิดประวัติตรวจรายการก่อนลองใหม่');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (savingRef.current) return;
    onClose();
    setSelectedEquipment('');
    setRecipient('');
    setReturnCondition('normal');
    setReturnNote('');
    setError('');
  };

  const availableCount = items.filter(item => item.state === "available").length;
  const inUseCount = items.filter(item => item.state === "in_use").length;
  const blockedCount = items.length - availableCount - inUseCount;
  const summary = `พร้อมยืม ${availableCount} · กำลังยืม ${inUseCount} · ยืมไม่ได้ ${blockedCount}`;
  let description = summary;
  if (saving) description = "กำลังบันทึกงาน…";
  else if (statusError) description = "ยังโหลดสถานะไม่ได้";
  else if (loading || !status) description = "กำลังโหลดสถานะอุปกรณ์…";

  const AvailableIcon = isHeadphones ? Headphones : isUsb ? Usb : Plug;

  const confirmLabel = returning
    ? `คืน ${selectedEquipment} — ${{ normal: "สมบูรณ์", damaged: "ชำรุด", lost: "สูญหาย" }[returnCondition]}`
    : selectedStatus === 'available' ? `ยืนยัน — ยืม ${selectedEquipment}` : "ยืนยัน";
  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      title={templateName}
      className="record-dialog equipment-loan-dialog"
      busy={saving}
      description={description}
      footer={<>
        <GlassButton onClick={handleClose} disabled={saving}>ยกเลิก</GlassButton>
        <GlassButton variant={returning && returnCondition === "lost" ? "destructive" : "prominent"} onClick={handleConfirm} disabled={!canConfirm}>
          {confirmLabel}
        </GlassButton>
      </>}
    >
        {/* Equipment List */}
        <div className="pb-3">
          {statusError ? <p role="alert" className="py-4 text-sm text-slate-600">โหลดสถานะล่าสุดไม่สำเร็จ <button type="button" className="underline" onClick={retry}>ลองอีกครั้ง</button></p> : loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
            </div>
          ) : equipmentList.length === 0 ? (
            <p className="py-4 text-sm text-slate-600" role="status">ไม่มีอุปกรณ์ในสังกัดนี้</p>
          ) : (
            <div className="equipment-loan-grid">
              {items.map(item => {
                const { id, location, state, active } = item;
                const { label, action, tone } = loanPresentation[state];
                const selected = id === selectedEquipment;
                const Icon = state === "available" ? AvailableIcon : state === "in_use" ? RotateCcw : Ban;
                const borrower = state === "in_use" ? equipmentDetails[id]?.user : null;
                return (
                  <button key={id} type="button" className="equipment-loan-card" data-tone={tone}
                    aria-label={[id, label, action, location].filter(Boolean).join(" · ")}
                    aria-pressed={selected} disabled={saving || !canSelect(state)} onClick={() => handleSelect(item)}>
                    <strong>{Number(id.slice(4))}</strong>
                    <span><Icon size={13} aria-hidden="true" /> {label}</span>
                    {borrower && <small className="equipment-loan-borrower">{borrower}</small>}
                    {!active && state === "in_use" && <small>หยุดใช้ · รับคืนได้</small>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="border-t border-slate-200 pt-3 space-y-3">
          {returning && equipmentDetails[selectedEquipment] && (
            <div className="equipment-loan-return-note">
              <User className="w-3.5 h-3.5 shrink-0" />
              <span>ผู้ยืม: <strong>{equipmentDetails[selectedEquipment].user}</strong></span>
              <Clock className="w-3 h-3 ml-2 shrink-0" />
              <span>{equipmentDetails[selectedEquipment].time}</span>
            </div>
          )}
          {/* ITEM-1: Inline condition selector ตอนคืนอุปกรณ์ */}
          {returning && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500">สภาพอุปกรณ์ที่คืน</p>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  ["normal", "สมบูรณ์", "green"],
                  ["damaged", "ชำรุด", "amber"],
                  ["lost", "สูญหาย", "red"],
                ].map(([v, label, tone]) => (
                  <button
                    key={v}
                    type="button"
                    disabled={saving}
                    onClick={() => { setReturnCondition(v);setError('');if (v === 'normal') setReturnNote(''); }}
                    className="equipment-loan-condition" data-tone={tone} aria-pressed={returnCondition === v}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {(returnCondition === 'damaged' || returnCondition === 'lost') && (
                <textarea
                  value={returnNote}
                  disabled={saving}
                  onChange={(e) => setReturnNote(e.target.value.slice(0, 200))}
                  className="apple-input text-sm resize-none"
                  rows={2}
                  placeholder="โน้ตสั้นๆ เช่น สายขาด, หายระหว่างใช้งาน... (ไม่เกิน 200 ตัวอักษร)"
                  aria-label="หมายเหตุสภาพอุปกรณ์"
                />
              )}
            </div>
          )}
          {selectedEquipment && selectedStatus === 'available' && (
            <div>
              <label htmlFor={recipientId} className="block text-xs font-medium text-slate-500 mb-1.5">รหัสนักศึกษา 13 หลัก</label>
              <input
                id={recipientId}
                ref={recipientRef}
                type="text"
                inputMode="numeric"
                lang="en"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                pattern="[0-9]{13}"
                aria-required="true"
                aria-describedby={error ? `${scannerHintId} ${errorId}` : scannerHintId}
                aria-invalid={Boolean(error) || /[^0-9]/.test(recipient) || recipient.length > 13}
                value={recipient}
                disabled={saving}
                onChange={(event) => { setRecipient(event.target.value);setError(''); }}
                onKeyDown={event => {
                  if (event.key !== 'Enter' || event.nativeEvent.isComposing || event.repeat) return;
                  event.preventDefault();
                  void handleConfirm();
                }}
                className="apple-input !text-base"
                placeholder="สแกนหรือกรอกรหัสนักศึกษา"
              />
              <p id={scannerHintId} className="ui-caption mt-1">{STUDENT_CODE_HINT}</p>
            </div>
          )}
          {error && <p id={errorId} className="record-error" role="alert">{error}</p>}
        </div>
    </Dialog>
  );
}
