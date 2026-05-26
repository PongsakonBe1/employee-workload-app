'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { getTemplatesForUser, logFromTemplate } from '../lib/quickLogTemplates';
import { useAuth } from './AuthProvider';
import { logSystemAction, SystemActions } from '../lib/systemLog';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import EquipmentModal from './EquipmentModal';
import SmartEquipmentModal from './SmartEquipmentModal';
import SmartRoomModal from './SmartRoomModal';

export default function QuickLogButtons({ onLogSuccess, targetUser }) {
  const t = useTranslations('worklog');
  const { user } = useAuth();
  // ถ้ามี targetUser (admin log แทน) ใช้ targetUser, ไม่งั้นใช้ user ตัวเอง
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

  const handleQuickLog = async (template) => {
    if (!user) return;
    if (!logAsUser) return;

    console.log('🔍 Template clicked:', template);
    console.log('🔍 isSmart value:', template.isSmart);

    // ตรวจสอบว่าเป็น Smart Template หรือไม่
    if (template.isSmart || 
        template.name.includes('ชั้น 3') || 
        template.name.includes('ชั้น 4') ||
        template.minorTask.includes('ชั้น 3') || 
        template.minorTask.includes('ชั้น 4') ||
        template.name.includes('หูฟัง') ||
        template.name.includes('ปลั๊กไฟ') ||
        template.minorTask.includes('หูฟัง') ||
        template.minorTask.includes('ปลั๊กไฟ')) {
      setSelectedTemplate(template);
      setEquipmentComment('');
      
      // ตรวจสอบประเภทของ Smart Template
      const isRoomTemplate = template.minorTask.includes('ห้องเรียน') || 
                             template.minorTask.includes('ชั้น 3') || 
                             template.minorTask.includes('ชั้น 4') ||
                             template.name.includes('ชั้น 3') ||
                             template.name.includes('ชั้น 4');
      
      console.log('🏢 isRoomTemplate:', isRoomTemplate);
      console.log('🏢 template.name:', template.name);
      console.log('🏢 template.minorTask:', template.minorTask);
      
      if (isRoomTemplate) {
        console.log('🏢 Opening SmartRoomModal');
        setShowSmartRoomModal(true);
      } else {
        // หูฟัง หรือ ปลั๊กไฟ
        console.log('🔌 Opening SmartEquipmentModal');
        setShowSmartEquipmentModal(true);
      }
      return;
    }

    // ตรวจสอบว่าเป็น template อุปกรณ์แบบเดิมหรือไม่
    const isEquipmentTemplate = template.minorTask.includes('ยืมหูฟัง') || 
                                template.minorTask.includes('คืนหูฟัง') ||
                                template.minorTask.includes('ยืมปลั๊กไฟ') || 
                                template.minorTask.includes('คืนปลั๊กไฟ');

    // ถ้าเป็น template อุปกรณ์ ให้แสดง equipment modal
    if (isEquipmentTemplate) {
      setSelectedTemplate(template);
      setEquipmentComment('');
      setShowEquipmentModal(true);
      return;
    }

    // ถ้า template ต้องการผู้รับบริการ ให้แสดง recipient modal
    if (template.requireRecipient) {
      setSelectedTemplate(template);
      setRecipient('');
      setShowRecipientModal(true);
      return;
    }

    setLoggingTemplate(template.id);
    setLoading(true);

    try {
      // สร้างข้อมูลสำหรับวันนี้และเวลาปัจจุบัน
      const now = new Date();
      const extraData = {
        date: now.toISOString().slice(0, 10),
        time: now.toTimeString().slice(0, 5)
      };

      // บันทึกงานจาก template
      await logFromTemplate(template.id, user.uid, extraData);

      // บันทึก system log
      await logSystemAction(
        SystemActions.WORKLOG_CREATE,
        `Quick log from template: ${template.name}`,
        { templateId: template.id }
      );

      // แจ้งผู้ใช้
      if (onLogSuccess) {
        onLogSuccess(`บันทึกงาน "${template.name}" เรียบร้อยแล้ว`);
      }

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

  const handleLogWithSmartEquipment = async (comment, equipment, minorTask, recipient) => {
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

  return (
    <div>
      {templates.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => handleQuickLog(template)}
              disabled={loading}
              title={template.minorTask}
              className={`
                relative p-3 text-left rounded-2xl border-2 transition-all active:scale-95
                ${loggingTemplate === template.id
                  ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                }
                ${loading && loggingTemplate !== template.id ? 'opacity-50 pointer-events-none' : ''}
              `}
            >
              {loggingTemplate === template.id && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-900/80">
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                </div>
              )}
              <div className="font-medium text-sm leading-tight truncate">{template.name}</div>
              <div className="text-[11px] mt-0.5 opacity-60 truncate">{template.minorTask}</div>
              {template.requireRecipient && (
                <span className="mt-1 inline-block text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">
                  กรอกชื่อ
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-sm text-slate-400">
          ยังไม่มี Quick Log Templates — Admin สร้างได้ในหน้าจัดการ
        </div>
      )}

      {/* Modal สำหรับกรอกผู้รับบริการ */}
      {showRecipientModal && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowRecipientModal(false); setSelectedTemplate(null); setRecipient(''); }} />
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
        </div>
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
    </div>
  );
}
