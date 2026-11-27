"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, orderBy, getDocs, limit as firestoreLimit } from "firebase/firestore";
import "../app/ui-detail-layouts.css";
import {
  calculateUserStats,
  calculateRadarData,
  getBadges,
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
  Calendar,
  Target,
  Award,
  Briefcase,
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
function StatCard({ title, value, subtitle, icon: Icon, textValue = false }) {
  return (
    <div className="apple-panel profile-stat-card">
      <div className="profile-stat-heading">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
        <div className="profile-stat-icon w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center">
          <Icon size={20} className="text-slate-400" aria-hidden="true" />
        </div>
      </div>
      <p className={`profile-stat-value ${textValue ? "profile-stat-value--text" : "text-2xl"} font-bold text-slate-900 mt-1`}>{value}</p>
      {subtitle && (
        <div className="flex items-center gap-1 mt-1">
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      )}
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

  return (
    <div className="apple-panel p-6">
      <h3 className="text-base font-semibold text-slate-900 mb-4">
        หัวข้อรองที่บันทึกบ่อย
      </h3>
      {data.length >= 3 && <div className="h-64" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={abbreviatedData} accessibilityLayer={false} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <PolarGrid stroke="var(--ui-line)" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fontSize: 11, fill: "var(--ui-sub)" }}
            />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              name="ความถี่สัมพัทธ์"
              dataKey="A"
              stroke="var(--ui-purple-ink)"
              strokeWidth={2}
              fill="var(--ui-purple-ink)"
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
      </div>}
      {data.length ? <ul className="profile-topic-counts" aria-label="จำนวนบันทึกแยกตามหัวข้อรอง">
        {data.map(item => <li key={item.subject}><span>{item.subject}</span><b>{item.count} รายการ</b></li>)}
      </ul> : <p className="ui-caption">ยังไม่มีบันทึกให้สรุป</p>}
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
const profileLimit = 500;
const emptyWorklogs = [];

export function ProfileStats({ user }) {
  const [result, setResult] = useState(null);
  const uid = user?.uid;
  const current = result?.uid === uid ? result : null;
  const worklogs = current?.worklogs ?? emptyWorklogs;
  const loading = !current;

  useEffect(() => {
    if (!uid) return;
    let active = true;

    async function fetchWorklogs() {
      try {
        const q = query(
          collection(db, "worklogs"),
          where("employeeId", "==", uid),
          orderBy("date", "desc"),
          firestoreLimit(profileLimit)
        );
        const snapshot = await getDocs(q);
        const logs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        if (active) setResult({ uid, worklogs: logs });
      } catch {
        if (active) setResult({ uid, error: true });
      }
    }

    fetchWorklogs();
    return () => { active = false; };
  }, [uid]);

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
  if (current?.error) return <p className="apple-panel p-4 text-slate-600" role="alert">โหลดสถิติโปรไฟล์ไม่สำเร็จ</p>;

  return (
    <div className="space-y-6">
      <p className="ui-caption">สถิติและกราฟคำนวณจากบันทึกล่าสุดสูงสุด {profileLimit} รายการ เรียงตามวันที่ทำงาน</p>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="บันทึกที่ใช้คำนวณ"
          value={stats.totalWorklogs}
          subtitle={`มีบันทึก ${stats.totalDays} วัน`}
          icon={Briefcase}
        />
        <StatCard
          title="เดือนนี้"
          value={stats.thisMonth}
          subtitle="รายการที่บันทึกในเดือนนี้"
          icon={Calendar}
        />
        <StatCard
          title="วันที่มีบันทึกต่อเนื่อง"
          value={stats.streak > 0 ? `${stats.streak} วัน` : "—"}
          subtitle={
            stats.longestStreak > stats.streak
              ? `สูงสุด ${stats.longestStreak} วัน`
              : undefined
          }
          icon={Zap}
        />
        <StatCard
          title="หัวข้อรองที่บันทึกบ่อยที่สุด"
          value={stats.topCategory || "—"}
          subtitle={stats.topCategory ? `${stats.topCategoryCount} งาน` : "ยังไม่มีข้อมูล"}
          icon={Target}
          textValue
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
