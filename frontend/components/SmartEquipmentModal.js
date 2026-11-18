"use client";

import { useState, useEffect, useLayoutEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Headphones, Plug, Usb, User, Clock, RotateCcw, AlertTriangle, Ban } from 'lucide-react';
import { getFirestore } from 'firebase/firestore';
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
  const [equipmentStatus, setEquipmentStatus] = useState({});
  const [equipmentDetails, setEquipmentDetails] = useState({});
  const [equipmentConditionMap, setEquipmentConditionMap] = useState({}); // ITEM-1: { ICIT01: 'damaged', ... }
  const [loading, setLoading] = useState(true);
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

  // คำนวณสถานะจาก worklogs
  useEffect(() => {
    const calculateStatusFromWorklogs = async () => {
      setLoading(true);
      try {
        const db = getFirestore();
        const { collection, query, orderBy, limit, getDocs } = await import('firebase/firestore');
        const worklogsQuery = query(collection(db, 'worklogs'), orderBy('createdAt', 'desc'), limit(500));
        const querySnapshot = await getDocs(worklogsQuery);
        const logs = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          logs.push({ ...data, date: data.date || data.createdAt?.toDate?.()?.toISOString?.()?.slice(0,10) || '' });
        });

        const status = {
          headphones: Object.fromEntries(ALL_HP.map(e => [e,'available'])),
          power:      Object.fromEntries(ALL_PW.map(e => [e,'available'])),
          usb:        Object.fromEntries(ALL_USB.map(e => [e,'available'])),
        };
        const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local timezone
        const details = {};

        // [SA] reverse เป็น asc (เก่า→ใหม่) เพื่อให้ log ใหม่ override ได้ถูกต้อง
        const sortedLogs = [...logs].reverse();

        // Pass 1: scan เฉพาะ log "คืน" เพื่อหา equipmentCondition ล่าสุดของแต่ละตัว
        // [FIX] condition (damaged/lost/normal) ถูกรายงานตอน "คืน" เท่านั้น
        // log "ยืม" ต้องไม่ override condition — เพราะการยืมออกไปไม่ได้หมายความว่าอุปกรณ์ปกติ
        const conditionMap = {};
        sortedLogs.forEach(log => {
          const minorTask = (log.minorTask || '').toLowerCase();
          const commentLower = (log.comment || '').toLowerCase();
          const isReturnLog = minorTask.includes('คืนหูฟัง') || minorTask.includes('คืนปลั๊กไฟ') || minorTask.includes('คืน usb');
          if (!isReturnLog) return;

          // ตรวจ field equipment ตรง (จาก SmartEquipmentModal log) ก่อน
          if (log.equipment && log.equipmentCondition) {
            conditionMap[log.equipment] = log.equipmentCondition;
            return;
          }
          // fallback: parse จาก comment
          [...ALL_HP, ...ALL_PW, ...ALL_USB].forEach(eq => {
            if (commentLower.includes(eq.toLowerCase()) && log.equipmentCondition) {
              conditionMap[eq] = log.equipmentCondition;
            }
          });
        });
        setEquipmentConditionMap(conditionMap);

        // Pass 2: scan เฉพาะวันนี้เพื่อคำนวณ in_use / available
        const todayLogs = sortedLogs.filter(l => l.date === today);
        todayLogs.forEach(log => {
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
          if (minorTask.includes('ยืม usb')) {
            ALL_USB.forEach(eq => { if (commentLower.includes(eq.toLowerCase())) { status.usb[eq]='in_use'; details[eq]={user:userName,time:userTime}; } });
          }
          if (minorTask.includes('คืน usb')) {
            ALL_USB.forEach(eq => { if (commentLower.includes(eq.toLowerCase())) { status.usb[eq]='available'; delete details[eq]; } });
          }
        });

        setEquipmentStatus(status[equipmentType] || {});
        setEquipmentDetails(details);
      } catch (error) {
        const fallback = isHeadphones
          ? Object.fromEntries(ALL_HP.map(e=>[e,'available']))
          : isUsb
          ? Object.fromEntries(ALL_USB.map(e=>[e,'available']))
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
      const { equipmentType: updatedType, equipment, status, user: userName, time: userTime } = event.detail;
      if (updatedType !== equipmentType) return;
      setEquipmentStatus(prev => ({ ...prev, [equipment]: status }));
      if (status === 'in_use' && userName) {
        setEquipmentDetails(prev => ({ ...prev, [equipment]: { user: userName, time: userTime || '' } }));
      } else if (status === 'available') {
        setEquipmentDetails(prev => { const next = { ...prev }; delete next[equipment]; return next; });
      }
    };
    window.addEventListener('equipmentStatusUpdated', handler);
    return () => window.removeEventListener('equipmentStatusUpdated', handler);
  }, [equipmentType, isOpen]);

  // Listen for worklogDeleted events to recalculate status
  useEffect(() => {
    if (!isOpen || !equipmentType) return;

    const handleWorklogDeleted = (event) => {
      const { minorTask, equipment } = event.detail;
      // Check if this is equipment-related
      const isEquipmentRelated = minorTask && (
        minorTask.includes('หูฟัง') ||
        minorTask.includes('ปลั๊กไฟ') ||
        minorTask.includes('ยืม') ||
        minorTask.includes('คืน') ||
        equipment
      );

      if (isEquipmentRelated) {
        console.log('🗑️ SmartEquipmentModal: Recalculating after worklog deletion');
        // Trigger recalculation by toggling a dependency
        // We need to call calculateStatusFromWorklogs again
        const recalculate = async () => {
          setLoading(true);
          try {
            const db = getFirestore();
            const { collection, query, orderBy, limit, getDocs } = await import('firebase/firestore');
            const worklogsQuery = query(collection(db, 'worklogs'), orderBy('createdAt', 'desc'), limit(500));
            const querySnapshot = await getDocs(worklogsQuery);
            const logs = [];
            querySnapshot.forEach((doc) => {
              const data = doc.data();
              logs.push({ ...data, date: data.date || data.createdAt?.toDate?.()?.toISOString?.()?.slice(0,10) || '' });
            });

            const newStatus = {
              headphones: Object.fromEntries(ALL_HP.map(e => [e,'available'])),
              power:      Object.fromEntries(ALL_PW.map(e => [e,'available'])),
              usb:        Object.fromEntries(ALL_USB.map(e => [e,'available'])),
            };
            const today = new Date().toLocaleDateString('en-CA');
            const newDetails = {};
            const sortedLogs = [...logs].reverse();

            // Recalculate status
            sortedLogs.forEach(log => {
              const logDate = log.date || '';
              const isToday = logDate === today;
              const minorTask = (log.minorTask || '').toLowerCase();
              const comment = (log.comment || '').toLowerCase();
              const isBorrow = minorTask.includes('ยืม') || comment.includes('ยืม');
              const isReturn = minorTask.includes('คืน') || comment.includes('คืน');

              const allEquipment = [...ALL_HP, ...ALL_PW, ...ALL_USB];
              allEquipment.forEach(eq => {
                const eqLower = eq.toLowerCase();
                const hasEq = comment.includes(eqLower) || log.equipment === eq;
                if (hasEq) {
                  const bucket = ALL_HP.includes(eq) ? 'headphones' : ALL_USB.includes(eq) ? 'usb' : 'power';
                  if (isBorrow) newStatus[bucket][eq] = 'in_use';
                  if (isReturn) newStatus[bucket][eq] = 'available';
                  if (log.recipient) newDetails[eq] = { user: log.recipient, time: log.time || '' };
                }
              });
            });

            setEquipmentStatus(isHeadphones ? newStatus.headphones : isUsb ? newStatus.usb : newStatus.power);
            setEquipmentDetails(newDetails);
          } catch (error) {
            console.error('Error recalculating status:', error);
          } finally {
            setLoading(false);
          }
        };
        recalculate();
      }
    };

    window.addEventListener('worklogDeleted', handleWorklogDeleted);
    return () => window.removeEventListener('worklogDeleted', handleWorklogDeleted);
  }, [equipmentType, isOpen, isHeadphones]);

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
