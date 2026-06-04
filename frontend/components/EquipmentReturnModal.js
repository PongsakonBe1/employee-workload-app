"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Check,
  Headphones,
  Plug,
  DoorOpen,
} from 'lucide-react';

/**
 * EH-4: EquipmentReturnModal
 * แสดงเมื่อ Staff คืนอุปกรณ์ — เลือกสภาพ (normal/damaged/lost) + optional note
 *
 * @param {boolean}  isOpen
 * @param {function} onClose
 * @param {function} onConfirm(condition, note)
 * @param {string}   equipmentId   — เช่น "ICIT05"
 * @param {string}   equipmentType — "headphones" | "power" | "room"
 * @param {string}   templateName  — ชื่อแสดงใน header
 */
export default function EquipmentReturnModal({
  isOpen,
  onClose,
  onConfirm,
  equipmentId = '',
  equipmentType = 'headphones',
  templateName = 'คืนอุปกรณ์',
}) {
  const [condition, setCondition] = useState('normal');
  const [note, setNote] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Reset state เมื่อเปิดใหม่
  useEffect(() => {
    if (isOpen) {
      setCondition('normal');
      setNote('');
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  const requiresNote = condition === 'damaged' || condition === 'lost';
  const canConfirm = !requiresNote || note.trim().length > 0;

  function handleClose() {
    setCondition('normal');
    setNote('');
    onClose();
  }

  function handleConfirm() {
    if (!canConfirm) return;
    onConfirm(condition, requiresNote ? note.trim() : '');
    handleClose();
  }

  const CONDITIONS = [
    {
      value: 'normal',
      icon: CheckCircle,
      label: 'สมบูรณ์',
      sublabel: 'ไม่มีความเสียหาย',
      border: { idle: 'border-green-200', active: 'border-green-500 ring-2 ring-green-100' },
      bg: { idle: 'bg-green-50/60', active: 'bg-green-50' },
      iconCls: { idle: 'text-green-400', active: 'text-green-600' },
      textCls: { idle: 'text-green-700', active: 'text-green-800' },
      checkBg: 'bg-green-500',
    },
    {
      value: 'damaged',
      icon: AlertTriangle,
      label: 'ชำรุด',
      sublabel: 'มีความเสียหาย ซ่อมได้',
      border: { idle: 'border-amber-200', active: 'border-amber-500 ring-2 ring-amber-100' },
      bg: { idle: 'bg-amber-50/60', active: 'bg-amber-50' },
      iconCls: { idle: 'text-amber-400', active: 'text-amber-600' },
      textCls: { idle: 'text-amber-700', active: 'text-amber-800' },
      checkBg: 'bg-amber-500',
    },
    {
      value: 'lost',
      icon: XCircle,
      label: 'สูญหาย',
      sublabel: 'ไม่พบอุปกรณ์',
      border: { idle: 'border-red-200', active: 'border-red-500 ring-2 ring-red-100' },
      bg: { idle: 'bg-red-50/60', active: 'bg-red-50' },
      iconCls: { idle: 'text-red-400', active: 'text-red-600' },
      textCls: { idle: 'text-red-700', active: 'text-red-800' },
      checkBg: 'bg-red-500',
    },
  ];

  const headerIconBg =
    condition === 'normal'  ? 'bg-green-100 text-green-600'
    : condition === 'damaged' ? 'bg-amber-100 text-amber-600'
    : 'bg-red-100 text-red-600';

  const EquipmentIcon =
    equipmentType === 'headphones' ? Headphones
    : equipmentType === 'power'    ? Plug
    : DoorOpen;

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-sm max-h-[92vh] flex flex-col overflow-hidden">

        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-150 ${headerIconBg}`}>
              <EquipmentIcon size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-950 leading-tight">
                {templateName}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {equipmentId ? `${equipmentId} · ` : ''}บันทึกสภาพก่อนคืน
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition"
            aria-label="ปิด"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Condition Cards */}
          <div className="px-6 pb-4 space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-3">
              สภาพอุปกรณ์
            </p>

            {CONDITIONS.map(({ value, icon: Icon, label, sublabel, border, bg, iconCls, textCls, checkBg }) => {
              const isActive = condition === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setCondition(value); setNote(''); }}
                  className={`
                    w-full flex items-center gap-4 px-4 py-3.5
                    rounded-2xl border-2 transition-all duration-150 active:scale-[0.98] text-left
                    ${isActive
                      ? `${border.active} ${bg.active}`
                      : `${border.idle} ${bg.idle} hover:border-opacity-60`}
                  `}
                  aria-pressed={isActive}
                >
                  <Icon size={20} className={isActive ? iconCls.active : iconCls.idle} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${isActive ? textCls.active : textCls.idle}`}>
                      {label}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{sublabel}</p>
                  </div>
                  {isActive && (
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${checkBg}`}>
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Note textarea — แสดงเฉพาะ damaged/lost */}
          {requiresNote && (
            <div className="px-6 pb-4 transition-all duration-200">
              <label htmlFor="eq-note" className="apple-label">
                {condition === 'damaged' ? 'อาการเสีย / จุดที่ชำรุด *' : 'หมายเหตุ / สถานการณ์ *'}
              </label>
              <textarea
                id="eq-note"
                className="apple-input resize-none"
                rows={3}
                maxLength={200}
                placeholder={
                  condition === 'damaged'
                    ? 'เช่น สายขาด, ไม่มีเสียงข้างซ้าย, ตัวล็อคหัก'
                    : 'เช่น ลืมไว้ห้อง 1211, ค้นหาแล้วไม่พบ'
                }
                value={note}
                onChange={(e) => setNote(e.target.value)}
                autoFocus
                aria-required="true"
              />
              <p className="text-right text-xs text-slate-400 mt-1">{note.length}/200</p>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="flex-shrink-0 border-t border-slate-100 bg-white px-6 py-4 space-y-2">
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            aria-disabled={!canConfirm}
            className={`apple-button w-full flex items-center justify-center gap-2 disabled:opacity-40
              ${condition === 'damaged' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-900/20'
              : condition === 'lost'    ? 'bg-red-600 hover:bg-red-700 shadow-red-900/20'
              : ''}
            `}
          >
            {condition === 'normal'  && <><CheckCircle size={16} /> ยืนยัน — สมบูรณ์</>}
            {condition === 'damaged' && <><AlertTriangle size={16} /> บันทึกชำรุด</>}
            {condition === 'lost'    && <><XCircle size={16} /> บันทึกสูญหาย</>}
          </button>
          <button onClick={handleClose} className="apple-button-secondary w-full">
            ยกเลิก
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
