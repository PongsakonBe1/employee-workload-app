"use client";
import { previewDestination } from "../../../lib/previewNavigation";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, Download, List, Pencil, Plus, Search, Trash2, Undo2 } from "lucide-react";
import { WorkspaceFrame } from "../../../components/ui/WorkspaceFrame";
import { Dialog } from "../../../components/ui/Dialog";
import { GlassButton, GlassControlGroup } from "../../../components/ui/GlassControls";
import { ReviewSymbol } from "../../../components/ui/ReviewSymbol";
import { usePreviewState } from "../previewState";
import { recordLedger, useRecordLedger } from "../record/store";
import { people } from "../record/fixtures";
import { canUndoPreview } from "../../../lib/equipmentPreview";
import { canManagePreviewLog, canViewPreviewLog } from "../../../lib/previewLedger";
import { historyRows, historyInitialRange, historyCSV } from "../../../lib/historyPreview";
import { calendarLabel, monthCalendarDates, addCalendarMonths, calendarRange, validCalendarDate, calendarToday } from "../../../lib/calendarView";
import holidays from "../../../data/calendar-holidays.json";
function Details({
  row,
  actor,
  onEdit,
  onDelete
}) {
  if (!row) return <div className="history-detail-empty"><ReviewSymbol name="history" size={32} /><h3>เลือกรายการงาน</h3><p>รายละเอียดจะแสดงที่นี่</p></div>;
  const editable = canManagePreviewLog(row, actor);
  return <div className="history-details" data-testid="history-details">
    <h3>{row.title}</h3>
    <dl><dt>วันที่ / เวลา</dt><dd>{calendarLabel(row.date)} · {row.time}</dd><dt>ผู้ปฏิบัติงาน</dt><dd>{row.person}</dd><dt>หัวข้อรอง</dt><dd>{row.minorTask}</dd><dt>งานหลัก / กลุ่มงาน</dt><dd>{[row.mainDuty, row.dutyGroup].filter(Boolean).join(" · ") || "ไม่มีข้อมูลในรายการตัวอย่างเดิม"}</dd><dt>ผู้รับบริการ</dt><dd>{row.recipient || "ไม่ได้ระบุ"}</dd><dt>รายละเอียด</dt><dd>{row.comment || row.detail || "ไม่ได้ระบุ"}</dd></dl>
    <div className="history-detail-actions"><GlassButton mode="quick" disabled={!editable} onClick={onEdit}><Pencil size={16} aria-hidden="true" />แก้ไขรายละเอียด</GlassButton><GlassButton mode="quick" variant="destructive" disabled={!editable} onClick={onDelete}><Trash2 size={16} aria-hidden="true" />ลบรายการ</GlassButton></div>
    {!editable && <p className="ui-caption">รายการถูกล็อกหรืออยู่นอกสิทธิ์แก้ไขของบัญชีตัวอย่างนี้</p>}
  </div>;
}
export default function HistoryPreview() {
  const router = useRouter(),
    {
      data,
      revision,
      undo
    } = useRecordLedger();
  const [role, setRole] = usePreviewState("record.role", "staff"),
    [personId, setPersonId] = usePreviewState("record.person", people[0].id);
  const [dateTime] = usePreviewState("record.datetime", {
    date: "2026-11-06",
    time: "10:55"
  });
  const referenceDate = validCalendarDate(dateTime.date) ? dateTime.date : calendarToday();
  const [filters, setFilters] = usePreviewState("history.filters", {
    ...historyInitialRange(referenceDate),
    search: "",
    person: "all"
  });
  const [view, setView] = usePreviewState("history.view", "list"),
    [month, setMonth] = usePreviewState("history.month", referenceDate.slice(0, 7) + "-01");
  const [selectedId, setSelectedId] = usePreviewState("history.selected", null),
    [page, setPage] = useState(1),
    [ascending, setAscending] = useState(false);
  const [dialog, setDialog] = useState(null),
    [day, setDay] = useState(null),
    [selectedIds, setSelectedIds] = useState([]),
    [selecting, setSelecting] = useState(false);
  const [draftFilters, setDraftFilters] = useState(filters),
    [edit, setEdit] = useState({
      recipient: "",
      comment: ""
    }),
    [operation, setOperation] = useState(null),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  const actor = {
      id: personId,
      role
    },
    person = people.find(item => item.id === personId) || people[0];
  let rows = historyRows(data.logs, actor, filters);
  if (ascending) rows = [...rows].reverse();
  const pageCount = Math.max(1, Math.ceil(rows.length / 8)),
    currentPage = Math.min(page, pageCount),
    shown = rows.slice((currentPage - 1) * 8, currentPage * 8);
  const selected = data.logs.find(row => row.id === selectedId && canViewPreviewLog(row, actor)),
    dayRows = rows.filter(row => row.date === day);
  const dayHolidays = value => holidays.events.filter(item => item.kind === "public" && value >= item.start && value < item.endExclusive);
  useEffect(() => {
    setSelectedIds([]);
    setPage(1);
  }, [revision, role, personId, filters]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const assetId = params.get("asset"), start = params.get("from"), end = params.get("to");
    if (!assetId) return;
    if (!validCalendarDate(start) || !validCalendarDate(end) || end < start) {
      setStatus("ลิงก์อุปกรณ์มีช่วงวันที่ไม่ถูกต้อง กรุณาเลือกช่วงใหม่");
      return;
    }
    setFilters({ assetId, start, end, search: "", person: "all" });
    setSelectedId(null);
    setView("list");
  }, [setFilters, setSelectedId, setView]);
  function changeFilters(value) {
    setFilters(value);
    setSelectedId(null);
  }
  function openFilters() {
    setError("");
    setDraftFilters(filters);
    setDialog("filters");
  }
  function choose(row, fromDay = false) {
    setSelectedId(row.id);
    setError("");
    if (fromDay || matchMedia("(max-width:1100px)").matches) setDialog("detail");
  }
  function begin(kind, ids = [selected.id]) {
    setError("");
    setOperation({
      kind,
      ids,
      requestId: crypto.randomUUID(),
      expectedRevision: revision
    });
    if (kind === "edit") setEdit({
      recipient: selected.recipient || "",
      comment: selected.comment || selected.detail || ""
    });
    setDialog(kind);
  }
  function applyOperation(event) {
    event.preventDefault();
    try {
      const result = recordLedger.transact({
        ...operation,
        actor,
        entries: operation.kind === "edit" ? [edit] : []
      });
      setDialog(null);
      setStatus(`${operation.kind === "edit" ? "แก้ไข" : "ลบ"}ตัวอย่าง ${result.count} รายการแล้ว`);
    } catch (failure) {
      setError(failure.message);
    }
  }
  function exportRows() {
    const exported = selectedIds.length ? rows.filter(row => selectedIds.includes(row.id)) : rows;
    const link = document.createElement("a"),
      url = URL.createObjectURL(new Blob(["\ufeff" + historyCSV(exported)], {
        type: "text/csv;charset=utf-8"
      }));
    link.href = url;
    link.download = "work-history-preview.csv";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus(`ส่งออกข้อมูลตัวอย่าง ${exported.length} รายการแล้ว`);
  }
  const detailProps = {
    row: selected,
    actor,
    onEdit: () => begin("edit"),
    onDelete: () => begin("delete")
  };
  return <WorkspaceFrame user={{
    uid: person.id,
    displayName: person.displayName,
    initial: person.initial,
    role
  }} pathname="/worklogs" glassMode="quick" onNavigate={href => {
    if (previewDestination(href) && previewDestination(href) !== "/dev/history") router.push(previewDestination(href));else if (href === "/calendar") router.push("/dev/calendar");else if (href !== "/worklogs") setStatus("หน้านี้ยังไม่ได้ย้ายตามแบบ — ดูสถานะรายหน้าในรายงาน QC");
  }}>
    <div className="ui-page-heading history-heading"><div><h1>ประวัติงาน</h1><p>ค้นหา ตรวจรายละเอียด และจัดการรายการงาน</p><small className="ui-caption">Development · ข้อมูลตัวอย่างร่วมกับหน้าบันทึกงาน</small></div><GlassButton mode="quick" variant="prominent" onClick={() => router.push("/dev/record")}><Plus size={18} aria-hidden="true" />เพิ่มบันทึก</GlassButton></div>
    <section className="history-toolbar" aria-label="มุมมองและตัวกรองประวัติ">
      <GlassControlGroup mode="quick" label="มุมมองประวัติงาน">{[["list", "รายการ", List], ["calendar", "ปฏิทิน", CalendarDays]].map(([value, label, Icon]) => <button key={value} type="button" aria-pressed={view === value} onClick={() => setView(value)}><Icon size={16} aria-hidden="true" />{label}</button>)}</GlassControlGroup>
      <label className="history-search"><Search size={17} aria-hidden="true" /><input type="search" value={filters.search} aria-label="ค้นหางาน ผู้รับบริการ หรือเจ้าหน้าที่" placeholder="ค้นหางาน ผู้รับบริการ หรือเจ้าหน้าที่" onChange={event => changeFilters({
          ...filters,
          search: event.target.value
        })} /></label>
      <GlassButton mode="quick" onClick={openFilters}><CalendarDays size={16} aria-hidden="true" />ช่วงวันที่</GlassButton>
      <button type="button" className="ui-choice" aria-pressed={selecting} onClick={() => {
        setSelecting(!selecting);
        setSelectedIds([]);
      }}>เลือกหลายรายการ</button>
    </section>
    <div className="history-summary">{filters.assetId && <span data-testid="history-asset-filter">อุปกรณ์: {data.devices.find(item => item.id === filters.assetId)?.assetCode || filters.assetId}</span>}<span>{calendarLabel(filters.start)} – {calendarLabel(filters.end)} · {rows.length} รายการ</span><button type="button" className="history-link" onClick={() => changeFilters({
        ...historyInitialRange(referenceDate),
        search: "",
        person: "all"
      })}>ล้างตัวกรอง</button><button type="button" className="history-link" onClick={exportRows} disabled={!rows.length}><Download size={15} aria-hidden="true" />CSV</button></div>
    {canUndoPreview(undo, actor) && !undo.kind.startsWith("template-") && <div className="history-undo" role="region" aria-label="เลิกทำรายการล่าสุด"><span>เปลี่ยนข้อมูลตัวอย่าง {undo.count} รายการ</span><GlassButton mode="quick" onClick={() => {
        try {
          recordLedger.undo(actor, undo.id);
          setStatus("เลิกทำรายการล่าสุดแล้ว");
        } catch (failure) {
          setStatus(failure.message);
        }
      }}><Undo2 size={16} aria-hidden="true" />เลิกทำ</GlassButton></div>}
    {selecting && <div className="history-selection"><span>เลือก {selectedIds.length} รายการ</span><button type="button" className="ui-choice" onClick={() => setSelectedIds(shown.filter(row => canManagePreviewLog(row, actor)).map(row => row.id))}>เลือกทั้งหน้า</button><GlassButton mode="quick" variant="destructive" disabled={!selectedIds.length} onClick={() => begin("delete", selectedIds)}>ลบรายการที่เลือก</GlassButton></div>}
    <div className="history-layout">
      <div className="history-content">
        {view === "list" ? <section className="history-list" aria-label="รายการงาน">
          <div className="history-table-head"><button type="button" onClick={() => setAscending(!ascending)} aria-label={`เรียงวันที่${ascending ? "จากใหม่ไปเก่า" : "จากเก่าไปใหม่"}`}>วัน / เวลา {ascending ? "↑" : "↓"}</button><span>ผู้ปฏิบัติงาน</span><span>หัวข้อรอง</span><span>สถานะ</span></div>
          {shown.map(row => <div className="history-row" data-selected={selectedId === row.id} key={row.id}>
            {selecting && <input type="checkbox" className="ui-checkbox" aria-label={`เลือกรายการ ${row.title} ${row.time}`} checked={selectedIds.includes(row.id)} disabled={!canManagePreviewLog(row, actor)} onChange={event => setSelectedIds(event.target.checked ? [...selectedIds, row.id] : selectedIds.filter(id => id !== row.id))} />}
            <button type="button" className="history-row-open" onClick={() => choose(row)} aria-label={`ดูรายละเอียด ${row.title} ${row.time}`}><span><strong>{calendarLabel(row.date, {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                  })}</strong><small>{row.time}</small></span><span>{row.person}</span><span><strong>{row.title}</strong><small>{row.comment || row.detail || "ไม่มีรายละเอียดเพิ่มเติม"}</small></span><span className="history-row-state">บันทึกแล้ว</span><ChevronRight size={16} aria-hidden="true" /></button>
          </div>)}
          {!rows.length && <div className="history-empty"><h3>ไม่พบรายการในช่วงที่เลือก</h3><p>ลองเปลี่ยนช่วงวันที่หรือคำค้นหา</p></div>}
          <div className="history-pagination"><span>{rows.length} รายการ · หน้า {currentPage}/{pageCount}</span><button type="button" className="ui-choice" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>ก่อนหน้า</button><button type="button" className="ui-choice" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>ถัดไป</button></div>
        </section> : <section className="history-calendar" aria-label="ปฏิทินประวัติงาน">
          <div className="history-month-heading"><h2>{calendarLabel(month, {
                month: "long",
                year: "numeric"
              })}</h2><button type="button" className="ui-icon-button" aria-label="เดือนก่อน" onClick={() => {
              const next = addCalendarMonths(month, -1);
              setMonth(next);
              changeFilters({
                ...filters,
                ...calendarRange(next, "month")
              });
            }}><ChevronLeft size={18} aria-hidden="true" /></button><button type="button" className="ui-icon-button" aria-label="เดือนถัดไป" onClick={() => {
              const next = addCalendarMonths(month, 1);
              setMonth(next);
              changeFilters({
                ...filters,
                ...calendarRange(next, "month")
              });
            }}><ChevronRight size={18} aria-hidden="true" /></button></div>
          <div className="history-month-grid">{["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map(label => <span className="history-weekday" key={label}>{label}</span>)}{monthCalendarDates(month).map(date => {
              const count = rows.filter(row => row.date === date).length,
                days = dayHolidays(date);
              return <button type="button" key={date} data-day={date} data-outside={date.slice(0, 7) !== month.slice(0, 7)} className="history-day" aria-label={`${calendarLabel(date)} ${count} รายการ ${days.map(item => item.title).join(" ")}`} onClick={() => {
                setDay(date);
                setDialog("day");
              }}><strong>{Number(date.slice(8))}</strong>{count > 0 && <span>{count} รายการ</span>}{days.map(item => <small className="history-holiday" key={item.id}>{item.title}</small>)}</button>;
            })}</div>
          <p className="ui-caption">จำนวนงานตามตัวกรอง · วันหยุด Google ประเทศไทยเป็น snapshot {holidays.coverageYears.join("–")} และไม่นับเป็นงาน</p>
        </section>}
      </div>
      <aside className="history-inspector" aria-label="รายละเอียดงาน" aria-live="polite"><h2>รายละเอียดงาน</h2><Details {...detailProps} /></aside>
    </div>
    <details className="history-test-controls"><summary>ตัวเลือกตรวจแบบ · Development</summary><label className="ui-field"><span>บทบาทตัวอย่าง</span><select aria-label="บทบาทตัวอย่าง" value={role} className="apple-input" onChange={event => {
          setRole(event.target.value);
          setSelectedId(null);
        }}>{["staff", "admin", "superadmin"].map(value => <option key={value} value={value}>{value}</option>)}</select></label><label className="ui-field"><span>บัญชีตัวอย่าง</span><select aria-label="บัญชีตัวอย่าง" value={personId} className="apple-input" onChange={event => {
          setPersonId(event.target.value);
          setSelectedId(null);
        }}>{people.map(item => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label><p className="ui-caption">จำลอง role policy เท่านั้น ไม่ใช่การยืนยัน Auth/Firestore จริง · ข้อมูลอยู่ใน tab และเริ่มใหม่เมื่อ refresh</p></details>
    <p className="ui-caption" role="status" aria-live="polite">{status}</p>
    <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} title={{
      filters: "ช่วงวันที่และตัวกรอง",
      day: day ? calendarLabel(day) : "",
      detail: "รายละเอียดงาน",
      edit: "แก้ไขรายละเอียด",
      delete: "ยืนยันลบรายการ"
    }[dialog] || ""} className="history-dialog" description="Development · ข้อมูลตัวอย่าง ไม่เขียนระบบจริง">
      {error && <p role="alert" className="history-error">{error}</p>}
      {dialog === "filters" && <form noValidate onSubmit={event => {
        event.preventDefault();
        try {
          historyRows(data.logs, actor, draftFilters);
          changeFilters(draftFilters);
          setDialog(null);
          setError("");
        } catch (failure) {
          setError(failure.message);
        }
      }}><label className="ui-field"><span>จากวันที่</span><input className="apple-input" type="date" value={draftFilters.start} onChange={event => setDraftFilters({
            ...draftFilters,
            start: event.target.value
          })} /></label><label className="ui-field"><span>ถึงวันที่</span><input className="apple-input" type="date" value={draftFilters.end} onChange={event => setDraftFilters({
            ...draftFilters,
            end: event.target.value
          })} /></label>{role !== "staff" && <label className="ui-field"><span>ผู้ปฏิบัติงาน</span><select aria-label="ผู้ปฏิบัติงาน" className="apple-input" value={draftFilters.person} onChange={event => setDraftFilters({
            ...draftFilters,
            person: event.target.value
          })}><option value="all">ทุกคน</option>{people.map(item => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label>}<GlassButton mode="quick" variant="prominent" type="submit">ใช้ตัวกรอง</GlassButton></form>}
      {dialog === "day" && <div>{dayHolidays(day).map(item => <p className="history-holiday" key={item.id}>{item.title}</p>)}{dayRows.length ? dayRows.map(row => <button type="button" className="history-day-row" key={row.id} onClick={() => choose(row, true)}><span>{row.time}</span><strong>{row.title}</strong><small>{row.person}</small><ChevronRight size={16} aria-hidden="true" /></button>) : <p>ไม่มีงานในวันที่เลือกตามตัวกรอง</p>}</div>}
      {dialog === "detail" && <><Details {...detailProps} />{view === "calendar" && <GlassButton mode="quick" onClick={() => setDialog("day")}>กลับรายการวันที่</GlassButton>}</>}
      {dialog === "edit" && <form onSubmit={applyOperation}><p className="ui-caption">{selected?.title} · รอบนี้แก้ผู้รับบริการและข้อความ รายการห้อง/อุปกรณ์คงสถานะเดิม</p><label className="ui-field"><span>ผู้รับบริการ</span><input aria-label="ผู้รับบริการ" className="apple-input" value={edit.recipient} readOnly={Boolean(selected?.resource)} onChange={event => setEdit({
            ...edit,
            recipient: event.target.value
          })} /></label><label className="ui-field"><span>รายละเอียด</span><textarea aria-label="รายละเอียด" className="apple-input" rows={4} value={edit.comment} onChange={event => setEdit({
            ...edit,
            comment: event.target.value
          })} /></label><GlassButton mode="quick" variant="prominent" type="submit">บันทึกการแก้ไข</GlassButton></form>}
      {dialog === "delete" && <form onSubmit={applyOperation}><p>ลบข้อมูลตัวอย่าง {operation.ids.length} รายการ หลังยืนยันสามารถเลิกทำรายการล่าสุดได้</p><div className="history-detail-actions"><GlassButton mode="quick" onClick={() => setDialog(null)}>ยกเลิก</GlassButton><GlassButton mode="quick" variant="destructive" type="submit">ยืนยันลบ</GlassButton></div></form>}
    </Dialog>
  </WorkspaceFrame>;
}
