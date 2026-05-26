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
    headphones: Object.fromEntries(
      Array.from({length:20}, (_,i) => [`ICIT${String(i+1).padStart(2,'0')}`, 'available'])
    ),
    power: {
      "ICIT21": "available", "ICIT22": "available", "ICIT23": "available",
      "ICIT24": "available", "ICIT25": "available"
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

      // ตรวจสอบหูฟัง ICIT01-20
      if (minorTask.includes('ยืมหูฟัง')) {
        for (let i = 1; i <= 20; i++) {
          const equipment = `ICIT${String(i).padStart(2, '0')}`;
          if (comment.includes(equipment.toLowerCase())) {
            equipmentStatus.headphones[equipment] = 'in_use';
            details[equipment] = { user: userName, time: userTime, action: 'ยืม' };
          }
        }
      }
      if (minorTask.includes('คืนหูฟัง')) {
        for (let i = 1; i <= 20; i++) {
          const equipment = `ICIT${String(i).padStart(2, '0')}`;
          if (comment.includes(equipment.toLowerCase())) {
            equipmentStatus.headphones[equipment] = 'available';
            delete details[equipment];
          }
        }
      }

      // ตรวจสอบปลั๊กไฟ ICIT21-25
      if (minorTask.includes('ยืมปลั๊กไฟ')) {
        for (let i = 21; i <= 25; i++) {
          const equipment = `ICIT${i}`;
          if (comment.includes(equipment.toLowerCase())) {
            equipmentStatus.power[equipment] = 'in_use';
            details[equipment] = { user: userName, time: userTime, action: 'ยืม' };
          }
        }
      }
      if (minorTask.includes('คืนปลั๊กไฟ')) {
        for (let i = 21; i <= 25; i++) {
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

  const headphoneStats = Object.values(equipmentStatus.headphones || {}).reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {});
  const powerStats = Object.values(equipmentStatus.power || {}).reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {});

  const allRooms3 = ['303','304','305','306'];
  const allRooms4 = ['401','402','406','407'];
  const allRooms = [...allRooms3, ...allRooms4];
  const allHeadphones3    = Array.from({length:12}, (_,i) => `ICIT${String(i+1).padStart(2,'0')}`);   // ICIT01-12
  const allHeadphonesFinn = Array.from({length:8},  (_,i) => `ICIT${String(i+13).padStart(2,'0')}`);  // ICIT13-20
  const allHeadphones     = [...allHeadphones3, ...allHeadphonesFinn];
  const allPower3    = ['ICIT21','ICIT22','ICIT23'];
  const allPowerFinn = ['ICIT24','ICIT25'];
  const allPower     = [...allPower3, ...allPowerFinn];

  const roomsInUse = allRooms.filter(r => roomStatus[r] === 'in_use');
  const hpInUse = allHeadphones.filter(h => (equipmentStatus.headphones||{})[h] === 'in_use');
  const pwInUse = allPower.filter(p => (equipmentStatus.power||{})[p] === 'in_use');
  const anyInUse = roomsInUse.length > 0 || hpInUse.length > 0 || pwInUse.length > 0;

  // --- Compact bar: กลุ่มละ dots + label ---
  const groups = [
    {
      key: 'room3',
      label: 'ชั้น 3',
      items: allRooms3,
      getStatus: r => roomStatus[r] === 'in_use',
      inUseCount: allRooms3.filter(r => roomStatus[r] === 'in_use').length,
    },
    {
      key: 'room4',
      label: 'ชั้น 4',
      items: allRooms4,
      getStatus: r => roomStatus[r] === 'in_use',
      inUseCount: allRooms4.filter(r => roomStatus[r] === 'in_use').length,
    },
    {
      key: 'hp3',
      label: 'หูฟัง',
      items: allHeadphones3,
      getStatus: h => (equipmentStatus.headphones||{})[h] === 'in_use',
      inUseCount: allHeadphones3.filter(h => (equipmentStatus.headphones||{})[h] === 'in_use').length,
    },
    {
      key: 'pw3',
      label: 'ปลั๊ก',
      items: allPower3,
      getStatus: p => (equipmentStatus.power||{})[p] === 'in_use',
      inUseCount: allPower3.filter(p => (equipmentStatus.power||{})[p] === 'in_use').length,
    },
    {
      key: 'hpFinn',
      label: 'Finn🎧',
      items: allHeadphonesFinn,
      getStatus: h => (equipmentStatus.headphones||{})[h] === 'in_use',
      inUseCount: allHeadphonesFinn.filter(h => (equipmentStatus.headphones||{})[h] === 'in_use').length,
    },
    {
      key: 'pwFinn',
      label: 'Finn🔌',
      items: allPowerFinn,
      getStatus: p => (equipmentStatus.power||{})[p] === 'in_use',
      inUseCount: allPowerFinn.filter(p => (equipmentStatus.power||{})[p] === 'in_use').length,
    },
  ];

  return (
    <div className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden shadow-sm">

      {/* ── Compact bar ── */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-0 px-4 py-3 hover:bg-slate-50/80 transition-colors text-left"
      >
        {loading ? (
          <div className="flex items-center gap-2 flex-1">
            <Activity className="w-3.5 h-3.5 text-slate-300 animate-pulse" />
            <span className="text-xs text-slate-400">กำลังโหลด...</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden flex-wrap">
            {/* ห้อง ชั้น 3 */}
            <div className="flex items-center gap-1 shrink-0">
              <div className="flex gap-[3px]">{allRooms3.map(r=><div key={r} className={`w-1.5 h-1.5 rounded-full ${roomStatus[r]==='in_use'?'bg-red-400':'bg-emerald-400'}`}/>)}</div>
              <span className={`text-[10px] font-medium ${allRooms3.some(r=>roomStatus[r]==='in_use')?'text-red-500':'text-slate-400'}`}>ชั้น 3</span>
            </div>
            <span className="text-slate-200 text-[10px] shrink-0">|</span>
            {/* ห้อง ชั้น 4 */}
            <div className="flex items-center gap-1 shrink-0">
              <div className="flex gap-[3px]">{allRooms4.map(r=><div key={r} className={`w-1.5 h-1.5 rounded-full ${roomStatus[r]==='in_use'?'bg-red-400':'bg-emerald-400'}`}/>)}</div>
              <span className={`text-[10px] font-medium ${allRooms4.some(r=>roomStatus[r]==='in_use')?'text-red-500':'text-slate-400'}`}>ชั้น 4</span>
            </div>
            <span className="text-slate-300 text-[10px] shrink-0 mx-0.5">┊</span>
            {/* ชั้น 3: หูฟัง */}
            <div className="flex items-center gap-1 shrink-0">
              <div className="flex gap-[2px]">{allHeadphones3.map(h=><div key={h} className={`w-1 h-1 rounded-full ${(equipmentStatus.headphones||{})[h]==='in_use'?'bg-red-400':'bg-emerald-400'}`}/>)}</div>
              <span className={`text-[10px] font-medium ${allHeadphones3.some(h=>(equipmentStatus.headphones||{})[h]==='in_use')?'text-red-500':'text-slate-400'}`}>หูฟัง</span>
            </div>
            <span className="text-slate-200 text-[10px] shrink-0">|</span>
            {/* ชั้น 3: ปลั๊ก */}
            <div className="flex items-center gap-1 shrink-0">
              <div className="flex gap-[3px]">{allPower3.map(p=><div key={p} className={`w-1.5 h-1.5 rounded-full ${(equipmentStatus.power||{})[p]==='in_use'?'bg-red-400':'bg-emerald-400'}`}/>)}</div>
              <span className={`text-[10px] font-medium ${allPower3.some(p=>(equipmentStatus.power||{})[p]==='in_use')?'text-red-500':'text-slate-400'}`}>ปลั๊ก</span>
            </div>
            <span className="text-slate-300 text-[10px] shrink-0 mx-0.5">┊</span>
            {/* Finn: หูฟัง */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[9px] text-slate-300 font-medium">Finn</span>
              <div className="flex gap-[2px]">{allHeadphonesFinn.map(h=><div key={h} className={`w-1 h-1 rounded-full ${(equipmentStatus.headphones||{})[h]==='in_use'?'bg-red-400':'bg-emerald-400'}`}/>)}</div>
              <span className={`text-[10px] font-medium ${allHeadphonesFinn.some(h=>(equipmentStatus.headphones||{})[h]==='in_use')?'text-red-500':'text-slate-400'}`}>หูฟัง</span>
            </div>
            <span className="text-slate-200 text-[10px] shrink-0">|</span>
            {/* Finn: ปลั๊ก */}
            <div className="flex items-center gap-1 shrink-0">
              <div className="flex gap-[3px]">{allPowerFinn.map(p=><div key={p} className={`w-1.5 h-1.5 rounded-full ${(equipmentStatus.power||{})[p]==='in_use'?'bg-red-400':'bg-emerald-400'}`}/>)}</div>
              <span className={`text-[10px] font-medium ${allPowerFinn.some(p=>(equipmentStatus.power||{})[p]==='in_use')?'text-red-500':'text-slate-400'}`}>ปลั๊ก</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0 ml-2">
          {!loading && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              anyInUse
                ? 'bg-red-50 text-red-500'
                : 'bg-emerald-50 text-emerald-600'
            }`}>
              {anyInUse ? 'มีการใช้งาน' : 'ว่างทั้งหมด'}
            </span>
          )}
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
            className={`text-slate-300 transition-transform ${expanded ? 'rotate-180' : ''}`}>
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>

      {/* ── Expanded detail: grid card style ── */}
      {expanded && !loading && (
        <div className="border-t border-slate-100 px-3 py-3 space-y-3">

          {/* ── ห้อง ── */}
          <div>
            <p className="text-[9px] font-semibold text-slate-300 uppercase tracking-widest px-1 mb-1.5">ห้อง</p>
            <div className="grid grid-cols-4 gap-1.5">
              {[...allRooms3, ...allRooms4].map(r => {
                const inUse = roomStatus[r] === 'in_use';
                return (
                  <div key={r} className={`rounded-xl px-2 py-2 flex flex-col items-center gap-0.5 ${
                    inUse ? 'bg-red-50 border border-red-100' : 'bg-emerald-50 border border-emerald-100'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${inUse ? 'bg-red-400' : 'bg-emerald-400'}`} />
                    <span className={`text-[11px] font-bold ${inUse ? 'text-red-700' : 'text-emerald-700'}`}>{r}</span>
                    <span className={`text-[9px] ${inUse ? 'text-red-400' : 'text-emerald-400'}`}>{inUse ? 'เปิด' : 'ว่าง'}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── ชั้น 3: อุปกรณ์ ── */}
          <div className="border-t border-slate-100 pt-2">
            <p className="text-[9px] font-semibold text-slate-300 uppercase tracking-widest px-1 mb-1.5">ชั้น 3</p>
            <div className="grid grid-cols-5 gap-1">
              {[...allHeadphones3, ...allPower3].map(id => {
                const isHP = id.startsWith('ICIT0') || parseInt(id.replace('ICIT',''),10) <= 12;
                const inUse = isHP
                  ? (equipmentStatus.headphones||{})[id] === 'in_use'
                  : (equipmentStatus.power||{})[id] === 'in_use';
                const det = equipmentDetails[id];
                const num = parseInt(id.replace('ICIT',''),10);
                return (
                  <div key={id} title={inUse && det ? `${det.user} ${det.time}` : 'ว่าง'}
                    className={`rounded-lg py-1.5 flex flex-col items-center gap-0.5 ${
                      inUse ? 'bg-red-50 border border-red-100' : 'bg-slate-50 border border-slate-100'
                    }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${inUse ? 'bg-red-400' : 'bg-emerald-400'}`} />
                    <span className={`text-[10px] font-bold leading-none ${inUse ? 'text-red-700' : 'text-slate-500'}`}>{num}</span>
                    {inUse && det
                      ? <span className="text-[8px] text-red-400 truncate w-full text-center px-0.5">{det.user.split(' ')[0]}</span>
                      : <span className="text-[8px] text-slate-300">{isHP ? 'หูฟัง' : 'ปลั๊ก'}</span>
                    }
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Finn Space: อุปกรณ์ ── */}
          <div className="border-t border-slate-100 pt-2">
            <p className="text-[9px] font-semibold text-slate-300 uppercase tracking-widest px-1 mb-1.5">Finn Space</p>
            <div className="grid grid-cols-5 gap-1">
              {[...allHeadphonesFinn, ...allPowerFinn].map(id => {
                const num = parseInt(id.replace('ICIT',''),10);
                const isHP = num <= 20;
                const inUse = isHP
                  ? (equipmentStatus.headphones||{})[id] === 'in_use'
                  : (equipmentStatus.power||{})[id] === 'in_use';
                const det = equipmentDetails[id];
                return (
                  <div key={id} title={inUse && det ? `${det.user} ${det.time}` : 'ว่าง'}
                    className={`rounded-lg py-1.5 flex flex-col items-center gap-0.5 ${
                      inUse ? 'bg-red-50 border border-red-100' : 'bg-slate-50 border border-slate-100'
                    }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${inUse ? 'bg-red-400' : 'bg-emerald-400'}`} />
                    <span className={`text-[10px] font-bold leading-none ${inUse ? 'text-red-700' : 'text-slate-500'}`}>{num}</span>
                    {inUse && det
                      ? <span className="text-[8px] text-red-400 truncate w-full text-center px-0.5">{det.user.split(' ')[0]}</span>
                      : <span className="text-[8px] text-slate-300">{isHP ? 'หูฟัง' : 'ปลั๊ก'}</span>
                    }
                  </div>
                );
              })}
            </div>
          </div>

          {lastUpdated && (
            <p className="text-[9px] text-slate-200 text-right pt-0.5">
              อัปเดต {lastUpdated.toLocaleTimeString('th-TH', {hour:'2-digit',minute:'2-digit'})}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
