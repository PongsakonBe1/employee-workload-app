"use client";

import { useState } from 'react';
import { X, Headphones, Plug } from 'lucide-react';

export default function EquipmentModal({ 
  isOpen, 
  onClose, 
  onSelect, 
  templateName,
  templateMinorTask 
}) {
  const [selectedEquipment, setSelectedEquipment] = useState('');

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              {isHeadphones ? (
                <Headphones className="w-5 h-5 text-white" />
              ) : (
                <Plug className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{templateName}</h3>
              <p className="text-sm text-slate-500">เลือกรายการอุปกรณ์</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Equipment List */}
        <div className="p-6">
          <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto">
            {equipmentList.map((equipment) => (
              <button
                key={equipment}
                onClick={() => handleSelect(equipment)}
                className={`p-3 rounded-xl border-2 transition-all ${
                  selectedEquipment === equipment
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="text-sm font-medium">{equipment}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
          <div className="text-sm text-slate-500">
            {selectedEquipment ? (
              <span>เลือก: <span className="font-medium text-slate-700">{selectedEquipment}</span></span>
            ) : (
              <span>กรุณาเลือกรายการ</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedEquipment}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                selectedEquipment
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              ยืนยัน
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
