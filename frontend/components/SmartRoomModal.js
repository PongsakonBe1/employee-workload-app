"use client";

import { useState, useRef } from 'react';
import { Dialog } from './ui/Dialog';
import { GlassButton } from './ui/GlassControls';
import { ReviewSymbol } from './ui/ReviewSymbol';
import '../app/dev/record/record.css';
import { useSharedResourceStatus } from "../hooks/useSharedResourceStatus";

export default function SmartRoomModal({ 
  isOpen, 
  onClose, 
  onSelect, 
  templateName,
  templateMinorTask 
}) {
  const [selectedRoom, setSelectedRoom] = useState('');
  const { status, loading, error: statusError, retry } = useSharedResourceStatus({ enabled: isOpen });
  const roomStatus = status?.roomStatus ?? {};
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);

  // กรองห้องตามชั้นที่เลือก
  const getFilteredRooms = () => {
    const isFloor3 = templateName.includes('ชั้น 3') || templateMinorTask.includes('ชั้น 3');
    const isFloor4 = templateName.includes('ชั้น 4') || templateMinorTask.includes('ชั้น 4');
    
    let roomList = [];
    if (isFloor3) {
      roomList = ['303', '304', '305', '306']; // ชั้น 3
    } else if (isFloor4) {
      roomList = ['401', '402', '406', '407']; // ชั้น 4
    } else {
      // ถ้าไม่ระบุชั้น ให้แสดงทั้งหมด
      roomList = ['303', '304', '305', '306', '401', '402', '406', '407'];
    }

    // หา action ที่เหมาะสม (เปิด/ปิด)
    const openCount = roomList.filter(room => roomStatus[room] === 'available').length;
    const closedCount = roomList.filter(room => roomStatus[room] === 'in_use').length;

    // ถ้ามีทั้งเปิดและปิดได้ แสดงทั้งหมด
    if (openCount > 0 && closedCount > 0) {
      return roomList;
    }
    // ถ้ามีแค่เปิดได้ แสดงแค่ที่ปิด
    if (openCount > 0) {
      return roomList.filter(room => roomStatus[room] === 'available');
    }
    // ถ้ามีแค่ปิดได้ แสดงแค่ที่เปิด
    if (closedCount > 0) {
      return roomList.filter(room => roomStatus[room] === 'in_use');
    }
    
    return roomList;
  };

  const filteredRooms = getFilteredRooms();
  
  // หา action ที่เหมาะสมสำหรับห้องนี้
  const getActionForRoom = (room) => {
    const status = roomStatus[room];
    if (status === 'available') return 'เปิดใช้งาน';
    if (status === 'in_use') return 'ปิดการใช้งาน';
    return 'เปิดใช้งาน'; // default
  };

  // หาข้อมูล OS ของห้อง
  const getRoomInfo = (room) => {
    const roomInfo = {
      '303': 'Windows',
      '304': 'iOS',
      '305': 'Android',
      '306': 'Linux',
      '401': '',
      '402': '',
      '406': '',
      '407': ''
    };
    return roomInfo[room] || '';
  };

  const handleSelect = (room) => {
    setSelectedRoom(room);
  };

  const handleConfirm = async () => {
    if (!selectedRoom || !roomStatus[selectedRoom] || submitting.current) {
      return;
    }
    
    const action = getActionForRoom(selectedRoom);
    const isOpenAction = action === 'เปิดใช้งาน';
    const isFloor3 = ['303','304','305','306'].includes(selectedRoom);
    const roomInfoMap = { '303': 'Windows', '304': 'iOS', '305': 'Android', '306': 'Linux' };
    let comment, minorTask;
    if (isFloor3) {
      minorTask = isOpenAction ? 'เช็คอินห้องแลกเปลี่ยนความรู้' : 'ปิดห้องแลกเปลี่ยนความรู้';
      comment = `${selectedRoom}/${roomInfoMap[selectedRoom] || ''}`;
    } else {
      minorTask = isOpenAction ? 'เปิดห้องเรียนชั้น 4' : 'ปิดห้องเรียนชั้น 4';
      comment = selectedRoom;
    }
    
    submitting.current = true;
    setSaving(true);
    setError("");
    try {
      await onSelect(comment, selectedRoom, minorTask, null);
      onClose();
      setSelectedRoom('');
    } catch {
      setError("บันทึกสถานะห้องไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (submitting.current) return;
    onClose();
    setError("");
    setSelectedRoom('');
  };

  return <Dialog
    open={isOpen}
    onClose={handleClose}
    title={templateName}
    className="record-dialog record-room-dialog"
    busy={saving}
    description={saving ? "กำลังบันทึกงาน…" : undefined}
    footer={<>
      <GlassButton onClick={handleClose} disabled={saving}>ยกเลิก</GlassButton>
      <GlassButton variant="prominent" onClick={handleConfirm} disabled={!selectedRoom || !roomStatus[selectedRoom] || saving}>
        {selectedRoom ? `ยืนยัน ${getActionForRoom(selectedRoom)}ห้อง ${selectedRoom}` : "ยืนยัน"}
      </GlassButton>
    </>}
  >
    {statusError ? <p role="alert" className="ui-caption">โหลดสถานะล่าสุดไม่สำเร็จ <button type="button" className="underline" onClick={retry}>ลองอีกครั้ง</button></p>
      : loading ? <p role="status" className="ui-caption">กำลังโหลดสถานะห้อง…</p>
      : <div className="record-room-grid">
        {filteredRooms.map(room => {
          const open = roomStatus[room] === "in_use";
          const state = roomStatus[room] ? open ? "เปิดอยู่" : "ปิดอยู่" : "ยังไม่ทราบสถานะ";
          return <button
            type="button" className="record-resource-tile" key={room}
            data-state={open ? "open" : "closed"} aria-pressed={selectedRoom === room}
            onClick={() => handleSelect(room)} disabled={saving || !roomStatus[room]}
          >
            <span className="record-tile ui-nav-symbol" data-tone={open ? "green" : "purple"}><ReviewSymbol name="door" size={25} /></span>
            <strong>ห้อง {room}</strong>
            <span className="record-badge" data-tone={open ? "green" : "neutral"}>{state}</span>
            {getRoomInfo(room) && <small>{getRoomInfo(room)}</small>}
            {roomStatus[room] && <span className="record-resource-action">{getActionForRoom(room)}</span>}
          </button>;
        })}
      </div>}
    {error && <p role="alert" className="record-error">{error}</p>}
  </Dialog>;
}
