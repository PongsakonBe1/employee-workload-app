"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Headphones, Plug, User, Clock, RotateCcw } from 'lucide-react';
import { doc, getDoc, getFirestore } from 'firebase/firestore';

export default function SmartEquipmentModal({ 
  isOpen, 
  onClose, 
  onSelect, 
  templateName,
  templateMinorTask 
}) {
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [equipmentStatus, setEquipmentStatus] = useState({});
  const [equipmentDetails, setEquipmentDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [recipient, setRecipient] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // กำหนดประเภทอุปกรณ์
  const tName = templateName || '';
  const tTask = templateMinorTask || '';
  const equipmentType = (tTask.includes('หูฟัง') || tName.includes('หูฟัง')) ? 'headphones'
                      : (tTask.includes('ปลั๊กไฟ') || tName.includes('ปลั๊กไฟ')) ? 'power'
                      : null;
  const isHeadphones = equipmentType === 'headphones';

  // ตรวจว่า template เป็นของห้องไหน
  const isFinn   = tName.toLowerCase().includes('finn') || tTask.toLowerCase().includes('finn');
  const isFloor3 = tName.includes('ชั้น 3') || tTask.includes('ชั้น 3');

  // full ranges สำหรับ scan worklogs
  const ALL_HP = Array.from({length:20}, (_,i) => `ICIT${String(i+1).padStart(2,'0')}`);
  const ALL_PW = ['ICIT21','ICIT22','ICIT23','ICIT24','ICIT25'];

  // range ที่แสดงใน grid ตาม template
  const getEquipmentRange = () => {
    if (isHeadphones) {
      if (isFinn)   return Array.from({length:8},  (_,i) => `ICIT${String(i+13).padStart(2,'0')}`);
      if (isFloor3) return Array.from({length:12}, (_,i) => `ICIT${String(i+1).padStart(2,'0')}`);
      return ALL_HP;
    }
    if (isFinn)   return ['ICIT24','ICIT25'];
    if (isFloor3) return ['ICIT21','ICIT22','ICIT23'];
    return ALL_PW;
  };

  // คำนวณสถานะจาก worklogs
  useEffect(() => {
    const calculateStatusFromWorklogs = async () => {
      setLoading(true);
      try {
        const db = getFirestore();
        const { collection, query, orderBy, limit, getDocs } = await import('firebase/firestore');
        const worklogsQuery = query(collection(db, 'worklogs'), orderBy('createdAt', 'desc'), limit(200));
        const querySnapshot = await getDocs(worklogsQuery);
        const logs = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          logs.push({ ...data, date: data.date || data.createdAt?.toDate?.()?.toISOString?.()?.slice(0,10) || '' });
        });

        const status = {
          headphones: Object.fromEntries(ALL_HP.map(e => [e,'available'])),
          power:      Object.fromEntries(ALL_PW.map(e => [e,'available'])),
        };
        const today = new Date().toISOString().slice(0,10);
        const details = {};

        logs.filter(l => l.date === today).forEach(log => {
          const commentLower = (log.comment || '').toLowerCase();
          const minorTask = (log.minorTask || '').toLowerCase();
          const userName = log.recipient || log.employeeDisplayName || log.employeeNickname || log.employeeFullName || '-';
          const userTime = log.time || '';

          if (minorTask.includes('ยืมหูฟัง')) {
            ALL_HP.forEach(eq => { if (commentLower.includes(eq.toLowerCase())) { status.headphones[eq]='in_use'; details[eq]={user:userName,time:userTime}; } });
          }
          if (minorTask.includes('คืนหูฟัง')) {
            ALL_HP.forEach(eq => { if (commentLower.includes(eq.toLowerCase())) { status.headphones[eq]='available'; delete details[eq]; } });
          }
          if (minorTask.includes('ยืมปลั๊กไฟ')) {
            ALL_PW.forEach(eq => { if (commentLower.includes(eq.toLowerCase())) { status.power[eq]='in_use'; details[eq]={user:userName,time:userTime}; } });
          }
          if (minorTask.includes('คืนปลั๊กไฟ')) {
            ALL_PW.forEach(eq => { if (commentLower.includes(eq.toLowerCase())) { status.power[eq]='available'; delete details[eq]; } });
          }
        });

        setEquipmentStatus(status[equipmentType] || {});
        setEquipmentDetails(details);
      } catch (error) {
        const fallback = isHeadphones
          ? Object.fromEntries(ALL_HP.map(e=>[e,'available']))
          : Object.fromEntries(ALL_PW.map(e=>[e,'available']));
        setEquipmentStatus(fallback);
      } finally {
        setLoading(false);
      }
    };

    if (equipmentType && isOpen) calculateStatusFromWorklogs();
  }, [equipmentType, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (event) => {
      const { equipmentType: updatedType, equipment, status } = event.detail;
      if (updatedType === equipmentType) setEquipmentStatus(prev => ({...prev, [equipment]: status}));
    };
    window.addEventListener('equipmentStatusUpdated', handler);
    return () => window.removeEventListener('equipmentStatusUpdated', handler);
  }, [equipmentType, isOpen]);

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
    setSelectedEquipment(equipment);
    // Autocomplete recipient จากผู้ยืมเดิม เมื่อเลือกคืนอุปกรณ์
    if (equipmentStatus[equipment] === 'in_use' && equipmentDetails[equipment]?.user) {
      setRecipient(equipmentDetails[equipment].user);
    } else {
      setRecipient('');
    }
  };

  const handleConfirm = () => {
    if (!selectedEquipment) {
      return;
    }
    
    if (!recipient.trim()) {
      alert('กรุณากรอกผู้รับบริการ');
      return;
    }
    
    const action = getActionForEquipment(selectedEquipment);
    const actionShort = action === 'ยืมใช้งาน' ? 'ยืม' : 'คืน';
    const comment = `${actionShort}${templateMinorTask.includes('หูฟัง') ? 'หูฟัง' : 'ปลั๊กไฟ'} ${selectedEquipment}`;
    const minorTask = `${actionShort}${templateMinorTask.includes('หูฟัง') ? 'หูฟัง' : 'ปลั๊กไฟ'}`;
    
    onSelect(comment, selectedEquipment, minorTask, recipient.trim());
    onClose();
    setSelectedEquipment('');
    setRecipient('');
  };

  const handleClose = () => {
    onClose();
    setSelectedEquipment('');
    setRecipient('');
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
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Equipment List */}
        <div className="px-6 pt-2 pb-2 flex-1 overflow-y-auto">
          {loading ? (
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
              <div className={`grid gap-1.5 ${isHeadphones ? 'grid-cols-5 sm:grid-cols-8' : 'grid-cols-3 sm:grid-cols-5'}`}>
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
                      className={`p-2 rounded-xl border-2 transition-all relative active:scale-95 ${
                        selectedEquipment === equipment
                          ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                          : isAvailable
                          ? 'border-green-200 bg-green-50 hover:border-green-300'
                          : 'border-orange-200 bg-orange-50 hover:border-orange-300'
                      }`}
                    >
                      <div className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
                        isAvailable ? 'bg-green-500' : 'bg-orange-400'
                      }`} />
                      <div className="text-center">
                        <div className={`text-base font-bold leading-tight ${
                          selectedEquipment === equipment ? 'text-purple-700'
                          : isAvailable ? 'text-green-700' : 'text-orange-700'
                        }`}>{numLabel}</div>
                        <div className="text-[10px] font-medium text-blue-500 truncate leading-tight">
                          {!isAvailable && detail ? detail.user : <span className="opacity-0">-</span>}
                        </div>
                        <div className={`text-[10px] mt-0.5 flex items-center justify-center gap-0.5 ${
                          selectedEquipment === equipment ? 'text-purple-500'
                          : isAvailable ? 'text-green-500' : 'text-orange-500'
                        }`}>
                          {isAvailable
                            ? (isHeadphones ? <Headphones className="w-2.5 h-2.5" /> : <Plug className="w-2.5 h-2.5" />)
                            : <RotateCcw className="w-2.5 h-2.5" />
                          }
                          {action}
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
          {equipmentStatus[selectedEquipment] !== 'in_use' && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">ผู้รับบริการ *</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                className="apple-input text-sm"
                placeholder={selectedEquipment ? 'กรอกชื่อผู้รับบริการ' : 'เลือกรายการก่อน'}
                autoFocus={!!selectedEquipment}
              />
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={!selectedEquipment || (equipmentStatus[selectedEquipment] !== 'in_use' && !recipient.trim())}
              className="apple-button flex-1 disabled:opacity-40"
            >
              ยืนยัน{selectedEquipment ? ` — ${getActionForEquipment(selectedEquipment)} ${selectedEquipment}` : ''}
            </button>
            <button onClick={handleClose} className="apple-button-secondary px-4">
              ยกเลิก
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
