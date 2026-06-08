"use client";

import { useState, useEffect } from 'react';
import { Monitor, Headphones, Plug, Wifi, Activity, Download, AlertTriangle, Wrench, Ban } from 'lucide-react';
import { getFirestore, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAuth } from './AuthProvider';
import { isAdminRole } from '../lib/authUtils';

// ─── Equipment Details Data (Barcode & Item Number) ───
const EQUIPMENT_DETAILS = {
  // Headphones ICIT01-20
  'ICIT01': { barcode: '024467AK00017', itemNo: 1, name: 'หูฟัง' },
  'ICIT02': { barcode: '024467AK00014', itemNo: 2, name: 'หูฟัง' },
  'ICIT03': { barcode: '024467AK00001', itemNo: 3, name: 'หูฟัง' },
  'ICIT04': { barcode: '024467AK00007', itemNo: 4, name: 'หูฟัง' },
  'ICIT05': { barcode: '024467AK00003', itemNo: 5, name: 'หูฟัง' },
  'ICIT06': { barcode: '024467AK00015', itemNo: 6, name: 'หูฟัง' },
  'ICIT07': { barcode: '024467AK00002', itemNo: 7, name: 'หูฟัง' },
  'ICIT08': { barcode: '024467AK00016', itemNo: 8, name: 'หูฟัง' },
  'ICIT09': { barcode: '024467AK00004', itemNo: 9, name: 'หูฟัง' },
  'ICIT10': { barcode: '024467AK00013', itemNo: 10, name: 'หูฟัง' },
  'ICIT11': { barcode: '024467AK00011', itemNo: 11, name: 'หูฟัง' },
  'ICIT12': { barcode: '024467AK00020', itemNo: 12, name: 'หูฟัง' },
  'ICIT13': { barcode: '024467AK00008', itemNo: 13, name: 'หูฟัง' },
  'ICIT14': { barcode: '024467AK00019', itemNo: 14, name: 'หูฟัง' },
  'ICIT15': { barcode: '024467AK00009', itemNo: 15, name: 'หูฟัง' },
  'ICIT16': { barcode: '024467AK00005', itemNo: 16, name: 'หูฟัง' },
  'ICIT17': { barcode: '024467AK00012', itemNo: 17, name: 'หูฟัง' },
  'ICIT18': { barcode: '024467AK00018', itemNo: 18, name: 'หูฟัง' },
  'ICIT19': { barcode: '024467AK00006', itemNo: 19, name: 'หูฟัง' },
  'ICIT20': { barcode: '024467AK00010', itemNo: 20, name: 'หูฟัง' },
  // Power Plugs ICIT21-25
  'ICIT21': { barcode: 'BA1614453', itemNo: 21, name: 'ปลั๊กไฟ' },
  'ICIT22': { barcode: 'BA1614456', itemNo: 22, name: 'ปลั๊กไฟ' },
  'ICIT23': { barcode: 'BA1614455', itemNo: 23, name: 'ปลั๊กไฟ' },
  'ICIT24': { barcode: 'BA1614444', itemNo: 24, name: 'ปลั๊กไฟ' },
  'ICIT25': { barcode: 'BA1614442', itemNo: 25, name: 'ปลั๊กไฟ' },
};

// ─── 3D Device Preview Components (CSS-based, GPU accelerated) ───

const Device3DContainer = ({ children, color = '#f5f5f5', inUse = false }) => (
  <div className="relative w-36 h-36 sm:w-40 sm:h-40 mx-auto" style={{ perspective: '600px' }}>
    <div 
      className="w-full h-full transition-transform duration-700 ease-out"
      style={{ 
        transformStyle: 'preserve-3d',
        transform: 'rotateY(-15deg) rotateX(5deg)',
        animation: 'deviceFloat 6s ease-in-out infinite'
      }}
    >
      {/* Shadow */}
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-4 rounded-full blur-md opacity-30"
        style={{ background: inUse ? '#ef4444' : '#22c55e', transform: 'translateZ(-20px)' }}
      />
      {children}
    </div>
    <style jsx>{`
      @keyframes deviceFloat {
        0%, 100% { transform: rotateY(-15deg) rotateX(5deg) translateY(0px); }
        50% { transform: rotateY(-15deg) rotateX(5deg) translateY(-8px); }
      }
    `}</style>
  </div>
);

// AirPods Max style headphones
const Headphones3D = ({ inUse = false }) => (
  <Device3DContainer inUse={inUse}>
    <svg viewBox="0 0 120 100" className="w-full h-full drop-shadow-xl">
      {/* Headband */}
      <path 
        d="M30 55 Q60 15 90 55" 
        fill="none" 
        stroke="#d4d4d8" 
        strokeWidth="12" 
        strokeLinecap="round"
      />
      <path 
        d="M30 55 Q60 15 90 55" 
        fill="none" 
        stroke="#a1a1aa" 
        strokeWidth="4" 
        strokeLinecap="round"
        opacity="0.3"
      />
      {/* Left Ear Cup */}
      <ellipse cx="28" cy="62" rx="14" ry="18" fill="#71717a" />
      <ellipse cx="28" cy="62" rx="10" ry="14" fill={inUse ? '#ef4444' : '#a1a1aa'} opacity="0.8"/>
      <ellipse cx="26" cy="60" rx="6" ry="8" fill="#52525b" />
      {/* Right Ear Cup */}
      <ellipse cx="92" cy="62" rx="14" ry="18" fill="#71717a" />
      <ellipse cx="92" cy="62" rx="10" ry="14" fill={inUse ? '#ef4444' : '#a1a1aa'} opacity="0.8"/>
      <ellipse cx="94" cy="60" rx="6" ry="8" fill="#52525b" />
      {/* Mesh detail */}
      <circle cx="28" cy="62" r="3" fill="#27272a" opacity="0.5"/>
      <circle cx="92" cy="62" r="3" fill="#27272a" opacity="0.5"/>
    </svg>
  </Device3DContainer>
);

// Link PowerConneX style rack power strip
const PowerStrip3D = ({ inUse = false }) => (
  <Device3DContainer inUse={inUse}>
    <svg viewBox="0 0 120 80" className="w-full h-full drop-shadow-xl">
      {/* Main body - rack mount power strip */}
      <rect x="10" y="20" width="100" height="40" rx="3" fill="#18181b" />
      {/* Side mounting flanges */}
      <rect x="5" y="22" width="6" height="36" rx="1" fill="#27272a" />
      <rect x="109" y="22" width="6" height="36" rx="1" fill="#27272a" />
      {/* Screw holes on flanges */}
      <circle cx="8" cy="30" r="1.5" fill="#52525b" />
      <circle cx="8" cy="50" r="1.5" fill="#52525b" />
      <circle cx="112" cy="30" r="1.5" fill="#52525b" />
      <circle cx="112" cy="50" r="1.5" fill="#52525b" />
      {/* 6 Power outlets */}
      {[0,1,2,3,4,5].map(i => (
        <g key={i}>
          <rect x={18 + i * 16} y="28" width="12" height="20" rx="1.5" fill="#3f3f46" />
          <rect x={20 + i * 16} y="30" width="8" height="16" rx="1" fill="#18181b" />
          {/* Outlet holes */}
          <circle cx={22 + i * 16} cy="35" r="1.5" fill="#71717a" />
          <circle cx={26 + i * 16} cy="35" r="1.5" fill="#71717a" />
          <rect x={23 + i * 16} y="38" width="2" height="4" fill="#71717a" />
        </g>
      ))}
      {/* LED indicator */}
      <circle cx="110" cy="28" r="2" fill={inUse ? '#ef4444' : '#22c55e'} className="animate-pulse" />
      {/* Cable */}
      <path d="M60 60 Q60 75 80 75 L100 75" fill="none" stroke="#27272a" strokeWidth="4" strokeLinecap="round" />
    </svg>
  </Device3DContainer>
);

// Room/Monitor icon
const Room3D = ({ os, inUse = false }) => (
  <Device3DContainer inUse={inUse}>
    <svg viewBox="0 0 100 80" className="w-full h-full drop-shadow-xl">
      {/* Monitor stand */}
      <path d="M45 65 L55 65 L52 75 L48 75 Z" fill="#71717a" />
      <rect x="35" y="75" width="30" height="3" rx="1" fill="#52525b" />
      {/* Monitor frame */}
      <rect x="15" y="15" width="70" height="50" rx="4" fill="#27272a" />
      <rect x="18" y="18" width="64" height="44" rx="2" fill={inUse ? '#1a1a2e' : '#0a0a0a'} />
      {/* Screen content */}
      {inUse ? (
        <>
          <rect x="22" y="22" width="20" height="3" rx="1" fill="#ef4444" opacity="0.8" />
          <rect x="22" y="28" width="40" height="2" rx="1" fill="#3f3f46" />
          <rect x="22" y="33" width="35" height="2" rx="1" fill="#3f3f46" />
          <rect x="22" y="38" width="45" height="2" rx="1" fill="#3f3f46" />
          <circle cx="75" cy="28" r="4" fill="#ef4444" opacity="0.6" />
        </>
      ) : (
        <>
          <circle cx="50" cy="40" r="12" fill="#22c55e" opacity="0.1" />
          <path d="M44 40 L48 44 L56 36" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        </>
      )}
      {/* OS Badge */}
      <rect x="65" y="55" width="15" height="6" rx="1" fill="#3f3f46" />
      <text x="72.5" y="59" textAnchor="middle" fill="#a1a1aa" fontSize="4" fontWeight="bold">{os?.slice(0,3) || 'OS'}</text>
    </svg>
  </Device3DContainer>
);

// ─── Module-level helper (ใช้ได้ทั้ง DevicePreview และ RoomEquipmentStatus) ───
const getConditionBadge = (condition) => {
  switch (condition) {
    case 'damaged':
      return { icon: Wrench, color: 'bg-amber-50 text-amber-700 border-amber-100', label: 'ชำรุด', dot: 'bg-amber-400' };
    case 'lost':
      return { icon: Ban, color: 'bg-slate-100 text-slate-500 border-slate-200', label: 'สูญหาย', dot: 'bg-slate-400' };
    default:
      return null;
  }
};

// Preview Panel Component
const DevicePreview = ({ item }) => {
  if (!item) return null;
  
  const render3D = () => {
    switch (item.type) {
      case 'headphones': return <Headphones3D inUse={item.inUse} />;
      case 'power': return <PowerStrip3D inUse={item.inUse} />;
      case 'room': return <Room3D os={item.os} inUse={item.inUse} />;
      default: return null;
    }
  };

  return (
    <div className="h-full flex flex-col space-y-3 sm:space-y-4">
      {/* 3D Preview */}
      <div className="relative py-2">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-100/50 to-transparent rounded-2xl" />
        {render3D()}
      </div>
      
      {/* Status indicator */}
      <div className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col items-center gap-1.5 sm:gap-2 ${
        item.inUse ? 'bg-red-50/80 border border-red-100'
        : item.condition === 'damaged' ? 'bg-amber-50/80 border border-amber-100'
        : item.condition === 'lost' ? 'bg-slate-100/80 border border-slate-200'
        : 'bg-emerald-50/80 border border-emerald-100'
      }`}>
        <div className={`w-3 h-3 rounded-full ${
          item.inUse ? 'bg-red-400 animate-pulse'
          : item.condition === 'damaged' ? 'bg-amber-400'
          : item.condition === 'lost' ? 'bg-slate-400'
          : 'bg-emerald-400'
        }`} />
        <span className={`text-sm font-bold ${
          item.inUse ? 'text-red-700'
          : item.condition === 'damaged' ? 'text-amber-700'
          : item.condition === 'lost' ? 'text-slate-500'
          : 'text-emerald-700'
        }`}>
          {item.inUse ? 'กำลังใช้งาน'
          : item.condition === 'damaged' ? 'ชำรุด — ยืมไม่ได้'
          : item.condition === 'lost' ? 'สูญหาย — ยืมไม่ได้'
          : 'พร้อมใช้งาน'}
        </span>
      </div>

      {/* Info */}
      <div className="text-center space-y-0.5 sm:space-y-1">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider">{item.location}</p>
        <p className="text-lg sm:text-xl font-bold text-slate-800 font-mono">{item.id}</p>
        {item.os && <p className="text-xs text-slate-500">{item.os}</p>}
        
        {/* Equipment Details - Barcode & Item No */}
        {EQUIPMENT_DETAILS[item.id] && (
          <div className="pt-2 space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-full">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-500">
                <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7"/><path d="M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/>
              </svg>
              <span className="text-[10px] font-mono text-slate-600 tracking-tight">
                {EQUIPMENT_DETAILS[item.id].barcode}
              </span>
            </div>
            <p className="text-[9px] text-slate-400">Item #{EQUIPMENT_DETAILS[item.id].itemNo}</p>
          </div>
        )}
      </div>

      {/* Usage Details */}
      {item.inUse && item.detail ? (
        <div className="bg-white rounded-lg sm:rounded-xl p-2.5 sm:p-3 border border-slate-100 space-y-1.5 sm:space-y-2 shadow-sm">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400 shrink-0">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <span className="text-sm text-slate-700 font-medium truncate">{item.detail.user}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400 shrink-0">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            <span className="text-xs text-slate-500">ยืมเมื่อ {item.detail.time}</span>
          </div>
        </div>
      ) : item.condition ? (
        // [SE] Show condition badge for returned equipment with issues
        <div className={`rounded-lg sm:rounded-xl p-2.5 sm:p-3 border shadow-sm ${getConditionBadge(item.condition)?.color || 'bg-slate-50 border-slate-100'}`}>
          <div className="flex items-center gap-2 justify-center">
            {(() => {
              const badge = getConditionBadge(item.condition);
              const Icon = badge?.icon;
              return Icon ? <Icon size={14} /> : null;
            })()}
            <span className="text-xs font-medium">
              {(() => {
                const badge = getConditionBadge(item.condition);
                return badge?.label || item.condition;
              })()}
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg sm:rounded-xl p-2.5 sm:p-3 border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-400 text-center">
            {item.type === 'room' ? 'ห้องว่าง สามารถเช็คอินได้' : 'พร้อมให้ยืมใช้งาน'}
          </p>
        </div>
      )}
    </div>
  );
};

export default function RoomEquipmentStatus() {
  const { user } = useAuth();
  const isAdmin = isAdminRole(user);

  const [roomStatus, setRoomStatus] = useState({});
  const [equipmentStatus, setEquipmentStatus] = useState({});
  const [equipmentConditions, setEquipmentConditions] = useState({}); // [SE] Track condition: normal/damaged/lost
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [equipmentDetails, setEquipmentDetails] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);

  // SE: Date range for transaction history export
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });

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

  // ฟังก์ชันตรวจสอบสถานะจาก worklogs
  const calculateStatusFromWorklogs = (worklogs) => {
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local timezone

    // [SA] worklogs มาเรียง desc จาก Firestore → reverse เป็น asc ก่อน process
    const sortedLogs = [...worklogs].reverse();

    const roomStatus = { ...initialRoomStatus };
    const equipmentStatus = JSON.parse(JSON.stringify(initialEquipmentStatus));
    const details = {};
    // [SA] conditions: ดูจาก log equipment ล่าสุดทุกวัน (ไม่จำกัดวันนี้)
    // เพราะ damaged/lost อาจถูก set เมื่อวานหรือก่อนหน้า และยังคงอยู่จนกว่าจะมี log ใหม่เปลี่ยน
    const conditions = {};

    // Pass 1: scan ทุก log เพื่อหา equipmentCondition ล่าสุดของแต่ละ equipment
    sortedLogs.forEach(log => {
      const minorTask = (log.minorTask || '').toLowerCase();
      const comment = (log.comment || '').toLowerCase();
      const isEquipmentLog = minorTask.includes('คืนหูฟัง') || minorTask.includes('คืนปลั๊กไฟ') ||
                             minorTask.includes('ยืมหูฟัง') || minorTask.includes('ยืมปลั๊กไฟ');
      if (!isEquipmentLog) return;

      // ตรวจ field equipment ตรง (จาก SmartEquipmentModal) ก่อน
      if (log.equipment && log.equipmentCondition) {
        conditions[log.equipment] = log.equipmentCondition;
        return;
      }

      // fallback: parse จาก comment
      const allEquipment = [
        ...Array.from({length:20}, (_,i) => `ICIT${String(i+1).padStart(2,'0')}`),
        ...['ICIT21','ICIT22','ICIT23','ICIT24','ICIT25']
      ];
      for (const eq of allEquipment) {
        if (comment.includes(eq.toLowerCase()) && log.equipmentCondition) {
          conditions[eq] = log.equipmentCondition;
        }
      }
    });

    // [SA] Pass 2: scan ทุก log เพื่อหา room status ล่าสุดของแต่ละห้อง
    // room status (in_use/available) คงอยู่ข้ามวันจนกว่าจะมี log ใหม่เปลี่ยน
    const roomLogs = sortedLogs.filter(log => {
      const mt = (log.minorTask || '').toLowerCase();
      return mt.includes('เช็คอิน') || mt.includes('ปิดห้อง') ||
             mt.includes('เปิดห้องเรียน') || mt.includes('ปิดห้องเรียน');
    });

    roomLogs.forEach(log => {
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

    return { roomStatus, equipmentStatus, details, conditions };
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
        
        const { roomStatus: calculatedRoomStatus, equipmentStatus: calculatedEquipmentStatus, details, conditions } =
          calculateStatusFromWorklogs(worklogs);

        setRoomStatus(calculatedRoomStatus);
        setEquipmentStatus(calculatedEquipmentStatus);
        setEquipmentConditions(conditions);
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

  // [SE/SA] Export equipment status to CSV for admin
  const exportToCSV = () => {
    const headers = ['รหัสอุปกรณ์', 'ประเภท', 'สังกัด', 'สถานะการใช้งาน', 'สภาพอุปกรณ์', 'บันทึกล่าสุด', 'Barcode', 'Item No'];

    const rows = [];

    // Headphones
    allHeadphones.forEach(id => {
      const inUse = (equipmentStatus.headphones || {})[id] === 'in_use';
      const condition = equipmentConditions[id] || 'normal';
      const location = allHeadphones3.includes(id) ? 'ชั้น 3' : 'Finn Space';
      const details = EQUIPMENT_DETAILS[id];
      rows.push([
        id,
        'หูฟัง',
        location,
        inUse ? 'กำลังใช้งาน' : 'พร้อมใช้งาน',
        condition === 'normal' ? 'สมบูรณ์' : condition === 'damaged' ? 'ชำรุด' : 'สูญหาย',
        lastUpdated ? lastUpdated.toLocaleString('th-TH') : '-',
        details?.barcode || '-',
        details?.itemNo || '-'
      ]);
    });

    // Power plugs
    allPower.forEach(id => {
      const inUse = (equipmentStatus.power || {})[id] === 'in_use';
      const condition = equipmentConditions[id] || 'normal';
      const location = allPower3.includes(id) ? 'ชั้น 3' : 'Finn Space';
      const details = EQUIPMENT_DETAILS[id];
      rows.push([
        id,
        'ปลั๊กไฟ',
        location,
        inUse ? 'กำลังใช้งาน' : 'พร้อมใช้งาน',
        condition === 'normal' ? 'สมบูรณ์' : condition === 'damaged' ? 'ชำรุด' : 'สูญหาย',
        lastUpdated ? lastUpdated.toLocaleString('th-TH') : '-',
        details?.barcode || '-',
        details?.itemNo || '-'
      ]);
    });

    // Create CSV content with BOM for Thai characters
    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `equipment-status-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // SE: Export transaction history (borrow/return) for date range
  const exportTransactionHistory = async () => {
    try {
      setLoading(true);
      const db = getFirestore();
      const { collection, query, where, orderBy, getDocs } = await import('firebase/firestore');

      // Query worklogs for equipment borrow/return in date range
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const worklogsQuery = query(
        collection(db, 'worklogs'),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        where('equipment', '!=', null),
        orderBy('createdAt', 'asc')
      );

      const snapshot = await getDocs(worklogsQuery);
      const logs = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        logs.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
        });
      });

      // Group logs by equipment and pair borrow/return
      const equipmentLogs = {};
      logs.forEach(log => {
        if (!log.equipment) return;
        if (!equipmentLogs[log.equipment]) equipmentLogs[log.equipment] = [];
        equipmentLogs[log.equipment].push(log);
      });

      // Create paired transactions
      const transactions = [];
      Object.entries(equipmentLogs).forEach(([equipmentId, eqLogs]) => {
        let borrowLog = null;
        eqLogs.forEach(log => {
          const isBorrow = log.minorTask?.includes('ยืม');
          const isReturn = log.minorTask?.includes('คืน');

          if (isBorrow) {
            borrowLog = log;
          } else if (isReturn && borrowLog) {
            // Pair found
            transactions.push({
              borrowDate: borrowLog.date,
              borrowTime: borrowLog.time,
              barcode: EQUIPMENT_DETAILS[equipmentId]?.barcode || '-',
              equipmentId,
              borrowerName: borrowLog.recipient || '-', // recipient = รหัสนักศึกษาหรือชื่อผู้ยืม
              status: 'คืนแล้ว',
              returnStaff: log.employeeDisplayName || '-',
              returnTime: log.time,
              condition: log.equipmentCondition === 'damaged' ? 'ชำรุด' : log.equipmentCondition === 'lost' ? 'สูญหาย' : 'สมบูรณ์',
              note: log.equipmentNote || ''
            });
            borrowLog = null;
          }
        });

        // Unreturned items
        if (borrowLog) {
          transactions.push({
            borrowDate: borrowLog.date,
            borrowTime: borrowLog.time,
            barcode: EQUIPMENT_DETAILS[equipmentId]?.barcode || '-',
            equipmentId,
            borrowerName: borrowLog.recipient || '-', // recipient = รหัสนักศึกษาหรือชื่อผู้ยืม
            status: 'ยังไม่คืน',
            returnStaff: '-',
            returnTime: '-',
            condition: '-',
            note: ''
          });
        }
      });

      // Sort by borrow date
      transactions.sort((a, b) => new Date(a.borrowDate) - new Date(b.borrowDate));

      // Create CSV - ใช้ recipient เป็นรหัสนักศึกษา/ชื่อผู้ยืม
      const headers = ['วันที่ยืม', 'เวลายืม', 'Barcode', 'รหัสอุปกรณ์', 'ผู้ยืม (รหัสนักศึกษา/ชื่อ)', 'สถานะ', 'ผู้รับคืน', 'เวลาคืน', 'สภาพ', 'หมายเหตุ'];
      const rows = transactions.map(t => [
        t.borrowDate,
        t.borrowTime,
        t.barcode,
        t.equipmentId,
        t.borrowerName, // รหัสนักศึกษาหรือชื่อผู้ยืม (จาก recipient field)
        t.status,
        t.returnStaff,
        t.returnTime,
        t.condition,
        t.note
      ]);

      const csvContent = '\uFEFF' + [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `equipment-history-${startDate}-to-${endDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Error exporting transaction history:', error);
      alert('เกิดข้อผิดพลาดในการส่งออก: ' + error.message);
    } finally {
      setLoading(false);
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

  // --- Navigation list for preview ---
  const navItems = [
    ...allRooms3.map(r => ({ type: 'room', id: r, label: r, location: 'ห้องบริการ ชั้น 3', inUse: roomStatus[r] === 'in_use', os: roomOsMap[r] })),
    ...allRooms4.map(r => ({ type: 'room', id: r, label: r, location: 'ห้องบริการ ชั้น 4', inUse: roomStatus[r] === 'in_use', os: roomOsMap[r] })),
    ...allHeadphones3.map(id => ({ type: 'headphones', id, label: id, location: 'ชั้น 3', inUse: (equipmentStatus.headphones||{})[id] === 'in_use', detail: equipmentDetails[id], condition: equipmentConditions[id] })),
    ...allPower3.map(id => ({ type: 'power', id, label: id, location: 'ชั้น 3', inUse: (equipmentStatus.power||{})[id] === 'in_use', detail: equipmentDetails[id], condition: equipmentConditions[id] })),
    ...allHeadphonesFinn.map(id => ({ type: 'headphones', id, label: id, location: 'Finn Space', inUse: (equipmentStatus.headphones||{})[id] === 'in_use', detail: equipmentDetails[id], condition: equipmentConditions[id] })),
    ...allPowerFinn.map(id => ({ type: 'power', id, label: id, location: 'Finn Space', inUse: (equipmentStatus.power||{})[id] === 'in_use', detail: equipmentDetails[id], condition: equipmentConditions[id] })),
  ];

  // --- Navigation handlers ---
  const navigatePrev = () => {
    if (!selectedItem) return;
    const currentIndex = navItems.findIndex(i => i.id === selectedItem.id);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : navItems.length - 1;
    setSelectedItem(navItems[prevIndex]);
  };

  const navigateNext = () => {
    if (!selectedItem) return;
    const currentIndex = navItems.findIndex(i => i.id === selectedItem.id);
    const nextIndex = currentIndex < navItems.length - 1 ? currentIndex + 1 : 0;
    setSelectedItem(navItems[nextIndex]);
  };

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
        onClick={() => {
          const next = !expanded;
          setExpanded(next);
          if (!next) {
            setSelectedItem(null);
          } else if (!selectedItem) {
            // Default to room 303 on first expand
            setSelectedItem({
              type: 'room',
              id: '303',
              label: '303',
              location: 'ห้องบริการ ชั้น 3',
              inUse: roomStatus['303'] === 'in_use',
              os: roomOsMap['303']
            });
          }
        }}
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
              <div className="flex gap-[2px]">{allHeadphones3.map(h=>{const s=(equipmentStatus.headphones||{})[h];const c=equipmentConditions[h];return <div key={h} className={`w-1 h-1 rounded-full ${s==='in_use'?'bg-red-400':c==='damaged'?'bg-amber-400':c==='lost'?'bg-slate-400':'bg-emerald-400'}`}/>})}</div>
              <span className={`text-[10px] font-medium ${allHeadphones3.some(h=>(equipmentStatus.headphones||{})[h]==='in_use')?'text-red-500':allHeadphones3.some(h=>equipmentConditions[h]==='damaged'||equipmentConditions[h]==='lost')?'text-amber-500':'text-slate-400'}`}>หูฟัง</span>
            </div>
            <span className="text-slate-200 text-[10px] shrink-0">|</span>
            {/* ชั้น 3: ปลั๊ก */}
            <div className="flex items-center gap-1 shrink-0">
              <div className="flex gap-[3px]">{allPower3.map(p=>{const s=(equipmentStatus.power||{})[p];const c=equipmentConditions[p];return <div key={p} className={`w-1.5 h-1.5 rounded-full ${s==='in_use'?'bg-red-400':c==='damaged'?'bg-amber-400':c==='lost'?'bg-slate-400':'bg-emerald-400'}`}/>})}</div>
              <span className={`text-[10px] font-medium ${allPower3.some(p=>(equipmentStatus.power||{})[p]==='in_use')?'text-red-500':allPower3.some(p=>equipmentConditions[p]==='damaged'||equipmentConditions[p]==='lost')?'text-amber-500':'text-slate-400'}`}>ปลั๊ก</span>
            </div>
            <span className="text-slate-300 text-[10px] shrink-0 mx-0.5">┊</span>
            {/* Finn: หูฟัง */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[9px] text-slate-300 font-medium">Finn</span>
              <div className="flex gap-[2px]">{allHeadphonesFinn.map(h=>{const s=(equipmentStatus.headphones||{})[h];const c=equipmentConditions[h];return <div key={h} className={`w-1 h-1 rounded-full ${s==='in_use'?'bg-red-400':c==='damaged'?'bg-amber-400':c==='lost'?'bg-slate-400':'bg-emerald-400'}`}/>})}</div>
              <span className={`text-[10px] font-medium ${allHeadphonesFinn.some(h=>(equipmentStatus.headphones||{})[h]==='in_use')?'text-red-500':allHeadphonesFinn.some(h=>equipmentConditions[h]==='damaged'||equipmentConditions[h]==='lost')?'text-amber-500':'text-slate-400'}`}>หูฟัง</span>
            </div>
            <span className="text-slate-200 text-[10px] shrink-0">|</span>
            {/* Finn: ปลั๊ก */}
            <div className="flex items-center gap-1 shrink-0">
              <div className="flex gap-[3px]">{allPowerFinn.map(p=>{const s=(equipmentStatus.power||{})[p];const c=equipmentConditions[p];return <div key={p} className={`w-1.5 h-1.5 rounded-full ${s==='in_use'?'bg-red-400':c==='damaged'?'bg-amber-400':c==='lost'?'bg-slate-400':'bg-emerald-400'}`}/>})}</div>
              <span className={`text-[10px] font-medium ${allPowerFinn.some(p=>(equipmentStatus.power||{})[p]==='in_use')?'text-red-500':allPowerFinn.some(p=>equipmentConditions[p]==='damaged'||equipmentConditions[p]==='lost')?'text-amber-500':'text-slate-400'}`}>ปลั๊ก</span>
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
          {/* [SE/SA] Export CSV button for admin - iOS minimal style */}
          {isAdmin && expanded && (
            <div
              onClick={(e) => { e.stopPropagation(); exportToCSV(); }}
              className="flex items-center gap-1.5 px-2 py-1 bg-white hover:bg-slate-50 text-slate-500 text-[10px] font-medium rounded-md transition-all cursor-pointer border border-slate-200/60 shadow-sm"
              role="button"
              title="ส่งออกสถานะอุปกรณ์ (CSV)"
            >
              <Download size={11} strokeWidth={1.5} />
              <span className="hidden sm:inline">ส่งออก</span>
            </div>
          )}
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
            className={`text-slate-300 transition-transform ${expanded ? 'rotate-180' : ''}`}>
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>

      {/* ── Expanded detail: 2-column layout ── */}
      {expanded && !loading && (
        <div className="border-t border-slate-100">
          {/* SE: Date range picker and export for admin - iOS minimal style */}
          {isAdmin && (
            <div className="px-3 py-2.5 bg-slate-50/80 border-b border-slate-100">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">ส่งออกประวัติ</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-[10px] py-1 px-2 w-28 bg-white border border-slate-200/60 rounded-md text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-300 transition-all"
                  />
                  <span className="text-slate-300 text-[10px]">→</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-[10px] py-1 px-2 w-28 bg-white border border-slate-200/60 rounded-md text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-300 transition-all"
                  />
                </div>
                <button
                  onClick={exportTransactionHistory}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-600 text-[10px] font-medium rounded-md transition-all border border-slate-200/60 shadow-sm active:scale-95"
                >
                  <Download size={11} strokeWidth={1.5} />
                  <span className="hidden sm:inline">ยืม/คืน</span>
                </button>
              </div>
            </div>
          )}
          <div className="flex flex-col-reverse md:flex-row">
            {/* ฝั่งซ้าย: Grid Cards - 40% - Fixed height with smooth scroll */}
            <div className="w-full md:w-[42%] p-2 space-y-2 overflow-y-auto h-[420px] md:h-[480px] scroll-smooth snap-y snap-mandatory">

              {/* Section: ห้อง ชั้น 3 */}
              <div>
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">ห้องบริการ ชั้น 3</p>
                <div className="grid grid-cols-5 sm:grid-cols-8 gap-1">
                  {allRooms3.map(r => {
                    const inUse = roomStatus[r] === 'in_use';
                    return (
                      <button key={r} onClick={() => setSelectedItem({type:'room',id:r,label:r,location:'ห้องบริการ ชั้น 3',inUse,os:roomOsMap[r]})}
                        className={`rounded-md p-1 flex flex-col items-center gap-0.5 transition-all duration-200 ease-out active:scale-95 snap-start ${
                          selectedItem?.id===r ? 'ring-2 ring-blue-400 bg-blue-50 shadow-sm' : inUse ? 'bg-red-50 border border-red-100' : 'bg-emerald-50 border border-emerald-100'
                        }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${inUse ? 'bg-red-400' : 'bg-emerald-400'}`} />
                        <span className={`text-[10px] font-bold ${inUse ? 'text-red-700' : 'text-emerald-700'}`}>{r}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section: ห้อง ชั้น 4 */}
              <div>
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">ห้องบริการ ชั้น 4</p>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
                  {allRooms4.map(r => {
                    const inUse = roomStatus[r] === 'in_use';
                    return (
                      <button key={r} onClick={() => setSelectedItem({type:'room',id:r,label:r,location:'ห้องบริการ ชั้น 4',inUse,os:roomOsMap[r]})}
                        className={`rounded-md p-1 flex flex-col items-center gap-0.5 transition-all duration-200 ease-out active:scale-95 snap-start ${
                          selectedItem?.id===r ? 'ring-2 ring-blue-400 bg-blue-50 shadow-sm' : inUse ? 'bg-red-50 border border-red-100' : 'bg-emerald-50 border border-emerald-100'
                        }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${inUse ? 'bg-red-400' : 'bg-emerald-400'}`} />
                        <span className={`text-[10px] font-bold ${inUse ? 'text-red-700' : 'text-emerald-700'}`}>{r}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section: หูฟัง ชั้น 3 */}
              <div>
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">หูฟัง ชั้น 3</p>
                <div className="grid grid-cols-8 sm:grid-cols-10 gap-0.5">
                  {allHeadphones3.map(id => {
                    const inUse = (equipmentStatus.headphones||{})[id] === 'in_use';
                    const det = equipmentDetails[id];
                    const cond = equipmentConditions[id];
                    const num = parseInt(id.replace('ICIT',''),10);
                    // [SE] Show condition styling
                    let bgClass = 'bg-slate-50 border-slate-100';
                    if (selectedItem?.id === id) bgClass = 'ring-2 ring-blue-400 bg-blue-50 shadow-sm';
                    else if (inUse) bgClass = 'bg-rose-50 border-rose-100';
                    else if (cond === 'damaged') bgClass = 'bg-amber-50 border-amber-100';
                    else if (cond === 'lost') bgClass = 'bg-slate-100 border-slate-200'; // UX: Gray for lost (disabled semantic)
                    return (
                      <button key={id} onClick={() => setSelectedItem({type:'headphones',id,label:`หูฟัง ${num}`,num,location:'ชั้น 3',inUse,detail:det,condition:cond})}
                        className={`rounded-md p-1 flex flex-col items-center gap-0.5 transition-all duration-200 ease-out active:scale-95 snap-start ${bgClass}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          inUse ? 'bg-rose-400' : cond === 'damaged' ? 'bg-amber-400' : cond === 'lost' ? 'bg-slate-400' : 'bg-emerald-400'
                        }`} />
                        <span className={`text-[9px] font-bold ${
                          inUse ? 'text-rose-700' : cond === 'damaged' ? 'text-amber-700' : cond === 'lost' ? 'text-slate-500' : 'text-slate-500'
                        }`}>{num}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section: ปลั๊ก ชั้น 3 */}
              <div>
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">ปลั๊ก ชั้น 3</p>
                <div className="grid grid-cols-5 sm:grid-cols-8 gap-0.5">
                  {allPower3.map(id => {
                    const inUse = (equipmentStatus.power||{})[id] === 'in_use';
                    const det = equipmentDetails[id];
                    const cond = equipmentConditions[id];
                    const num = parseInt(id.replace('ICIT',''),10);
                    let bgClass = 'bg-slate-50 border-slate-100';
                    if (selectedItem?.id === id) bgClass = 'ring-2 ring-blue-400 bg-blue-50 shadow-sm';
                    else if (inUse) bgClass = 'bg-rose-50 border-rose-100';
                    else if (cond === 'damaged') bgClass = 'bg-amber-50 border-amber-100';
                    else if (cond === 'lost') bgClass = 'bg-slate-100 border-slate-200';
                    return (
                      <button key={id} onClick={() => setSelectedItem({type:'power',id,label:`ปลั๊ก ${num}`,num,location:'ชั้น 3',inUse,detail:det,condition:cond})}
                        className={`rounded-md p-1 flex flex-col items-center gap-0.5 transition-all duration-200 ease-out active:scale-95 snap-start ${bgClass}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          inUse ? 'bg-rose-400' : cond === 'damaged' ? 'bg-amber-400' : cond === 'lost' ? 'bg-slate-400' : 'bg-emerald-400'
                        }`} />
                        <span className={`text-[9px] font-bold ${
                          inUse ? 'text-rose-700' : cond === 'damaged' ? 'text-amber-700' : cond === 'lost' ? 'text-slate-500' : 'text-slate-500'
                        }`}>{num}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section: หูฟัง Finn */}
              <div>
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">หูฟัง Finn Space</p>
                <div className="grid grid-cols-6 sm:grid-cols-10 gap-0.5">
                  {allHeadphonesFinn.map(id => {
                    const inUse = (equipmentStatus.headphones||{})[id] === 'in_use';
                    const det = equipmentDetails[id];
                    const cond = equipmentConditions[id];
                    const num = parseInt(id.replace('ICIT',''),10);
                    let bgClass = 'bg-slate-50 border-slate-100';
                    if (selectedItem?.id === id) bgClass = 'ring-2 ring-blue-400 bg-blue-50 shadow-sm';
                    else if (inUse) bgClass = 'bg-rose-50 border-rose-100';
                    else if (cond === 'damaged') bgClass = 'bg-amber-50 border-amber-100';
                    else if (cond === 'lost') bgClass = 'bg-slate-100 border-slate-200';
                    return (
                      <button key={id} onClick={() => setSelectedItem({type:'headphones',id,label:`หูฟัง ${num}`,num,location:'Finn Space',inUse,detail:det,condition:cond})}
                        className={`rounded-md p-1 flex flex-col items-center gap-0.5 transition-all duration-200 ease-out active:scale-95 snap-start ${bgClass}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          inUse ? 'bg-rose-400' : cond === 'damaged' ? 'bg-amber-400' : cond === 'lost' ? 'bg-slate-400' : 'bg-emerald-400'
                        }`} />
                        <span className={`text-[9px] font-bold ${
                          inUse ? 'text-rose-700' : cond === 'damaged' ? 'text-amber-700' : cond === 'lost' ? 'text-slate-500' : 'text-slate-500'
                        }`}>{num}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section: ปลั๊ก Finn */}
              <div>
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">ปลั๊ก Finn Space</p>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-0.5">
                  {allPowerFinn.map(id => {
                    const inUse = (equipmentStatus.power||{})[id] === 'in_use';
                    const det = equipmentDetails[id];
                    const cond = equipmentConditions[id];
                    const num = parseInt(id.replace('ICIT',''),10);
                    let bgClass = 'bg-slate-50 border-slate-100';
                    if (selectedItem?.id === id) bgClass = 'ring-2 ring-blue-400 bg-blue-50 shadow-sm';
                    else if (inUse) bgClass = 'bg-rose-50 border-rose-100';
                    else if (cond === 'damaged') bgClass = 'bg-amber-50 border-amber-100';
                    else if (cond === 'lost') bgClass = 'bg-slate-100 border-slate-200';
                    return (
                      <button key={id} onClick={() => setSelectedItem({type:'power',id,label:`ปลั๊ก ${num}`,num,location:'Finn Space',inUse,detail:det,condition:cond})}
                        className={`rounded-md p-1 flex flex-col items-center gap-0.5 transition-all duration-200 ease-out active:scale-95 snap-start ${bgClass}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          inUse ? 'bg-rose-400' : cond === 'damaged' ? 'bg-amber-400' : cond === 'lost' ? 'bg-slate-400' : 'bg-emerald-400'
                        }`} />
                        <span className={`text-[9px] font-bold ${
                          inUse ? 'text-rose-700' : cond === 'damaged' ? 'text-amber-700' : cond === 'lost' ? 'text-slate-500' : 'text-slate-500'
                        }`}>{num}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ฝั่งขวา: 3D Preview Panel - 60% - Fixed height container */}
            <div className="relative w-full md:w-[58%] bg-gradient-to-b from-slate-50/80 to-white border-b md:border-b-0 md:border-l border-slate-100 p-3 md:p-4 flex flex-col h-[420px] md:h-[480px] overflow-hidden">
              {/* Navigation buttons */}
              <div className="absolute top-3 left-3 right-3 z-10 flex justify-between pointer-events-none">
                <button
                  onClick={navigatePrev}
                  disabled={!selectedItem}
                  className={`w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm border border-slate-200 flex items-center justify-center transition-all pointer-events-auto ${
                    selectedItem ? 'hover:bg-white hover:shadow-md active:scale-95' : 'opacity-30 cursor-not-allowed'
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-600">
                    <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button
                  onClick={navigateNext}
                  disabled={!selectedItem}
                  className={`w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm border border-slate-200 flex items-center justify-center transition-all pointer-events-auto ${
                    selectedItem ? 'hover:bg-white hover:shadow-md active:scale-95' : 'opacity-30 cursor-not-allowed'
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-600">
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              {/* Fixed content wrapper for smooth transitions */}
              <div className="flex-1 flex flex-col relative overflow-y-auto overflow-x-hidden pt-12">
                <div className={`transition-all duration-300 ease-out ${!selectedItem ? 'opacity-100 scale-100' : 'opacity-0 scale-95 absolute inset-0 pointer-events-none'}`}>
                  {/* Empty state */}
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-3">
                    <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="4"/>
                        <circle cx="12" cy="12" r="4"/>
                      </svg>
                    </div>
                    <p className="text-xs text-center">เลือกรายการเพื่อดู<br/>รายละเอียดและ 3D Preview</p>
                  </div>
                </div>
                <div className={`transition-all duration-300 ease-out ${selectedItem ? 'opacity-100 scale-100' : 'opacity-0 scale-95 absolute inset-0 pointer-events-none'}`}>
                  {/* Preview state */}
                  {selectedItem && <DevicePreview item={selectedItem} />}
                </div>
              </div>

              {lastUpdated && (
                <p className="text-[9px] text-slate-300 text-center mt-auto pt-4">
                  อัปเดต {lastUpdated.toLocaleTimeString('th-TH', {hour:'2-digit',minute:'2-digit'})}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
