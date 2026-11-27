"use client";

import { useState, useEffect } from 'react';
import { useSharedResourceStatus } from '../hooks/useSharedResourceStatus';
import { Monitor, Headphones, Plug, Activity, Download, Wrench, Ban, Usb } from 'lucide-react';
import { getFirestore, collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { useAuth } from './AuthProvider';
import { isAdminRole } from '../lib/authUtils';
import { calendarToday, classroomAppliesOn } from '../lib/calendarView';
import { EQUIPMENT_LABELS, visibleEquipment } from '../lib/equipmentCatalog';
import { ResourceDirectory } from './ResourceDirectory';

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
  // USB ICIT26-29
  'ICIT26': { barcode: '-', itemNo: 26, name: 'USB' },
  'ICIT27': { barcode: '-', itemNo: 27, name: 'USB' },
  'ICIT28': { barcode: '-', itemNo: 28, name: 'USB' },
  'ICIT29': { barcode: '-', itemNo: 29, name: 'USB' },
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

// USB Flash Drive 3D
const Usb3D = ({ inUse = false }) => (
  <Device3DContainer inUse={inUse}>
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
      {/* USB body */}
      <rect x="35" y="15" width="30" height="55" rx="4" fill="#27272a" />
      <rect x="38" y="18" width="24" height="49" rx="2" fill={inUse ? '#1a1a2e' : '#3f3f46'} />
      {/* Connector */}
      <rect x="38" y="70" width="24" height="18" rx="2" fill="#a1a1aa" />
      <rect x="40" y="72" width="20" height="14" rx="1" fill="#d4d4d8" />
      {/* USB pins */}
      <rect x="43" y="74" width="4" height="8" rx="0.5" fill="#71717a" />
      <rect x="53" y="74" width="4" height="8" rx="0.5" fill="#71717a" />
      {/* LED */}
      <circle cx="50" cy="28" r="3" fill={inUse ? '#ef4444' : '#22c55e'} className="animate-pulse" />
      {/* Label */}
      <rect x="42" y="38" width="16" height="3" rx="1" fill="#52525b" />
      <rect x="44" y="44" width="12" height="2" rx="0.5" fill="#52525b" opacity="0.6" />
    </svg>
  </Device3DContainer>
);

// Preview Panel Component
const DevicePreview = ({ item }) => {
  if (!item) return null;
  
  const render3D = () => {
    switch (item.type) {
      case 'headphones': return <Headphones3D inUse={item.inUse} />;
      case 'power': return <PowerStrip3D inUse={item.inUse} />;
      case 'usb': return <Usb3D inUse={item.inUse} />;
      case 'room': return <Room3D os={item.os} inUse={item.inUse} />;
      default: return null;
    }
  };

  return (
    <div className="h-full flex flex-col space-y-2 justify-center">
      {/* 3D Preview - Compact */}
      <div className="relative py-1 flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-100/50 to-transparent rounded-2xl" />
        {render3D()}
      </div>
      
      {/* Status indicator - Compact */}
      <div className={`rounded-lg p-2 flex flex-col items-center gap-1 flex-shrink-0 ${
        item.inUse ? 'bg-red-50/80 border border-red-100'
        : item.condition === 'damaged' ? 'bg-amber-50/80 border border-amber-100'
        : item.unknown || item.condition === 'lost' ? 'bg-slate-100/80 border border-slate-200'
        : 'bg-emerald-50/80 border border-emerald-100'
      }`}>
        <div className={`w-2 h-2 rounded-full ${
          item.inUse ? 'bg-red-400 animate-pulse'
          : item.condition === 'damaged' ? 'bg-amber-400'
          : item.unknown || item.condition === 'lost' ? 'bg-slate-400'
          : 'bg-emerald-400'
        }`} />
        <span className={`text-xs font-bold ${
          item.inUse ? 'text-red-700'
          : item.condition === 'damaged' ? 'text-amber-700'
          : item.unknown || item.condition === 'lost' ? 'text-slate-500'
          : 'text-emerald-700'
        }`}>
          {item.inUse ? 'กำลังใช้งาน'
          : item.unknown ? 'ตรวจสอบประวัติอุปกรณ์'
          : item.condition === 'damaged' ? 'ชำรุด — ยืมไม่ได้'
          : item.condition === 'lost' ? 'สูญหาย — ยืมไม่ได้'
          : 'พร้อมใช้งาน'}
        </span>
      </div>

      {/* Info - Compact */}
      <div className="text-center space-y-0.5 flex-shrink-0">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider">{item.location}</p>
        <p className="text-base font-bold text-slate-800 font-mono">{item.id}</p>
        {item.os && <p className="text-xs text-slate-500">{item.os}</p>}
        
        {/* Equipment Details - Compact */}
        {EQUIPMENT_DETAILS[item.id] && (
          <div className="pt-1">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-full">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-500">
                <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7"/><path d="M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/>
              </svg>
              <span className="text-[9px] font-mono text-slate-600 tracking-tight">
                {EQUIPMENT_DETAILS[item.id].barcode}
              </span>
            </div>
            <p className="text-[8px] text-slate-400 mt-0.5">Item #{EQUIPMENT_DETAILS[item.id].itemNo}</p>
          </div>
        )}
      </div>

      {/* Usage Details - DYNAMIC BASED ON STATUS */}
      {item.inUse && item.detail ? (
        <div className="bg-white rounded-lg p-2 border border-slate-100 space-y-1.5 shadow-sm flex-shrink-0">
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
        <div className={`rounded-lg p-2 border shadow-sm flex-shrink-0 ${getConditionBadge(item.condition)?.color || 'bg-slate-50 border-slate-100'}`}>
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
        <div className="bg-white rounded-lg p-2 border border-slate-100 shadow-sm flex-shrink-0">
          <p className={`text-xs text-center font-medium ${
            item.inUse 
              ? 'text-red-500' 
              : item.type === 'room' 
                ? 'text-emerald-600' 
                : 'text-slate-400'
          }`}>
            {item.unknown ? 'ยังยืนยันสถานะไม่ได้' : item.inUse
              ? (item.type === 'room' ? 'ห้องกำลังใช้งานอยู่' : 'อุปกรณ์ถูกยืมใช้งาน')
              : (item.type === 'room' ? 'ห้องว่าง พร้อมเช็คอิน' : 'พร้อมให้ยืมใช้งาน')
            }
          </p>
        </div>
      )}
    </div>
  );
};

function equipmentDot({ inUse, condition, unknown }) {
  if (inUse) return 'bg-rose-400';
  if (condition === 'damaged') return 'bg-amber-400';
  if (unknown || condition === 'lost') return 'bg-slate-400';
  return 'bg-emerald-400';
}

export default function RoomEquipmentStatus({ directory = false }) {
  const { user } = useAuth();
  const isAdmin = isAdminRole(user);

  const [expanded, setExpanded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { status, updatedAt: lastUpdated, loading, error: statusError, retry } = useSharedResourceStatus({ refreshEveryMs: 5 * 60_000 });
  const roomStatus = status?.roomStatus ?? {};
  const equipmentStatus = status?.equipmentStatus ?? {};
  const equipmentConditions = status?.equipmentConditions ?? {};
  const equipmentDetails = status?.details ?? {};
  const [selectedId, setSelectedId] = useState(null);
  
  // [SE] View toggle: 'rooms' | 'equipment'
  const [activeView, setActiveView] = useState('rooms');

  // SE: Date range for transaction history export
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });

  const roomOsMap = {
    "303": "Windows", "304": "iOS", "305": "Android", "306": "Linux"
  };

  const exportToCSV = () => {
    const headers = ['รหัสอุปกรณ์', 'ประเภท', 'สังกัด', 'สถานะการใช้งาน', 'สภาพอุปกรณ์', 'บันทึกล่าสุด', 'Barcode', 'Item No'];
    const rows = equipmentItems.map(item => {
      const details = EQUIPMENT_DETAILS[item.id];
      return [
        item.id, EQUIPMENT_LABELS[item.type], item.location.replace(/^(\s*[=+@-]|[\t\r\n])/, "'$1"),
        item.unknown ? 'ไม่ทราบสถานะ' : item.inUse ? 'กำลังใช้งาน' : 'พร้อมใช้งาน',
        item.unknown ? 'ยังไม่ระบุ' : item.condition === 'damaged' ? 'ชำรุด' : item.condition === 'lost' ? 'สูญหาย' : 'สมบูรณ์',
        lastUpdated ? lastUpdated.toLocaleString('th-TH') : '-',
        details?.barcode || '-', details?.itemNo || '-'
      ];
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
      setExporting(true);
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
      setExporting(false);
    }
  };

  const allRooms3 = ['303', '304', '305', '306'];
  const allRooms4 = ['401', '402', '406', '407'];
  const roomItems = [...allRooms3, ...allRooms4].map(id => ({
    type: 'room', id, label: id, location: `ห้องบริการ ชั้น ${id[0]}`,
    status: roomStatus[id], inUse: roomStatus[id] === 'in_use', os: roomOsMap[id]
  }));
  const equipmentItems = visibleEquipment(status?.equipmentCatalog ?? [], equipmentStatus).map(({ id, kind, location }) => ({
    type: kind, id, label: `${EQUIPMENT_LABELS[kind]} ${id.slice(4)}`, location: location || 'ไม่ระบุสังกัด',
    status: equipmentStatus[kind]?.[id], inUse: equipmentStatus[kind]?.[id] === 'in_use',
    unknown: !['available', 'in_use'].includes(equipmentStatus[kind]?.[id]),
    detail: equipmentDetails[id], condition: equipmentConditions[id]
  }));
  const equipmentGroups = new Map();
  for (const item of equipmentItems) {
    const label = `${EQUIPMENT_LABELS[item.type]} · ${item.location}`;
    const entries = equipmentGroups.get(label) ?? [];
    entries.push(item);
    equipmentGroups.set(label, entries);
  }

  const anyInUse = [...roomItems, ...equipmentItems].some(item => item.inUse);
  const navItems = activeView === 'rooms' ? roomItems : equipmentItems;
  const selectedIndex = navItems.findIndex(item => item.id === selectedId);
  const selectedItem = navItems[selectedIndex];

  const navigate = offset => {
    if (!selectedItem) return;
    setSelectedId(navItems[(selectedIndex + offset + navItems.length) % navItems.length].id);
  };

  if (directory) return <ResourceDirectory
    rooms={roomItems}
    equipment={equipmentItems}
    admin={isAdmin}
    loading={loading}
    error={statusError}
    retry={retry}
    onExport={exportToCSV}
    history={{ start: startDate, end: endDate, setStart: setStartDate, setEnd: setEndDate, exporting, onExport: exportTransactionHistory }}
  />;

  return (
    <div className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden shadow-sm">

      {/* ── Compact bar ── */}
      <button
        onClick={() => {
          const next = !expanded;
          setExpanded(next);
          if (!next) setSelectedId(null);
          else if (!selectedItem) setSelectedId(navItems[0]?.id ?? null);
        }}
        className="w-full flex items-center gap-0 px-4 py-3 hover:bg-slate-50/80 transition-colors text-left"
      >
        {statusError ? <p role="alert" className="py-4 text-sm text-slate-600">โหลดสถานะล่าสุดไม่สำเร็จ <button type="button" className="underline" onClick={retry}>ลองอีกครั้ง</button></p> : loading ? (
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
            {[...equipmentGroups].map(([label, items]) => (
              <div key={label} className="flex items-center gap-1 shrink-0">
                <div className="flex gap-[2px]">
                  {items.map(item => <span key={item.id} className={`w-1 h-1 rounded-full ${equipmentDot(item)}`} />)}
                </div>
                <span className={`text-[10px] font-medium ${items.some(item => item.inUse) ? 'text-red-500' : items.some(item => ['damaged', 'lost'].includes(item.condition)) ? 'text-amber-500' : 'text-slate-400'}`}>{label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0 ml-2">
          {!loading && !statusError && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              anyInUse
                ? 'bg-red-50 text-red-500'
                : 'bg-emerald-50 text-emerald-600'
            }`}>
              {anyInUse ? 'มีการใช้งาน' : equipmentItems.some(item => item.unknown) ? 'มีรายการที่ต้องตรวจ' : 'ว่างทั้งหมด'}
            </span>
          )}
          {/* [SE/SA] Export CSV button for admin - iOS minimal style */}
          {isAdmin && expanded && !statusError && (
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
      {expanded && !loading && !statusError && (
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
                  disabled={exporting}
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
            <div className="w-full md:w-[42%] overflow-y-auto h-[420px] md:h-[480px] scroll-smooth snap-y snap-mandatory">
              
              {/* [SE] View Toggle Tabs */}
              <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-100 p-2 flex gap-1">
                <button
                  onClick={() => { 
                    setActiveView('rooms'); 
                    setSelectedId(roomItems[0].id);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10px] font-medium transition-all ${
                    activeView === 'rooms'
                      ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 21h18M5 21V7l8-4 8 4v14M9 21v-8h6v8"/>
                  </svg>
                  ห้องบริการ
                </button>
                <button
                  onClick={() => { 
                    setActiveView('equipment'); 
                    setSelectedId(equipmentItems[0]?.id ?? null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10px] font-medium transition-all ${
                    activeView === 'equipment'
                      ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2a3 3 0 0 0-3 3v14a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                    <path d="M12 11h.01"/>
                  </svg>
                  อุปกรณ์
                </button>
              </div>

              <div className="p-2 space-y-2">
                {activeView === 'rooms' ? (
                  <>
                    {/* Section: ห้อง ชั้น 3 */}
                    <div>
                      <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">ห้องบริการ ชั้น 3</p>
                      <div className="grid grid-cols-5 sm:grid-cols-8 gap-1">
                        {allRooms3.map(r => {
                          const inUse = roomStatus[r] === 'in_use';
                          return (
                            <button key={r} onClick={() => setSelectedId(r)}
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
                            <button key={r} onClick={() => setSelectedId(r)}
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

                    {/* Section: ตารางเรียนวันนี้ ชั้น 4 */}
                    <ClassroomScheduleSection />
            </>
          ) : (
            equipmentGroups.size ? [...equipmentGroups].map(([label, items]) => (
              <div key={label}>
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                <div className="grid grid-cols-6 sm:grid-cols-10 gap-0.5">
                  {items.map(item => {
                    const { id, inUse, condition } = item;
                    const selected = selectedId === id;
                    const colors = inUse ? 'bg-rose-50 border-rose-100 text-rose-700'
                      : condition === 'damaged' ? 'bg-amber-50 border-amber-100 text-amber-700'
                      : condition === 'lost' ? 'bg-slate-100 border-slate-200 text-slate-500'
                      : 'bg-slate-50 border-slate-100 text-slate-500';
                    return (
                      <button key={id} type="button" aria-label={`${id} · ${item.location}`} aria-pressed={selected}
                        onClick={() => setSelectedId(id)}
                        className={`rounded-md p-1 flex flex-col items-center gap-0.5 transition-all duration-200 ease-out active:scale-95 snap-start ${selected ? 'ring-2 ring-blue-400 bg-blue-50 shadow-sm' : colors}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${equipmentDot(item)}`} />
                        <span className="text-[9px] font-bold break-all">{id.slice(4)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )) : <p className="p-2 text-sm text-slate-500">ไม่มีรายการอุปกรณ์</p>
          )}
        </div>
      </div>

      {/* ฝั่งขวา: 3D Preview Panel - 60% - Fixed height container */}
      <div className="relative w-full md:w-[58%] bg-gradient-to-b from-slate-50/80 to-white border-b md:border-b-0 md:border-l border-slate-100 p-3 md:p-4 flex flex-col h-[420px] md:h-[480px] overflow-hidden">
              {/* Navigation buttons */}
              <div className="absolute top-3 left-3 right-3 z-10 flex justify-between pointer-events-none">
                <button
                  onClick={() => navigate(-1)}
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
                  onClick={() => navigate(1)}
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

              {/* Fixed content wrapper for smooth transitions - NO SCROLLBAR */}
              <div className="flex-1 flex flex-col relative overflow-hidden pt-10">
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

// Component แสดงตารางเรียนวันนี้
function ClassroomScheduleSection() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  const dayLabels = {
    sunday: "อาทิตย์",
    monday: "จันทร์",
    tuesday: "อังคาร",
    wednesday: "พุธ",
    thursday: "พฤหัสบดี",
    friday: "ศุกร์",
    saturday: "เสาร์",
  };

  const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const db = (await import('../lib/firebase')).db;
        const { collection, query, where, orderBy, getDocs } = await import('firebase/firestore');

        const today = calendarToday();
        const dayOfWeek = DAYS[new Date(today + 'T12:00:00Z').getUTCDay()];

        const q = query(
          collection(db, "classroomSchedules"),
          where("isActive", "==", true),
          where("dayOfWeek", "==", dayOfWeek),
          orderBy("startTime", "asc")
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSchedules(data.filter(schedule => classroomAppliesOn(schedule, today)));
      } catch (err) {
        console.error("Error fetching schedules:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();

    // Refresh every 5 minutes
    const interval = setInterval(fetchSchedules, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-2 bg-blue-50/50 rounded-lg border border-blue-100">
        <p className="text-[9px] font-semibold text-blue-400 uppercase tracking-wider mb-2">ตารางเรียนวันนี้</p>
        <div className="animate-pulse space-y-1">
          <div className="h-4 bg-blue-100 rounded w-3/4"></div>
          <div className="h-4 bg-blue-100 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">ตารางเรียนวันนี้</p>
        <p className="text-[10px] text-slate-500">ไม่มีตารางเรียนชั้น 4 วันนี้</p>
      </div>
    );
  }

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
      <p className="text-[9px] font-semibold text-blue-600 uppercase tracking-wider mb-2">
        ตารางเรียนวันนี้ ({schedules.length} รายการ)
      </p>
      <div className="space-y-1.5">
        {schedules.map((schedule) => {
          const isInProgress = currentTime >= schedule.startTime && currentTime < schedule.endTime;
          const isUpcoming = currentTime < schedule.startTime;

          return (
            <div
              key={schedule.id}
              className={`p-1.5 rounded-md text-xs ${
                isInProgress
                  ? "bg-amber-50 border border-amber-200"
                  : isUpcoming
                  ? "bg-white/80 border border-blue-100"
                  : "bg-slate-50/50 border border-slate-100 opacity-60"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  isInProgress ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                }`}>
                  ห้อง {schedule.room}
                </span>
                <span className="text-[10px] text-slate-600">
                  {schedule.startTime} - {schedule.endTime}
                </span>
                {isInProgress && (
                  <span className="text-[9px] font-medium text-amber-600 animate-pulse">
                    กำลังเรียน
                  </span>
                )}
              </div>
              <p className="text-[11px] font-medium text-slate-700 mt-1 truncate">{schedule.subject}</p>
              {schedule.teacher && (
                <p className="text-[9px] text-slate-500">{schedule.teacher}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
