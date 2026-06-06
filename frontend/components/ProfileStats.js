"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, limit as firestoreLimit } from "firebase/firestore";
import {
  calculateUserStats,
  calculateRadarData,
  getBadges,
  formatMonthLabel,
} from "../lib/analytics";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Target,
  Award,
  Briefcase,
  BarChart3,
  Zap,
  Trophy,
  Medal,
  Flame,
  CalendarCheck,
  Dumbbell,
  Star,
  Rocket,
  Layers,
  HandHelping,
} from "lucide-react";

const COLOR_MAP = {
  amber: "bg-amber-100 text-amber-700 border-amber-200",
  slate: "bg-slate-100 text-slate-700 border-slate-200",
  orange: "bg-orange-100 text-orange-700 border-orange-200",
  rose: "bg-rose-100 text-rose-700 border-rose-200",
  yellow: "bg-yellow-100 text-yellow-700 border-yellow-200",
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  indigo: "bg-indigo-100 text-indigo-700 border-indigo-200",
  violet: "bg-violet-100 text-violet-700 border-violet-200",
  cyan: "bg-cyan-100 text-cyan-700 border-cyan-200",
  pink: "bg-pink-100 text-pink-700 border-pink-200",
};

// Icon map for badges - maps icon name to Lucide component
const ICON_MAP = {
  Trophy,
  Medal,
  Award,
  Flame,
  Zap,
  CalendarCheck,
  Dumbbell,
  Star,
  Rocket,
  Layers,
  HandHelping,
};

// ─── Stats Card Component ───────────────────────────────────────────────────
function StatCard({ title, value, subtitle, icon: Icon, trend }) {
  const trendIcon =
    trend === "up" ? (
      <TrendingUp size={14} className="text-emerald-500" />
    ) : trend === "down" ? (
      <TrendingDown size={14} className="text-rose-500" />
    ) : (
      <Minus size={14} className="text-slate-400" />
    );

  return (
    <div className="apple-panel p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {title}
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {subtitle && (
            <div className="flex items-center gap-1 mt-1">
              {trend && trendIcon}
              <p className="text-xs text-slate-500">{subtitle}</p>
            </div>
          )}
        </div>
        <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center">
          <Icon size={20} className="text-slate-400" />
        </div>
      </div>
    </div>
  );
}

// ─── Radar Chart Component ──────────────────────────────────────────────────
function CategoryRadar({ data }) {
  // Apply abbreviations to data
  const abbreviatedData = useMemo(() => {
    return data.map(d => ({
      ...d,
      subject: shortenLabel(d.subject),
      fullLabel: d.subject // Keep full label for tooltip
    }));
  }, [data]);

  // PM/UX: Need at least 3 different minorTasks for meaningful radar
  if (!data || data.length === 0) {
    return (
      <div className="apple-panel p-6 flex flex-col items-center justify-center h-64">
        <BarChart3 size={32} className="text-slate-300 mb-3" />
        <p className="text-sm text-slate-500">ยังไม่มีข้อมูลหมวดหมู่</p>
        <p className="text-xs text-slate-400 mt-1">
          บันทึกงานเพิ่มเพื่อดูกราฟทักษะ
        </p>
      </div>
    );
  }

  if (data.length < 3) {
    return (
      <div className="apple-panel p-6 flex flex-col items-center justify-center h-64">
        <BarChart3 size={32} className="text-slate-300 mb-3" />
        <p className="text-sm text-slate-500">ข้อมูลไม่พอสำหรับกราฟ</p>
        <p className="text-xs text-slate-400 mt-1 text-center px-4">
          ต้องมีอย่างน้อย 3 หัวข้อรองที่แตกต่างกัน
          <br />
          (ขณะนี้มี {data.length} หัวข้อ)
        </p>
      </div>
    );
  }

  return (
    <div className="apple-panel p-6">
      <h3 className="text-base font-semibold text-slate-900 mb-4">
        การกระจายตามหัวข้อรอง
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={abbreviatedData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fontSize: 10, fill: "#64748b" }}
            />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              name="ทักษะ"
              dataKey="A"
              stroke="#3730a3"
              strokeWidth={2}
              fill="#3730a3"
              fillOpacity={0.25}
            />
            <RechartsTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload;
                return (
                  <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
                    <p className="font-medium text-slate-700">{p.fullLabel || p.subject}</p>
                    <p className="text-slate-500">{p.count} งาน</p>
                  </div>
                );
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-slate-400 mt-2 text-center">
        แสดงสัดส่วนงานตามหัวข้อรองยอดนิยม (normalized)
      </p>
    </div>
  );
}

// ─── Badge with Custom Tooltip ──────────────────────────────────────────────
function BadgeWithTooltip({ badge }) {
  const IconComponent = ICON_MAP[badge.icon] || Award;
  const [show, setShow] = useState(false);
  const timeoutRef = useRef(null);

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShow(true);
  };

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setShow(false), 150);
  };

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  return (
    <div
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium cursor-default ${
          COLOR_MAP[badge.color] || "bg-slate-100 text-slate-700 border-slate-200"
        }`}
      >
        <IconComponent size={16} />
        <span>{badge.name}</span>
      </div>
      {/* Custom tooltip */}
      <div
        className={`absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-max max-w-xs
                   bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-xl
                   transition-all duration-200 pointer-events-none
                   ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}
      >
        <p className="font-medium">{badge.name}</p>
        <p className="text-slate-300 mt-0.5">{badge.desc}</p>
        {/* Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1
                       border-4 border-transparent border-t-slate-800" />
      </div>
    </div>
  );
}

// ─── Badges Component ───────────────────────────────────────────────────────
function BadgesSection({ badges }) {
  if (!badges || badges.length === 0) {
    return (
      <div className="apple-panel p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Award size={18} className="text-amber-500" />
          ตรารางวัล
        </h3>
        <div className="text-center py-6">
          <Award size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">ยังไม่มีตรารางวัล</p>
          <p className="text-xs text-slate-400 mt-1">
            บันทึกงานสะสมเพื่อรับตรารางวัลต่างๆ
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="apple-panel p-6">
      <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <Award size={18} className="text-amber-500" />
        ตรารางวัล ({badges.length})
      </h3>
      <div className="flex flex-wrap gap-2">
        {badges.map((badge) => (
          <BadgeWithTooltip key={badge.id} badge={badge} />
        ))}
      </div>
    </div>
  );
}

// ─── Abbreviation map for minorTask labels (PM/UX: shorter = better on radar)
const ABBREVIATION_MAP = {
  'ช่วยเหลือการใช้งานคอมพิวเตอร์': 'ช่วยดูคอม',
  'เปิดห้องเรียนชั้น 3': 'เปิดชั้น 3',
  'ปิดห้องเรียนชั้น 3': 'ปิดชั้น 3',
  'เปิดห้องเรียนชั้น 4': 'เปิดชั้น 4',
  'ปิดห้องเรียนชั้น 4': 'ปิดชั้น 4',
  'Software ลิขสิทธิ์': 'SW Licence',
  'แก้ไขปัญหา ICIT account': 'ICIT Account',
  'Microsoft Authenticator': 'MS Auth',
  'รับแจ้งและแก้ปัญหาทางโทรศัพท์': 'รับสาย',
  'ติดตั้ง Software': 'ติดตั้ง SW',
  'แก้ไขปัญหาเครื่องพิมพ์,คอมพิวเตอร์': 'ซ่อมเครื่อง',
  'แก้ไขปัญหาการใช้งานคอมพิวเตอร์': 'ซ่อมคอม',
  'แก้ไขปัญหาการเชื่อมต่อ': 'แก้เน็ต',
  'การเติมเงินงานพิมพ์': 'เติมเงินพิมพ์',
  'เช็คอินห้องแลกเปลี่ยนความรู้': 'เช็คอิน',
  'ปิดห้องแลกเปลี่ยนความรู้': 'ปิดห้อง',
};

// Shorten label for radar display
function shortenLabel(label) {
  return ABBREVIATION_MAP[label] || label;
}

// ─── Main ProfileStats Component ────────────────────────────────────────────
export function ProfileStats({ user }) {
  const [worklogs, setWorklogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    async function fetchWorklogs() {
      try {
        // [SA] Limit 500 to prevent quota overuse - enough for stats
        const q = query(
          collection(db, "worklogs"),
          where("employeeId", "==", user.uid),
          firestoreLimit(500)
        );
        const snapshot = await getDocs(q);
        const logs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setWorklogs(logs);
      } catch (err) {
        console.error("Error fetching worklogs:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchWorklogs();
  }, [user?.uid]);

  const stats = useMemo(() => calculateUserStats(worklogs, user), [worklogs, user]);
  const radarData = useMemo(() => calculateRadarData(worklogs), [worklogs]);
  const badges = useMemo(() => getBadges(stats, worklogs), [stats, worklogs]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="apple-panel p-5 h-28 animate-pulse bg-slate-50" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="apple-panel h-80 animate-pulse bg-slate-50" />
          <div className="apple-panel h-80 animate-pulse bg-slate-50" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="งานทั้งหมด"
          value={stats.totalWorklogs}
          subtitle={`${stats.totalDays} วันที่ทำงาน`}
          icon={Briefcase}
          trend={stats.trend}
        />
        <StatCard
          title="เดือนนี้"
          value={stats.thisMonth}
          subtitle={
            stats.thisMonth > stats.lastMonth
              ? `เพิ่มจากเดือนที่แล้ว ${stats.thisMonth - stats.lastMonth}`
              : stats.thisMonth < stats.lastMonth
              ? `ลดจากเดือนที่แล้ว ${stats.lastMonth - stats.thisMonth}`
              : "เท่ากับเดือนที่แล้ว"
          }
          icon={Calendar}
          trend={stats.trend}
        />
        <StatCard
          title="streak"
          value={stats.streak > 0 ? `${stats.streak} วัน` : "—"}
          subtitle={
            stats.longestStreak > stats.streak
              ? `สูงสุด ${stats.longestStreak} วัน`
              : "กำลังต่อเนื่อง!"
          }
          icon={Zap}
        />
        <StatCard
          title="หมวดหมู่หลัก"
          value={stats.topCategory || "—"}
          subtitle={stats.topCategory ? `${stats.topCategoryCount} งาน` : "ยังไม่มีข้อมูล"}
          icon={Target}
        />
      </div>

      {/* Radar Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CategoryRadar data={radarData} />
        <BadgesSection badges={badges} />
      </div>
    </div>
  );
}
