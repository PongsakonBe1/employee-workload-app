"use client";
import { previewDestination } from "../../../lib/previewNavigation";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Ellipsis, Filter, PanelLeftClose, Plus, Search, Undo2, Upload } from "lucide-react";
import { WorkspaceFrame } from "../../../components/ui/WorkspaceFrame";
import { GlassButton, GlassControlGroup } from "../../../components/ui/GlassControls";
import { GlassSurface } from "../../../components/ui/GlassSurface";
import { MenuPopover } from "../../../components/ui/MenuPopover";
import { Dialog } from "../../../components/ui/Dialog";
import { CALENDAR_KINDS, CALENDAR_ROOMS, addCalendarDays, addCalendarMonths, calendarConflicts, calendarDates, calendarLabel, calendarRange, calendarToday, calendarWeekday, expandCalendar, filterCalendar, monthCalendarDates, validCalendarDate, validateCalendarEntry } from "../../../lib/calendarView";
import CalendarEntryForm from "./CalendarEntryForm";
import ClassroomImport from "./ClassroomImport";
import DlImageImport from "./DlImageImport";
import { addDlPreviewPerson, planDlImport } from "../../../lib/dlImageImport";
import { CalendarAgenda, CalendarMonth, CalendarTimeline, DayStrip, MiniCalendar } from "./CalendarViews";
import { calendarPeople, initialCalendar } from "./fixtures";
import holidays from "./holidays.json";
import { hasPreviewState, usePreviewState } from "../previewState";

const defaults = { kinds: Object.keys(CALENDAR_KINDS), room: "all", semester: "2/2569", query: "", public: true, observance: false };
const newEntry = (date, kind = "classroom") => ({ title: kind === "dl" ? "สอบ Digital Literacy" : "", kind, date, start: "09:00", end: "10:30", repeat: kind === "classroom" ? "weekly" : "none", validTo: addCalendarMonths(date, 3), rooms: ["401"], semester: "2/2569", teacher: "", participants: "75", proctors: [] });

function FilterFields({ filters, onChange, id, semesters = [] }) {
  return <div className="cal-filter-fields">
    <fieldset>
      <legend>ประเภทกิจกรรม</legend>
      {Object.entries(CALENDAR_KINDS).map(([kind, label]) => <label
        className="cal-filter-check" key={kind}
        data-kind={kind}
      >
        <input
          className="ui-checkbox" type="checkbox"
          checked={filters.kinds.includes(kind)} onChange={event => onChange({ ...filters, kinds: event.target.checked ? [...filters.kinds, kind] : filters.kinds.filter(value => value !== kind) })}
        />
        <i aria-hidden="true" />
        <span>{label}</span>
      </label>)}
    </fieldset>
    <label className="ui-field" htmlFor={`${id}-room`}>
      <span>ห้อง</span>
      <select
        className="apple-input" id={`${id}-room`}
        value={filters.room} onChange={event => onChange({ ...filters, room: event.target.value })}
      >
        <option value="all">ทุกห้อง</option>
        {CALENDAR_ROOMS.map(room => <option key={room} value={room}>{`ห้อง ${room}`}</option>)}
      </select>
    </label>
    <label className="ui-field" htmlFor={`${id}-semester`}>
      <span>ภาคเรียน</span>
      <select
        className="apple-input" id={`${id}-semester`}
        value={filters.semester} onChange={event => onChange({ ...filters, semester: event.target.value })}
      >
        <option value="all">ทุกภาคเรียน</option>
        {[...new Set(["2/2569","1/2570",...semesters,filters.semester])].filter(value=>value&&value!=="all").map(value=><option key={value}>{value}</option>)}
      </select>
    </label>
    <fieldset>
      <legend>ปฏิทินเพิ่มเติม</legend>
      <label className="cal-filter-check">
        <input
          className="ui-checkbox" type="checkbox"
          checked={filters.public} onChange={event => onChange({ ...filters, public: event.target.checked })}
        />
        <i className="cal-holiday-dot" aria-hidden="true" />
        <span>วันหยุดนักขัตฤกษ์ไทย</span>
      </label>
      <label className="cal-filter-check">
        <input
          className="ui-checkbox" type="checkbox"
          checked={filters.observance} onChange={event => onChange({ ...filters, observance: event.target.checked })}
        />
        <i className="cal-observance-dot" aria-hidden="true" />
        <span>วันสำคัญ</span>
      </label>
    </fieldset>
  </div>;
}

export default function CalendarPreview() {
  const router = useRouter();
  const [date, setDate] = usePreviewState("calendar.date", "2026-11-06"), [miniMonth, setMiniMonth] = useState(date), [today, setToday] = useState("2026-11-06"), [mode, setMode] = usePreviewState("calendar.mode", "week");
  const [role, setRole] = usePreviewState("calendar.role", "admin"), [glassMode, setGlassMode] = useState("quick"), [sideOpen, setSideOpen] = useState(true);
  const [sampleData, setSampleData] = usePreviewState("calendar.data", initialCalendar);
  const [sandboxData, setSandboxData] = usePreviewState("calendar.sandbox.data", { rules: [], events: [] });
  const [dataset, setDataset] = usePreviewState("calendar.dataset", "sample");
  const [sampleUndo, setSampleUndo] = usePreviewState("calendar.undo", null), [sandboxUndo, setSandboxUndo] = usePreviewState("calendar.sandbox.undo", null);
  const data = dataset === "sandbox" ? sandboxData : sampleData, setData = dataset === "sandbox" ? setSandboxData : setSampleData;
  const undo = dataset === "sandbox" ? sandboxUndo : sampleUndo, setUndo = dataset === "sandbox" ? setSandboxUndo : setSampleUndo;
  const [filters, setFilters] = usePreviewState("calendar.filters", defaults), [filterDraft, setFilterDraft] = useState(defaults);
  const [dialog, setDialog] = useState(null), [selected, setSelected] = useState(null), [selectedHoliday, setSelectedHoliday] = useState(null);
  const [entry, setEntry] = useState(newEntry("2026-11-06")), [editing, setEditing] = useState(null), [error, setError] = useState(null);
  const [dateDraft, setDateDraft] = useState(date), [copyDate, setCopyDate] = useState("2026-11-09");
  const [status, setStatus] = useState("");
  const [importKind, setImportKind] = useState("classroom");
  const [people, setPeople] = usePreviewState("calendar.people", calendarPeople);
  const counter = useRef(Date.now()), restoredMode = useRef(hasPreviewState("calendar.mode"));
  useEffect(() => { const current = calendarToday();setToday(current);if (!restoredMode.current && matchMedia("(max-width:760px)").matches) setMode("day"); }, [setMode]);
  const canEdit = role !== "staff", range = calendarRange(date, mode), week = calendarRange(date, "week");
  const renderRange = mode === "month" ? { start: monthCalendarDates(date)[0], end: monthCalendarDates(date).at(-1) } : range;
  const rows = filterCalendar(expandCalendar(data, renderRange, filters.semester), filters);
  const shared = { rows, range, holidays, holidayOptions: filters, onEvent: row => { setSelected(row);setDialog("detail"); }, onHoliday: item => { setSelectedHoliday(item);setDialog("holiday"); } };
  const monthEvents = rows.filter(row => row.date === date), copyRows = filterCalendar(expandCalendar({ events: data.events, rules: [] }, week), filters);
  const coverage = holidays.coverageYears.includes(date.slice(0, 4));
  function selectDate(value) { setDate(value);setMiniMonth(value); }
  function open(value) { setError(null);setDialog(value);if (value === "filters") setFilterDraft({ ...filters });if (value === "date") setDateDraft(date);if (value === "copy") setCopyDate(addCalendarDays(week.start, 7)); }
  function startEntry(kind = "classroom", existing = null) {
    if (!canEdit) return;
    setEditing(existing);setEntry(existing ? { ...newEntry(existing.date, existing.kind), ...existing, date: existing.recurring ? existing.validFrom : existing.date, participants: String(existing.participants || 75), proctors: existing.proctors || [], repeat: existing.recurring ? "weekly" : "none" } : newEntry(date, kind));setError(null);setDialog("entry");
  }
  function commit(next, message) { setUndo({ before: data, message });setData(next);setDialog(null);setStatus(message + (dataset === "sample" ? " · ชุดตัวอย่าง" : " · พื้นที่ทดลองนำเข้า")); }
  function saveEntry(event) {
    event.preventDefault();if (!canEdit) return;
    const value = { ...entry, title: entry.title.trim(), rooms: entry.kind === "dl" ? Number(entry.participants) > 40 ? ["406", "407"] : ["406"] : entry.rooms, participants: Number(entry.participants) };
    const invalid = validateCalendarEntry(value);if (invalid) { setError(invalid);return; }
    const bounds = { start: value.date, end: value.repeat === "weekly" ? value.validTo : value.date };
    const dates = value.repeat === "weekly" ? calendarDates(bounds.start, bounds.end).filter(day => calendarWeekday(day) === calendarWeekday(value.date)) : [value.date];
    const existing = expandCalendar(data, bounds);
    for (const day of dates) { const conflicts = calendarConflicts({ ...value, date: day }, existing, editing?.sourceId);if (conflicts.length) { setError({ field: "rooms", message: `ห้องชนกับ ${conflicts[0].title} วันที่ ${calendarLabel(day)} ${conflicts[0].start}–${conflicts[0].end}` });return; } }
    const id = editing?.sourceId || `preview-calendar-${++counter.current}`;
    const next = { rules: data.rules.filter(item => item.id !== id), events: data.events.filter(item => item.id !== id) };
    if (value.repeat === "weekly") next.rules = [...next.rules, { ...value, id, validFrom: value.date, weekday: calendarWeekday(value.date) }];else next.events = [...next.events, { ...value, id }];
    commit(next, editing ? "แก้ไขตารางแล้ว" : "เพิ่มตารางแล้ว");
  }
  function copyWeek() {
    if (!canEdit || !copyRows.length) return;
    if (!validCalendarDate(copyDate) || calendarWeekday(copyDate) !== 0) { setError({ message: "เลือกวันจันทร์ของสัปดาห์ปลายทาง" });return; }
    const target = calendarRange(copyDate, "week"), existing = expandCalendar(data, target), additions = [];
    for (const row of copyRows) {
      const offset = calendarDates(week.start, row.date).length - 1, candidate = { ...row, id: `copy-preview-${++counter.current}`, date: addCalendarDays(copyDate, offset) };
      if (calendarConflicts(candidate, [...existing, ...additions]).length) { setError({ message: `มีห้องชนกันในวันที่ ${calendarLabel(candidate.date)} ยังไม่ได้เพิ่มรายการใด` });return; }additions.push(candidate);
    }
    commit({ ...data, events: [...data.events, ...additions] }, `คัดลอกรายการสอบ ${additions.length} รายการแล้ว`);selectDate(copyDate);
  }
  function importClassrooms(rules) {
    if (!canEdit || !rules.length) return;
    const imported = rules.map(rule=>({...rule,id:`pdf-preview-${++counter.current}`}));
    commit({ ...data, rules: [...data.rules, ...imported] }, `นำเข้า ${imported.length} ตารางรายสัปดาห์แล้ว`);
    selectDate(imported.map(rule=>rule.validFrom).sort()[0]);
    setFilters(previous=>({...previous,semester:imported[0].semester,kinds:[...new Set([...previous.kinds,"classroom"])]}));
  }
  function addPreviewPerson(name) {
    if(!canEdit)return {error:"ไม่มีสิทธิ์เพิ่มผู้คุมทดลอง"};
    const next=addDlPreviewPerson(people,name,"dl-person-"+(++counter.current));
    if(next.error)return next;
    setPeople(next.people);return {person:next.person};
  }
  function importDlRounds(events, options) {
    if (!canEdit) return "ไม่มีสิทธิ์นำเข้าตารางสอบ";
    const candidate = events.map((row,index)=>({...row,id:"commit-"+index,selected:true,proctorKeys:[],manualProctors:row.proctors}));
    const checked = planDlImport(candidate,{...options,people},data);
    if(checked.issues.length) return checked.issues[0].message;
    const additions=checked.events.map(event=>({...event,id:"dl-image-preview-"+(++counter.current)}));
    if(!additions.length)return "ไม่มีรอบสอบที่พร้อมนำเข้า";
    commit({...data,events:[...data.events,...additions]},"นำเข้า "+additions.length+" รอบสอบ DL แล้ว");
    selectDate(additions.map(row=>row.date).sort()[0]);
    setFilters(previous=>({...previous,semester:options.semester,kinds:[...new Set([...previous.kinds,"dl"])]}));
    return null;
  }
  function navigatePeriod(direction) { selectDate(mode === "month" ? addCalendarMonths(date, direction) : addCalendarDays(date, direction * (mode === "day" ? 1 : 7))); }
  const title = ({ date: "ไปยังวันที่", filters: "ปฏิทินและตัวกรอง", detail: selected?.title, entry: editing ? "แก้ไขตาราง" : "เพิ่มตาราง", holiday: selectedHoliday?.title, copy: "คัดลอกรายการสอบในสัปดาห์นี้", import: importKind === "dl" ? "นำเข้าตารางสอบ DL จากรูปภาพ" : "นำเข้าตารางเรียนจาก PDF", delete: "ลบตารางตัวอย่าง", notifications: "การแจ้งเตือน" }[dialog] || "");

  return <WorkspaceFrame
    user={{ uid: "calendar-fixture", displayName: "เจ้าหน้าที่ตัวอย่าง A", initial: "A", role }} pathname="/calendar"
    notificationSlot={<button
      type="button" className="ui-icon-button"
      aria-label="การแจ้งเตือนตัวอย่าง" onClick={() => open("notifications")}
    >
      <Bell size={20} aria-hidden="true" />
    </button>}
    glassMode={glassMode} onNavigate={href => { if (previewDestination(href) && previewDestination(href) !== "/dev/calendar") router.push(previewDestination(href));else if (href === "/worklogs") router.push("/dev/history");else if (href !== "/calendar") setStatus("หน้านี้ยังไม่ได้ย้ายตามแบบ — ดูสถานะรายหน้าในรายงาน QC"); }}
  >
    <div className="cal-page-heading ui-page-heading">
      <div>
        <h1>ตารางและการใช้ห้อง</h1>
        <p>เรียน สอบรายวิชา และ Digital Literacy ในปฏิทินเดียว</p>
        <small className="cal-preview-label">Development · ข้อมูลตัวอย่าง</small>
      </div>
      <div className="cal-heading-actions">
        <GlassButton
          mode={glassMode} disabled={!canEdit}
          onClick={() => open("import")}
        >
          <Upload size={17} aria-hidden="true" />
          นำเข้าตาราง
        </GlassButton>
        <GlassButton
          mode={glassMode} variant="prominent"
          disabled={!canEdit} onClick={() => startEntry()}
        >
          <Plus size={18} aria-hidden="true" />
          เพิ่มตาราง
        </GlassButton>
      </div>
    </div>
    <section className="cal-dataset-switch" aria-label="ชุดข้อมูลสำหรับทดลอง">
      <GlassControlGroup mode={glassMode} label="เลือกชุดข้อมูลปฏิทิน">
        <button type="button" aria-pressed={dataset === "sample"} onClick={() => setDataset("sample")}>ชุดตัวอย่าง</button>
        <button type="button" aria-pressed={dataset === "sandbox"} onClick={() => setDataset("sandbox")}>พื้นที่ทดลองนำเข้า</button>
      </GlassControlGroup>
      <p>{dataset === "sample" ? "ชุดตัวอย่างสำหรับตรวจหน้าตาและการทำงาน · ทดลองไฟล์ของคุณได้ในพื้นที่แยก" : "พื้นที่เริ่มว่างสำหรับไฟล์ของคุณ แยกจากชุดตัวอย่าง · ข้อมูลอยู่เฉพาะแท็บนี้และยังไม่บันทึกระบบจริง"}</p>
    </section>
    <div className="cal-layout" data-side-open={sideOpen}>
      <aside className="cal-sidebar" aria-label="ปฏิทินและตัวกรอง">
        <GlassSurface
          mode={glassMode} radius={22}
          name="calendar-sidebar" interactive={false}
        />
        <div className="cal-sidebar-content">
          <div className="cal-mini-heading">
            <strong>{calendarLabel(miniMonth, { month: "long", year: "numeric" })}</strong>
            <button
              type="button" className="cal-small-icon"
              aria-label="เดือนก่อนหน้าในปฏิทินย่อ" onClick={() => setMiniMonth(addCalendarMonths(miniMonth, -1))}
            >
              <ChevronLeft size={15} aria-hidden="true" />
            </button>
            <button
              type="button" className="cal-small-icon"
              aria-label="เดือนถัดไปในปฏิทินย่อ" onClick={() => setMiniMonth(addCalendarMonths(miniMonth, 1))}
            >
              <ChevronRight size={15} aria-hidden="true" />
            </button>
          </div>
          <MiniCalendar
            anchor={miniMonth} selected={date}
            today={today} onSelect={selectDate}
          />
          <FilterFields
            filters={filters} onChange={setFilters}
            id="cal-side" semesters={data.rules.map(rule=>rule.semester)}
          />
          <button
            type="button" className="cal-text-button"
            onClick={() => setFilters(defaults)}
          >
            ล้างตัวกรอง
          </button>
          <p className="cal-source-caption">
            วันหยุดจาก Google ประเทศไทย
            <br />
            <span>ชุดอ้างอิงปี พ.ศ. 2569 ถึง 2570</span>
          </p>
        </div>
      </aside>
      <div className="cal-main">
        <div className="cal-toolbar">
          <div className="cal-date-tools">
            <button
              type="button" className="cal-sidebar-toggle ui-icon-button"
              aria-label={sideOpen ? "ซ่อนปฏิทินย่อ" : "แสดงปฏิทินย่อ"} aria-expanded={sideOpen}
              onClick={() => setSideOpen(!sideOpen)}
            >
              <PanelLeftClose size={20} aria-hidden="true" />
            </button>
            <button
              type="button" className="cal-month-title"
              onClick={() => open("date")} aria-label="เลือกวันที่"
            >
              <span>{calendarLabel(date, { month: "long", year: "numeric" })}</span>
              <ChevronDown size={16} aria-hidden="true" />
            </button>
          </div>
          <GlassControlGroup
            mode={glassMode} label="เปลี่ยนช่วงวันที่"
            className="cal-period-controls"
          >
            <button
              type="button" aria-label="ช่วงก่อนหน้า"
              onClick={() => navigatePeriod(-1)}
            >
              <ChevronLeft size={17} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => selectDate(today)}>วันนี้</button>
            <button
              type="button" aria-label="ช่วงถัดไป"
              onClick={() => navigatePeriod(1)}
            >
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          </GlassControlGroup>
          <GlassControlGroup
            mode={glassMode} label="มุมมองปฏิทิน"
            className="cal-view-controls"
          >
            {[["day", "วัน"], ["week", "สัปดาห์"], ["month", "เดือน"], ["agenda", "รายการ"]].map(([value, label]) => <button
              type="button" key={value}
              aria-pressed={mode === value} onClick={() => setMode(value)}
            >
              {label}
            </button>)}
          </GlassControlGroup>
          <div className="cal-extra-controls">
            <button
              type="button" className="ui-icon-button"
              aria-label="ค้นหาหรือกรองตาราง" onClick={() => open("filters")}
            >
              <Search size={19} aria-hidden="true" />
            </button>
            <MenuPopover
              glassMode={glassMode} label="คำสั่งปฏิทินเพิ่มเติม"
              icon={<Ellipsis size={21} aria-hidden="true" />} items={[{ label: "ปฏิทินและตัวกรอง…", icon: <Filter size={17} aria-hidden="true" />, action: () => open("filters") }, { label: "เพิ่มรอบสอบ DL…", icon: <Plus size={17} aria-hidden="true" />, disabled: !canEdit, action: () => startEntry("dl") }, { label: "คัดลอกรายการสอบสัปดาห์นี้…", icon: <Copy size={17} aria-hidden="true" />, disabled: !canEdit, action: () => open("copy") }]}
            />
          </div>
        </div>
        <div className="cal-scope-line">
          <span>{range.start === range.end ? calendarLabel(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : `${calendarLabel(range.start, { day: "numeric", month: "short" })} – ${calendarLabel(range.end, { day: "numeric", month: "short", year: "numeric" })}`}</span>
          <span>{`${rows.filter(row => row.date >= range.start && row.date <= range.end).length} กิจกรรม · ${filters.room === "all" ? "ทุกห้อง" : `ห้อง ${filters.room}`}`}</span>
          <button
            type="button" onClick={() => open("filters")}
            className="cal-mobile-filters"
          >
            <Filter size={15} aria-hidden="true" />
            ตัวกรอง
          </button>
        </div>
        {!coverage && (filters.public || filters.observance) && <p className="cal-coverage-note">ไม่มีชุดข้อมูลวันหยุดของปีนี้ใน preview ไม่ได้หมายความว่าปีนี้ไม่มีวันหยุด</p>}
        {mode === "day" && <DayStrip
          range={week} selected={date}
          today={today} onSelect={selectDate}
          holidays={holidays} holidayOptions={filters}
        />}
        <div className="cal-content" data-view={mode}>
          {mode === "month" ? <>
            <CalendarMonth
              {...shared} anchor={date}
              selected={date} today={today}
              onDate={selectDate}
            />
            <div className="cal-month-selection">
              <CalendarAgenda
                {...shared} rows={monthEvents}
                range={{ start: date, end: date }} emptyText="ไม่มีตารางในวันที่เลือก"
              />
            </div>
          </> : mode === "agenda" ? <CalendarAgenda {...shared} /> : <CalendarTimeline {...shared} today={today} />}
        </div>
        <div className="cal-legend" aria-label="คำอธิบายสี">
          {Object.entries(CALENDAR_KINDS).map(([kind, label]) => <span key={kind} data-kind={kind}>
            <i aria-hidden="true" />
            {label}
          </span>)}
          <span data-kind="holiday">
            <i aria-hidden="true" />
            วันหยุดไทย
          </span>
        </div>
        {undo && canEdit && <div className="cal-undo">
          <span>
            <Check size={17} aria-hidden="true" />
            {undo.message}
          </span>
          <GlassButton mode={glassMode} onClick={() => { setData(undo.before);setUndo(null);setStatus("เลิกทำการเปลี่ยนแปลงล่าสุดแล้ว"); }}>
            <Undo2 size={16} aria-hidden="true" />
            เลิกทำ
          </GlassButton>
        </div>}
      </div>
    </div>
    <details className="cal-inspector">
      <summary>ตัวเลือกตรวจแบบ · Development</summary>
      <div>
        <label>
          บทบาทตัวอย่าง
          <select
            className="apple-input" value={role}
            onChange={event => { setRole(event.target.value);setDialog(null); }}
          >
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
            <option value="superadmin">Superadmin</option>
          </select>
        </label>
        <div
          className="ui-glass-comparison" role="group"
          aria-label="เปรียบเทียบวัสดุกระจก"
        >
          {[["css", "CSS เดิม"], ["quick", "QuickLiquid"]].map(([value, label]) => <button
            type="button" className="ui-choice"
            key={value} aria-pressed={value === glassMode}
            onClick={() => setGlassMode(value)}
          >
            {label}
          </button>)}
        </div>
        <a href="/dev/record">หน้าบันทึกงาน</a>
      </div>
      <p className="ui-caption">ตารางและธุรกรรมในหน้านี้เป็นข้อมูลตัวอย่างในหน่วยความจำ ไม่มีการอ่านหรือเขียน production · วันหยุดเป็นชุดอ้างอิงจากวันที่ 5 พ.ย. 2569</p>
    </details>
    <p
      className="cal-live-status" role="status"
      aria-live="polite"
    >
      {status}
    </p>
    <Dialog
      open={Boolean(dialog)} onClose={() => setDialog(null)}
      title={title} className={`cal-dialog ${dialog === "entry" ? "cal-entry-dialog" : ""} ${dialog === "import" ? "cal-import-dialog" : ""}`}
      description={dialog === "entry" || dialog === "import" ? "Development · พื้นที่ทดลอง ยังไม่บันทึกไปยังระบบจริง" : undefined}
    >
      {dialog === "date" && <form onSubmit={event => { event.preventDefault();if (validCalendarDate(dateDraft)) { selectDate(dateDraft);setDialog(null); } }}>
        <label className="ui-field">
          <span>ไปยังวันที่</span>
          <input
            className="apple-input" type="date"
            required value={dateDraft}
            onChange={event => setDateDraft(event.target.value)}
          />
        </label>
        <MiniCalendar
          anchor={dateDraft && validCalendarDate(dateDraft) ? dateDraft : date} selected={dateDraft}
          today={today} onSelect={setDateDraft}
        />
        <div className="cal-dialog-actions">
          <GlassButton mode={glassMode} onClick={() => setDialog(null)}>ยกเลิก</GlassButton>
          <GlassButton
            mode={glassMode} type="submit"
            variant="prominent"
          >
            ไปยังวันที่นี้
          </GlassButton>
        </div>
      </form>}
      {dialog === "filters" && <div>
        <label className="ui-field">
          <span>ค้นหาวิชา กิจกรรม หรือห้อง</span>
          <input
            className="apple-input" type="search"
            value={filterDraft.query} onChange={event => setFilterDraft({ ...filterDraft, query: event.target.value })}
          />
        </label>
        <FilterFields
          filters={filterDraft} onChange={setFilterDraft}
          id="cal-dialog" semesters={data.rules.map(rule=>rule.semester)}
        />
        <div className="cal-dialog-actions">
          <GlassButton mode={glassMode} onClick={() => setDialog(null)}>ยกเลิก</GlassButton>
          <GlassButton
            mode={glassMode} variant="prominent"
            onClick={() => { setFilters(filterDraft);setDialog(null); }}
          >
            ใช้ตัวกรอง
          </GlassButton>
        </div>
      </div>}
      {dialog === "entry" && <CalendarEntryForm people={people}
        {...{ entry, setEntry, editing, error, glassMode }} onSave={saveEntry}
        onCancel={() => setDialog(null)}
      />}
      {dialog === "detail" && selected && <div>
        <span className="cal-kind-badge" data-kind={selected.kind}>{CALENDAR_KINDS[selected.kind]}</span>
        <dl className="cal-detail-facts">
          <div>
            <dt>วันที่</dt>
            <dd>{calendarLabel(selected.date)}</dd>
          </div>
          <div>
            <dt>เวลา</dt>
            <dd>{`${selected.start}–${selected.end}`}</dd>
          </div>
          <div>
            <dt>ห้อง</dt>
            <dd>{selected.rooms.join(" + ")}</dd>
          </div>
          {selected.kind === "dl" ? <>
            <div>
              <dt>ผู้เข้าสอบ</dt>
              <dd>{`${selected.participants} คนต่อรอบ`}</dd>
            </div>
            <div>
              <dt>ผู้คุมสอบ</dt>
              <dd>{selected.proctors.map(id => people.find(person => person.id === id)?.label || "ไม่ระบุ").join(", ")}</dd>
            </div>
          </> : <div>
            <dt>ผู้สอน</dt>
            <dd>{selected.teacher || "ไม่ระบุ"}</dd>
          </div>}
          {selected.recurring && <div>
            <dt>ตารางรายสัปดาห์</dt>
            <dd>{`${calendarLabel(selected.validFrom)} – ${calendarLabel(selected.validTo)}`}</dd>
          </div>}
        </dl>
        {canEdit && <div className="cal-dialog-actions">
          <GlassButton mode={glassMode} variant="destructive"
            type="button" className="cal-delete-action"
            onClick={() => setDialog("delete")}
          >
            ลบตาราง…
          </GlassButton>
          <GlassButton mode={glassMode} onClick={() => startEntry(selected.kind, selected)}>แก้ไขตาราง</GlassButton>
        </div>}
      </div>}
      {dialog === "delete" && selected && <div>
        <p className="cal-form-note">{selected.recurring ? "ลบตารางรายสัปดาห์นี้ทุกครั้งในช่วงที่กำหนด หลังลบยังเลิกทำได้" : "ลบรายการนี้จากข้อมูลตัวอย่าง หลังลบยังเลิกทำได้"}</p>
        <div className="cal-dialog-actions">
          <GlassButton mode={glassMode} onClick={() => setDialog("detail")}>ยกเลิก</GlassButton>
          <GlassButton mode={glassMode} variant="destructive"
            type="button" className="cal-delete-action"
            onClick={() => { if (canEdit) commit({ rules: data.rules.filter(row => row.id !== selected.sourceId), events: data.events.filter(row => row.id !== selected.sourceId) }, "ลบตารางแล้ว"); }}
          >
            ลบตารางตัวอย่าง
          </GlassButton>
        </div>
      </div>}
      {dialog === "holiday" && selectedHoliday && <div>
        <p className="cal-form-note">{selectedHoliday.kind === "public" ? "วันหยุดนักขัตฤกษ์ไทย" : "วันสำคัญ · ไม่ใช่วันหยุดนักขัตฤกษ์"}</p>
        <p>{calendarLabel(selectedHoliday.start)}</p>
        <p className="ui-caption cal-source-detail">อ้างอิง Google Calendar ประเทศไทย · ชุดข้อมูลวันที่ 5 พ.ย. 2569 การแสดงวันหยุดไม่ปิดกั้นการเพิ่มตาราง</p>
        <a
          className="cal-text-button" href={holidays.sourceUrl}
          target="_blank" rel="noreferrer"
        >
          ดูแหล่งข้อมูลปฏิทิน
        </a>
      </div>}
      {dialog === "copy" && <div>
        <p className="cal-form-note">{`${copyRows.length} รายการสอบที่ตรงกับตัวกรองในสัปดาห์นี้ ตารางเรียนที่เกิดซ้ำทุกสัปดาห์อยู่แล้วจะไม่ถูกคัดลอกซ้ำ`}</p>
        <label className="ui-field">
          <span>วันจันทร์ของสัปดาห์ปลายทาง</span>
          <input
            className="apple-input" type="date"
            value={copyDate} onChange={event => setCopyDate(event.target.value)}
          />
        </label>
        {error && <p className="cal-form-error" role="alert">{error.message}</p>}
        <div className="cal-dialog-actions">
          <GlassButton mode={glassMode} onClick={() => setDialog(null)}>ยกเลิก</GlassButton>
          <GlassButton
            mode={glassMode} variant="prominent"
            disabled={!copyRows.length} onClick={copyWeek}
          >
            คัดลอกตัวอย่าง
          </GlassButton>
        </div>
      </div>}
      {dialog === "import" && <>
        <GlassControlGroup mode={glassMode} label="ชนิดตารางที่นำเข้า"><button type="button" aria-pressed={importKind==="classroom"} onClick={()=>setImportKind("classroom")}>ตารางเรียน · PDF</button><button type="button" aria-pressed={importKind==="dl"} onClick={()=>setImportKind("dl")}>ตารางสอบ DL · รูปภาพ</button></GlassControlGroup>
        {importKind === "dl" ? <DlImageImport people={people} onAddPerson={addPreviewPerson} data={data} dataset={dataset} canEdit={canEdit} glassMode={glassMode} onUseSandbox={()=>setDataset("sandbox")} onCancel={()=>setDialog(null)} onImport={importDlRounds}/> : <ClassroomImport data={data} dataset={dataset} onUseSandbox={()=>setDataset("sandbox")} canEdit={canEdit} glassMode={glassMode} onCancel={()=>setDialog(null)} onImport={importClassrooms}/> }
      </>}
      {dialog === "notifications" && <p className="ui-caption">ไม่มีการแจ้งเตือนตัวอย่างเพิ่มเติม</p>}
    </Dialog>
  </WorkspaceFrame>;
}
