"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, DoorOpen, DoorClosed, Clock } from 'lucide-react';
import { getFirestore, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

export default function SmartRoomModal({ 
  isOpen, 
  onClose, 
  onSelect, 
  templateName,
  templateMinorTask 
}) {
  const [selectedRoom, setSelectedRoom] = useState('');
  const [roomStatus, setRoomStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // ดึงข้อมูลสถานะห้องจาก Firestore worklogs
  useEffect(() => {
    const loadRoomStatus = async () => {
      if (!isOpen) return;
      setLoading(true);
      
      const initialStatus = {
        '303': 'closed', '304': 'closed', '305': 'closed', '306': 'closed',
        '401': 'closed', '402': 'closed', '406': 'closed', '407': 'closed'
      };

      try {
        const db = getFirestore();
        const today = new Date().toISOString().slice(0, 10);
        const worklogsQuery = query(
          collection(db, 'worklogs'),
          orderBy('createdAt', 'desc'),
          limit(200)
        );
        const querySnapshot = await getDocs(worklogsQuery);
        const roomStatus = { ...initialStatus };
        
        // collect วันนี้แล้ว reverse เป็น asc เพื่อให้ log ใหม่ override เก่า
        const todayDocs = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const date = data.date || data.createdAt?.toDate?.()?.toISOString?.()?.slice(0, 10) || '';
          if (date === today) todayDocs.push(data);
        });
        todayDocs.reverse();

        todayDocs.forEach((data) => {

          const comment = (data.comment || '').toLowerCase();
          const minorTask = (data.minorTask || '').toLowerCase();

          // ชั้น 3: เช็คอินห้องแลกเปลี่ยน / ปิดห้องแลกเปลี่ยน
          if (minorTask === 'เช็คอินห้องแลกเปลี่ยนความรู้' || minorTask === 'ปิดห้องแลกเปลี่ยนความรู้') {
            const isOpenAction = minorTask === 'เช็คอินห้องแลกเปลี่ยนความรู้';
            if (comment.includes('303')) roomStatus['303'] = isOpenAction ? 'open' : 'closed';
            if (comment.includes('304')) roomStatus['304'] = isOpenAction ? 'open' : 'closed';
            if (comment.includes('305')) roomStatus['305'] = isOpenAction ? 'open' : 'closed';
            if (comment.includes('306')) roomStatus['306'] = isOpenAction ? 'open' : 'closed';
          }
          // รองรับ comment แบบ เช็คอิน 303/windows (key แบบเก่า)
          if (minorTask === 'เช็คอินห้องแลกเปลี่ยนความรู้' || minorTask === 'ปิดห้องแลกเปลี่ยนความรู้') {
            const isOpenAction = minorTask === 'เช็คอินห้องแลกเปลี่ยนความรู้';
            if (comment.includes('303/windows')) roomStatus['303'] = isOpenAction ? 'open' : 'closed';
            if (comment.includes('304/ios')) roomStatus['304'] = isOpenAction ? 'open' : 'closed';
            if (comment.includes('305/android')) roomStatus['305'] = isOpenAction ? 'open' : 'closed';
            if (comment.includes('306/linux')) roomStatus['306'] = isOpenAction ? 'open' : 'closed';
          }
          // ชั้น 4: เปิดห้องเรียนชั้น 4 / ปิดห้องเรียนชั้น 4
          if (minorTask.includes('เปิดห้องเรียนชั้น 4') || minorTask.includes('ปิดห้องเรียนชั้น 4')) {
            const isOpenAction = minorTask.includes('เปิด');
            if (new RegExp('\\b401\\b').test(comment)) roomStatus['401'] = isOpenAction ? 'open' : 'closed';
            if (new RegExp('\\b402\\b').test(comment)) roomStatus['402'] = isOpenAction ? 'open' : 'closed';
            if (new RegExp('\\b406\\b').test(comment)) roomStatus['406'] = isOpenAction ? 'open' : 'closed';
            if (new RegExp('\\b407\\b').test(comment)) roomStatus['407'] = isOpenAction ? 'open' : 'closed';
          }
        });

        setRoomStatus(roomStatus);
      } catch (error) {
        console.error('SmartRoomModal: Error loading room status:', error);
        setRoomStatus(initialStatus);
      } finally {
        setLoading(false);
      }
    };

    loadRoomStatus();
  }, [isOpen]);

  // รับ CustomEvent เมื่อ QuickLogButtons บันทึกสำเร็จ
  useEffect(() => {
    if (!isOpen) return;
    const handler = (event) => {
      const { room, status } = event.detail;
      if (room) setRoomStatus(prev => ({ ...prev, [room]: status }));
    };
    window.addEventListener('roomStatusUpdated', handler);
    return () => window.removeEventListener('roomStatusUpdated', handler);
  }, [isOpen]);

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
    const openCount = roomList.filter(room => roomStatus[room] === 'closed').length;
    const closedCount = roomList.filter(room => roomStatus[room] === 'open').length;

    // ถ้ามีทั้งเปิดและปิดได้ แสดงทั้งหมด
    if (openCount > 0 && closedCount > 0) {
      return roomList;
    }
    // ถ้ามีแค่เปิดได้ แสดงแค่ที่ปิด
    if (openCount > 0) {
      return roomList.filter(room => roomStatus[room] === 'closed');
    }
    // ถ้ามีแค่ปิดได้ แสดงแค่ที่เปิด
    if (closedCount > 0) {
      return roomList.filter(room => roomStatus[room] === 'open');
    }
    
    return roomList;
  };

  const filteredRooms = getFilteredRooms();
  
  // หา action ที่เหมาะสมสำหรับห้องนี้
  const getActionForRoom = (room) => {
    const status = roomStatus[room];
    if (status === 'closed') return 'เปิดใช้งาน';
    if (status === 'open') return 'ปิดการใช้งาน';
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

  const handleConfirm = () => {
    if (!selectedRoom) {
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
    
    onSelect(comment, selectedRoom, minorTask, null);
    onClose();
    setSelectedRoom('');
  };

  const handleClose = () => {
    onClose();
    setSelectedRoom('');
  };

  // นับจำนวนแยกตามสถานะ
  const openCount = filteredRooms.filter(room => roomStatus[room] === 'closed').length;
  const closedCount = filteredRooms.filter(room => roomStatus[room] === 'open').length;

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-sm max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">{templateName}</h3>
            <p className="text-sm text-slate-400 mt-0.5">เปิดได้ {openCount} · เปิดอยู่ {closedCount}</p>
          </div>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Room List */}
        <div className="px-6 pt-2 pb-2 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status Legend */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                  <span className="text-slate-500">ปิด (กดเพื่อเปิด)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 bg-orange-400 rounded-full"></div>
                  <span className="text-slate-500">เปิดอยู่ (กดเพื่อปิด)</span>
                </div>
              </div>

              {/* Room Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {filteredRooms.map((room) => {
                  const status = roomStatus[room];
                  const action = getActionForRoom(room);
                  const canOpen = status === 'closed';
                  const roomInfo = getRoomInfo(room);
                  
                  return (
                    <button
                      key={room}
                      onClick={() => handleSelect(room)}
                      className={`p-4 rounded-2xl border-2 transition-all relative active:scale-95 ${
                        selectedRoom === room
                          ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                          : canOpen
                          ? 'border-green-200 bg-green-50 hover:border-green-300'
                          : 'border-orange-200 bg-orange-50 hover:border-orange-300'
                      }`}
                    >
                      <div className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                        canOpen ? 'bg-green-500' : 'bg-orange-400'
                      }`} />
                      <div className="text-center">
                        <div className={`text-xl font-bold ${
                          selectedRoom === room ? 'text-purple-700'
                          : canOpen ? 'text-green-700' : 'text-orange-700'
                        }`}>{room}</div>
                        {roomInfo && (
                          <div className="text-xs font-medium text-blue-500 mt-0.5">{roomInfo}</div>
                        )}
                        <div className={`text-[11px] mt-1 flex items-center justify-center gap-1 ${
                          selectedRoom === room ? 'text-purple-500'
                          : canOpen ? 'text-green-500' : 'text-orange-500'
                        }`}>
                          {canOpen ? <DoorClosed className="w-3 h-3" /> : <DoorOpen className="w-3 h-3" />}
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
        <div className="flex-shrink-0 border-t border-slate-100 bg-white px-6 py-4">
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={!selectedRoom}
              className="apple-button flex-1 disabled:opacity-40"
            >
              ยืนยัน{selectedRoom ? ` — ${getActionForRoom(selectedRoom)}ห้อง ${selectedRoom}` : ''}
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
