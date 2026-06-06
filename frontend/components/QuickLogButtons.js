'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { getTemplatesForUser, logFromTemplate, logFromComboTemplate } from '../lib/quickLogTemplates';
import { useAuth } from './AuthProvider';
import { logSystemAction, SystemActions } from '../lib/systemLog';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import EquipmentModal from './EquipmentModal';
import SmartEquipmentModal from './SmartEquipmentModal';
import SmartRoomModal from './SmartRoomModal';
import EquipmentReturnModal from './EquipmentReturnModal';

const HOLD_DURATION = 3000; // ms hold to confirm direct-log (3 seconds)

export default function QuickLogButtons({ onLogSuccess, targetUser }) {
  const t = useTranslations('worklog');
  const { user } = useAuth();
  const logAsUser = targetUser || user;
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loggingTemplate, setLoggingTemplate] = useState(null);
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [recipient, setRecipient] = useState('');
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [equipmentComment, setEquipmentComment] = useState('');
  const [showSmartEquipmentModal, setShowSmartEquipmentModal] = useState(false);
  const [showSmartRoomModal, setShowSmartRoomModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  // Combo modal state
  const [showComboModal, setShowComboModal] = useState(false);
  const [comboRecipient, setComboRecipient] = useState('');
  // EquipmentReturnModal state (EH-4)
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnEquipmentId, setReturnEquipmentId] = useState('');
  const [returnEquipmentType, setReturnEquipmentType] = useState('headphones');
  // hold-to-confirm state
  const [holdingId, setHoldingId] = useState(null);
  const [holdProgress, setHoldProgress] = useState(0); // 0-100
  const holdRafRef = useRef(null);
  const executingRef = useRef(false); // guard ป้องกัน double-log
  const [currentPage, setCurrentPage] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!user) return;

    const loadTemplates = async () => {
      try {
        // ส่ง null แทน department เพราะ templates เป็น global ทั้งหมด
        const userTemplates = await getTemplatesForUser(null);
        setTemplates(userTemplates);
      } catch (error) {
        console.error("Error loading templates:", error);
      }
    };

    loadTemplates();
  }, [user]);

  const isReturnTemplate = (template) =>
    template.minorTask.includes('คืนหูฟัง') || template.minorTask.includes('คืนปลั๊กไฟ') ||
    template.name.includes('คืนหูฟัง') || template.name.includes('คืนปลั๊กไฟ');

  const isSmartOrEquipmentTemplate = (template) => {
    return template.isSmart ||
      template.name.includes('ชั้น 3') || template.name.includes('ชั้น 4') ||
      template.minorTask.includes('ชั้น 3') || template.minorTask.includes('ชั้น 4') ||
      template.name.includes('หูฟัง') || template.name.includes('ปลั๊กไฟ') ||
      template.minorTask.includes('หูฟัง') || template.minorTask.includes('ปลั๊กไฟ') ||
      template.minorTask.includes('ยืมหูฟัง') || template.minorTask.includes('คืนหูฟัง') ||
      template.minorTask.includes('ยืมปลั๊กไฟ') || template.minorTask.includes('คืนปลั๊กไฟ');
  };

  const isDirectLog = (template) => !isSmartOrEquipmentTemplate(template) && !template.requireRecipient && !template.isCombo;

  // --- Hold-to-confirm handlers ---
  const handleHoldStart = (template) => {
    if (!isDirectLog(template)) return;
    if (executingRef.current) return; // guard
    const startTime = Date.now();
    setHoldingId(template.id);
    setHoldProgress(0);

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setHoldProgress(pct);
      if (pct < 100) {
        holdRafRef.current = requestAnimationFrame(tick);
      } else {
        if (executingRef.current) return; // prevent double fire
        executingRef.current = true;
        setHoldingId(null);
        setHoldProgress(0);
        executeDirectLog(template).finally(() => {
          executingRef.current = false;
        });
      }
    };
    holdRafRef.current = requestAnimationFrame(tick);
  };

  const handleHoldEnd = () => {
    if (holdRafRef.current) { cancelAnimationFrame(holdRafRef.current); holdRafRef.current = null; }
    setHoldingId(null);
    setHoldProgress(0);
  };

  const executeDirectLog = async (template, overrideComment) => {
    if (!user || !logAsUser) return;
    setLoggingTemplate(template.id);
    setLoading(true);
    try {
      const now = new Date();
      await logFromTemplate(template.id, logAsUser.uid || logAsUser.id, {
        date: now.toISOString().slice(0, 10),
        time: now.toTimeString().slice(0, 5),
        comment: overrideComment || '',
        employeeDisplayName: logAsUser.displayName || logAsUser.nickname || (logAsUser.fullName || '').split(' ')[0] || '',
        employeeNickname: logAsUser.nickname || '',
        employeeFullName: logAsUser.fullName || ''
      });
      await logSystemAction(SystemActions.WORKLOG_CREATE, `Quick log: ${template.name}`, { templateId: template.id });
      if (onLogSuccess) onLogSuccess(`บันทึก “${template.name}” เรียบร้อย`);
    } catch (error) {
      if (onLogSuccess) onLogSuccess(`เกิดข้อผิดพลาด: ${error.message}`, 'error');
    } finally {
      setLoading(false);
      setLoggingTemplate(null);
    }
  };

  const handleQuickLog = (template) => {
    if (!user || !logAsUser) return;

    // Return template: เปิด EquipmentReturnModal (EH-4)
    if (isReturnTemplate(template)) {
      setSelectedTemplate(template);
      const eqType = (template.minorTask.includes('หูฟัง') || template.name.includes('หูฟัง'))
        ? 'headphones' : 'power';
      setReturnEquipmentType(eqType);
      // ดึง equipment ID จากชื่อ template เช่น "คืนหูฟัง ICIT05" → "ICIT05"
      const idMatch = template.name.match(/ICIT\d+/) || template.minorTask.match(/ICIT\d+/);
      setReturnEquipmentId(idMatch ? idMatch[0] : '');
      setShowReturnModal(true);
      return;
    }

    // Combo template: เปิด modal กรอก recipient
    if (template.isCombo) {
      setSelectedTemplate(template);
      setComboRecipient('');
      setShowComboModal(true);
      return;
    }

    if (template.requireComment) {
      setSelectedTemplate(template);
      setCommentText('');
      setRecipient('');
      setShowCommentModal(true);
      return;
    }

    if (isSmartOrEquipmentTemplate(template)) {
      setSelectedTemplate(template);
      setEquipmentComment('');
      const isRoom = template.minorTask.includes('ห้องเรียน') ||
                     template.minorTask.includes('ชั้น 3') || template.minorTask.includes('ชั้น 4') ||
                     template.name.includes('ชั้น 3') || template.name.includes('ชั้น 4');
      if (template.minorTask.includes('ยืมหูฟัง') || template.minorTask.includes('คืนหูฟัง') ||
          template.minorTask.includes('ยืมปลั๊กไฟ') || template.minorTask.includes('คืนปลั๊กไฟ') ||
          template.name.includes('หูฟัง') || template.name.includes('ปลั๊กไฟ')) {
        setShowSmartEquipmentModal(true);
      } else if (isRoom) {
        setShowSmartRoomModal(true);
      } else {
        setShowSmartEquipmentModal(true);
      }
      return;
    }

    if (template.requireRecipient) {
      setSelectedTemplate(template);
      setRecipient('');
      setShowRecipientModal(true);
      return;
    }

    // direct-log: handled by hold gesture only (3-second hold)
  };

  const handleLogCombo = async () => {
    if (!selectedTemplate || !comboRecipient.trim()) {
      if (onLogSuccess) onLogSuccess('กรุณากรอกผู้รับบริการ', 'error');
      return;
    }

    setLoggingTemplate(selectedTemplate.id);
    setLoading(true);

    try {
      const now = new Date();
      const extraData = {
        date: now.toISOString().slice(0, 10),
        time: now.toTimeString().slice(0, 5),
        recipient: comboRecipient.trim(),
        employeeDisplayName: logAsUser.displayName || logAsUser.nickname || logAsUser.fullName?.split(' ')?.[0] || '',
        employeeNickname: logAsUser.nickname || '',
        employeeFullName: logAsUser.fullName || ''
      };

      const worklogIds = await logFromComboTemplate(selectedTemplate.id, logAsUser.uid || logAsUser.id, extraData);
      
      await logSystemAction(
        SystemActions.WORKLOG_CREATE,
        `Combo log: ${selectedTemplate.name} (${worklogIds.length} งาน)`,
        { templateId: selectedTemplate.id, comboSize: worklogIds.length }
      );

      if (onLogSuccess) {
        onLogSuccess(`บันทึก ${worklogIds.length} งานเรียบร้อย`);
      }
      
      setShowComboModal(false);
      setSelectedTemplate(null);
      setComboRecipient('');

    } catch (error) {
      console.error("Error combo logging:", error);
      if (onLogSuccess) {
        onLogSuccess(`เกิดข้อผิดพลาด: ${error.message}`, 'error');
      }
    } finally {
      setLoading(false);
      setLoggingTemplate(null);
    }
  };

  const handleLogWithComment = async () => {
    if (!selectedTemplate || !commentText.trim()) {
      if (onLogSuccess) onLogSuccess('กรุณากรอกความคิดเห็น', 'error');
      return;
    }
    if (selectedTemplate.requireRecipient && !recipient.trim()) {
      if (onLogSuccess) onLogSuccess('กรุณากรอกผู้รับบริการ', 'error');
      return;
    }
    setLoggingTemplate(selectedTemplate.id);
    setLoading(true);
    try {
      const now = new Date();
      const extraData = {
        date: now.toISOString().slice(0, 10),
        time: now.toTimeString().slice(0, 5),
        comment: commentText.trim(),
        employeeDisplayName: logAsUser.displayName || logAsUser.nickname || logAsUser.fullName?.split(' ')?.[0] || '',
        employeeNickname: logAsUser.nickname || '',
        employeeFullName: logAsUser.fullName || ''
      };
      if (selectedTemplate.requireRecipient && recipient.trim()) {
        extraData.recipient = recipient.trim();
      }
      await logFromTemplate(selectedTemplate.id, logAsUser.uid || logAsUser.id, extraData);
      await logSystemAction(SystemActions.WORKLOG_CREATE, `Quick log: ${selectedTemplate.name}`, { templateId: selectedTemplate.id });
      if (onLogSuccess) onLogSuccess(`บันทึก "${selectedTemplate.name}" เรียบร้อย`);
      setShowCommentModal(false);
      setSelectedTemplate(null);
      setCommentText('');
      setRecipient('');
    } catch (error) {
      if (onLogSuccess) onLogSuccess(`เกิดข้อผิดพลาด: ${error.message}`, 'error');
    } finally {
      setLoading(false);
      setLoggingTemplate(null);
    }
  };

  const handleLogWithRecipient = async () => {
    if (!selectedTemplate || !recipient.trim()) {
      if (onLogSuccess) {
        onLogSuccess('กรุณากรอกผู้รับบริการ', 'error');
      }
      return;
    }

    setLoggingTemplate(selectedTemplate.id);
    setLoading(true);

    try {
      // สร้างข้อมูลสำหรับวันนี้และเวลาปัจจุบัน
      const now = new Date();
      const extraData = {
        date: now.toISOString().slice(0, 10),
        time: now.toTimeString().slice(0, 5),
        recipient: recipient.trim()
      };

      // บันทึกงานจาก template
      await logFromTemplate(selectedTemplate.id, user.uid, extraData);

      // บันทึก system log
      await logSystemAction(
        SystemActions.WORKLOG_CREATE,
        `Quick log from template: ${selectedTemplate.name}`,
        { templateId: selectedTemplate.id }
      );

      // แจ้งผู้ใช้
      if (onLogSuccess) {
        onLogSuccess(`บันทึกงาน "${selectedTemplate.name}" เรียบร้อยแล้ว`);
      }
      
      setShowRecipientModal(false);
      setSelectedTemplate(null);
      setRecipient('');

    } catch (error) {
      console.error("Error quick logging:", error);
      if (onLogSuccess) {
        onLogSuccess(`เกิดข้อผิดพลาด: ${error.message}`, 'error');
      }
    } finally {
      setLoading(false);
      setLoggingTemplate(null);
    }
  };

  const handleLogWithEquipment = async (comment, equipment) => {
    if (!selectedTemplate || !comment.trim()) {
      if (onLogSuccess) {
        onLogSuccess('กรุณาเลือกรายการอุปกรณ์', 'error');
      }
      return;
    }

    setLoggingTemplate(selectedTemplate.id);
    setLoading(true);

    try {
      // สร้างข้อมูลสำหรับวันนี้และเวลาปัจจุบัน
      const now = new Date();
      const extraData = {
        date: now.toISOString().slice(0, 10),
        time: now.toTimeString().slice(0, 5),
        comment: comment.trim(),
        equipment: equipment
      };

      // บันทึกงานจาก template พร้อม override comment
      await logFromTemplate(selectedTemplate.id, user.uid, extraData);

      // บันทึก system log
      await logSystemAction(
        SystemActions.WORKLOG_CREATE,
        `Quick log from template: ${selectedTemplate.name} - ${equipment}`,
        { templateId: selectedTemplate.id, equipment }
      );

      // แจ้งผู้ใช้
      if (onLogSuccess) {
        onLogSuccess(`บันทึกงาน "${selectedTemplate.name} - ${equipment}" เรียบร้อยแล้ว`);
      }
      
      setShowEquipmentModal(false);
      setSelectedTemplate(null);
      setEquipmentComment('');

    } catch (error) {
      console.error("Error quick logging with equipment:", error);
      if (onLogSuccess) {
        onLogSuccess(`เกิดข้อผิดพลาด: ${error.message}`, 'error');
      }
    } finally {
      setLoading(false);
      setLoggingTemplate(null);
    }
  };

  const handleLogWithSmartEquipment = async (comment, equipment, minorTask, recipient, equipmentCondition = 'normal', equipmentNote = '') => {
    if (!selectedTemplate || !comment.trim()) {
      if (onLogSuccess) {
        onLogSuccess('กรุณาเลือกรายการอุปกรณ์', 'error');
      }
      return;
    }

    setLoggingTemplate(selectedTemplate.id);
    setLoading(true);

    try {
      // สร้างข้อมูลสำหรับวันนี้และเวลาปัจจุบัน
      const now = new Date();
      const extraData = {
        date: now.toISOString().slice(0, 10),
        time: now.toTimeString().slice(0, 5),
        comment: comment.trim(),
        minorTask: minorTask, // override minorTask ตามสถานะ
        equipment: equipment,
        recipient: recipient.trim(),
        equipmentCondition: equipmentCondition || 'normal', // ITEM-1
        equipmentNote: equipmentNote || '',                 // ITEM-1
        employeeDisplayName: logAsUser.displayName || logAsUser.nickname || logAsUser.fullName?.split(' ')?.[0] || '',
        employeeNickname: logAsUser.nickname || '',
        employeeFullName: logAsUser.fullName || ''
      };

      // บันทึกงานจาก template พร้อม override comment และ minorTask
      await logFromTemplate(selectedTemplate.id, logAsUser.uid || logAsUser.id, extraData);

      // อัปเดตสถานะอุปกรณ์ใน RoomEquipmentStatus
      const equipmentType = selectedTemplate.minorTask.includes('หูฟัง') ? 'headphones' : 
                           selectedTemplate.minorTask.includes('ปลั๊กไฟ') ? 'power' : null;
      
      if (equipmentType) {
        // กำหนดสถานะใหม่ตามการกระทำ
        const newStatus = minorTask.includes('ยืม') || minorTask.includes('เปิด') ? 'in_use' : 'available';
        
        // อัปเดตใน RoomEquipmentStatus collection
        const statusRef = doc(db, 'RoomEquipmentStatus', 'equipment');
        await setDoc(statusRef, {
          [`${equipmentType}.${equipment}`]: newStatus,
          [`${equipmentType}.${equipment}_user`]: recipient,
          [`${equipmentType}.${equipment}_timestamp`]: new Date().toISOString()
        }, { merge: true });
        
        console.log(`✅ Updated ${equipmentType} ${equipment} status to ${newStatus}`);
        
        // Trigger refresh ของสถานะอุปกรณ์โดยการส่ง custom event
        window.dispatchEvent(new CustomEvent('equipmentStatusUpdated', {
          detail: { equipmentType, equipment, status: newStatus }
        }));
      }

      // บันทึก system log
      await logSystemAction(
        SystemActions.WORKLOG_CREATE,
        `Smart log from template: ${selectedTemplate.name} - ${equipment} (${minorTask}) - ${recipient}`,
        { templateId: selectedTemplate.id, equipment, minorTask, recipient }
      );

      // แจ้งผู้ใช้
      if (onLogSuccess) {
        console.log('🔔 Calling onLogSuccess with message:', `บันทึกงาน "${comment}" สำหรับ ${recipient} เรียบร้อยแล้ว`);
        onLogSuccess(`บันทึกงาน "${comment}" สำหรับ ${recipient} เรียบร้อยแล้ว`);
      } else {
        console.log('❌ onLogSuccess is not available');
      }
      
      setShowSmartEquipmentModal(false);
      setSelectedTemplate(null);
      setEquipmentComment('');

    } catch (error) {
      console.error("Error quick logging with smart equipment:", error);
      if (onLogSuccess) {
        onLogSuccess(`เกิดข้อผิดพลาด: ${error.message}`, 'error');
      }
    } finally {
      setLoading(false);
      setLoggingTemplate(null);
    }
  };

  const handleLogWithSmartRoom = async (comment, room, minorTask, recipient) => {
    if (!selectedTemplate || !comment.trim()) {
      if (onLogSuccess) {
        onLogSuccess('กรุณาเลือกห้องเรียน', 'error');
      }
      return;
    }

    setLoggingTemplate(selectedTemplate.id);
    setLoading(true);

    try {
      // สร้างข้อมูลสำหรับวันนี้และเวลาปัจจุบัน
      const now = new Date();
      const extraData = {
        date: now.toISOString().slice(0, 10),
        time: now.toTimeString().slice(0, 5),
        comment: comment.trim(),
        minorTask: minorTask, // override minorTask ตามสถานะ
        room: room, // เพิ่ม room field
        recipient: recipient, // ห้องเรียนไม่ต้องการ recipient แต่ส่งไปให้ครบ
        employeeDisplayName: logAsUser.displayName || logAsUser.nickname || logAsUser.fullName?.split(' ')?.[0] || '',
        employeeNickname: logAsUser.nickname || '',
        employeeFullName: logAsUser.fullName || ''
      };

      // บันทึกงานจาก template พร้อม override comment และ minorTask
      await logFromTemplate(selectedTemplate.id, logAsUser.uid || logAsUser.id, extraData);

      // อัปเดตสถานะห้องใน RoomEquipmentStatus
      // กำหนดสถานะใหม่ตามการกระทำ
      const newStatus = (minorTask.includes('เปิด') || minorTask.includes('เช็คอิน')) ? 'in_use' : 'available';
      
      // อัปเดตใน RoomEquipmentStatus collection
      const statusRef = doc(db, 'RoomEquipmentStatus', 'equipment');
      await setDoc(statusRef, {
        [`rooms.${room}`]: newStatus,
        [`rooms.${room}_user`]: user.uid,
        [`rooms.${room}_timestamp`]: new Date().toISOString()
      }, { merge: true });
      
      console.log(`✅ Updated room ${room} status to ${newStatus}`);
      
      // Trigger refresh ของสถานะห้องเรียนโดยการส่ง custom event
      window.dispatchEvent(new CustomEvent('roomStatusUpdated', {
        detail: { room, status: newStatus }
      }));

      // บันทึก system log
      await logSystemAction(
        SystemActions.WORKLOG_CREATE,
        `Smart log from template: ${selectedTemplate.name} - ${room} (${minorTask})`,
        { templateId: selectedTemplate.id, room, minorTask }
      );

      // แจ้งผู้ใช้
      if (onLogSuccess) {
        onLogSuccess(`บันทึกงาน "${comment}" เรียบร้อยแล้ว`);
      }
      
      setShowSmartRoomModal(false);
      setSelectedTemplate(null);
      setEquipmentComment('');

    } catch (error) {
      console.error("Error quick logging with smart room:", error);
      if (onLogSuccess) {
        onLogSuccess(`เกิดข้อผิดพลาด: ${error.message}`, 'error');
      }
    } finally {
      setLoading(false);
      setLoggingTemplate(null);
    }
  };

  if (!user) {
    return null;
  }

  const ITEMS_PER_PAGE = 6;
  const totalPages = Math.ceil(templates.length / ITEMS_PER_PAGE);
  const pagedTemplates = templates.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  return (
    <div>
      {templates.length > 0 ? (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {pagedTemplates.map((template) => {
              const direct = isDirectLog(template);
              const isHolding = holdingId === template.id;
              const isLogging = loggingTemplate === template.id;
              return (
              <button
                key={template.id}
                type="button"
                onClick={() => { if (!direct || template.requireComment) handleQuickLog(template); }}
                onMouseDown={() => direct && !template.requireComment && handleHoldStart(template)}
                onMouseUp={() => direct && !template.requireComment && handleHoldEnd()}
                onMouseLeave={() => direct && !template.requireComment && handleHoldEnd()}
                onTouchStart={(e) => { if (direct && !template.requireComment) { e.preventDefault(); handleHoldStart(template); } }}
                onTouchEnd={(e) => { if (direct && !template.requireComment) { e.preventDefault(); handleHoldEnd(); } }}
                onTouchCancel={() => direct && !template.requireComment && handleHoldEnd()}
                disabled={loading && !isLogging}
                title={direct ? 'กดค้างเพื่อบันทึก' : template.minorTask}
                className={`
                  relative p-3 text-left rounded-2xl border-2 transition-all overflow-hidden select-none
                  ${isLogging
                    ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                    : isHolding
                    ? 'border-emerald-500 bg-emerald-50 text-slate-700'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                  }
                  ${loading && !isLogging ? 'opacity-50 pointer-events-none' : ''}
                `}
              >
                {/* hold progress bar */}
                {isHolding && (
                  <div
                    className="absolute bottom-0 left-0 h-0.5 bg-emerald-500 transition-none"
                    style={{ width: `${holdProgress}%` }}
                  />
                )}
                {isLogging && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-900/80">
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  </div>
                )}
                <div className="font-medium text-sm leading-tight truncate">{template.name}</div>
                <div className="text-[11px] mt-0.5 opacity-60 truncate">
                  {template.isCombo 
                    ? template.comboItems?.map(i => i.minorTask).join(' · ')
                    : template.minorTask
                  }
                </div>
                <div className="mt-1 flex items-center gap-1">
                  {template.isCombo && (
                    <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">
                      {template.comboItems?.length || 0} งาน
                    </span>
                  )}
                  {template.requireRecipient && (
                    <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">กรอกชื่อ</span>
                  )}
                  {direct && !template.requireComment && (
                    <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full">กดค้าง 3 วิ</span>
                  )}
                  {template.requireComment && (
                    <span className="text-[10px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full">กรอก comment</span>
                  )}
                </div>
              </button>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 px-1">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 text-slate-600 disabled:opacity-30 hover:bg-slate-200 transition-colors select-none"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                ก่อนหน้า
              </button>
              <span className="text-xs text-slate-400">
                {currentPage + 1} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage === totalPages - 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 text-slate-600 disabled:opacity-30 hover:bg-slate-200 transition-colors select-none"
              >
                ถัดไป
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6 text-sm text-slate-400">
          ยังไม่มี Quick Log Templates — Admin สร้างได้ในหน้าจัดการ
        </div>
      )}

      {/* Modal สำหรับกรอกผู้รับบริการ */}
      {showRecipientModal && selectedTemplate && mounted && createPortal(
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => { setShowRecipientModal(false); setSelectedTemplate(null); setRecipient(''); }} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-sm p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">บันทึกด่วน</p>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">{selectedTemplate.name}</h3>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">ผู้รับบริการ *</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && recipient.trim() && handleLogWithRecipient()}
              className="apple-input"
              placeholder="กรอกชื่อผู้รับบริการ"
              autoFocus
            />
            <div className="flex gap-2 mt-5">
              <button
                onClick={handleLogWithRecipient}
                disabled={loading || !recipient.trim()}
                className="apple-button flex-1 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading
                  ? <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />กำลังบันทึก...</>
                  : 'บันทึก'
                }
              </button>
              <button
                onClick={() => { setShowRecipientModal(false); setSelectedTemplate(null); setRecipient(''); }}
                className="apple-button-secondary px-4"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Comment Modal */}
      {showCommentModal && selectedTemplate && mounted && createPortal(
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => { setShowCommentModal(false); setSelectedTemplate(null); setCommentText(''); setRecipient(''); }} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-sm p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">บันทึกด่วน</p>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">{selectedTemplate.name}</h3>
            <p className="text-xs text-slate-500 mb-4">ปฏิบัติงานตามผู้บังคับบัญชา — กรุณาระบุรายละเอียด</p>
            {selectedTemplate.requireRecipient && (
              <>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">ผู้รับบริการ *</label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="apple-input mb-3"
                  placeholder="กรอกชื่อผู้รับบริการ"
                  autoFocus
                />
              </>
            )}
            <label className="block text-xs font-medium text-slate-500 mb-1.5">ความคิดเห็น / รายละเอียด *</label>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="apple-input w-full resize-none"
              rows={3}
              placeholder="กรอกรายละเอียดการปฏิบัติงาน..."
              autoFocus={!selectedTemplate.requireRecipient}
            />
            <div className="flex gap-2 mt-5">
              <button
                onClick={handleLogWithComment}
                disabled={loading || !commentText.trim() || (selectedTemplate.requireRecipient && !recipient.trim())}
                className="apple-button flex-1 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading
                  ? <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />กำลังบันทึก...</>
                  : 'บันทึก'
                }
              </button>
              <button
                onClick={() => { setShowCommentModal(false); setSelectedTemplate(null); setCommentText(''); setRecipient(''); }}
                className="apple-button-secondary px-4"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Equipment Modal */}
      {showEquipmentModal && selectedTemplate && (
        <EquipmentModal
          isOpen={showEquipmentModal}
          onClose={() => setShowEquipmentModal(false)}
          onSelect={handleLogWithEquipment}
          templateName={selectedTemplate.name}
          templateMinorTask={selectedTemplate.minorTask}
        />
      )}

      {/* Smart Equipment Modal */}
      {showSmartEquipmentModal && selectedTemplate && (
        <SmartEquipmentModal
          isOpen={showSmartEquipmentModal}
          onClose={() => setShowSmartEquipmentModal(false)}
          onSelect={handleLogWithSmartEquipment}
          templateName={selectedTemplate.name}
          templateMinorTask={selectedTemplate.minorTask}
        />
      )}

      {/* Smart Room Modal */}
      {showSmartRoomModal && selectedTemplate && (
        <SmartRoomModal
          isOpen={showSmartRoomModal}
          onClose={() => setShowSmartRoomModal(false)}
          onSelect={handleLogWithSmartRoom}
          templateName={selectedTemplate.name}
          templateMinorTask={selectedTemplate.minorTask}
        />
      )}

      {/* Combo Modal */}
      {showComboModal && selectedTemplate && mounted && createPortal(
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => { setShowComboModal(false); setSelectedTemplate(null); setComboRecipient(''); }} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Combo Template</p>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">{selectedTemplate.name}</h3>
            <span className="inline-block px-2 py-1 bg-violet-100 text-violet-700 text-xs rounded-full mb-4">
              {selectedTemplate.comboItems?.length || 0} งานพร้อมกัน
            </span>
            
            {/* Sub-tasks list */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-slate-500 mb-2">รายการงานที่จะบันทึก</label>
              <div className="space-y-2">
                {selectedTemplate.comboItems?.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="w-5 h-5 bg-violet-100 text-violet-600 rounded-full text-xs flex items-center justify-center font-medium shrink-0">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-700 truncate">{item.name}</div>
                      <div className="text-xs text-slate-500 truncate">{item.minorTask}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Recipient input */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">ผู้รับบริการ *</label>
              <input
                type="text"
                value={comboRecipient}
                onChange={(e) => setComboRecipient(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && comboRecipient.trim() && handleLogCombo()}
                className="apple-input"
                placeholder="กรอกรหัสนักศึกษาหรือชื่อผู้รับบริการ"
                autoFocus
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleLogCombo}
                disabled={loading || !comboRecipient.trim()}
                className="apple-button flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading
                  ? <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />กำลังบันทึก...</>
                  : <>บันทึก {selectedTemplate.comboItems?.length || 0} งาน</>
                }
              </button>
              <button
                onClick={() => { setShowComboModal(false); setSelectedTemplate(null); setComboRecipient(''); }}
                className="apple-button-secondary px-4"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* EquipmentReturnModal (EH-4) */}
      {selectedTemplate && (
        <EquipmentReturnModal
          isOpen={showReturnModal}
          onClose={() => { setShowReturnModal(false); setSelectedTemplate(null); }}
          onConfirm={async (condition, note) => {
            if (!selectedTemplate || !logAsUser) return;
            setLoggingTemplate(selectedTemplate.id);
            setLoading(true);
            try {
              const now = new Date();
              const extraData = {
                date: now.toISOString().slice(0, 10),
                time: now.toTimeString().slice(0, 5),
                equipmentCondition: condition,
                equipmentNote: note,
                employeeDisplayName: logAsUser.displayName || logAsUser.nickname || logAsUser.fullName?.split(' ')?.[0] || '',
                employeeNickname: logAsUser.nickname || '',
                employeeFullName: logAsUser.fullName || '',
              };
              await logFromTemplate(selectedTemplate.id, logAsUser.uid || logAsUser.id, extraData);
              await logSystemAction(
                SystemActions.WORKLOG_CREATE,
                `Return log: ${selectedTemplate.name} — ${condition}${note ? ` (${note})` : ''}`,
                { templateId: selectedTemplate.id }
              );
              window.dispatchEvent(new CustomEvent('equipmentStatusUpdated', {
                detail: { equipmentType: returnEquipmentType, equipment: returnEquipmentId, status: 'available' }
              }));
              if (onLogSuccess) onLogSuccess(`บันทึก "${selectedTemplate.name}" — ${condition === 'normal' ? 'สมบูรณ์' : condition === 'damaged' ? 'ชำรุด' : 'สูญหาย'} เรียบร้อย`);
            } catch (error) {
              if (onLogSuccess) onLogSuccess(`เกิดข้อผิดพลาด: ${error.message}`, 'error');
            } finally {
              setLoading(false);
              setLoggingTemplate(null);
              setSelectedTemplate(null);
            }
          }}
          equipmentId={returnEquipmentId}
          equipmentType={returnEquipmentType}
          templateName={selectedTemplate.name}
        />
      )}
    </div>
  );
}
