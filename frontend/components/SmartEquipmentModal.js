"use client";

import { useState, useEffect } from 'react';
import { X, Headphones, Plug, User, Clock } from 'lucide-react';
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

  // กำหนดประเภทอุปกรณ์
  const getEquipmentType = () => {
    if (templateMinorTask.includes('หูฟัง')) return 'headphones';
    if (templateMinorTask.includes('ปลั๊กไฟ')) return 'power';
    return null;
  };

  const equipmentType = getEquipmentType();
  const isHeadphones = equipmentType === 'headphones';

  console.log('🔧 SmartEquipmentModal rendered with new UI changes');
  console.log('🔧 isHeadphones:', isHeadphones);

  // คำนวณสถานะอุปกรณ์จาก worklogs เหมือน RoomEquipmentStatus
  useEffect(() => {
    const calculateStatusFromWorklogs = async () => {
      setLoading(true);
      
      try {
        const db = getFirestore();
        const { collection, query, orderBy, limit, getDocs } = await import('firebase/firestore');
        
        // ดึงข้อมูล worklogs ล่าสุด
        const worklogsQuery = query(
          collection(db, 'worklogs'),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
        
        const querySnapshot = await getDocs(worklogsQuery);
        const logs = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          logs.push({
            id: doc.id,
            ...data,
            date: data.date || data.createdAt?.toDate?.()?.toISOString?.()?.slice(0, 10) || ''
          });
        });

        console.log('📋 SmartEquipmentModal: Loaded worklogs:', logs.length);

        // คำนวณสถานะเหมือน RoomEquipmentStatus
        const equipmentStatus = {
          headphones: {
            'ICIT01': 'available', 'ICIT02': 'available', 'ICIT03': 'available', 'ICIT04': 'available',
            'ICIT05': 'available', 'ICIT06': 'available', 'ICIT07': 'available', 'ICIT08': 'available',
            'ICIT09': 'available', 'ICIT10': 'available', 'ICIT11': 'available', 'ICIT12': 'available'
          },
          power: {
            'ICIT21': 'available', 'ICIT22': 'available', 'ICIT23': 'available'
          }
        };

        // ประมวลผล logs เฉพาะวันนี้เท่านั้น (เหมือน RoomEquipmentStatus)
        const today = new Date().toISOString().slice(0, 10);
        const todayLogs = logs.filter(log => log.date === today);
        const details = {};
        console.log('📋 SmartEquipmentModal: Today logs:', todayLogs.length, '/', logs.length);

        for (const log of todayLogs) {
          const comment = (log.comment || '');
          const commentLower = comment.toLowerCase();
          const minorTask = (log.minorTask || '').toLowerCase();

          const userName = log.recipient || log.employeeDisplayName || log.employeeNickname || log.employeeFullName || '-';
          const userTime = log.time || '';

          // ตรวจสอบหูฟัง
          if (minorTask.includes('ยืมหูฟัง')) {
            for (let i = 1; i <= 12; i++) {
              const equipment = `ICIT${String(i).padStart(2, '0')}`;
              if (commentLower.includes(equipment.toLowerCase())) {
                equipmentStatus.headphones[equipment] = 'in_use';
                details[equipment] = { user: userName, time: userTime };
              }
            }
          }
          if (minorTask.includes('คืนหูฟัง')) {
            for (let i = 1; i <= 12; i++) {
              const equipment = `ICIT${String(i).padStart(2, '0')}`;
              if (commentLower.includes(equipment.toLowerCase())) {
                equipmentStatus.headphones[equipment] = 'available';
                delete details[equipment];
              }
            }
          }

          // ตรวจสอบปลั๊กไฟ
          if (minorTask.includes('ยืมปลั๊กไฟ')) {
            for (let i = 21; i <= 23; i++) {
              const equipment = `ICIT${i}`;
              if (commentLower.includes(equipment.toLowerCase())) {
                equipmentStatus.power[equipment] = 'in_use';
                details[equipment] = { user: userName, time: userTime };
              }
            }
          }
          if (minorTask.includes('คืนปลั๊กไฟ')) {
            for (let i = 21; i <= 23; i++) {
              const equipment = `ICIT${i}`;
              if (commentLower.includes(equipment.toLowerCase())) {
                equipmentStatus.power[equipment] = 'available';
                delete details[equipment];
              }
            }
          }
        }

        console.log('🔧 SmartEquipmentModal: equipmentType:', equipmentType);
        console.log('🔧 SmartEquipmentModal: calculated equipmentStatus:', equipmentStatus[equipmentType]);
        setEquipmentStatus(equipmentStatus[equipmentType] || {});
        setEquipmentDetails(details);

      } catch (error) {
        console.error('❌ SmartEquipmentModal: Error calculating status:', error);
        // ใช้ค่าเริ่มต้นถ้าเกิดข้อผิดพลาด
        const defaultStatus = equipmentType === 'headphones' 
          ? {
              'ICIT01': 'available', 'ICIT02': 'available', 'ICIT03': 'available', 'ICIT04': 'available',
              'ICIT05': 'available', 'ICIT06': 'available', 'ICIT07': 'available', 'ICIT08': 'available',
              'ICIT09': 'available', 'ICIT10': 'available', 'ICIT11': 'available', 'ICIT12': 'available'
            }
          : {
              'ICIT21': 'available', 'ICIT22': 'available', 'ICIT23': 'available'
            };
        setEquipmentStatus(defaultStatus);
      } finally {
        setLoading(false);
      }
    };

    if (equipmentType && isOpen) {
      calculateStatusFromWorklogs();
    }
  }, [equipmentType, isOpen]);

  // Event listener สำหรับรับการอัปเดตสถานะแบบ real-time
  useEffect(() => {
    if (!isOpen) return;
    const handleEquipmentStatusUpdate = (event) => {
      const { equipmentType: updatedType, equipment, status } = event.detail;
      if (updatedType === equipmentType) {
        setEquipmentStatus(prev => ({ ...prev, [equipment]: status }));
      }
    };
    window.addEventListener('equipmentStatusUpdated', handleEquipmentStatusUpdate);
    return () => window.removeEventListener('equipmentStatusUpdated', handleEquipmentStatusUpdate);
  }, [equipmentType, isOpen]);

  // Early return AFTER all hooks
  if (!isOpen) return null;

  // แสดงอุปกรณ์ทั้งหมดเหมือน SmartRoomModal
  const getFilteredEquipment = () => {
    const equipmentList = isHeadphones 
      ? Array.from({ length: 12 }, (_, i) => `ICIT${String(i + 1).padStart(2, '0')}`)
      : ['ICIT21', 'ICIT22', 'ICIT23'];

    // แสดงทั้งหมดเหมือน SmartRoomModal - ให้ผู้ใช้เลือกเอง
    return equipmentList;
  };

  const filteredEquipment = getFilteredEquipment();
  
  console.log('🔧 filteredEquipment:', filteredEquipment);
  
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

  // นับจำนวนแยกตามสถานะ
  const availableCount = filteredEquipment.filter(eq => equipmentStatus[eq] === 'available').length;
  const inUseCount = filteredEquipment.filter(eq => equipmentStatus[eq] === 'in_use').length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
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
        <div className="px-6 pb-2 pt-2 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status Legend */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                  <span className="text-slate-500">ว่าง (กดเพื่อยืม)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 bg-orange-400 rounded-full"></div>
                  <span className="text-slate-500">ใช้งานอยู่ (กดเพื่อคืน)</span>
                </div>
              </div>

              {/* Equipment Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                {filteredEquipment.map((equipment) => {
                  const status = equipmentStatus[equipment];
                  const action = getActionForEquipment(equipment);
                  const isAvailable = status === 'available';
                  
                  return (
                    <button
                      key={equipment}
                      onClick={() => handleSelect(equipment)}
                      className={`p-3 rounded-2xl border-2 transition-all relative active:scale-95 ${
                        selectedEquipment === equipment
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : isAvailable
                          ? 'border-green-200 bg-green-50 hover:border-green-300'
                          : 'border-orange-200 bg-orange-50 hover:border-orange-300'
                      }`}
                    >
                      <div className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                        isAvailable ? 'bg-green-500' : 'bg-orange-400'
                      }`} />
                      <div className="text-center">
                        <div className={`text-sm font-bold ${
                          selectedEquipment === equipment ? 'text-blue-700'
                          : isAvailable ? 'text-green-700' : 'text-orange-700'
                        }`}>{equipment}</div>
                        <div className={`text-[10px] mt-0.5 ${
                          selectedEquipment === equipment ? 'text-blue-500'
                          : isAvailable ? 'text-green-500' : 'text-orange-500'
                        }`}>{action}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

            </div>
          )}
        </div>

        {/* Sticky footer: recipient + confirm */}
        <div className="flex-shrink-0 border-t border-slate-100 bg-white px-6 py-4 space-y-3">
          {/* User info for in-use */}
          {selectedEquipment && equipmentStatus[selectedEquipment] === 'in_use' && equipmentDetails[selectedEquipment] && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
              <User className="w-3.5 h-3.5 shrink-0" />
              <span>ผู้ยืม: <strong>{equipmentDetails[selectedEquipment].user}</strong></span>
              <Clock className="w-3 h-3 ml-2 shrink-0" />
              <span>{equipmentDetails[selectedEquipment].time}</span>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">ผู้รับบริการ *</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              readOnly={!!(selectedEquipment && equipmentStatus[selectedEquipment] === 'in_use')}
              className={`apple-input text-sm ${
                selectedEquipment && equipmentStatus[selectedEquipment] === 'in_use'
                  ? 'bg-slate-50 text-slate-500 cursor-default'
                  : ''
              }`}
              placeholder={selectedEquipment ? 'กรอกชื่อผู้รับบริการ' : 'เลือกรายการก่อน'}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={!selectedEquipment || !recipient.trim()}
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
    </div>
  );
}
