"use client";

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function EquipmentModal({ 
  isOpen, 
  onClose, 
  onSelect, 
  templateName,
  templateMinorTask 
}) {
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!isOpen || !mounted) return null;

  // กำหนดรายการอุปกรณ์ตามประเภท
  const getEquipmentList = () => {
    if (templateMinorTask.includes('หูฟัง')) {
      return Array.from({ length: 12 }, (_, i) => `ICIT${String(i + 1).padStart(2, '0')}`);
    } else if (templateMinorTask.includes('ปลั๊กไฟ')) {
      return ['ICIT21', 'ICIT22', 'ICIT23'];
    }
    return [];
  };

  const equipmentList = getEquipmentList();
  const isHeadphones = templateMinorTask.includes('หูฟัง');

  const handleSelect = (equipment) => {
    setSelectedEquipment(equipment);
  };

  const handleConfirm = () => {
    if (selectedEquipment) {
      const comment = `${templateMinorTask} ${selectedEquipment}`;
      onSelect(comment, selectedEquipment);
      onClose();
      setSelectedEquipment('');
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedEquipment('');
  };

  const modal = (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleClose} />

      {/* Sheet */}
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-sm max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">{templateName}</h3>
            <p className="text-sm text-slate-400 mt-0.5">เลือกรายการอุปกรณ์</p>
          </div>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Equipment List */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          <div className={`grid gap-2 ${isHeadphones ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {equipmentList.map((equipment) => (
              <button
                key={equipment}
                onClick={() => handleSelect(equipment)}
                className={`py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95 ${
                  selectedEquipment === equipment
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {equipment.replace('ICIT', '')}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={!selectedEquipment}
            className="apple-button flex-1 disabled:opacity-40"
          >
            {selectedEquipment ? `ยืนยัน ${selectedEquipment}` : 'เลือกอุปกรณ์ก่อน'}
          </button>
          <button
            onClick={handleClose}
            className="apple-button-secondary px-5"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
