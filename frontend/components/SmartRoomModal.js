"use client";

import { useState, useEffect } from 'react';
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

  if (!isOpen) return null;

  // กรองห้องตามชั้นที่เลือก
  const getFilteredRooms = () => {
    console.log('🏢 SmartRoomModal templateName:', templateName);
    console.log('🏢 SmartRoomModal templateMinorTask:', templateMinorTask);
    
    // ตรวจสอบว่าเป็นชั้น 3 หรือชั้น 4
    const isFloor3 = templateName.includes('ชั้น 3') || templateMinorTask.includes('ชั้น 3');
    const isFloor4 = templateName.includes('ชั้น 4') || templateMinorTask.includes('ชั้น 4');
    
    console.log('🏢 isFloor3:', isFloor3, 'isFloor4:', isFloor4);
    
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
  console.log('🏢 filteredRooms:', filteredRooms);
  
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <DoorOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{templateName}</h3>
              <p className="text-sm text-slate-500">
                ปิด {closedCount} | เปิดได้ {openCount}
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

        {/* Room List */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status Legend */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-slate-600">ปิด (เปิดได้)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-slate-600">เปิด (ปิดได้)</span>
                </div>
              </div>

              {/* Room Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto">
                {filteredRooms.map((room) => {
                  const status = roomStatus[room];
                  const action = getActionForRoom(room);
                  const canOpen = status === 'closed';
                  const roomInfo = getRoomInfo(room);
                  
                  return (
                    <button
                      key={room}
                      onClick={() => handleSelect(room)}
                      className={`p-4 rounded-xl border-2 transition-all relative ${
                        selectedRoom === room
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : canOpen
                          ? 'border-green-200 bg-green-50 text-green-700 hover:border-green-300 hover:bg-green-100'
                          : 'border-orange-200 bg-orange-50 text-orange-700 hover:border-orange-300 hover:bg-orange-100'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-lg font-bold">{room}</div>
                        {roomInfo && (
                          <div className="text-xs font-medium text-blue-600 mt-1">{roomInfo}</div>
                        )}
                        <div className="text-xs mt-1 opacity-75">{action}</div>
                        
                        {/* Icon */}
                        <div className="mt-2 flex justify-center">
                          {canOpen ? (
                            <DoorClosed className="w-4 h-4" />
                          ) : (
                            <DoorOpen className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                      
                      {/* Status indicator */}
                      <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                        canOpen ? 'bg-green-500' : 'bg-orange-500'
                      }`}></div>
                    </button>
                  );
                })}
              </div>

              {/* Room Info */}
              {selectedRoom && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-purple-800">
                      ห้อง {selectedRoom} - {getActionForRoom(selectedRoom)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-purple-600">
                      {getRoomInfo(selectedRoom) && (
                        <span className="font-medium text-blue-600">{getRoomInfo(selectedRoom)}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
          <div className="text-sm text-slate-500">
            {selectedRoom ? (
              <span>
                เลือก: <span className="font-medium text-slate-700">ห้อง {selectedRoom}</span>
                <span className="ml-2 text-xs">
                  ({getActionForRoom(selectedRoom)})
                </span>
              </span>
            ) : (
              <span>กรุณาเลือกห้องเรียน</span>
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
              disabled={!selectedRoom}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                selectedRoom
                  ? 'bg-purple-500 text-white hover:bg-purple-600'
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
