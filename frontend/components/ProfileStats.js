"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, query, where, orderBy, getDocs, limit as firestoreLimit } from "firebase/firestore";
import { Award, Briefcase, CalendarDays, ChevronDown, Target } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import { calculateUserStats, calculateRadarData, getBadges } from "../lib/analytics";
import { calendarLabel, calendarToday, validCalendarDate } from "../lib/calendarView";
import { db } from "../lib/firebase";
import { profileWorklogsInScope, recentProfileTopicWorklogs } from "../lib/profileWorklogScope";
import { useAppearance } from "./ui/AppearanceProvider";
import { GlassButton, GlassControlGroup } from "./ui/GlassControls";

const profileLimit = 500;
const emptyWorklogs = [];
const periods = [
  ["month", "เดือนนี้"],
  ["last90", "90 วันล่าสุด"],
  ["recent", "บันทึกล่าสุด"],
];

const shortTopic = {
  "ช่วยเหลือการใช้งานคอมพิวเตอร์": "ช่วยดูคอม",
  "เปิดห้องเรียนชั้น 3": "เปิดชั้น 3",
  "ปิดห้องเรียนชั้น 3": "ปิดชั้น 3",
  "เปิดห้องเรียนชั้น 4": "เปิดชั้น 4",
  "ปิดห้องเรียนชั้น 4": "ปิดชั้น 4",
  "Software ลิขสิทธิ์": "SW Licence",
  "แก้ไขปัญหา ICIT account": "ICIT Account",
  "Microsoft Authenticator": "MS Auth",
  "รับแจ้งและแก้ปัญหาทางโทรศัพท์": "รับสาย",
  "ติดตั้ง Software": "ติดตั้ง SW",
  "แก้ไขปัญหาเครื่องพิมพ์,คอมพิวเตอร์": "ซ่อมเครื่อง",
  "แก้ไขปัญหาการใช้งานคอมพิวเตอร์": "ซ่อมคอม",
  "แก้ไขปัญหาการเชื่อมต่อ": "แก้เน็ต",
  "การเติมเงินงานพิมพ์": "เติมเงินพิมพ์",
  "เช็คอินห้องแลกเปลี่ยนความรู้": "เช็คอิน",
  "ปิดห้องแลกเปลี่ยนความรู้": "ปิดห้อง",
};

function StatCard({ title, value, note, icon: Icon, tone, textValue = false }) {
  return <div className="apple-panel profile-stat-card">
    <div className="profile-stat-heading">
      <p className="ui-caption">{title}</p>
      <span className="ui-nav-symbol" data-tone={tone}><Icon size={19} aria-hidden="true" /></span>
    </div>
    <p className="profile-stat-value" data-text={textValue}>{value}</p>
    {note && <p className="ui-caption">{note}</p>}
  </div>;
}

function ProfileRadar({ data }) {
  const { resolved } = useAppearance();
  const labels = useMemo(() => data.map(item => ({
    ...item,
    shortName: Object.hasOwn(shortTopic, item.subject) ? shortTopic[item.subject] : item.subject,
  })), [data]);

  if (data.length < 3) return null;

  return <div className="profile-radar" aria-hidden="true">
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <RadarChart data={labels} outerRadius="68%" accessibilityLayer={false} margin={{ top: 12, right: 16, bottom: 12, left: 16 }}>
        <PolarGrid stroke="var(--ui-line)" />
        <PolarAngleAxis dataKey="shortName" tick={{ fontSize: 12, fill: "var(--ui-sub)" }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
        <Radar name="ความถี่สัมพัทธ์" dataKey="A" stroke="var(--ui-purple-ink)" strokeWidth={2}
          fill="var(--ui-purple-ink)" fillOpacity={0.25} isAnimationActive={!resolved.reducedMotion} animationDuration={200} />
        <Tooltip content={({ active, payload }) => {
          if (!active || !payload?.length) return null;
          const topic = payload[0].payload;
          return <div className="profile-chart-tooltip"><strong>{topic.subject}</strong><p>{topic.count} รายการ</p></div>;
        }} />
      </RadarChart>
    </ResponsiveContainer>
  </div>;
}

function ProfileTopics({ topics, scope, worklogs }) {
  return <section className="apple-panel profile-stat-panel" aria-labelledby="profile-topics-title">
    <h3 id="profile-topics-title">หัวข้อรองที่บันทึกบ่อย</h3>
    <ProfileRadar data={topics} />
    {topics.length ? <ul className="profile-topics">
      {topics.map(({ subject, count }) => <li key={scope + ":" + subject}>
        <details className="profile-topic">
          <summary><span>{subject}</span><b>{count} รายการ</b><ChevronDown size={16} aria-hidden="true" /></summary>
          <div className="profile-topic-details">
            <p className="ui-caption">บันทึกล่าสุดในหัวข้อนี้</p>
            <ul className="profile-topic-worklogs">
              {recentProfileTopicWorklogs(worklogs, subject).map(worklog => <li key={worklog.id}>
                <strong>{validCalendarDate(worklog.date) ? calendarLabel(worklog.date, { dateStyle: "medium" }) : "ไม่ระบุวันที่"}
                  {worklog.time && " · " + worklog.time}</strong>
                {typeof worklog.comment === "string" && worklog.comment.trim() && <p>{worklog.comment}</p>}
              </li>)}
            </ul>
          </div>
        </details>
      </li>)}
    </ul> : <p className="ui-caption">ยังไม่มีบันทึกในช่วงเวลานี้</p>}
  </section>;
}

function ProfileBadges({ stats, badges }) {
  return <section className="apple-panel profile-stat-panel" aria-labelledby="profile-badges-title">
    <h3 id="profile-badges-title"><Award size={19} aria-hidden="true" /> ตรารางวัล</h3>
    <p className="ui-caption">คำนวณจากบันทึกล่าสุดที่โหลด</p>
    {stats.longestStreak > 0 && <p className="profile-streak">บันทึกต่อเนื่องสูงสุด {stats.longestStreak} วัน</p>}
    {badges.length ? <ul className="profile-badges">
      {badges.map(badge => <li key={badge.id}>
        <details className="profile-badge">
          <summary><span>{badge.name}</span><ChevronDown size={16} aria-hidden="true" /></summary>
          <p className="ui-caption">{badge.desc}</p>
        </details>
      </li>)}
    </ul> : <p className="profile-streak">ยังไม่มีตรารางวัล</p>}
  </section>;
}

export function ProfileStats({ user }) {
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [scope, setScope] = useState("month");
  const uid = user?.uid;
  const current = uid && result?.uid === uid && result.attempt === attempt ? result : null;
  const worklogs = current?.worklogs ?? emptyWorklogs;
  const today = calendarToday();

  useEffect(() => {
    if (!uid) return;
    let active = true;
    const worklogQuery = query(collection(db, "worklogs"),
      where("employeeId", "==", uid), orderBy("date", "desc"), firestoreLimit(profileLimit));
    getDocs(worklogQuery).then(snapshot => {
      if (!active) return;
      const logs = snapshot.docs.map(document => ({ ...document.data(), id: document.id }));
      setResult({ uid, attempt, worklogs: logs });
    }).catch(() => {
      if (active) setResult({ uid, attempt, error: true });
    });
    return () => { active = false; };
  }, [uid, attempt]);

  const scopedWorklogs = useMemo(() => profileWorklogsInScope(worklogs, scope, today), [worklogs, scope, today]);
  const topics = useMemo(() => calculateRadarData(scopedWorklogs), [scopedWorklogs]);
  const days = useMemo(() => new Set(scopedWorklogs.map(log => log.date).filter(validCalendarDate)).size, [scopedWorklogs]);
  const awardStats = useMemo(() => calculateUserStats(worklogs, user), [worklogs, user]);
  const badges = useMemo(() => getBadges(awardStats, worklogs), [awardStats, worklogs]);
  const leadingTopic = topics[0];

  if (!current) return <p className="apple-panel profile-stat-panel" role="status">กำลังโหลดสถิติโปรไฟล์…</p>;
  if (current.error) return <div className="apple-panel profile-stat-panel profile-stats-error">
    <p role="alert">โหลดสถิติโปรไฟล์ไม่สำเร็จ</p>
    <GlassButton onClick={() => setAttempt(value => value + 1)}>ลองใหม่</GlassButton>
  </div>;

  return <div className="profile-stats">
    <div className="profile-period">
      <GlassControlGroup mode="quick" label="ช่วงเวลาสถิติ" className="profile-period-controls">
        {periods.map(([value, label]) => <button type="button" key={value}
          aria-pressed={scope === value} onClick={() => setScope(value)}>{label}</button>)}
      </GlassControlGroup>
      <p className="ui-caption" role="status">{scopedWorklogs.length} รายการในช่วงที่เลือก</p>
    </div>
    {worklogs.length >= profileLimit && <p className="ui-caption">สถิติอิงจาก {profileLimit} บันทึกล่าสุด และอาจไม่ครอบคลุมทั้งช่วง</p>}
    <div className="profile-stat-grid">
      <StatCard title="บันทึกในช่วงที่เลือก" value={scopedWorklogs.length} icon={Briefcase} tone="blue" />
      <StatCard title="วันที่มีบันทึก" value={days + " วัน"} icon={CalendarDays} tone="green" />
      <StatCard title="หัวข้อที่บันทึกบ่อยที่สุด" value={leadingTopic?.subject || "—"} note={leadingTopic && leadingTopic.count + " รายการ"}
        icon={Target} tone="purple" textValue />
    </div>
    <div className="profile-stats-breakdown">
      <ProfileTopics topics={topics} scope={scope} worklogs={scopedWorklogs} />
      <ProfileBadges stats={awardStats} badges={badges} />
    </div>
  </div>;
}
