"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { assessmentTaskCatalog } from "../../../lib/assessmentPreview";
export function TaskCatalog({
  rows,
  catalog,
  partial,
  onSelect
}) {
  const [query, setQuery] = useState(""),
    [group, setGroup] = useState("all"),
    [includeZero, setIncludeZero] = useState(true);
  const all = assessmentTaskCatalog(rows, catalog),
    groups = [...new Set(all.map(task => task.major))];
  const filtered = all.filter(task => (includeZero || task.count > 0) && (group === "all" || task.major === group) && task.task.toLocaleLowerCase("th").includes(query.trim().toLocaleLowerCase("th")));
  const maximum = Math.max(1, ...filtered.map(task => task.count));
  return <div className="planning-task-catalog">
    <div className="planning-catalog-filters"><label className="planning-search"><Search size={17} aria-hidden="true" /><input type="search" aria-label="ค้นหาหัวข้อรอง" placeholder="ค้นหาหัวข้อรอง" value={query} onChange={event => setQuery(event.target.value)} /></label><label className="ui-field"><span>หมวดงาน</span><select className="apple-input" aria-label="กรองหมวดหัวข้อรอง" value={group} onChange={event => setGroup(event.target.value)}><option value="all">ทุกหมวด</option>{groups.map(label => <option key={label}>{label}</option>)}</select></label></div>
    <label className="planning-catalog-zero"><input type="checkbox" checked={includeZero} onChange={event => setIncludeZero(event.target.checked)} />รวมหัวข้อที่ไม่มีบันทึก</label>
    <p className="ui-caption">{filtered.length} จาก {all.length} หัวข้อ · หน่วย: ครั้งตามบันทึกหัวข้อรอง{partial ? " · ยอดยังไม่ครบช่วง" : ""}</p>
    <div className="planning-bars">{filtered.map(task => <button className="planning-bar" key={task.task} data-task={task.task} onClick={() => onSelect(task.task)}><span>{task.task}{!task.known && <small>นอกบัญชีหัวข้อปัจจุบัน</small>}</span><i aria-hidden="true"><b style={{
            width: `${task.count / maximum * 100}%`
          }} /></i><strong>{partial ? task.count ? `≥${task.count}` : "—" : task.count}</strong></button>)}</div>
    {!filtered.length && <p className="planning-empty">ไม่พบหัวข้อตรงกับตัวกรอง</p>}
    <p className="ui-caption">{partial ? "— หมายถึงยังไม่พบในข้อมูลที่โหลด ต้องโหลดครบก่อนสรุปว่าเป็นศูนย์" : "0 หมายถึงไม่พบบันทึกในช่วงนี้ ไม่ได้ยืนยันว่างานไม่ได้เกิดขึ้น"}</p>
  </div>;
}
