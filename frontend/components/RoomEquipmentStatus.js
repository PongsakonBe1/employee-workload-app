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

      {/* ── Expanded detail ── */}
      {expanded && !loading && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-3">

          {/* helper: แถวสถานะ 1 บรรทัด */}
          {(() => {
            const StatusRow = ({ label, items, getInUse, getLabel, inUseDetails }) => {
              const inUseList = items.filter(getInUse);
              return (
                <div>
                  <div className="flex items-center gap-2 min-h-[22px]">
                    <span className="text-[11px] text-slate-400 w-24 shrink-0">{label}</span>
                    <div className="flex items-center gap-0.5 flex-wrap flex-1">
                      {items.map(item => (
                        <div
                          key={item}
                          title={getLabel ? getLabel(item) : item}
                          className={`h-4 rounded text-[9px] font-bold flex items-center justify-center transition-colors px-1 ${
                            getInUse(item) ? 'bg-red-400 text-white' : 'bg-emerald-100 text-emerald-600'
                          } ${item.startsWith('ICIT') ? 'w-4' : 'min-w-[1.75rem]'}`}
                        >
                          {item.startsWith('ICIT') ? String(parseInt(item.replace('ICIT',''),10)) : item}
                        </div>
                      ))}
                    </div>
                    <span className={`text-[10px] font-semibold shrink-0 ${inUseList.length > 0 ? 'text-red-400' : 'text-slate-300'}`}>
                      {inUseList.length > 0 ? `ใช้ ${inUseList.length}` : 'ว่าง'}
                    </span>
                  </div>
                  {inUseList.length > 0 && inUseDetails && (
                    <div className="ml-26 mt-1 space-y-0.5 pl-[6.5rem]">
                      {inUseList.map(item => inUseDetails[item] && (
                        <div key={item} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                          <span className="font-semibold text-red-500">{item.replace('ICIT','')}</span>
                          <span className="text-slate-400 truncate">{inUseDetails[item].user}</span>
                          <span className="text-slate-300 ml-auto shrink-0">{inUseDetails[item].time}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            };

            return (
              <>
                {/* ห้อง ชั้น 3 */}
                <StatusRow
                  label="ห้อง ชั้น 3"
                  items={allRooms3}
                  getInUse={r => roomStatus[r] === 'in_use'}
                  getLabel={r => `${r} ${roomOsMap[r] || ''}`}
                />
                {/* ห้อง ชั้น 4 */}
                <StatusRow
                  label="ห้อง ชั้น 4"
                  items={allRooms4}
                  getInUse={r => roomStatus[r] === 'in_use'}
                />

                <div className="border-t border-slate-100 pt-2 space-y-2">
                  <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest">ชั้น 3</p>
                  {/* หูฟัง ชั้น 3 */}
                  <StatusRow
                    label="หูฟัง 01–12"
                    items={allHeadphones3}
                    getInUse={h => (equipmentStatus.headphones||{})[h] === 'in_use'}
                    inUseDetails={equipmentDetails}
                  />
                  {/* ปลั๊กไฟ ชั้น 3 */}
                  <StatusRow
                    label="ปลั๊กไฟ 21–23"
                    items={allPower3}
                    getInUse={p => (equipmentStatus.power||{})[p] === 'in_use'}
                    inUseDetails={equipmentDetails}
                  />
                </div>

                <div className="border-t border-slate-100 pt-2 space-y-2">
                  <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest">Finn Space</p>
                  {/* หูฟัง Finn */}
                  <StatusRow
                    label="หูฟัง 13–20"
                    items={allHeadphonesFinn}
                    getInUse={h => (equipmentStatus.headphones||{})[h] === 'in_use'}
                    inUseDetails={equipmentDetails}
                  />
                  {/* ปลั๊กไฟ Finn */}
                  <StatusRow
                    label="ปลั๊กไฟ 24–25"
                    items={allPowerFinn}
                    getInUse={p => (equipmentStatus.power||{})[p] === 'in_use'}
                    inUseDetails={equipmentDetails}
                  />
                </div>

                {lastUpdated && (
                  <p className="text-[10px] text-slate-300 text-right pt-1">
                    อัปเดต {lastUpdated.toLocaleTimeString('th-TH', {hour:'2-digit',minute:'2-digit'})}
                  </p>
                )}
              </>
            );
          })()}

        </div>
      )}
    </div>
  );
}
