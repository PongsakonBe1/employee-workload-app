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
    <div className="mb-3 mt-4">
      {/* วาวล์ชัวล */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-blue-900">⚡ Quick Log - คลิกเพื่อบันทึกงานทันที</span>
          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
            {templates.length} templates
          </span>
        </div>
      </div>
      
      {/* Templates Container */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        {templates.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleQuickLog(template)}
                disabled={loading}
                title={`${template.name}\nหัวข้อรอง: ${template.minorTask}\nหัวข้อหลัก: ${template.mainDuty}${template.comment ? `\nความคิดเห็น: ${template.comment}` : ''}${template.requireRecipient ? '\nต้องกรอกผู้รับบริการ' : ''}`}
                className={`
                  relative p-3 text-left rounded-lg border transition-all duration-300 transform hover:scale-105 hover:shadow-md
                  ${loggingTemplate === template.id
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 border-blue-500 text-white shadow-lg scale-105'
                    : 'bg-gradient-to-r from-white to-slate-50 border-slate-200 hover:border-blue-300 hover:from-blue-50 hover:to-indigo-50 text-slate-700 hover:text-blue-900'
                  }
                  ${loading ? 'cursor-not-allowed opacity-50 scale-95' : 'cursor-pointer active:scale-95'}
                `}
              >
                {loggingTemplate === template.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-lg backdrop-blur-sm">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                
                <div className="flex flex-col gap-1">
                  <div className="font-medium text-sm flex items-center gap-1 min-w-0">
                    <span className="truncate flex-1">
                      {template.name}
                    </span>
                    {template.requireRecipient && (
                      <span className="text-xs bg-orange-100 text-orange-600 px-1 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                        กรอก
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {template.minorTask}
                  </div>
                                  </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 px-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-slate-500 text-sm">
              <div className="mb-2">ยังไม่มี Quick Log Templates</div>
              <div className="text-xs">Admin สามารถสร้าง templates ได้ในหน้าจัดการ</div>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-2 text-xs text-slate-500">
        คลิกปุ่มด้านบนเพื่อบันทึกงานทันที หรือกรอกแบบปกติด้านล่าง
      </div>

      {/* Modal สำหรับกรอกผู้รับบริการ */}
      {showRecipientModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 transform transition-all duration-300 scale-100 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600">👤</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  กรอกผู้รับบริการ
                </h3>
                <p className="text-sm text-slate-600">
                  Template: <span className="font-medium text-blue-600">{selectedTemplate.name}</span>
                </p>
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                ผู้รับบริการ *
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                placeholder="กรอกชื่อผู้รับบริการ"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleLogWithRecipient}
                disabled={loading || !recipient.trim()}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    กำลังบันทึก...
                  </span>
                ) : (
                  'บันทึก'
                )}
              </button>
              <button
                onClick={() => {
                  setShowRecipientModal(false);
                  setSelectedTemplate(null);
                  setRecipient('');
                }}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all duration-200 transform hover:scale-105 active:scale-95"
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
