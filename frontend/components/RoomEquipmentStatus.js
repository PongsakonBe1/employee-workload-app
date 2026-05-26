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

  const headphoneStats = Object.values(equipmentStatus.headphones || {}).reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {});
  const powerStats = Object.values(equipmentStatus.power || {}).reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {});

  const allRooms3 = ['303','304','305','306'];
  const allRooms4 = ['401','402','406','407'];
  const allRooms = [...allRooms3, ...allRooms4];
  const allHeadphones = Array.from({length:12}, (_,i) => `ICIT${String(i+1).padStart(2,'0')}`);
  const allPower = ['ICIT21','ICIT22','ICIT23'];

  const roomsInUse = allRooms.filter(r => roomStatus[r] === 'in_use');
  const hpInUse = allHeadphones.filter(h => (equipmentStatus.headphones||{})[h] === 'in_use');
  const pwInUse = allPower.filter(p => (equipmentStatus.power||{})[p] === 'in_use');
  const anyInUse = roomsInUse.length > 0 || hpInUse.length > 0 || pwInUse.length > 0;

  // --- Compact bar: กลุ่มละ dots + label ---
  const groups = [
    {
      key: 'room3',
      label: 'ห้อง ชั้น 3',
      items: allRooms3,
      getStatus: r => roomStatus[r] === 'in_use',
      inUseCount: allRooms3.filter(r => roomStatus[r] === 'in_use').length,
    },
    {
      key: 'room4',
      label: 'ห้อง ชั้น 4',
      items: allRooms4,
      getStatus: r => roomStatus[r] === 'in_use',
      inUseCount: allRooms4.filter(r => roomStatus[r] === 'in_use').length,
    },
    {
      key: 'hp',
      label: 'หูฟัง',
      items: allHeadphones,
      getStatus: h => (equipmentStatus.headphones||{})[h] === 'in_use',
      inUseCount: hpInUse.length,
    },
    {
      key: 'pw',
      label: 'ปลั๊ก',
      items: allPower,
      getStatus: p => (equipmentStatus.power||{})[p] === 'in_use',
      inUseCount: pwInUse.length,
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
          <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
            {groups.map((g, i) => (
              <div key={g.key} className="flex items-center gap-1.5 shrink-0">
                {/* dots */}
                <div className="flex items-center gap-0.5">
                  {g.items.map(item => (
                    <div
                      key={item}
                      className={`rounded-full transition-colors ${
                        g.getStatus(item)
                          ? 'bg-red-400 w-2 h-2'
                          : 'bg-emerald-400 w-2 h-2'
                      }`}
                    />
                  ))}
                </div>
                {/* label */}
                <span className={`text-[11px] font-medium whitespace-nowrap ${
                  g.inUseCount > 0 ? 'text-red-500' : 'text-slate-400'
                }`}>
                  {g.label}
                  {g.inUseCount > 0 && (
                    <span className="ml-0.5 text-red-400">·{g.inUseCount}</span>
                  )}
                </span>
                {/* divider */}
                {i < groups.length - 1 && (
                  <div className="w-px h-3 bg-slate-200 ml-1.5" />
                )}
              </div>
            ))}
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

      {/* ── Expanded: Apple iOS card style ── */}
      {expanded && !loading && (
        <div className="border-t border-slate-100 bg-slate-50/60 p-4 space-y-5">

          {/* ห้องแลกเปลี่ยน ชั้น 3 */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-semibold text-slate-500">ห้องแลกเปลี่ยน ชั้น 3</p>
              <span className="text-[11px] text-slate-400">
                {allRooms3.filter(r => roomStatus[r] !== 'in_use').length} ว่าง
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {allRooms3.map(r => {
                const inUse = roomStatus[r] === 'in_use';
                return (
                  <div key={r} className={`rounded-2xl p-3 text-center transition-all ${
                    inUse
                      ? 'bg-red-500 shadow-sm shadow-red-200'
                      : 'bg-white border border-slate-200/80 shadow-sm'
                  }`}>
                    <div className={`text-base font-bold tracking-tight ${inUse ? 'text-white' : 'text-slate-800'}`}>{r}</div>
                    <div className={`text-[10px] mt-0.5 font-medium ${inUse ? 'text-red-100' : 'text-slate-400'}`}>{roomOsMap[r]}</div>
                    <div className={`mt-1.5 w-1.5 h-1.5 rounded-full mx-auto ${inUse ? 'bg-red-200' : 'bg-emerald-400'}`} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* ห้องเรียน ชั้น 4 */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-semibold text-slate-500">ห้องเรียน ชั้น 4</p>
              <span className="text-[11px] text-slate-400">
                {allRooms4.filter(r => roomStatus[r] !== 'in_use').length} ว่าง
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {allRooms4.map(r => {
                const inUse = roomStatus[r] === 'in_use';
                return (
                  <div key={r} className={`rounded-2xl p-3 text-center transition-all ${
                    inUse
                      ? 'bg-red-500 shadow-sm shadow-red-200'
                      : 'bg-white border border-slate-200/80 shadow-sm'
                  }`}>
                    <div className={`text-base font-bold tracking-tight ${inUse ? 'text-white' : 'text-slate-800'}`}>{r}</div>
                    <div className={`text-[10px] mt-0.5 font-medium ${inUse ? 'text-red-100' : 'text-slate-400'}`}>{inUse ? 'เปิดอยู่' : 'ว่าง'}</div>
                    <div className={`mt-1.5 w-1.5 h-1.5 rounded-full mx-auto ${inUse ? 'bg-red-200' : 'bg-emerald-400'}`} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* หูฟัง */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-semibold text-slate-500">หูฟัง</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  ว่าง {headphoneStats.available||0}
                </span>
                {(headphoneStats.in_use||0) > 0 && (
                  <span className="text-[11px] font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                    ใช้ {headphoneStats.in_use}
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {allHeadphones.map(h => {
                const inUse = (equipmentStatus.headphones||{})[h] === 'in_use';
                const detail = equipmentDetails[h];
                return (
                  <div key={h}
                    title={inUse && detail ? `${detail.user} · ${detail.time}` : 'ว่าง'}
                    className={`rounded-xl py-2 text-center transition-all ${
                      inUse
                        ? 'bg-red-500 shadow-sm shadow-red-200'
                        : 'bg-white border border-slate-200/80 shadow-sm'
                    }`}>
                    <div className={`text-xs font-bold ${inUse ? 'text-white' : 'text-slate-700'}`}>
                      {h.replace('ICIT','')}
                    </div>
                  </div>
                );
              })}
            </div>
            {hpInUse.length > 0 && (
              <div className="mt-2.5 space-y-1.5">
                {hpInUse.map(h => equipmentDetails[h] && (
                  <div key={h} className="flex items-center gap-2.5 bg-white rounded-xl px-3 py-2 border border-slate-200/80 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                    <span className="text-xs font-semibold text-slate-700">{h}</span>
                    <span className="text-[11px] text-slate-400 ml-auto">{equipmentDetails[h].user}</span>
                    <span className="text-[11px] text-slate-300">{equipmentDetails[h].time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ปลั๊กไฟ */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-semibold text-slate-500">ปลั๊กไฟ</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  ว่าง {powerStats.available||0}
                </span>
                {(powerStats.in_use||0) > 0 && (
                  <span className="text-[11px] font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                    ใช้ {powerStats.in_use}
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {allPower.map(p => {
                const inUse = (equipmentStatus.power||{})[p] === 'in_use';
                const detail = equipmentDetails[p];
                return (
                  <div key={p}
                    title={inUse && detail ? `${detail.user} · ${detail.time}` : 'ว่าง'}
                    className={`rounded-2xl p-3 text-center transition-all ${
                      inUse
                        ? 'bg-red-500 shadow-sm shadow-red-200'
                        : 'bg-white border border-slate-200/80 shadow-sm'
                    }`}>
                    <div className={`text-sm font-bold ${inUse ? 'text-white' : 'text-slate-800'}`}>
                      {p.replace('ICIT','')}
                    </div>
                    {inUse && detail ? (
                      <div className="text-[10px] text-red-100 mt-0.5 truncate">{detail.user}</div>
                    ) : (
                      <div className="text-[10px] text-slate-400 mt-0.5">ว่าง</div>
                    )}
                    <div className={`mt-1.5 w-1.5 h-1.5 rounded-full mx-auto ${inUse ? 'bg-red-200' : 'bg-emerald-400'}`} />
                  </div>
                );
              })}
            </div>
          </div>

          {lastUpdated && (
            <p className="text-[10px] text-slate-300 text-right pt-1">
              อัปเดต {lastUpdated.toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
