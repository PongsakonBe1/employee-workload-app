"use client";

import { useState } from "react";
import { ChevronLeft, Download } from "lucide-react";
import { GlassButton } from "../../../components/ui/GlassControls";
import { calendarLabel } from "../../../lib/calendarView";
import { findPreviewResource, resourceHistoryRows, resourceHistoryCSV } from "../../../lib/resourcePreview";
import { downloadCSV } from "./downloadCSV";
export function ResourceHistory({
  data,
  actor,
  selection,
  range,
  onRange,
  onBack
}) {
  const [draft, setDraft] = useState(range),
    [error, setError] = useState(""),
    [feedback, setFeedback] = useState("");
  let rows = [],
    item,
    readError = "";
  try {
    item = findPreviewResource(data, selection);
    rows = resourceHistoryRows(data, actor, selection, range);
  } catch (failure) {
    readError = failure.message;
  }
  function applyRange(event) {
    event.preventDefault();
    try {
      resourceHistoryRows(data, actor, selection, draft);
      onRange(draft);
      setError("");
      setFeedback("");
    } catch (failure) {
      setError(failure.message);
    }
  }
  function exportHistory() {
    try {
      const allowed = resourceHistoryRows(data, actor, selection, range);
      downloadCSV("resource-history-preview.csv", resourceHistoryCSV(allowed));
      setFeedback(`ดาวน์โหลดประวัติตัวอย่าง ${allowed.length} รายการแล้ว`);
      setError("");
    } catch (failure) {
      setError(failure.message);
    }
  }
  return <div className="resource-history">
    <div className="resource-history-actions"><GlassButton mode="quick" onClick={onBack}><ChevronLeft size={16} aria-hidden="true" />กลับรายละเอียด</GlassButton><GlassButton mode="quick" disabled={Boolean(readError)} onClick={exportHistory}><Download size={16} aria-hidden="true" />ดาวน์โหลด CSV</GlassButton></div>
    <p className="resource-history-identity">{selection.kind === "room" ? `ห้อง ${item?.id}` : item?.name} · {selection.id}</p>
    <form className="resource-history-range" onSubmit={applyRange} noValidate><label className="ui-field"><span>จากวันที่</span><input aria-label="ประวัติจากวันที่" className="apple-input" type="date" value={draft.start} onChange={event => setDraft({
          ...draft,
          start: event.target.value
        })} /></label><label className="ui-field"><span>ถึงวันที่</span><input aria-label="ประวัติถึงวันที่" className="apple-input" type="date" value={draft.end} onChange={event => setDraft({
          ...draft,
          end: event.target.value
        })} /></label><GlassButton mode="quick" type="submit">ใช้ช่วงวันที่</GlassButton><GlassButton mode="quick" onClick={() => {
        setDraft(range);
        setError("");
      }}>คืนค่าช่วงเดิม</GlassButton></form>
    <p role="alert" className="resource-error">{readError || error}</p>
    <p className="resource-result-count" data-testid="resource-history-count">{calendarLabel(range.start)} – {calendarLabel(range.end)} · {rows.length} รายการ</p>
    <p className="ui-caption resource-note">{actor.role === "staff" ? "แสดงเฉพาะประวัติของผู้ปฏิบัติงานบัญชีนี้" : "แสดงประวัติทีมที่จับคู่ทรัพยากรนี้ได้"} · จับคู่ด้วย ID ไม่เดาจากชื่อ</p>
    <div className="resource-history-list" role="list" aria-label="ประวัติทรัพยากร">{rows.map(row => <article key={row.id} role="listitem" data-history-event={row.id}><span>{calendarLabel(row.date)}<small>{row.time}</small></span><div><strong>{row.title}</strong><small>{row.person}</small>{selection.kind === "device" && <small>ขณะทำรายการ: {row.assetCodeAtEvent} · {row.locationAtEvent}</small>}</div><span className="record-badge">{row.action}</span></article>)}</div>
    {!readError && !rows.length && <p className="resource-empty">ยังไม่มีประวัติที่จับคู่ได้ในช่วงวันที่และสิทธิ์ที่เลือก</p>}
    <p role="status" className="resource-live-status">{feedback}</p>
  </div>;
}
