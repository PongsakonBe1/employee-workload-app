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

  if (!isOpen) return null;

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
    const handleEquipmentStatusUpdate = (event) => {
      console.log('🎧 SmartEquipmentModal: Received equipment status update', event.detail);
      const { equipmentType: updatedType, equipment, status } = event.detail;
      
      // อัปเดตเฉพาะถ้าเป็น equipment type เดียวกัน
      if (updatedType === equipmentType) {
        setEquipmentStatus(prev => ({
          ...prev,
          [equipment]: status
        }));
        console.log(`✅ SmartEquipmentModal: Updated ${equipment} status to ${status}`);
      }
    };

    // เพิ่ม event listener
    window.addEventListener('equipmentStatusUpdated', handleEquipmentStatusUpdate);

    // Cleanup
    return () => {
      window.removeEventListener('equipmentStatusUpdated', handleEquipmentStatusUpdate);
    };
  }, [equipmentType]);

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[95vh] flex flex-col overflow-hidden">
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
              <p className="text-sm text-slate-500">
                ว่าง {availableCount} | ใช้ {inUseCount}
              </p>
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
        <div className="p-6 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status Legend */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-slate-600">ว่าง</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-slate-600">ใช้งาน</span>
                </div>
              </div>

              {/* Equipment Grid */}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 max-h-96 overflow-y-auto">
                {filteredEquipment.map((equipment) => {
                  const status = equipmentStatus[equipment];
                  const action = getActionForEquipment(equipment);
                  const isAvailable = status === 'available';
                  
                  console.log(`🎯 SmartEquipmentModal: ${equipment} - status: ${status}, action: ${action}, isAvailable: ${isAvailable}`);
                  
                  return (
                    <button
                      key={equipment}
                      onClick={() => handleSelect(equipment)}
                      className={`p-4 rounded-xl border-2 transition-all relative ${
                        selectedEquipment === equipment
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : isAvailable
                          ? 'border-green-200 bg-green-50 text-green-700 hover:border-green-300 hover:bg-green-100'
                          : 'border-orange-200 bg-orange-50 text-orange-700 hover:border-orange-300 hover:bg-orange-100'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-lg font-bold">{equipment}</div>
                        <div className="text-xs mt-1 opacity-75">{action}</div>
                        
                        {/* Icon */}
                        <div className="mt-2 flex justify-center">
                          {isAvailable ? (
                            <Headphones className="w-4 h-4" />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                      
                      {/* Status indicator */}
                      <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                        isAvailable ? 'bg-green-500' : 'bg-orange-500'
                      }`}></div>
                    </button>
                  );
                })}
              </div>

              {/* User info for in-use equipment */}
              {selectedEquipment && equipmentStatus[selectedEquipment] === 'in_use' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm text-amber-800">
                    <User className="w-4 h-4" />
                    <span>ผู้ยืม: {equipmentDetails[selectedEquipment]?.user || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-amber-600 mt-1">
                    <Clock className="w-3 h-3" />
                    <span>เวลา: {equipmentDetails[selectedEquipment]?.time || '-'}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recipient Input */}
        <div className="px-6 pb-4 flex-shrink-0">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-amber-900 mb-2">
              ผู้รับบริการ *
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              readOnly={selectedEquipment && equipmentStatus[selectedEquipment] === 'in_use'}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
                selectedEquipment && equipmentStatus[selectedEquipment] === 'in_use'
                  ? 'bg-amber-100 border-amber-300 text-amber-800 cursor-default'
                  : 'border-amber-300'
              }`}
              placeholder="กรอกชื่อผู้รับบริการ"
            />
            <p className="mt-1 text-xs text-amber-600">
              {selectedEquipment && equipmentStatus[selectedEquipment] === 'in_use'
                ? 'ชื่อผู้ยืมถูกกรอกอัตโนมัติ'
                : 'กรุณาระบุชื่อผู้มารับบริการ (ยืม/คืนอุปกรณ์)'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
          <div className="text-sm text-slate-500">
            {selectedEquipment && recipient.trim() ? (
              <span>
                เลือก: <span className="font-medium text-slate-700">{selectedEquipment}</span>
                <span className="ml-2 text-xs">
                  ({getActionForEquipment(selectedEquipment)})
                </span>
                <span className="ml-2 text-xs text-amber-600">
                  ผู้รับบริการ: {recipient}
                </span>
              </span>
            ) : selectedEquipment ? (
              <span className="text-amber-600">กรุณากรอกผู้รับบริการ</span>
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
              disabled={!selectedEquipment || !recipient.trim()}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                selectedEquipment && recipient.trim()
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
