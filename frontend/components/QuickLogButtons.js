'use client';

import { useState, useEffect, useId, useRef, useSyncExternalStore } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { DlQuickLogDialog } from './DlQuickLogDialog';
import { Dialog } from './ui/Dialog';
import { GlassButton } from './ui/GlassControls';
import { ReviewSymbol } from './ui/ReviewSymbol';
import '../app/dev/record/record.css';
import { getTemplatesForUser, logFromTemplate, logFromComboTemplate, logFromComboCheckbox } from '../lib/quickLogTemplates';
import { useAuth } from './AuthProvider';
import { logSystemAction, SystemActions } from '../lib/systemLog';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import EquipmentModal from './EquipmentModal';
import SmartEquipmentModal from './SmartEquipmentModal';
import SmartRoomModal from './SmartRoomModal';
import { equipmentLoanKind, equipmentLoanTask, isEquipmentStudentCode } from '../lib/equipmentLoan';
import { combineDlRoundTemplates, DL_WORKLOG_TASK, isDlRoundTemplate } from '../lib/dlQuickLog';

const HOLD_DURATION = 3000; // ms hold to confirm direct-log (3 seconds)
const DESKTOP_QUICK_LOG_QUERY = '(min-width:761px)';
const COMPACT_PAGE_SIZE = 6;
const DESKTOP_PAGE_SIZE = 9;

function subscribeToDesktopWidth(onChange) {
  const query = window.matchMedia(DESKTOP_QUICK_LOG_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

const equipmentAppearance = {
  headphones: ["headphones", "green"],
  power: ["plug", "green"],
  usb: ["usb", "blue"]
};

function templateAppearance(template, equipmentKind) {
  if (equipmentKind) return equipmentAppearance[equipmentKind];
  const text = `${template.name} ${template.minorTask}`;
  if (/ชั้น [34]|เปิดห้อง|ปิดห้อง/.test(text)) return ["door", "purple"];
  if (/โทรศัพท์|รับสาย/.test(text)) return ["phone", "amber"];
  if (/โปรแกรม|Software/i.test(text)) return ["software", "purple"];
  if (/บัญชี|account/i.test(text)) return ["account", "blue"];
  return ["templates", "blue"];
}

function templateHint(template, equipmentKind, symbol, hasRoundPicker) {
  if (hasRoundPicker) return "เลือกรอบที่คุมสอบ";
  if (equipmentKind) return "เลือกอุปกรณ์";
  if (symbol === "door") return "เลือกห้อง";
  if (template.isCombo) return template.requireCheckbox ? "เลือกเฉพาะงานที่ทำ" : "บันทึกเป็นชุด";
  if (template.requireComment) return template.requireRecipient ? "ระบุผู้รับบริการและรายละเอียด" : "ระบุรายละเอียด";
  return template.requireRecipient ? "ระบุผู้รับบริการ" : "กดค้าง 3 วินาที";
}

export default function QuickLogButtons({ onLogSuccess, targetUser, expandOnDesktop = false, dlContext }) {
  const { user } = useAuth();
  const logAsUser = targetUser || user;
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loggingTemplate, setLoggingTemplate] = useState(null);
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [dlRequest, setDlRequest] = useState(null);
  const [recipient, setRecipient] = useState('');
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showSmartEquipmentModal, setShowSmartEquipmentModal] = useState(false);
  const [showSmartRoomModal, setShowSmartRoomModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  // Combo modal state
  const [showComboModal, setShowComboModal] = useState(false);
  const [comboRecipient, setComboRecipient] = useState('');
  // Combo checkbox modal state
  const [showComboCheckboxModal, setShowComboCheckboxModal] = useState(false);
  const [comboCheckboxRecipient, setComboCheckboxRecipient] = useState('');
  const [selectedComboItems, setSelectedComboItems] = useState([]);
  // hold-to-confirm state
  const [holdingId, setHoldingId] = useState(null);
  const [holdProgress, setHoldProgress] = useState(0); // 0-100
  const holdRafRef = useRef(null);
  const executingRef = useRef(false); // guard ป้องกัน double-log
  const pageSize = useSyncExternalStore(
    subscribeToDesktopWidth,
    () => expandOnDesktop && window.matchMedia(DESKTOP_QUICK_LOG_QUERY).matches ? DESKTOP_PAGE_SIZE : COMPACT_PAGE_SIZE,
    () => COMPACT_PAGE_SIZE,
  );
  const [pageStart, setPageStart] = useState(0);
  const [search, setSearch] = useState('');
  const [dialogError, setDialogError] = useState('');
  const formId = useId();

  useEffect(() => () => {
    if (holdRafRef.current !== null) cancelAnimationFrame(holdRafRef.current);
  }, []);

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

  const isSmartOrEquipmentTemplate = (template) => {
    return equipmentLoanKind(template) || template.isSmart ||
      template.name.includes('ชั้น 3') || template.name.includes('ชั้น 4') ||
      template.minorTask.includes('ชั้น 3') || template.minorTask.includes('ชั้น 4');
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
        date: now.toLocaleDateString('en-CA'),
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

    if (loading) return;
    setDialogError('');

    // Combo template with checkbox mode: เปิด modal เลือก checkbox
    if (template.isCombo && template.requireCheckbox) {
      setSelectedTemplate(template);
      setComboCheckboxRecipient('');
      setSelectedComboItems([]);
      setShowComboCheckboxModal(true);
      return;
    }

    // Combo template: เปิด modal กรอก recipient
    if (template.isCombo) {
      setSelectedTemplate(template);
      setComboRecipient('');
      setShowComboModal(true);
      return;
    }

    const loanKind = equipmentLoanKind(template);
    if (template.requireComment && !(loanKind && template.isSmart)) {
      setSelectedTemplate(template);
      setCommentText('');
      setRecipient('');
      setShowCommentModal(true);
      return;
    }

    if (loanKind) {
      setSelectedTemplate(template);
      setShowSmartEquipmentModal(true);
      return;
    }

    if (isSmartOrEquipmentTemplate(template)) {
      setSelectedTemplate(template);
      const isRoom = template.minorTask.includes('ห้องเรียน') ||
                     template.minorTask.includes('ชั้น 3') || template.minorTask.includes('ชั้น 4') ||
                     template.name.includes('ชั้น 3') || template.name.includes('ชั้น 4');
      if (isRoom) {
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
    if (!selectedTemplate || loading || (selectedTemplate.requireRecipient !== false && !comboRecipient.trim())) {
      if (onLogSuccess) onLogSuccess('กรุณากรอกผู้รับบริการ', 'error');
      return;
    }

    setDialogError('');
    setLoggingTemplate(selectedTemplate.id);
    setLoading(true);

    try {
      const now = new Date();
      const extraData = {
        date: now.toLocaleDateString('en-CA'),
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
      setDialogError('บันทึกไม่สำเร็จ กรุณาลองใหม่');
      console.error("Error combo logging:", error);
      if (onLogSuccess) {
        onLogSuccess(`เกิดข้อผิดพลาด: ${error.message}`, 'error');
      }
    } finally {
      setLoading(false);
      setLoggingTemplate(null);
    }
  };

  const handleLogComboCheckbox = async () => {
    if (!selectedTemplate || loading || (selectedTemplate.requireRecipient !== false && !comboCheckboxRecipient.trim())) {
      if (onLogSuccess) onLogSuccess('กรุณากรอกผู้รับบริการ', 'error');
      return;
    }

    if (selectedComboItems.length === 0) {
      if (onLogSuccess) onLogSuccess('กรุณาเลือกอย่างน้อย 1 งาน', 'error');
      return;
    }

    setDialogError('');
    setLoggingTemplate(selectedTemplate.id);
    setLoading(true);

    try {
      const now = new Date();
      const extraData = {
        date: now.toLocaleDateString('en-CA'),
        time: now.toTimeString().slice(0, 5),
        recipient: comboCheckboxRecipient.trim(),
        employeeDisplayName: logAsUser.displayName || logAsUser.nickname || logAsUser.fullName?.split(' ')?.[0] || '',
        employeeNickname: logAsUser.nickname || '',
        employeeFullName: logAsUser.fullName || ''
      };

      const worklogIds = await logFromComboCheckbox(
        selectedTemplate.id,
        logAsUser.uid || logAsUser.id,
        selectedComboItems,
        extraData
      );

      await logSystemAction(
        SystemActions.WORKLOG_CREATE,
        `Combo checkbox log: ${selectedTemplate.name} (${worklogIds.length}/${selectedTemplate.comboItems.length} งาน)`,
        { templateId: selectedTemplate.id, selectedCount: worklogIds.length, totalCount: selectedTemplate.comboItems.length }
      );

      if (onLogSuccess) {
        onLogSuccess(`บันทึก ${worklogIds.length} งานเรียบร้อย`);
      }

      setShowComboCheckboxModal(false);
      setSelectedTemplate(null);
      setComboCheckboxRecipient('');
      setSelectedComboItems([]);

    } catch (error) {
      setDialogError('บันทึกไม่สำเร็จ กรุณาลองใหม่');
      console.error("Error combo checkbox logging:", error);
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
    setDialogError('');
    setLoggingTemplate(selectedTemplate.id);
    setLoading(true);
    try {
      const now = new Date();
      const extraData = {
        date: now.toLocaleDateString('en-CA'),
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
      setDialogError('บันทึกไม่สำเร็จ กรุณาลองใหม่');
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

    setDialogError('');
    setLoggingTemplate(selectedTemplate.id);
    setLoading(true);

    try {
      // สร้างข้อมูลสำหรับวันนี้และเวลาปัจจุบัน
      const now = new Date();
      const extraData = {
        date: now.toLocaleDateString('en-CA'),
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
      setDialogError('บันทึกไม่สำเร็จ กรุณาลองใหม่');
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
        date: now.toLocaleDateString('en-CA'),
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
    const equipmentType = equipmentLoanKind(selectedTemplate || undefined);
    const returning = minorTask === equipmentLoanTask(equipmentType, true);
    if (!user || !logAsUser || !equipmentType || !equipment || !comment.trim() ||
        (!returning && (minorTask !== equipmentLoanTask(equipmentType, false) || !isEquipmentStudentCode(recipient)))) {
      throw new Error('Invalid equipment loan input');
    }

    setLoggingTemplate(selectedTemplate.id);
    setLoading(true);

    try {
      // สร้างข้อมูลสำหรับวันนี้และเวลาปัจจุบัน
      const now = new Date();
      const extraData = {
        date: now.toLocaleDateString('en-CA'),
        time: now.toTimeString().slice(0, 5),
        comment: comment.trim(),
        minorTask: minorTask, // override minorTask ตามสถานะ
        equipment: equipment,
        recipient,
        equipmentCondition: equipmentCondition || 'normal', // ITEM-1
        equipmentNote: equipmentNote || '',                 // ITEM-1
        employeeDisplayName: logAsUser.displayName || logAsUser.nickname || logAsUser.fullName?.split(' ')?.[0] || '',
        employeeNickname: logAsUser.nickname || '',
        employeeFullName: logAsUser.fullName || ''
      };

      // บันทึกงานจาก template พร้อม override comment และ minorTask
      await logFromTemplate(selectedTemplate.id, logAsUser.uid || logAsUser.id, extraData);

      const newStatus = returning ? 'available' : 'in_use';
      let statusSynced = true;
      if (equipmentType !== 'usb') {
        try {
          await setDoc(doc(db, 'RoomEquipmentStatus', 'equipment'), {
            [`${equipmentType}.${equipment}`]: newStatus,
            [`${equipmentType}.${equipment}_user`]: recipient,
            [`${equipmentType}.${equipment}_timestamp`]: new Date().toISOString()
          }, { merge: true });
        } catch {
          // The worklog already committed. Report the status sync separately to avoid another loan on retry.
          statusSynced = false;
        }
      }
      window.dispatchEvent(new CustomEvent('equipmentStatusUpdated', { detail: { equipmentType, equipment, status: newStatus } }));

      void logSystemAction(
        SystemActions.WORKLOG_CREATE,
        `Smart log from template: ${selectedTemplate.name} - ${equipment} (${minorTask})`,
        logAsUser.uid || logAsUser.id
      );

      onLogSuccess?.(statusSynced ? `บันทึกงาน “${comment}” เรียบร้อยแล้ว` : `บันทึกงาน “${comment}” แล้ว แต่ซิงก์สถานะอุปกรณ์ไม่สำเร็จ`);
      setSelectedTemplate(null);
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
      throw new Error("Missing room selection");
    }

    setLoggingTemplate(selectedTemplate.id);
    setLoading(true);

    try {
      // สร้างข้อมูลสำหรับวันนี้และเวลาปัจจุบัน
      const now = new Date();
      const extraData = {
        date: now.toLocaleDateString('en-CA'),
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
      void setDoc(statusRef, {
        [`rooms.${room}`]: newStatus,
        [`rooms.${room}_user`]: user.uid,
        [`rooms.${room}_timestamp`]: new Date().toISOString()
      }, { merge: true }).catch(() => {});
      
      // Trigger refresh ของสถานะห้องเรียนโดยการส่ง custom event
      window.dispatchEvent(new CustomEvent('roomStatusUpdated', {
        detail: { room, status: newStatus }
      }));

      // บันทึก system log
      void logSystemAction(
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

    } catch (error) {
      console.error("Error quick logging with smart room:", error);
      if (onLogSuccess) {
        onLogSuccess(`เกิดข้อผิดพลาด: ${error.message}`, 'error');
      }
      throw error;
    } finally {
      setLoading(false);
      setLoggingTemplate(null);
    }
  };

  if (!user) {
    return null;
  }

  const term = search.trim().toLocaleLowerCase("th");
  const visibleTemplates = dlContext ? combineDlRoundTemplates(templates) : templates;
  const filteredTemplates = visibleTemplates.filter(template =>
    !term || [template.name, template.minorTask].some(value => value?.toLocaleLowerCase("th").includes(term))
  );
  const pageCount = Math.ceil(filteredTemplates.length / pageSize);
  const page = Math.min(Math.floor(pageStart / pageSize), Math.max(0, pageCount - 1));
  const pagedTemplates = filteredTemplates.slice(page * pageSize, (page + 1) * pageSize);
  const isCombo = showComboModal || showComboCheckboxModal;
  const showForm = Boolean(selectedTemplate && (isCombo || showCommentModal || showRecipientModal));
  const needsRecipient = isCombo ? selectedTemplate?.requireRecipient !== false : Boolean(showRecipientModal || selectedTemplate?.requireRecipient);
  const recipientValue = showComboCheckboxModal ? comboCheckboxRecipient : showComboModal ? comboRecipient : recipient;
  const setRecipientValue = showComboCheckboxModal ? setComboCheckboxRecipient : showComboModal ? setComboRecipient : setRecipient;
  const comboItems = selectedTemplate?.comboItems || [];

  function closeForm() {
    if (loading) return;
    setShowComboModal(false);
    setShowComboCheckboxModal(false);
    setShowRecipientModal(false);
    setShowCommentModal(false);
    setSelectedTemplate(null);
    setRecipient('');
    setComboRecipient('');
    setComboCheckboxRecipient('');
    setCommentText('');
    setSelectedComboItems([]);
    setDialogError('');
  }

  function submitForm(event) {
    event.preventDefault();
    if (loading) return;
    if (needsRecipient && !recipientValue.trim()) {
      setDialogError('กรุณากรอกผู้รับบริการ');
      event.currentTarget.elements.namedItem('recipient')?.focus();
      return;
    }
    if (showCommentModal && !commentText.trim()) {
      setDialogError("กรุณากรอกรายละเอียด");
      event.currentTarget.elements.namedItem("comment")?.focus();
      return;
    }
    if (showComboCheckboxModal) void handleLogComboCheckbox();
    else if (showComboModal) void handleLogCombo();
    else if (showCommentModal) void handleLogWithComment();
    else if (showRecipientModal) void handleLogWithRecipient();
  }

  return (
    <div>
      <label className="ui-field quick-log-search">
        <span className="quick-log-search-box">
          <Search size={17} aria-hidden="true" />
          <input type="search" aria-label="ค้นหาบันทึกด่วน" placeholder="ค้นหาบันทึกด่วน" value={search} onChange={event => { setSearch(event.target.value); setPageStart(0); }} />
        </span>
      </label>
      <div className="record-quick-grid">
        {pagedTemplates.map(template => {
          const hasRoundPicker = dlContext && isDlRoundTemplate(template);
          const direct = !hasRoundPicker && isDirectLog(template) && !template.requireComment;
          const holding = holdingId === template.id;
          const saving = loggingTemplate === template.id;
          const kind = equipmentLoanKind(template);
          const [symbol, tone] = templateAppearance(template, kind);
          const hint = templateHint(template, kind, symbol, hasRoundPicker);
          return <button
            key={template.id}
            type="button"
            className="record-quick-card"
            data-holding={holding || undefined}
            aria-busy={saving || undefined}
            disabled={loading}
            onClick={() => {
              if (hasRoundPicker) {
                setDlRequest({ templateId: template.id, actorId: user.uid, date: dlContext.date, time: dlContext.time, person: { ...logAsUser, ...dlContext.person } });
              } else if (!direct) handleQuickLog(template);
            }}
            onPointerDown={event => { if (direct && event.button === 0) handleHoldStart(template); }}
            onPointerUp={() => { if (direct) handleHoldEnd(); }}
            onPointerLeave={() => { if (direct) handleHoldEnd(); }}
            onPointerCancel={() => { if (direct) handleHoldEnd(); }}
            onKeyDown={event => {
              if (direct && (event.key === " " || event.key === "Enter")) {
                event.preventDefault();
                if (!event.repeat) handleHoldStart(template);
              }
            }}
            onKeyUp={event => { if (direct && (event.key === " " || event.key === "Enter")) handleHoldEnd(); }}
            onBlur={() => { if (direct) handleHoldEnd(); }}
          >
            <span className="record-tile ui-nav-symbol" data-tone={tone}><ReviewSymbol name={symbol} size={28} /></span>
            <span className="record-quick-copy">
              <span className="record-quick-title">
                <strong>{template.name}</strong>
                {template.isCombo && <span className="record-quick-count">{template.comboItems?.length || 0} งาน</span>}
              </span>
              <small>{saving ? "กำลังบันทึก…" : hint}</small>
            </span>
            {holding && <span className="quick-log-hold-progress" style={{ width: `${holdProgress}%` }} />}
          </button>;
        })}
      </div>
      {!filteredTemplates.length && <p className="ui-caption">{term ? "ไม่พบบันทึกด่วนตรงกับคำค้นหา" : "ยังไม่มีรายการบันทึกด่วน"}</p>}
      {pageCount > 1 && <div className="record-pagination" aria-label="หน้าบันทึกด่วน">
        <GlassButton disabled={page === 0} onClick={() => setPageStart((page - 1) * pageSize)}><ChevronLeft size={16} aria-hidden="true" /> ก่อนหน้า</GlassButton>
        <span>{page + 1} / {pageCount}</span>
        <GlassButton disabled={page === pageCount - 1} onClick={() => setPageStart((page + 1) * pageSize)}>ถัดไป <ChevronRight size={16} aria-hidden="true" /></GlassButton>
      </div>}

      {dlRequest && <DlQuickLogDialog request={dlRequest} context={dlContext} onClose={() => setDlRequest(null)} onSaved={() => {
        setDlRequest(null);
        onLogSuccess?.(`บันทึก “${DL_WORKLOG_TASK}” เรียบร้อย`);
      }} />}

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
          isSmart={selectedTemplate.isSmart}
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

      <Dialog
        open={showForm}
        onClose={closeForm}
        title={selectedTemplate?.name || "บันทึกด่วน"}
        busy={loading}
        description={loading ? "กำลังบันทึกงาน…" : showComboCheckboxModal ? "เลือกเฉพาะงานที่ทำจริง" : undefined}
        footer={<>
          <GlassButton onClick={closeForm} disabled={loading}>ยกเลิก</GlassButton>
          <GlassButton type="submit" form={formId} variant="prominent" disabled={loading || (showComboCheckboxModal && !selectedComboItems.length)}>
            {isCombo ? `บันทึก ${showComboCheckboxModal ? selectedComboItems.length : comboItems.length} งาน` : "บันทึก"}
          </GlassButton>
        </>}
      >
        {showForm && <form id={formId} onSubmit={submitForm}>
          {(needsRecipient || isCombo) && <label className="ui-field">
            <span>ผู้รับบริการ{needsRecipient ? " *" : " (ถ้ามี)"}</span>
            <input className="apple-input" name="recipient" value={recipientValue} onChange={event => setRecipientValue(event.target.value)} required={needsRecipient} />
          </label>}
          {showCommentModal && <label className="ui-field">
            <span>รายละเอียด *</span>
            <textarea className="apple-input" name="comment" rows={3} value={commentText} onChange={event => setCommentText(event.target.value)} required />
          </label>}
          {showComboCheckboxModal && <fieldset className="quick-log-combo">
            <legend>รายการงาน</legend>
            {comboItems.map((item, index) => <label key={index}>
              <input type="checkbox" className="ui-checkbox" checked={selectedComboItems.includes(index)} onChange={event =>
                setSelectedComboItems(previous => event.target.checked ? [...previous, index].sort((a, b) => a - b) : previous.filter(value => value !== index))
              } />
              <span>{item.name || item.minorTask}</span>
            </label>)}
            <div className="flex flex-wrap gap-2">
              <GlassButton onClick={() => setSelectedComboItems(comboItems.map((_, index) => index))}>เลือกทั้งหมด</GlassButton>
              <GlassButton onClick={() => setSelectedComboItems([])} disabled={!selectedComboItems.length}>ล้างการเลือก</GlassButton>
            </div>
          </fieldset>}
          {showComboModal && <ul className="quick-log-combo" aria-label="รายการงาน">
            {comboItems.map((item, index) => <li key={index}>{item.name || item.minorTask}</li>)}
          </ul>}
          {dialogError && <p role="alert" className="record-error">{dialogError}</p>}
        </form>}
      </Dialog>

    </div>
  );
}
