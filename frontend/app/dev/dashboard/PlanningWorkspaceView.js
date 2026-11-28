"use client";

import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Download, HelpCircle, Plus, Search } from "lucide-react";
import { GlassButton, GlassControlGroup } from "../../../components/ui/GlassControls";
import { ReviewSymbol } from "../../../components/ui/ReviewSymbol";
import { Dialog } from "../../../components/ui/Dialog";
import { downloadCSV } from "../resources/downloadCSV";
import { calendarLabel, calendarToday } from "../../../lib/calendarView";
import { PLANNING_MODES, planningAdmin, stepPlanningRange, planningFiscalYear, planningSummary, planningCounts, planningTrend, planningStaff, planningJD, planningCSV } from "../../../lib/planningPreview";
import { RangeDialog, JDDialog, SourceRecords } from "./PlanningDialogs";
import { TaskCatalog } from "./TaskCatalog";
import { StaffDistribution, PersonalTrend } from "./PlanningCharts";
import { AssessmentReport } from "./AssessmentReport";

const rangeLabel = range => `${calendarLabel(range.start, {
  dateStyle: "medium"
})} – ${calendarLabel(range.end, {
  dateStyle: "medium"
})}`;
function Bars({
  pairs,
  onSelect
}) {
  const max = Math.max(1, ...pairs.map(([, count]) => count));
  return pairs.length ? <div className="planning-bars">{pairs.map(([key, count]) => <button key={key} className="planning-bar" onClick={() => onSelect(key)}><span>{key}</span><i aria-hidden="true"><b style={{
          width: `${count / max * 100}%`
        }} /></i><strong>{count.toLocaleString("th-TH")}</strong></button>)}</div> : <p className="planning-empty">ยังไม่มีบันทึกในช่วงนี้</p>;
}
function Summary({
  summary,
  personal = false,
  partial = false
}) {
  return <section className="planning-summary" data-personal={personal} aria-label={partial ? "สรุปเฉพาะบันทึกที่โหลดแล้ว" : "สรุปข้อมูลในช่วงที่เลือก"}><div className="planning-summary-primary"><span>{partial ? "กิจกรรมที่โหลดแล้ว" : "กิจกรรมที่บันทึก"}</span><strong data-metric="activities">{summary.activities.toLocaleString("th-TH")}<small>รายการ</small></strong></div><dl>{[["people", "ผู้มีบันทึก", "คนที่ระบุได้"], ["days", "วันที่มีบันทึก", "วัน"], ["tasks", "หัวข้อรอง", "ประเภท"]].filter(([key]) => !personal || key !== "people").map(([key, label, unit]) => <div key={key}><dt>{label}</dt><dd data-metric={key}>{summary[key].toLocaleString("th-TH")}<small>{unit}</small></dd></div>)}</dl></section>;
}

function ActivityTrend({ rows, selection, drill }) {
  const trend = planningTrend(rows, selection.range);
  const today = calendarToday();
  const busiest = planningCounts(rows, "date");
  const maxTrend = Math.max(1, ...trend.values.map(row => row.count));
  return <section className="planning-panel planning-trend">
    <div className="planning-panel-head"><h2>แนวโน้มกิจกรรม</h2><span className="ui-caption">{PLANNING_MODES[selection.mode]}</span></div>
    <p className="planning-takeaway">{busiest.length ? <><strong>{calendarLabel(busiest[0][0], { dateStyle: "medium" })}</strong>{busiest.filter(([, count]) => count === busiest[0][1]).length > 1 ? " และวันอื่นที่มียอดเท่ากัน" : ""} มีบันทึกมากที่สุด <strong>{busiest[0][1]} รายการ</strong></> : "ยังไม่มีบันทึกสำหรับช่วงนี้"}</p>
    <div className="planning-trend-scroll" role="group" aria-label="แนวโน้มจำนวนกิจกรรม หน่วยรายการ"><div className="planning-columns">
      {trend.values.map(bucket => {
        const start = trend.unit === "day" ? bucket.date : trend.unit === "month" ? `${bucket.date}-01` : `${bucket.date}-01-01`;
        const future = start > today && !bucket.count;
        const label = trend.unit === "day" ? `${Number(bucket.date.slice(8))}/${Number(bucket.date.slice(5, 7))}` : trend.unit === "month" ? `${Number(bucket.date.slice(5, 7))}/${Number(bucket.date.slice(0, 4)) + 543}` : Number(bucket.date) + 543;
        return <button key={bucket.date} disabled={future} aria-label={`${bucket.date} ${future ? "ยังไม่ถึงช่วงนี้" : bucket.count + " กิจกรรม"}`} onClick={() => drill("date", bucket.date)}>
          <strong>{future ? "—" : bucket.count}</strong><span aria-hidden="true" style={{ height: `${Math.max(2, bucket.count / maxTrend * 130)}px` }} /><small>{label}</small>
        </button>;
      })}
    </div></div>
    <p className="ui-caption">หน่วย: กิจกรรมที่บันทึก{trend.unit === "day" ? "ต่อวัน" : trend.unit === "month" ? "ต่อเดือน" : "ต่อปี"} · แตะแท่งเพื่อดูรายการ{selection.range.end >= today ? " · ช่วงปัจจุบันยังไม่สิ้นสุด และ — หมายถึงยังไม่ถึงช่วงนั้น" : ""}</p>
  </section>;
}
export function PlanningWorkspaceView({
  mode, actor, person, people, tasks, result, selection, setSelection, employee, setEmployee,
  onLoadMore, onRetry, loading = false, error = "", navigate, taskView, setTaskView,
  profiles, setProfiles, assessmentMapping, setAssessmentMapping, reader, rawLogs,
  preview, stress, revision, children
}) {
  const admin = planningAdmin(actor);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState(null);
  const [status, setStatus] = useState("");
  const ready = (!loading && !error) || result.rows.length > 0;
  const complete = ready && !loading && !error && !result.partial;
  const today = calendarToday();
  const rows = result.rows,
    summary = planningSummary(rows),
    taskCounts = planningCounts(rows, "task");
  const effectiveEmployee = admin ? employee : person.id;
  const team = planningStaff(rows, people, search, effectiveEmployee),
    dashboardTeam = planningStaff(rows, people, "", effectiveEmployee);
  const year = planningFiscalYear(selection.range.end),
    profile = profiles[year],
    jd = planningJD(rows, year, profile);
  const scopedTasks = [...new Set([...tasks.map(task => task.label), ...rows.map(row => row.task)])].sort((a, b) => a.localeCompare(b, "th"));
  const title = mode === "staff" ? "การกระจายงานของทีม" : "ภาพรวมงาน";
  function applySelection(next) {
    setSelection(next);
    setDialog(null);
  }
  function drill(kind, key, label) {
    const source = rows.filter(row => kind === "person" ? key === "unresolved" ? !row.employeeId : row.employeeId === key : kind === "date" ? row.date.startsWith(key) : kind === "hour" ? row.time?.slice(0, 2) + ":00" === key : kind === "jd" ? planningFiscalYear(row.date) === year && (profile?.mapping[row.task] || "unmapped") === key : row.task === key);
    setDialog({
      kind: "records",
      title: label || "รายการต้นทาง",
      rows: source,
      person: kind === "person" && key !== "unresolved"
    });
  }
  function exportDisplayed() {
    try {
      downloadCSV(`staff-planning-${selection.range.start}-${selection.range.end}.csv`, planningCSV(team, selection.range, result.partial));
      setStatus("สร้างไฟล์ CSV จากตารางที่แสดงแล้ว");
    } catch {
      setStatus("สร้างไฟล์ CSV ไม่สำเร็จ กรุณาลองอีกครั้ง");
    }
  }
  return <>
    <div className="planning-workspace" data-planning-mode={mode} data-revision={revision}>
      <div className="ui-page-heading planning-heading"><div><h1>{title}</h1><p>{mode === "staff" ? "จำนวนและประเภทกิจกรรม ใช้ประกอบการวางแผนกำลังคน" : "อ่านแนวโน้มและกิจกรรมที่บันทึก เพื่อวางแผนงาน"}</p>{preview && <small className="ui-caption">Development · ข้อมูลสังเคราะห์ร่วมกับบันทึกงานและประวัติ</small>}</div><div className="planning-heading-actions">{mode !== "staff" && <GlassButton mode="quick" disabled={!ready} onClick={() => setDialog({
            kind: "assessment"
          })}><ReviewSymbol name="record" size={17} />สรุปแบบประเมิน</GlassButton>}{mode === "staff" ? admin && <GlassButton mode="quick" disabled={!ready} onClick={exportDisplayed}><Download size={17} aria-hidden="true" />ส่งออกข้อมูลที่แสดง</GlassButton> : <GlassButton mode="quick" variant="prominent" onClick={() => navigate(!preview && actor.role === "admin" ? "/admin/record" : "/worklogs/new")}><Plus size={17} aria-hidden="true" />บันทึกงาน</GlassButton>}</div></div>
      {mode === "staff" && !admin ? <section className="planning-panel planning-empty"><h2>หน้านี้สำหรับผู้ดูแล</h2><p>Staff ดูข้อมูลของตนเองได้ในภาพรวมงาน</p><GlassButton mode="quick" onClick={() => navigate("/dashboard")}>เปิดภาพรวมงาน</GlassButton></section> : <>
        <div className="planning-toolbar"><div className="planning-period"><GlassButton mode="quick" onClick={() => setDialog({
              kind: "range"
            })}><CalendarDays size={17} aria-hidden="true" />{PLANNING_MODES[selection.mode]}</GlassButton><GlassButton mode="quick" aria-label="ช่วงข้อมูลก่อนหน้า" onClick={() => applySelection(stepPlanningRange(selection, -1))}><ChevronLeft size={18} aria-hidden="true" /></GlassButton><GlassButton mode="quick" aria-label="ช่วงข้อมูลถัดไป" onClick={() => applySelection(stepPlanningRange(selection, 1))}><ChevronRight size={18} aria-hidden="true" /></GlassButton><strong data-range-label>{rangeLabel(selection.range)}</strong></div>{admin && <label className="ui-field planning-employee"><span>ผู้ปฏิบัติงาน</span><select className="apple-input" aria-label="ผู้ปฏิบัติงาน" value={employee} onChange={event => { setEmployee(event.target.value);setDialog(null); }}>{[["all", "ทุกคน"], ...people.map(item => [item.id, item.displayName])].map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>}</div>
        <div className="planning-data-status"><ReviewSymbol name="record" size={15} /><span role="status">{ready ? <>{preview ? "ข้อมูลตัวอย่าง" : "บันทึกงาน"} · <b data-loaded-count>{rows.length.toLocaleString("th-TH")}</b> กิจกรรม{stress ? " · ชุดทดสอบปริมาณมาก" : ""}{result.partial ? " · ยังโหลดไม่ครบช่วงที่เลือก" : ""}</> : null}{loading && <>{ready ? " · " : ""}กำลังโหลดบันทึกงาน…</>}</span>{result.partial && !error && <button className="planning-link" disabled={loading} onClick={onLoadMore}>โหลดเพิ่ม 1,000 รายการ</button>}<button className="planning-link" disabled={!ready} onClick={() => setDialog({
            kind: "source",
            title: "วิธีนับและขอบเขตข้อมูล"
          })}>วิธีนับและขอบเขตข้อมูล</button></div>
        {error && <p className="planning-warning" role="alert">{error} <button className="planning-link" onClick={onRetry}>ลองอีกครั้ง</button></p>}
        {result.partial && <p className="planning-warning" role="status">ยังโหลดข้อมูลไม่ครบช่วงที่เลือก ยอดด้านล่างนับเฉพาะรายการที่โหลดแล้ว กราฟแนวโน้มจะแสดงเมื่อข้อมูลครบ</p>}
        {ready && (mode === "dashboard" ? <>
          <Summary summary={summary} personal={!admin || effectiveEmployee !== "all"} partial={!complete} />
          {complete && <ActivityTrend rows={rows} selection={selection} drill={drill} />}
          <div className="planning-detail-grid"><section className="planning-panel planning-task-panel"><div className="planning-panel-head"><h2>{taskView === "all" ? "หัวข้อรองทั้งหมด" : "หัวข้อรองที่มีบันทึกบ่อย"}{!complete && " · ที่โหลดแล้ว"}</h2><GlassControlGroup mode="quick" label="มุมมองหัวข้อรอง">{[["popular", "บ่อยที่สุด"], ["all", "ทุกหัวข้อ"]].map(([value, label]) => <button key={value} aria-pressed={taskView === value} onClick={() => setTaskView(value)}>{label}</button>)}</GlassControlGroup></div>{taskView === "all" ? <TaskCatalog rows={rows} catalog={tasks} partial={result.partial} onSelect={key => drill("task", key)} /> : <><Bars pairs={taskCounts.slice(0, 5)} onSelect={key => drill("task", key)} /><button className="planning-link" onClick={() => setDialog({
                  kind: "tasks",
                  title: "หัวข้อรองทั้งหมด"
                })}>ดูหัวข้อรองทั้งหมด ({scopedTasks.length})</button><p className="ui-caption">หน่วย: ครั้งตามบันทึกหัวข้อรอง · แตะแถบเพื่อดูรายละเอียด</p></>}</section><section className="planning-panel"><h2>{admin ? "บันทึกของทีม" : "บันทึกของฉัน"}</h2><p className="ui-caption">เรียงตามรายชื่อทีม ไม่จัดอันดับตามจำนวนบันทึก</p><div className="planning-team">{dashboardTeam.map(item => <button key={item.id} onClick={() => drill("person", item.id, item.displayName)}><span className="planning-avatar">{item.initial}</span><span><strong>{item.displayName}</strong><small>{item.tasks} หัวข้อ · {item.days} วันที่มีบันทึก</small></span><span className="planning-team-count"><strong>{item.activities}</strong><small>รายการ</small></span><ChevronRight size={14} aria-hidden="true" /></button>)}</div>{summary.unresolved > 0 && <button className="planning-link" onClick={() => drill("person", "unresolved", "ระบุเจ้าหน้าที่ไม่ได้")}>ระบุเจ้าหน้าที่ไม่ได้ {summary.unresolved} รายการ</button>}<p className="ui-caption">จำนวนบันทึกไม่ใช่คะแนนผลงาน และการไม่มีบันทึกไม่ได้หมายถึงไม่ได้ทำงาน · แตะชื่อเพื่อดูรายการต้นทาง</p></section></div>
          <details className="planning-context"><summary><HelpCircle size={18} aria-hidden="true" />บริบทและวิธีอ่านข้อมูล{summary.unresolved ? ` · ยังระบุเจ้าหน้าที่ไม่ได้ ${summary.unresolved} รายการ` : ""}</summary><div><dl className="planning-context-metrics"><div><dt>ชุด Combo ที่มีรหัสกลุ่ม</dt><dd>{summary.comboGroups}</dd></div><div><dt>กิจกรรมที่ยังระบุเจ้าหน้าที่ไม่ได้</dt><dd>{summary.unresolved}</dd></div></dl><p className="ui-caption">กิจกรรมย่อยหลายรายการอาจเกิดจากการบันทึกครั้งเดียว จำนวนรายการไม่ได้บอกระยะเวลาหรือความยากของงาน และวันที่มีบันทึกไม่ใช่วันมาปฏิบัติงาน</p><GlassButton mode="quick" onClick={() => setDialog({
                kind: "hours",
                title: "กิจกรรมตามชั่วโมงที่บันทึก"
              })}>รูปแบบช่วงเวลา</GlassButton>{admin && preview && <GlassButton mode="quick" onClick={() => setDialog({
                kind: "jd"
              })}>ดูบริบท JD</GlassButton>}</div></details>
        </> : <>
          <Summary summary={summary} personal={effectiveEmployee !== "all"} partial={!complete} />
          {complete && (effectiveEmployee === "all" ? <ActivityTrend rows={rows} selection={selection} drill={drill} />
            : <PersonalTrend rows={rows} range={selection.range} name={people.find(item => item.id === effectiveEmployee)?.displayName || "เจ้าหน้าที่ที่เลือก"} onShow={value => setDialog({ kind: "timeline", title: "ข้อมูลแนวโน้ม", trend: value })} />)}
          <label className="planning-search"><Search size={18} aria-hidden="true" /><input type="search" aria-label="ค้นหาเจ้าหน้าที่" placeholder="ค้นหาเจ้าหน้าที่" value={search} onChange={event => setSearch(event.target.value)} /></label>
          <section className="planning-staff-table" aria-label="กิจกรรมรายเจ้าหน้าที่"><div role="table" aria-label="กิจกรรมรายเจ้าหน้าที่"><div className="planning-staff-head" role="row"><span role="columnheader">ผู้ปฏิบัติงาน</span><span role="columnheader">กิจกรรม</span><span role="columnheader">หัวข้อรอง</span><span role="columnheader">วันที่มีบันทึก</span><span role="columnheader">รายละเอียด</span></div>{team.map(item => <div className="planning-staff-row" role="row" key={item.id}><strong role="cell">{item.displayName}</strong><span role="cell"><small aria-hidden="true">กิจกรรม</small>{item.activities}</span><span role="cell"><small aria-hidden="true">หัวข้อรอง</small>{item.tasks}</span><span role="cell"><small aria-hidden="true">วันที่มีบันทึก</small>{item.days}</span><span role="cell"><button className="planning-link" aria-label={`รายละเอียด ${item.displayName}`} onClick={() => drill("person", item.id, item.displayName)}><ChevronRight size={16} aria-hidden="true" />รายละเอียด</button></span></div>)}{!team.length && <p className="planning-empty">ไม่พบเจ้าหน้าที่ตรงกับตัวกรอง</p>}</div><footer><span>{team.length} คน{preview ? " · ข้อมูลตัวอย่าง" : ""}</span><span>{result.partial ? "ยังโหลดไม่ครบช่วงที่เลือก" : "แสดงทั้งหมดในช่วงนี้"}</span></footer></section>
          {summary.unresolved > 0 && <button type="button" className="planning-link planning-unknown" onClick={() => drill("person", "unresolved", "ระบุเจ้าหน้าที่ไม่ได้")}>ระบุเจ้าหน้าที่ไม่ได้ {summary.unresolved} รายการ</button>}
          <p className="ui-caption planning-note">ไม่มีการจัดอันดับคุณภาพบุคลากร วันที่มีบันทึกไม่ใช่ข้อมูลการมาทำงาน{summary.unresolved ? ` · ยังระบุเจ้าหน้าที่ไม่ได้ ${summary.unresolved} รายการ จึงไม่รวมในแถวรายคน` : ""}</p>
          {complete && <StaffDistribution rows={rows} people={team} mapping={assessmentMapping} partial={false} onPerson={(id, label) => drill("person", id, label)} />}
          <section className="planning-panel planning-assessment-link"><h2>รายงาน</h2><GlassButton mode="quick" onClick={() => setDialog({ kind: "assessment" })}>สรุปแบบประเมิน</GlassButton></section>
          <section className="planning-panel"><h2>{profile ? `บริบท JD กลาง · ปีงบ ${year}` : "JD กลางของทีม"}</h2>{profile ? <><p className="ui-caption">น้ำหนักความรับผิดชอบและจำนวนกิจกรรมเป็นคนละความหมาย ไม่ใช้ส่วนต่างเป็นคะแนนประเมิน · ค่าทดลองใน develop</p><div className="planning-jd-table"><div><span>ความรับผิดชอบ</span><span>น้ำหนัก JD</span><span>กิจกรรม</span></div>{jd.map(item => <button key={item.id} onClick={() => drill("jd", item.id, item.label)}><span>{item.label}</span><strong>{item.weight === null ? "—" : item.weight + "%"}</strong><span>{item.count}</span></button>)}</div><p className="ui-caption">นับเฉพาะกิจกรรมของปีงบ {year} ที่อยู่ในช่วงเลือก · หัวข้อที่ยังไม่จับคู่แสดงแยกเสมอ</p></> : <><p>ยังไม่ได้กำหนดชุดกลางสำหรับปีงบ {year}</p><p className="ui-caption">{preview ? "ยังไม่มีน้ำหนัก JD จริงที่ยืนยันแล้วใน development · กำหนดทดลองแยกแต่ละปีได้" : "จะแสดงน้ำหนักเมื่อมีชุด JD ที่ตรวจทานแล้วสำหรับปีนี้"}</p></>}{preview && <GlassButton mode="quick" onClick={() => setDialog({
              kind: "jd"
            })}><Plus size={16} aria-hidden="true" />{profile ? "ตั้งค่า JD และผังจับคู่" : "กำหนด JD กลาง"}</GlassButton>}</section>
        </>)}
      </>}
      {children}
      <p role="status" className="planning-status" aria-live="polite">{status}</p>
    </div>
    {dialog?.kind === "assessment" && <AssessmentReport rawLogs={rawLogs} reader={reader} preview={preview} people={people} actor={actor} initialRange={selection.range} initialPerson={admin && employee !== "all" ? employee : person.id} catalog={tasks} mapping={assessmentMapping} onMapping={setAssessmentMapping} onClose={() => setDialog(null)} />}
    {dialog?.kind === "range" && <RangeDialog selection={selection} onClose={() => setDialog(null)} onApply={applySelection} />}
    {dialog?.kind === "jd" && admin && <JDDialog year={year} profile={profile} tasks={scopedTasks} onClose={() => setDialog(null)} onSave={value => {
      setProfiles(current => ({
        ...current,
        [value.year]: {
          weights: value.weights,
          mapping: value.mapping
        }
      }));
      setDialog(null);
      setStatus(`ใช้ JD กลางปีงบ ${value.year} ในต้นแบบแล้ว`);
    }} />}
    {dialog && !["range", "jd", "assessment"].includes(dialog.kind) && <Dialog key={`${dialog.kind}:${dialog.title}`} open onClose={() => setDialog(null)} title={dialog.title} description={dialog.kind === "records" ? `${dialog.rows.length} กิจกรรม · ${rangeLabel(selection.range)}${result.partial ? " · ยังโหลดไม่ครบช่วง" : ""}` : undefined} className={dialog.kind === "records" ? "planning-source-dialog" : ""} footer={dialog.parent ? <GlassButton mode="quick" onClick={() => setDialog(dialog.parent)}><ChevronLeft size={16} aria-hidden="true" />กลับรายละเอียดเจ้าหน้าที่</GlassButton> : undefined}>
      {dialog.kind === "records" && <>{dialog.person && <><Summary summary={planningSummary(dialog.rows)} personal partial={!complete} /><Bars pairs={planningCounts(dialog.rows, "task")} onSelect={key => setDialog({
            kind: "records",
            title: key,
            rows: dialog.rows.filter(row => row.task === key),
            parent: dialog
          })} /></>}<SourceRecords rows={dialog.rows} people={people} /></>}
      {dialog.kind === "tasks" && <TaskCatalog rows={rows} catalog={tasks} partial={result.partial} onSelect={key => drill("task", key)} />}
      {dialog.kind === "timeline" && <div className="planning-timeline-values">{dialog.trend.values.map(value => {
          const date = value.date.length === 4 ? value.date + "-01-01" : value.date.length === 7 ? value.date + "-01" : value.date;
          const future = date > today && !value.count;
          return <button className="planning-bar" disabled={future} key={value.date} onClick={() => drill("date", value.date)}><span>{value.date}</span><strong>{future ? "ยังไม่ถึงช่วงนี้" : `${result.partial ? "≥" : ""}${value.count} ครั้ง`}</strong></button>;
        })}</div>}
      {dialog.kind === "hours" && <><p className="ui-caption">หน่วย: รายการ ไม่ใช่ชั่วโมงทำงาน · ไม่รวม {rows.filter(row => !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(row.time || "")).length} รายการที่ไม่มีเวลาที่ถูกต้อง</p><Bars pairs={planningCounts(rows.filter(row => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(row.time || "")), row => row.time.slice(0, 2) + ":00")} onSelect={key => drill("hour", key)} /></>}
      {dialog.kind === "source" && <div className="planning-form"><dl className="planning-source-facts">{[["กิจกรรมย่อย", summary.activities + " รายการ"], ["ชุด Combo ที่มีรหัสกลุ่ม", summary.comboGroups + " ชุด"], ["กิจกรรมในกลุ่มที่ยืนยันได้", summary.groupedActivities + " รายการ"], ["ยังระบุเจ้าหน้าที่ไม่ได้", summary.unresolved + " รายการ"], ["แถววันที่ไม่ถูกต้องที่ไม่รวมในช่วง", result.invalid + " รายการ"]].map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl><p>หนึ่งชุด Combo อาจมีหลายกิจกรรม งานเก่าที่ไม่มีรหัสกลุ่มจะไม่นำมาคาดเดาจำนวนครั้งบริการ ไม่มีคะแนนคุณภาพจากความถี่ ความยาวข้อความ หรือการใช้ Quick Log</p><p className="ui-caption">{preview ? "ต้นแบบนี้ใช้ข้อมูลจำลอง" : "อ่านบันทึกตามช่วงวันที่และเจ้าหน้าที่ที่เลือก"} · แสดงครั้งละ 1,000 รายการ การค้นชื่อและเปิดรายละเอียดใช้ข้อมูลที่โหลดแล้ว</p>{preview && <details><summary>สัญญาการอ่านข้อมูลสำหรับเฟสเชื่อมต่อ</summary><pre className="planning-query-plan">{JSON.stringify(result.plan, null, 2)}</pre><p className="ui-caption">ยังไม่เชื่อม Firestore · เฟสเชื่อมต่อจะต้องทดสอบ DocumentSnapshot cursor, cache, rules และ index อีกครั้ง</p></details>}</div>}
    </Dialog>}
  </>;
}
