"use client";

import { useState, useEffect, useLayoutEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Headphones, Plug, Usb, User, Clock, RotateCcw, AlertTriangle, Ban } from 'lucide-react';
import { useSharedResourceStatus } from "../hooks/useSharedResourceStatus";
import { equipmentLoanKind, equipmentLoanTask, isEquipmentStudentCode, STUDENT_CODE_HINT } from '../lib/equipmentLoan';

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
  const [mounted, setMounted] = useState(false);
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

  useEffect(() => { setMounted(true); }, []);

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
  const selectedStatus = equipmentStatus[selectedEquipment];
  const returning = selectedStatus === 'in_use';
  const originalBorrower = equipmentDetails[selectedEquipment]?.user || '';
  const noteRequired = returning && (returnCondition === 'damaged' || returnCondition === 'lost');
  const canConfirm = Boolean(selectedEquipment && !loading && !saving && (returning ? !noteRequired || returnNote.trim() : selectedStatus === 'available' && isEquipmentStudentCode(recipient)));

  useLayoutEffect(() => {
    if (isOpen && mounted && selectedStatus === 'available' && !loading) recipientRef.current?.focus();
  }, [isOpen, mounted, selectedEquipment, selectedStatus, loading]);

  // ตรวจว่า template เป็นของห้องไหน
  const isFinn   = tName.toLowerCase().includes('finn') || tTask.toLowerCase().includes('finn');
  const isFloor3 = tName.includes('ชั้น 3') || tTask.includes('ชั้น 3');

  // full ranges สำหรับ scan worklogs
  const ALL_HP = Array.from({length:20}, (_,i) => `ICIT${String(i+1).padStart(2,'0')}`);
  const ALL_PW = ['ICIT21','ICIT22','ICIT23','ICIT24','ICIT25'];
  const ALL_USB = ['ICIT26','ICIT27','ICIT28','ICIT29'];

  // range ที่แสดงใน grid ตาม template
  const getEquipmentRange = () => {
    if (isHeadphones) {
      if (isFinn)   return Array.from({length:8},  (_,i) => `ICIT${String(i+13).padStart(2,'0')}`);
      if (isFloor3) return Array.from({length:12}, (_,i) => `ICIT${String(i+1).padStart(2,'0')}`);
      return ALL_HP;
    }
    if (isUsb) return ALL_USB;
    if (isFinn)   return ['ICIT24','ICIT25'];
    if (isFloor3) return ['ICIT21','ICIT22','ICIT23'];
    return ALL_PW;
  };

  const equipmentList = getEquipmentRange();

  // กรองเหมือน SmartRoomModal: ถ้ามีทั้งว่างและใช้งาน แสดงทั้งหมด
  const availableItems = equipmentList.filter(e => equipmentStatus[e] === 'available');
  const inUseItems = equipmentList.filter(e => equipmentStatus[e] === 'in_use');
  const filteredEquipment = (availableItems.length > 0 && inUseItems.length > 0)
    ? equipmentList
    : availableItems.length > 0 ? availableItems
    : inUseItems.length > 0 ? inUseItems
    : equipmentList;

  // หา action ที่เหมาะสมสำหรับอุปกรณ์นี้
  const getActionForEquipment = (equipment) => {
    const status = equipmentStatus[equipment];
    if (status === 'available') return 'ยืมใช้งาน';
    if (status === 'in_use') return 'คืนอุปกรณ์';
    return 'ยืมใช้งาน'; // default
  };

  const handleSelect = (equipment) => {
    if (savingRef.current) return;
    // ITEM-1: ถ้าอุปกรณ์ damaged/lost ห้ามยืม — ถ้า in_use ให้คืนได้ปกติ
    const cond = equipmentConditionMap[equipment];
    if (equipmentStatus[equipment] !== 'in_use' && (cond === 'damaged' || cond === 'lost')) return;
    setSelectedEquipment(equipment);
    setReturnCondition('normal');
    setReturnNote('');
    setError('');
    if (selectedEquipment !== equipment) setRecipient('');
    else recipientRef.current?.focus();
  };

  const handleConfirm = async () => {
    if (savingRef.current || loading || !selectedEquipment || !['in_use', 'available'].includes(selectedStatus)) return;
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

  const availableCount = equipmentList.filter(e => equipmentStatus[e] === 'available').length;
  const inUseCount = equipmentList.filter(e => equipmentStatus[e] === 'in_use').length;

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">{templateName}</h3>
            <p className="text-sm text-slate-400 mt-0.5">ว่าง {availableCount} · ใช้งาน {inUseCount}</p>
          </div>
          <button type="button" aria-label="ปิดหน้าต่าง" disabled={saving} onClick={handleClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Equipment List */}
        <div className="px-6 pt-2 pb-2 flex-1 overflow-y-auto">
          {statusError ? <p role="alert" className="py-4 text-sm text-slate-600">โหลดสถานะล่าสุดไม่สำเร็จ <button type="button" className="underline" onClick={retry}>ลองอีกครั้ง</button></p> : loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status Legend */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                  <span className="text-slate-500">ว่าง (กดเพื่อยืม)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 bg-orange-400 rounded-full" />
                  <span className="text-slate-500">ใช้งานอยู่ (กดเพื่อคืน)</span>
                </div>
              </div>

              {/* Equipment Grid */}
              <div className={`grid gap-1.5 ${isHeadphones ? 'grid-cols-5 sm:grid-cols-8' : isUsb ? 'grid-cols-4' : 'grid-cols-3 sm:grid-cols-5'}`}>
                {filteredEquipment.map((equipment) => {
                  const status = equipmentStatus[equipment];
                  const action = getActionForEquipment(equipment);
                  const isAvailable = status === 'available';
                  const detail = equipmentDetails[equipment];
                  const numLabel = String(parseInt(equipment.replace('ICIT',''), 10));
                  return (
                    <button
                      key={equipment}
                      onClick={() => handleSelect(equipment)}
                      disabled={saving || (equipmentStatus[equipment] !== 'in_use' && (equipmentConditionMap[equipment] === 'damaged' || equipmentConditionMap[equipment] === 'lost'))}
                      title={equipmentStatus[equipment] !== 'in_use' && equipmentConditionMap[equipment] === 'damaged' ? 'ยืมไม่ได้ — ชำรุด' : equipmentStatus[equipment] !== 'in_use' && equipmentConditionMap[equipment] === 'lost' ? 'ยืมไม่ได้ — สูญหาย' : undefined}
                      className={`p-2 rounded-xl border-2 transition-all relative active:scale-95 ${
                        equipmentStatus[equipment] !== 'in_use' && (equipmentConditionMap[equipment] === 'damaged' || equipmentConditionMap[equipment] === 'lost')
                          ? 'border-red-200 bg-red-50 opacity-60 cursor-not-allowed'
                          : selectedEquipment === equipment
                          ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                          : isAvailable
                          ? 'border-green-200 bg-green-50 hover:border-green-300'
                          : 'border-orange-200 bg-orange-50 hover:border-orange-300'
                      }`}
                    >
                      <div className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
                        equipmentConditionMap[equipment] === 'lost' ? 'bg-red-600'
                        : equipmentConditionMap[equipment] === 'damaged' ? 'bg-amber-500'
                        : isAvailable ? 'bg-green-500' : 'bg-orange-400'
                      }`} />
                      <div className="text-center">
                        <div className={`text-base font-bold leading-tight ${
                          selectedEquipment === equipment ? 'text-purple-700'
                          : equipmentConditionMap[equipment] === 'damaged' || equipmentConditionMap[equipment] === 'lost' ? 'text-red-600'
                          : isAvailable ? 'text-green-700' : 'text-orange-700'
                        }`}>{numLabel}</div>
                        <div className="text-[10px] font-medium text-blue-500 truncate leading-tight">
                          {!isAvailable && detail ? detail.user : equipmentConditionMap[equipment] === 'damaged' ? <span className="text-amber-600">ชำรุด</span> : equipmentConditionMap[equipment] === 'lost' ? <span className="text-red-600">สูญหาย</span> : <span className="opacity-0">-</span>}
                        </div>
                        <div className={`text-[10px] mt-0.5 flex items-center justify-center gap-0.5 ${
                          selectedEquipment === equipment ? 'text-purple-500'
                          : equipmentConditionMap[equipment] === 'damaged' || equipmentConditionMap[equipment] === 'lost' ? 'text-red-500'
                          : isAvailable ? 'text-green-500' : 'text-orange-500'
                        }`}>
                          {equipmentConditionMap[equipment] === 'damaged' || equipmentConditionMap[equipment] === 'lost'
                            ? <Ban className="w-2.5 h-2.5" />
                            : isAvailable
                            ? (isHeadphones ? <Headphones className="w-2.5 h-2.5" /> : isUsb ? <Usb className="w-2.5 h-2.5" /> : <Plug className="w-2.5 h-2.5" />)
                            : <RotateCcw className="w-2.5 h-2.5" />
                          }
                          {equipmentConditionMap[equipment] === 'damaged' ? 'ชำรุด' : equipmentConditionMap[equipment] === 'lost' ? 'สูญหาย' : action}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="flex-shrink-0 border-t border-slate-100 bg-white px-6 py-4 space-y-3">
          {selectedEquipment && equipmentStatus[selectedEquipment] === 'in_use' && equipmentDetails[selectedEquipment] && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
              <User className="w-3.5 h-3.5 shrink-0" />
              <span>ผู้ยืม: <strong>{equipmentDetails[selectedEquipment].user}</strong></span>
              <Clock className="w-3 h-3 ml-2 shrink-0" />
              <span>{equipmentDetails[selectedEquipment].time}</span>
            </div>
          )}
          {/* ITEM-1: Inline condition selector ตอนคืนอุปกรณ์ */}
          {selectedEquipment && equipmentStatus[selectedEquipment] === 'in_use' && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500">สภาพอุปกรณ์ที่คืน</p>
              <div className="grid grid-cols-3 gap-1.5">
                {[{v:'normal',label:'สมบูรณ์',cls:'border-green-300 bg-green-50 text-green-700'},{v:'damaged',label:'ชำรุด',cls:'border-amber-300 bg-amber-50 text-amber-700'},{v:'lost',label:'สูญหาย',cls:'border-red-300 bg-red-50 text-red-700'}].map(({v,label,cls}) => (
                  <button
                    key={v}
                    type="button"
                    disabled={saving}
                    onClick={() => { setReturnCondition(v);setError('');if (v === 'normal') setReturnNote(''); }}
                    className={`py-1.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                      returnCondition === v ? cls + ' ring-2 ring-offset-1 ring-current' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                    }`}
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
                  autoFocus
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
          {error && <p id={errorId} className="text-sm text-red-600" role="alert">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className={`apple-button flex-1 disabled:opacity-40 ${
                selectedEquipment && equipmentStatus[selectedEquipment] === 'in_use'
                  ? returnCondition === 'damaged' ? 'bg-amber-600 hover:bg-amber-700'
                  : returnCondition === 'lost' ? 'bg-red-600 hover:bg-red-700' : ''
                  : ''
              }`}
            >
              {saving ? 'กำลังบันทึก…' : selectedEquipment && equipmentStatus[selectedEquipment] === 'in_use'
                ? `คืน ${selectedEquipment} — ${returnCondition === 'normal' ? 'สมบูรณ์' : returnCondition === 'damaged' ? 'ชำรุด' : 'สูญหาย'}`
                : `ยืนยัน${selectedEquipment ? ` — ยืม ${selectedEquipment}` : ''}`
              }
            </button>
            <button disabled={saving} onClick={handleClose} className="apple-button-secondary px-4">
              ยกเลิก
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
