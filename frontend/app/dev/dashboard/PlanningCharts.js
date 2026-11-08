"use client";

import { useState } from "react";
import { GlassButton, GlassControlGroup } from "../../../components/ui/GlassControls";
import { assessmentDistribution } from "../../../lib/assessmentPreview";
import { calendarToday } from "../../../lib/calendarView";
import { planningTrend } from "../../../lib/planningPreview";
const chartLabels = {
  "1.1": "ซ่อมฯ ภายในสำนัก",
  "1.2": "ซ่อมฯ หน่วยงาน",
  "1.3": "ห้องและเครื่องพิมพ์",
  "1.4": "ยืม–คืนอุปกรณ์",
  "1.5": "ระบบสารสนเทศ",
  "1.6": "บัญชี 3 มิติ",
  "1.7": "IT Clinic",
  "1.8": "Digital Literacy",
  "2.1": "สนับสนุนฝ่ายอื่น",
  "3.1": "งานมอบหมาย",
  unmapped: "ยังไม่จับคู่"
};
export function StaffDistribution({
  rows,
  people,
  mapping,
  onPerson,
  partial
}) {
  const [mode, setMode] = useState("count"),
    distribution = assessmentDistribution(rows, people, mapping);
  const max = Math.max(1, ...distribution.map(person => person.total));
  const legend = distribution[0]?.segments.filter(segment => distribution.some(person => person.segments.find(item => item.id === segment.id)?.count)) || [];
  return <section className="planning-panel planning-distribution"><div className="planning-panel-head"><div><h2>การกระจายกิจกรรมตามหมวดงาน</h2><p className="ui-caption">เรียงตามรายชื่อทีม · หมวดตามแบบประเมิน · {partial ? "นับเฉพาะข้อมูลที่โหลดแล้ว" : "นับบันทึกในช่วงที่เลือก"}</p></div><GlassControlGroup mode="quick" label="หน่วยกราฟการกระจายงาน">{[["count", "จำนวน"], ["share", "สัดส่วน"]].map(([value, label]) => <button key={value} aria-pressed={mode === value} onClick={() => setMode(value)}>{label}</button>)}</GlassControlGroup></div>
    <div className="planning-distribution-legend">{legend.map(segment => <span key={segment.id}><i data-chart-tone={segment.tone} aria-hidden="true" />{segment.id !== "unmapped" ? segment.id + " " : ""}{chartLabels[segment.id] || segment.label}</span>)}</div>
    <div className="planning-distribution-rows">{distribution.map(person => <button key={person.id} className="planning-distribution-row" onClick={() => onPerson(person.id, person.displayName)} aria-label={`${person.displayName} ${person.total} ครั้ง ${person.segments.filter(segment => segment.count).map(segment => `${segment.label} ${segment.count} ครั้ง`).join(" · ")}`}><span className="planning-distribution-person">{person.displayName}</span><span className="planning-distribution-track" aria-hidden="true"><span style={{
            width: `${mode === "share" && person.total ? 100 : person.total / max * 100}%`
          }}>{person.segments.filter(segment => segment.count > 0).map(segment => <i key={segment.id} data-chart-tone={segment.tone} style={{
              width: `${segment.count / person.total * 100}%`
            }} />)}</span></span><strong>{partial ? "≥" : ""}{person.total}<small>ครั้ง</small></strong></button>)}</div>
    {!legend.length && <p className="planning-empty">ยังไม่มีบันทึกตรงกับบุคคลและช่วงที่เลือก</p>}
    <p className="ui-caption">{mode === "share" ? "แต่ละแถบรวม 100% ของบันทึกของคนนั้น ตัวเลขด้านขวายังคงเป็นจำนวนครั้งจริง · " : "ความยาวแถบเปรียบเทียบจำนวนบันทึก · "}จำนวนและสัดส่วนบันทึกไม่ใช่เวลาทำงาน ความยาก หรือคะแนนบุคลากร · แตะชื่อเพื่อดูรายการต้นทาง</p>
  </section>;
}
export function PersonalTrend({
  rows,
  range,
  name,
  onShow
}) {
  const trend = planningTrend(rows, range),
    today = calendarToday();
  const max = Math.max(1, ...trend.values.map(value => value.count));
  const points = trend.values.map((value, index) => {
    const date = value.date.length === 4 ? value.date + "-01-01" : value.date.length === 7 ? value.date + "-01" : value.date;
    return {
      ...value,
      future: date > today && !value.count,
      x: 40 + index / Math.max(1, trend.values.length - 1) * 520,
      y: 145 - value.count / max * 115
    };
  });
  const segments = [];
  let line = [];
  for (const point of points) {
    if (point.future) {
      if (line.length) segments.push(line);
      line = [];
    } else line.push(point);
  }
  if (line.length) segments.push(line);
  const label = value => trend.unit === "day" ? Number(value.slice(8)) + "/" + Number(value.slice(5, 7)) : trend.unit === "month" ? Number(value.slice(5, 7)) + "/" + (Number(value.slice(0, 4)) + 543) : Number(value) + 543;
  return <section className="planning-panel planning-person-trend"><div className="planning-panel-head"><h2>แนวโน้มของ {name}</h2><GlassButton mode="quick" onClick={() => onShow(trend)}>ดูข้อมูลแนวโน้ม</GlassButton></div><svg viewBox="0 0 600 180" role="img" aria-label={`กราฟเส้นจำนวนบันทึกของ ${name} แกนนอนเป็นช่วงเวลา แกนตั้ง 0 ถึง ${max} ครั้ง ดูค่ารายช่วงได้จากปุ่มดูข้อมูลแนวโน้ม`}><path className="planning-line-axis" d="M40 25V145H560" /><text x="32" y="148" textAnchor="end">0</text><text x="32" y="30" textAnchor="end">{max}</text>{segments.map((segment, index) => <polyline key={index} className="planning-line-series" points={segment.map(point => `${point.x},${point.y}`).join(" ")} />)}{points.filter(point => !point.future && (points.length <= 31 || point.count > 0)).map(point => <circle key={point.date} cx={point.x} cy={point.y} r="3" className="planning-line-point" />)}<text x="40" y="170">{label(trend.values[0].date)}</text><text x="560" y="170" textAnchor="end">{label(trend.values.at(-1).date)}</text></svg><p className="ui-caption">หน่วย: ครั้งตามบันทึก{trend.unit === "day" ? "รายวัน" : trend.unit === "month" ? "รายเดือน" : "รายปี"} · วันที่ไม่มีบันทึกไม่ใช่ข้อมูลการมาทำงาน · ยังไม่ลากเส้นไปยังช่วงอนาคตที่ไม่มีข้อมูล</p></section>;
}
