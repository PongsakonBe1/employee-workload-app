"use client";

import { useState, useEffect } from 'react';
import { Monitor, Headphones, Plug, Wifi, Activity } from 'lucide-react';
import { getFirestore, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

export default function RoomEquipmentStatus() {
  const [roomStatus, setRoomStatus] = useState({});
  const [equipmentStatus, setEquipmentStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [equipmentDetails, setEquipmentDetails] = useState({});

  // ข้อมูลเริ่มต้นทั้งหมดว่าง - เริ่มต้นที่ 'available' (ไม่ได้ใช้งาน)
  const initialRoomStatus = {
    "303": "available",
    "304": "available",
    "305": "available",
    "306": "available",
    "401": "available",
    "402": "available",
    "406": "available",
    "407": "available"
  };

  const roomOsMap = {
    "303": "Windows", "304": "iOS", "305": "Android", "306": "Linux"
  };

  const initialEquipmentStatus = {
    headphones: {
      "ICIT01": "available", "ICIT02": "available", "ICIT03": "available", "ICIT04": "available",
      "ICIT05": "available", "ICIT06": "available", "ICIT07": "available", "ICIT08": "available",
      "ICIT09": "available", "ICIT10": "available", "ICIT11": "available", "ICIT12": "available"
    },
    power: {
      "ICIT21": "available", "ICIT22": "available", "ICIT23": "available"
    }
  };

  // ฟังก์ชันตรวจสอบสถานะจาก worklogs วันนี้
  const calculateStatusFromWorklogs = (worklogs) => {
    const today = new Date().toISOString().slice(0, 10);
    const todayLogs = worklogs.filter(log => log.date === today);
    
    const roomStatus = { ...initialRoomStatus };
    const equipmentStatus = JSON.parse(JSON.stringify(initialEquipmentStatus));
    const details = {};

    todayLogs.forEach(log => {
      const commentLower = (log.comment || '').toLowerCase();
      const comment = commentLower;
      const minorTask = (log.minorTask || '').toLowerCase();
      const userName = log.recipient || log.employeeDisplayName || log.userName || '-';
      const userTime = log.time || '';

      // ชั้น 3: เช็คอินห้องแลกเปลี่ยนความรู้ / ปิดห้องแลกเปลี่ยนความรู้
      if (minorTask === 'เช็คอินห้องแลกเปลี่ยนความรู้' || minorTask === 'ปิดห้องแลกเปลี่ยนความรู้') {
        const isOpenAction = minorTask === 'เช็คอินห้องแลกเปลี่ยนความรู้';
        if (comment.includes('303')) roomStatus['303'] = isOpenAction ? 'in_use' : 'available';
        if (comment.includes('304')) roomStatus['304'] = isOpenAction ? 'in_use' : 'available';
        if (comment.includes('305')) roomStatus['305'] = isOpenAction ? 'in_use' : 'available';
        if (comment.includes('306')) roomStatus['306'] = isOpenAction ? 'in_use' : 'available';
      }
      // ชั้น 4: เปิดห้องเรียนชั้น 4 / ปิดห้องเรียนชั้น 4
      if (minorTask.includes('เปิดห้องเรียนชั้น 4') || minorTask.includes('ปิดห้องเรียนชั้น 4')) {
        const isOpenAction = minorTask.includes('เปิด');
        if (/\b401\b/.test(comment)) roomStatus['401'] = isOpenAction ? 'in_use' : 'available';
        if (/\b402\b/.test(comment)) roomStatus['402'] = isOpenAction ? 'in_use' : 'available';
        if (/\b406\b/.test(comment)) roomStatus['406'] = isOpenAction ? 'in_use' : 'available';
        if (/\b407\b/.test(comment)) roomStatus['407'] = isOpenAction ? 'in_use' : 'available';
      }

      // ตรวจสอบหูฟัง
      if (minorTask.includes('ยืมหูฟัง')) {
        for (let i = 1; i <= 12; i++) {
          const equipment = `ICIT${String(i).padStart(2, '0')}`;
          if (comment.includes(equipment.toLowerCase())) {
            equipmentStatus.headphones[equipment] = 'in_use';
            details[equipment] = { user: userName, time: userTime, action: 'ยืม' };
          }
        }
      }
      if (minorTask.includes('คืนหูฟัง')) {
        for (let i = 1; i <= 12; i++) {
          const equipment = `ICIT${String(i).padStart(2, '0')}`;
          if (comment.includes(equipment.toLowerCase())) {
            equipmentStatus.headphones[equipment] = 'available';
            delete details[equipment];
          }
        }
      }

      // ตรวจสอบปลั๊กไฟ
      if (minorTask.includes('ยืมปลั๊กไฟ')) {
        for (let i = 21; i <= 23; i++) {
          const equipment = `ICIT${i}`;
          if (comment.includes(equipment.toLowerCase())) {
            equipmentStatus.power[equipment] = 'in_use';
            details[equipment] = { user: userName, time: userTime, action: 'ยืม' };
          }
        }
      }
      if (minorTask.includes('คืนปลั๊กไฟ')) {
        for (let i = 21; i <= 23; i++) {
          const equipment = `ICIT${i}`;
          if (comment.includes(equipment.toLowerCase())) {
            equipmentStatus.power[equipment] = 'available';
            delete details[equipment];
          }
        }
      }
    });

    return { roomStatus, equipmentStatus, details };
  };

  useEffect(() => {
    const loadStatus = async () => {
      try {
        setLoading(true);
        const db = getFirestore();
        
        // ดึงข้อมูล worklogs จาก Firestore (desc แล้ว reverse เป็น asc ใน JS)
        const worklogsQuery = query(
          collection(db, 'worklogs'),
          orderBy('createdAt', 'desc'),
          limit(200)
        );
        
        const querySnapshot = await getDocs(worklogsQuery);
        const worklogs = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          worklogs.push({
            id: doc.id,
            ...data,
            date: data.date || data.createdAt?.toDate?.()?.toISOString?.()?.slice(0, 10) || ''
          });
        });
        
        // reverse เป็น asc เพื่อให้ log ใหม่ override เก่า
        worklogs.reverse();
        
        const { roomStatus: calculatedRoomStatus, equipmentStatus: calculatedEquipmentStatus, details } = 
          calculateStatusFromWorklogs(worklogs);
        
        setRoomStatus(calculatedRoomStatus);
        setEquipmentStatus(calculatedEquipmentStatus);
        setEquipmentDetails(details);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Error loading status:', error);
        setRoomStatus(initialRoomStatus);
        setEquipmentStatus(initialEquipmentStatus);
      } finally {
        setLoading(false);
      }
    };

    // Event listeners สำหรับรับการอัปเดตจาก QuickLogButtons
    const handleEquipmentStatusUpdate = (event) => {
      console.log('🎧 RoomEquipmentStatus: Received equipment status update', event.detail);
      const { equipmentType, equipment, status } = event.detail;
      
      setEquipmentStatus(prev => ({
        ...prev,
        [equipmentType]: {
          ...prev[equipmentType],
          [equipment]: status
        }
      }));
      
      setLastUpdated(new Date());
    };

    const handleRoomStatusUpdate = (event) => {
      console.log('🏠 RoomEquipmentStatus: Received room status update', event.detail);
      const { room, status } = event.detail;
      
      setRoomStatus(prev => ({
        ...prev,
        [room]: status
      }));
      
      setLastUpdated(new Date());
    };

    // เพิ่ม event listeners
    window.addEventListener('equipmentStatusUpdated', handleEquipmentStatusUpdate);
    window.addEventListener('roomStatusUpdated', handleRoomStatusUpdate);

    // Load initial status
    loadStatus();
    
    // อัปเดตทุก 5 นาที
    const interval = setInterval(loadStatus, 5 * 60 * 1000);
    
    // Cleanup
    return () => {
      clearInterval(interval);
      window.removeEventListener('equipmentStatusUpdated', handleEquipmentStatusUpdate);
      window.removeEventListener('roomStatusUpdated', handleRoomStatusUpdate);
    };
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-50 text-green-700 border-green-200';
      case 'in_use': return 'bg-red-50 text-red-700 border-red-200';
      case 'maintenance': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available': return '🟢';
      case 'in_use': return '🔴';
      case 'maintenance': return '🟡';
      default: return '⚪';
    }
  };

  if (loading) {
    return (
      <div className="mb-4 bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
          <Activity className="w-4 h-4 animate-pulse" />
          <span>กำลังโหลดสถานะ...</span>
        </div>
      </div>
    );
  }

  const roomStats = Object.values(roomStatus).reduce((acc, status) => {
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const headphoneStats = Object.values(equipmentStatus.headphones || {}).reduce((acc, status) => {
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const powerStats = Object.values(equipmentStatus.power || {}).reduce((acc, status) => {
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mb-4 bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg shadow-black/5 relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
            <Wifi className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">สถานะห้องและอุปกรณ์</h3>
            {lastUpdated && (
              <p className="text-xs text-slate-500">
                อัปเดต {lastUpdated.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs font-medium text-green-700">ว่าง {roomStats.available || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-full">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-xs font-medium text-red-700">ใช้ {roomStats.in_use || 0}</span>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg bg-white/50 hover:bg-white/70 transition-colors"
          >
            <svg 
              className={`w-4 h-4 text-slate-600 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Compact View */}
      {!expanded && (
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Summary Cards */}
            <div className="bg-slate-50/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <Monitor className="w-3 h-3 text-slate-600" />
                </div>
                <span className="text-xs font-semibold text-slate-800">ห้องแลกเปลี่ยน</span>
              </div>
              <div className="flex gap-1">
                {['303','304','305','306'].map(room => (
                  <div
                    key={room}
                    className={`w-2 h-2 rounded-full ${
                      (roomStatus[room] || 'available') === 'available' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    title={`${room}/${roomOsMap[room] || ''}`}
                  ></div>
                ))}
              </div>
            </div>

            <div className="bg-slate-50/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <Monitor className="w-3 h-3 text-slate-600" />
                </div>
                <span className="text-xs font-semibold text-slate-800">ห้องเรียนชั้น 4</span>
              </div>
              <div className="flex gap-1">
                {Object.entries(roomStatus).filter(([room]) => 
                  room.includes('401') || room.includes('402') || room.includes('406') || room.includes('407')
                ).map(([room, status]) => (
                  <div
                    key={room}
                    className={`w-2 h-2 rounded-full ${
                      status === 'available' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    title={room}
                  ></div>
                ))}
              </div>
            </div>

            <div className="bg-slate-50/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <div className="flex gap-0.5">
                    <Headphones className="w-2.5 h-2.5 text-slate-600" />
                    <Plug className="w-2.5 h-2.5 text-slate-600" />
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-800">อุปกรณ์</span>
              </div>
              <div className="text-xs text-slate-600">
                หูฟัง: {headphoneStats.available || 0}/{12} | ปลั๊ก: {powerStats.available || 0}/{3}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expanded View */}
      {expanded && (
        <div className="p-4">

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ห้องแลกเปลี่ยนความรู้ */}
        <div className="bg-slate-50/50 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <Monitor className="w-3 h-3 text-slate-600" />
            </div>
            <span className="text-xs font-semibold text-slate-800">ห้องแลกเปลี่ยน</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(roomStatus).filter(([room]) => 
              room.includes('303') || room.includes('304') || room.includes('305') || room.includes('306')
            ).map(([room, status]) => (
              <div
                key={room}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  status === 'available' 
                    ? 'bg-white text-slate-700 shadow-sm hover:shadow-md' 
                    : 'bg-red-500 text-white shadow-sm'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${
                  status === 'available' ? 'bg-green-500' : 'bg-white'
                }`}></div>
                <span className="truncate">{room.replace('/Windows', '').replace('/iOS', '').replace('/Android', '').replace('/Linux', '')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ห้องเรียนชั้น 4 */}
        <div className="bg-slate-50/50 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <Monitor className="w-3 h-3 text-slate-600" />
            </div>
            <span className="text-xs font-semibold text-slate-800">ห้องเรียนชั้น 4</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(roomStatus).filter(([room]) => 
              room.includes('401') || room.includes('402') || room.includes('406') || room.includes('407')
            ).map(([room, status]) => (
              <div
                key={room}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  status === 'available' 
                    ? 'bg-white text-slate-700 shadow-sm hover:shadow-md' 
                    : 'bg-red-500 text-white shadow-sm'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${
                  status === 'available' ? 'bg-green-500' : 'bg-white'
                }`}></div>
                <span>{room}</span>
              </div>
            ))}
          </div>
        </div>

        {/* อุปกรณ์ */}
        <div className="bg-slate-50/50 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <div className="flex gap-0.5">
                <Headphones className="w-2.5 h-2.5 text-slate-600" />
                <Plug className="w-2.5 h-2.5 text-slate-600" />
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-800">อุปกรณ์</span>
          </div>
          
          {/* หูฟัง */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-600">หูฟัง</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-600 font-medium">{headphoneStats.available || 0}</span>
                <span className="text-xs text-slate-400">/</span>
                <span className="text-xs text-red-600 font-medium">{headphoneStats.in_use || 0}</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1 mb-2">
              {Object.entries(equipmentStatus.headphones || {}).map(([equipment, status]) => (
                <div
                  key={equipment}
                  className={`text-xs p-1 rounded text-center ${
                    status === 'available' 
                      ? 'bg-green-50 text-green-700' 
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {equipment.replace('ICIT', '')}
                </div>
              ))}
            </div>
            {/* แสดงผู้ยืมหูฟัง */}
            <div className="space-y-1">
              {Object.entries(equipmentDetails).filter(([key]) => key.includes('ICIT') && parseInt(key.replace('ICIT', '')) <= 12).map(([equipment, detail]) => (
                <div key={equipment} className="text-xs bg-red-50 text-red-700 p-1 rounded">
                  {equipment}: {detail.user} ({detail.time})
                </div>
              ))}
            </div>
          </div>

          {/* ปลั๊กไฟ */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-600">ปลั๊กไฟ</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-600 font-medium">{powerStats.available || 0}</span>
                <span className="text-xs text-slate-400">/</span>
                <span className="text-xs text-red-600 font-medium">{powerStats.in_use || 0}</span>
              </div>
            </div>
            <div className="flex gap-1 mb-2">
              {Object.entries(equipmentStatus.power || {}).map(([equipment, status]) => (
                <div
                  key={equipment}
                  className={`text-xs p-1 rounded flex-1 text-center ${
                    status === 'available' 
                      ? 'bg-green-50 text-green-700' 
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {equipment.replace('ICIT', '')}
                </div>
              ))}
            </div>
            {/* แสดงผู้ยืมปลั๊กไฟ */}
            <div className="space-y-1">
              {Object.entries(equipmentDetails).filter(([key]) => key.includes('ICIT') && parseInt(key.replace('ICIT', '')) >= 21).map(([equipment, detail]) => (
                <div key={equipment} className="text-xs bg-red-50 text-red-700 p-1 rounded">
                  {equipment}: {detail.user} ({detail.time})
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
        </div>
      )}
    </div>
  );
}
