"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Check, Download, Plus, Search, Undo2 } from "lucide-react";
import { WorkspaceFrame } from "../../../components/ui/WorkspaceFrame";
import { GlassButton, GlassControlGroup } from "../../../components/ui/GlassControls";
import { Dialog } from "../../../components/ui/Dialog";
import { ReviewSymbol } from "../../../components/ui/ReviewSymbol";
import { usePreviewState } from "../previewState";
import { recordLedger, useRecordLedger } from "../record/store";
import { people } from "../record/fixtures";
import { ResourceDetails } from "./ResourceDetails";
import { ResourceHistory } from "./ResourceHistory";
import { ResourceExportPreview } from "./ResourceExportPreview";
import { downloadCSV } from "./downloadCSV";
import { resourceStatusRows, resourceStatusCSV } from "../../../lib/resourcePreview";
import { ResourceDialog } from "./ResourceDialog";
import { equipmentList, equipmentRange, equipmentState, equipmentSummary, EQUIPMENT_KINDS, EQUIPMENT_CONDITIONS, canManageEquipment, canUndoPreview } from "../../../lib/equipmentPreview";
import { previewDestination } from "../../../lib/previewNavigation";
import { roomState } from "../../../lib/resourceWorklog";
import { calendarLabel, calendarToday, validCalendarDate } from "../../../lib/calendarView";
const emptyDevice = () => ({
  name: "",
  assetCode: "",
  barcode: "",
  kind: "headphones",
  location: "ชั้น 3",
  order: 0,
  condition: "unknown",
  active: true
});
const symbols = {
  headphones: "headphones",
  plug: "plug",
  usb: "usb"
};
const viewMeta = {
  resources: ["ห้องและทรัพยากร", "/resources", "สถานะห้องและอุปกรณ์ ยืมและคืนได้ในบริบทเดิม"],
  equipment: ["ทะเบียนอุปกรณ์", "/admin/equipment-items", "เพิ่มอุปกรณ์ เปลี่ยนสังกัด และปรับรายการที่ใช้ในบันทึกด่วน"],
  usage: ["การใช้งานอุปกรณ์", "/admin/equipment-health", "ชิ้นไหนถูกยืมบ่อย และมีอะไรที่ต้องดูแลต่อ"]
};
function Badge({
  item
}) {
  const state = equipmentState(item);
  return <span className="record-badge" data-tone={state.tone}>{state.label}</span>;
}
function TypeOptions() {
  return Object.entries(EQUIPMENT_KINDS).map(([key, value]) => <option key={key} value={key}>{value}</option>);
}
export default function ResourcesWorkspace({
  mode
}) {
  const formId = useId(),
    dialogReturn = useRef(null);
  const [advancedOpen, setAdvancedOpen] = useState(false),
    [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    const viewport = matchMedia("(min-width:761px)");
    const update = () => setFiltersOpen(viewport.matches);
    update();
    viewport.addEventListener("change", update);
    return () => viewport.removeEventListener("change", update);
  }, []);
  const router = useRouter(),
    {
      data,
      undo,
      revision
    } = useRecordLedger(),
    formRef = useRef(null);
  const [role, setRole] = usePreviewState("record.role", "staff"),
    [personId, setPersonId] = usePreviewState("record.person", people[0].id);
  const [dateTime] = usePreviewState("record.datetime", {
    date: "2026-11-06",
    time: "10:55"
  });
  const person = people.find(item => item.id === personId) || people[0],
    actor = {
      id: person.id,
      role
    },
    admin = canManageEquipment(actor),
    meta = viewMeta[mode];
  const [tab, setTab] = usePreviewState("resources.tab", "rooms"),
    [filters, setFilters] = usePreviewState(`resources.filters.${mode}`, {
      kind: "all",
      location: "all",
      search: "",
      status: "all"
    });
  const [range, setRange] = usePreviewState("equipment.range", equipmentRange(validCalendarDate(dateTime.date) ? dateTime.date : calendarToday(), "week"));
  const [historyRange, setHistoryRange] = usePreviewState("resources.history.range", range);
  const [historySelection, setHistorySelection] = useState(null),
    [exportRows, setExportRows] = useState([]);
  const [period, setPeriod] = usePreviewState("equipment.period", "week");
  const [analysisTab, setAnalysisTab] = usePreviewState("equipment.analysis", "usage"),
    [conditionFilter, setConditionFilter] = useState("all");
  const [action, setAction] = useState(null),
    [dialog, setDialog] = useState(null),
    [operation, setOperation] = useState(null),
    [draft, setDraft] = useState(emptyDevice),
    [rangeDraft, setRangeDraft] = useState(range);
  const [selectedAsset, setSelectedAsset] = useState(null),
    [error, setError] = useState(""),
    [errorField, setErrorField] = useState(null),
    [status, setStatus] = useState("");
  useEffect(() => {
    if (!["resourceDetail", "resourceHistory", "resourceExport", "deviceDetail", "device"].includes(dialog)) return;
    const frame = requestAnimationFrame(() => document.querySelector("dialog.resource-dialog[open] .ui-dialog-header button")?.focus());
    return () => cancelAnimationFrame(frame);
  }, [dialog]);
  const locations = [...new Set(["ชั้น 3", "Finn Space", ...data.devices.map(item => item.location)])];
  const items = equipmentList(data.devices, {
    ...filters,
    includeInactive: mode === "equipment"
  });
  const analytics = equipmentSummary(data, range, filters),
    maxCount = Math.max(1, ...analytics.ranking.map(item => item.borrows));
  const assetEvents = analytics.events.filter(row => !selectedAsset || row.asset.id === selectedAsset).sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  const editing = operation?.kind === "device-update" ? data.devices.find(item => item.id === operation.ids[0]) : null;
  function navigate(href) {
    const target = previewDestination(href);
    if (target) router.push(target);else setStatus("หน้านี้ยังไม่ได้ย้ายตามแบบ — ดูสถานะรายหน้าในรายงาน QC");
  }
  const [registryId, setRegistryId] = usePreviewState("equipment.selected", null);
  const registryItem = items.find(item => item.id === registryId) || items[0];
  const [resourceSelection, setResourceSelection] = usePreviewState("resources.selected", null);
  const resourceKind = tab === "rooms" ? "room" : "device";
  const roomSearch = filters.search.trim().toLocaleLowerCase();
  const visibleRooms = data.rooms.filter(item => [item.id, item.detail, `ชั้น ${item.floor}`].join(" ").toLocaleLowerCase().includes(roomSearch));
  const resourceItems = resourceKind === "room" ? visibleRooms : items;
  const selectedItems = dialog === "resourceDetail" ? data[resourceKind === "room" ? "rooms" : "devices"] : resourceItems;
  const resourceItem = selectedItems.find(item => resourceSelection?.kind === resourceKind && item.id === resourceSelection.id) || resourceItems[0];
  function closeDialog() {
    const target = dialogReturn.current;
    dialogReturn.current = null;
    setDialog(target);
    setError("");
  }
  function dismissDialog() {
    dialogReturn.current = null;
    setDialog(null);
    setError("");
  }
  function chooseRegistry(item) {
    setRegistryId(item.id);
    dialogReturn.current = null;
    if (matchMedia("(max-width:900px)").matches) setDialog("deviceDetail");
  }
  function chooseResource(kind, id) {
    setResourceSelection({
      kind,
      id
    });
    dialogReturn.current = null;
    if (matchMedia("(max-width:900px)").matches) setDialog("resourceDetail");
  }
  function openAction(kind, id) {
    setResourceSelection({
      kind,
      id
    });
    setDialog(null);
    setAction({
      type: kind,
      id,
      revision,
      requestId: crypto.randomUUID(),
      returnTo: matchMedia("(max-width:900px)").matches ? "resourceDetail" : null
    });
  }
  function openResourceHistory(selection, back = null) {
    setHistorySelection(selection);
    dialogReturn.current = back;
    setDialog("resourceHistory");
    setError("");
  }
  function openStatusExport() {
    try {
      setExportRows(resourceStatusRows(data, actor));
      dialogReturn.current = null;
      setError("");
      setDialog("resourceExport");
    } catch (failure) {
      setStatus(failure.message);
    }
  }
  function exportStatus() {
    try {
      resourceStatusRows(data, actor);
      downloadCSV("resource-status-preview.csv", resourceStatusCSV(exportRows));
      closeDialog();
      setStatus(`ดาวน์โหลดสถานะตัวอย่าง ${exportRows.length} รายการแล้ว`);
    } catch (failure) {
      setError(failure.message);
    }
  }
  function editDevice(item, back = null) {
    dialogReturn.current = back;
    setDraft(item ? {
      ...item
    } : emptyDevice());
    setError("");
    setErrorField(null);
    setAdvancedOpen(false);
    setOperation({
      kind: item ? "device-update" : "device-create",
      ids: item ? [item.id] : [],
      expectedRevision: revision,
      requestId: crypto.randomUUID()
    });
    setDialog("device");
  }
  function submitDevice(event) {
    event.preventDefault();
    try {
      const result = recordLedger.transact({
        ...operation,
        actor,
        device: draft
      });
      setRegistryId(result.ids[0]);
      closeDialog();
      setStatus(editing ? "แก้ทะเบียนตัวอย่างแล้ว บันทึกด่วนใช้ข้อมูลล่าสุดทันที" : "เพิ่มอุปกรณ์ตัวอย่างแล้ว บันทึกด่วนใช้ข้อมูลล่าสุดทันที");
    } catch (failure) {
      setError(failure.message);
      setErrorField(failure.field);
      if (["barcode", "order"].includes(failure.field)) setAdvancedOpen(true);
      requestAnimationFrame(() => {
        const field = formRef.current?.elements.namedItem(failure.field);
        field?.focus();
        field?.scrollIntoView({
          block: "center",
          behavior: "instant"
        });
      });
    }
  }
  function toggle(item) {
    try {
      recordLedger.transact({
        kind: "device-toggle",
        ids: [item.id],
        actor,
        requestId: crypto.randomUUID(),
        expectedRevision: revision
      });
      setStatus("เปลี่ยนสถานะใช้งานตัวอย่างแล้ว");
    } catch (failure) {
      setStatus(failure.message);
    }
  }
  function showAsset(id) {
    setSelectedAsset(id);
    setDialog("asset");
  }
  function historyForAsset() {
    router.push(`/dev/history?asset=${encodeURIComponent(selectedAsset)}&from=${range.start}&to=${range.end}`);
  }
  function field(name, label, type = "text") {
    return <label className="ui-field"><span>{label}</span><input name={name} aria-label={label} className="apple-input" type={type} value={draft[name]} aria-invalid={errorField === name} aria-describedby={errorField === name ? "equipment-form-error" : undefined} onChange={event => {
        setDraft({
          ...draft,
          [name]: event.target.value
        });
        setErrorField(null);
      }} {...type === "number" ? {
        min: 0,
        max: 99999,
        step: 1
      } : {
        maxLength: 120
      }} /></label>;
  }
  function locationFilter() {
    return <label className="resource-filter"><span>สังกัดปัจจุบัน</span><select aria-label="สังกัดปัจจุบัน" value={filters.location} onChange={event => setFilters({
        ...filters,
        location: event.target.value
      })}><option value="all">ทุกสังกัด</option>{locations.map(location => <option key={location} value={location}>{location}</option>)}</select></label>;
  }
  function registryDetails() {
    if (!registryItem) return <p className="resource-empty">เลือกอุปกรณ์เพื่อดูรายละเอียด</p>;
    const count = equipmentSummary(data, {
      start: "1900-01-01",
      end: "9999-12-31"
    }).ranking.find(item => item.id === registryItem.id)?.borrows || 0;
    return <><h2>รายละเอียดอุปกรณ์</h2><div className="equipment-inspector-title"><span className="ui-nav-symbol" data-tone="green"><ReviewSymbol name={symbols[registryItem.kind]} size={22} /></span><div><strong>{registryItem.name}</strong><small>{registryItem.assetCode}</small></div></div><Badge item={registryItem} /><dl><dt>สังกัดปัจจุบัน</dt><dd>{registryItem.location}</dd><dt>ประเภท</dt><dd>{EQUIPMENT_KINDS[registryItem.kind]}</dd><dt>สภาพล่าสุดที่ทราบ</dt><dd>{EQUIPMENT_CONDITIONS[registryItem.condition]}</dd><dt>บาร์โค้ด</dt><dd>{registryItem.barcode || "ไม่ได้ระบุ"}</dd><dt>ลำดับแสดงผล</dt><dd>{registryItem.order}</dd><dt>ครั้งยืมที่มีบันทึกทั้งหมด</dt><dd>{count}</dd></dl><div className="equipment-visibility"><label className="equipment-active"><input type="checkbox" className="ui-checkbox" aria-label={`แสดงในบันทึกด่วน ${registryItem.assetCode}`} checked={registryItem.active} onChange={() => toggle(registryItem)} /><span>แสดงในบันทึกด่วน</span></label><p className="ui-caption">{registryItem.active ? "เปิดให้เลือกจากรายการบันทึกด่วน" : "ซ่อนจากรายการยืมใหม่ โดยคงประวัติและรายการคืนที่ค้างอยู่"}</p></div><div className="equipment-inspector-actions"><GlassButton mode="quick" onClick={() => editDevice(registryItem)}>แก้ไขทะเบียน</GlassButton><GlassButton mode="quick" onClick={() => openResourceHistory({
          kind: "device",
          id: registryItem.id
        }, dialog === "deviceDetail" ? "deviceDetail" : null)}>ประวัติ</GlassButton></div><p className="ui-caption resource-note">การย้ายสังกัดเปลี่ยนรายการปัจจุบัน โดยคงข้อความในประวัติเดิม</p></>;
  }
  function resourceDetails() {
    return <ResourceDetails kind={resourceKind} item={resourceItem} admin={admin} onAction={() => openAction(resourceKind, resourceItem.id)} onHistory={() => openResourceHistory({
      kind: resourceKind,
      id: resourceItem.id
    }, dialog === "resourceDetail" ? "resourceDetail" : null)} onEdit={() => editDevice(resourceItem, dialog === "resourceDetail" ? "resourceDetail" : null)} />;
  }
  return <WorkspaceFrame user={{
    uid: person.id,
    displayName: person.displayName,
    initial: person.initial,
    role
  }} pathname={meta[1]} glassMode="quick" onNavigate={navigate}>
    <div className="ui-page-heading resource-page-heading"><div><h1>{meta[0]}</h1><p>{meta[2]}</p><small className="ui-caption">Development · ข้อมูลตัวอย่างร่วมกับบันทึกงานและประวัติ</small></div><div className="resource-heading-actions">
      {mode === "equipment" && admin && <GlassButton mode="quick" variant="prominent" onClick={() => editDevice(null)}><Plus size={18} aria-hidden="true" />เพิ่มอุปกรณ์</GlassButton>}
      {mode === "resources" && <GlassButton mode="quick" onClick={openStatusExport}><Download size={16} aria-hidden="true" />ส่งออกสถานะ</GlassButton>}
      {mode === "resources" && admin && <GlassButton mode="quick" onClick={() => navigate("/admin/equipment-items")}>ทะเบียนอุปกรณ์<ArrowRight size={16} aria-hidden="true" /></GlassButton>}
      {mode === "usage" && admin && <GlassButton mode="quick" onClick={() => navigate("/admin/equipment-items")}>ทะเบียนอุปกรณ์</GlassButton>}
    </div></div>
    {mode === "resources" || admin ? <>
      {canUndoPreview(undo, actor) && !undo.kind.startsWith("template-") && <div className="resource-undo" role="region" aria-label="เลิกทำรายการล่าสุด"><span>เปลี่ยนข้อมูลตัวอย่าง {undo.count} รายการ</span><GlassButton mode="quick" onClick={() => {
          try {
            recordLedger.undo(actor, undo.id);
            setStatus("เลิกทำรายการล่าสุดแล้ว");
          } catch (failure) {
            setStatus(failure.message);
          }
        }}><Undo2 size={16} aria-hidden="true" />เลิกทำ</GlassButton></div>}

      {(mode === "equipment" || mode === "resources") && <section className="resource-toolbar" aria-label="ตัวกรองทรัพยากร">      {mode === "resources" && <GlassControlGroup mode="quick" label="ประเภททรัพยากร">{[["rooms", "ห้องบริการ"], ["devices", "อุปกรณ์"]].map(([key, label]) => <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)}>{label}</button>)}</GlassControlGroup>}
        {mode !== "usage" && <label className="resource-search"><Search size={17} aria-hidden="true" /><input aria-label={mode === "resources" && tab === "rooms" ? "ค้นหาห้อง รหัส หรือสังกัด" : "ค้นหาอุปกรณ์ รหัส หรือบาร์โค้ด"} type="search" value={filters.search} placeholder={mode === "resources" && tab === "rooms" ? "ค้นหาห้อง รหัส หรือสังกัด" : "ค้นหาอุปกรณ์ รหัส หรือบาร์โค้ด"} onChange={event => setFilters({
            ...filters,
            search: event.target.value
          })} /></label>}
        {(mode === "equipment" || tab === "devices") && <><label className="resource-filter"><span>ประเภท</span><select aria-label="ประเภทอุปกรณ์" value={filters.kind} onChange={event => setFilters({
              ...filters,
              kind: event.target.value
            })}><option value="all">ทุกประเภท</option><TypeOptions /></select></label>{locationFilter()}
        {mode !== "usage" && <label className="resource-filter"><span>สถานะ</span><select aria-label="สถานะอุปกรณ์" value={filters.status} onChange={event => setFilters({
              ...filters,
              status: event.target.value
            })}>{[["all", "ทุกสถานะ"], ["ready", "พร้อมยืม"], ["borrowed", "กำลังยืม"], ["unavailable", "ต้องดูแล"], ...(mode === "equipment" ? [["inactive", "หยุดใช้งาน"]] : [])].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
        </>}
      </section>}
      {mode === "resources" && <div className="equipment-master-detail resource-master-detail"><div>
      {mode === "resources" && tab === "rooms" && <div className="resource-floors">{!visibleRooms.length && <p className="resource-empty">ไม่พบห้องตามคำค้นหา</p>}{["3", "4"].filter(floor => visibleRooms.some(room => room.floor === floor)).map(floor => <section key={floor}><h2>ห้องบริการ ชั้น {floor}</h2><div className="resource-room-grid">{visibleRooms.filter(room => room.floor === floor).map(room => <button type="button" className="resource-card" key={room.id} data-room={room.id} aria-pressed={resourceItem?.id === room.id} data-selected={resourceItem?.id === room.id} onClick={() => chooseResource("room", room.id)}><span className="ui-nav-symbol resource-symbol" data-tone={room.open ? "green" : "purple"}><ReviewSymbol name="door" size={27} /></span><strong>ห้อง {room.id}</strong><span className="record-badge" data-tone={roomState(room).tone}>{roomState(room).label}</span><small>{room.detail}</small><span className="resource-intent">ดูรายละเอียด<ArrowRight size={15} aria-hidden="true" /></span></button>)}</div></section>)}</div>}
      {mode === "resources" && tab === "devices" && <><p className="resource-result-count">{items.length} อุปกรณ์ · รายการที่หยุดใช้และยังยืมอยู่แสดงเพื่อให้คืนได้</p><div className="resource-device-grid">{items.map(item => <button type="button" className="resource-card" key={item.id} data-asset={item.id} aria-pressed={resourceItem?.id === item.id} data-selected={resourceItem?.id === item.id} onClick={() => chooseResource("device", item.id)}><span className="ui-nav-symbol resource-symbol" data-tone={item.kind === "plug" ? "amber" : "green"}><ReviewSymbol name={symbols[item.kind]} size={27} /></span><strong>{item.name}</strong><small>{item.assetCode} · {item.location}</small><Badge item={item} /><span className="resource-intent">ดูรายละเอียด<ArrowRight size={15} aria-hidden="true" /></span></button>)}</div>{!items.length && <p className="resource-empty">ไม่พบอุปกรณ์ตามตัวกรอง</p>}</>}
      </div><aside className="equipment-inspector" aria-label="รายละเอียดทรัพยากร"><h2>รายละเอียดทรัพยากร</h2>{resourceDetails()}</aside></div>}
      {mode === "equipment" && <><p className="resource-result-count">{items.length} รายการ · เลือกอุปกรณ์เพื่อดูรายละเอียด สถานะยืมคงผูกกับ ID เดิม</p><div className="equipment-master-detail"><div><div className="equipment-list" role="list" aria-label="ทะเบียนอุปกรณ์">{items.map(item => <div className="equipment-row" role="listitem" key={item.id} data-asset={item.id} data-selected={registryItem?.id === item.id}><button type="button" className="equipment-row-name" aria-pressed={registryItem?.id === item.id} onClick={() => chooseRegistry(item)}><span className="ui-nav-symbol" data-tone="green"><ReviewSymbol name={symbols[item.kind]} size={20} /></span><span><strong>{item.name}</strong><small>{item.assetCode} · {item.location}</small></span><Badge item={item} /><ArrowRight size={16} aria-hidden="true" /></button></div>)}</div>{!items.length && <p className="resource-empty">ไม่พบอุปกรณ์ตามตัวกรอง</p>}</div><aside className="equipment-inspector" aria-label="รายละเอียดอุปกรณ์">{registryDetails()}</aside></div><p className="ui-caption resource-note">หยุดใช้งานจะคงประวัติไว้ หากยังมีผู้ยืม รายการยังแสดงในหน้าคืนจนกว่าจะปิดการยืม</p></>}
      {mode === "usage" && <>
        <div className="resource-analysis-controls"><GlassControlGroup mode="quick" label="ข้อมูลอุปกรณ์">{[["usage", "การใช้งาน"], ["condition", "สภาพตอนคืน"]].map(([key, label]) => <button type="button" key={key} aria-pressed={analysisTab === key} onClick={() => setAnalysisTab(key)}>{label}</button>)}</GlassControlGroup><select aria-label="ช่วงข้อมูลอุปกรณ์" className="apple-input" value={period} onChange={event => {
            if (event.target.value === "custom") {
              setRangeDraft(range);
              setError("");
              setDialog("range");
            } else {
              setPeriod(event.target.value);
              setRange(equipmentRange(validCalendarDate(dateTime.date) ? dateTime.date : calendarToday(), event.target.value));
            }
          }}>{[["day", "รายวัน"], ["week", "รายสัปดาห์"], ["month", "รายเดือน"], ["quarter", "รายไตรมาส"], ["fiscal", "ปีงบประมาณ"], ["custom", "เลือกช่วงเอง"]].map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><GlassButton mode="quick" onClick={() => {
            setRangeDraft(range);
            setError("");
            setDialog("range");
          }}><CalendarDays size={16} aria-hidden="true" />ช่วงวันที่</GlassButton></div>
        <details className="resource-more-filters" open={filtersOpen} onToggle={event => setFiltersOpen(event.currentTarget.open)}><summary>ตัวกรอง{[filters.kind && filters.kind !== "all", filters.location && filters.location !== "all", filters.person && filters.person !== "all"].filter(Boolean).length > 0 && <span className="record-badge">{[filters.kind && filters.kind !== "all", filters.location && filters.location !== "all", filters.person && filters.person !== "all"].filter(Boolean).length}</span>}</summary><div className="resource-secondary-filters"><label className="resource-filter"><span>ประเภท</span><select aria-label="ประเภทอุปกรณ์" value={filters.kind} onChange={event => setFilters({
                ...filters,
                kind: event.target.value
              })}><option value="all">ทุกประเภท</option><TypeOptions /></select></label>{locationFilter()}<label className="resource-filter resource-person-filter"><span>ผู้ปฏิบัติงาน</span><select aria-label="ผู้ปฏิบัติงานในข้อมูลอุปกรณ์" value={filters.person || "all"} onChange={event => setFilters({
                ...filters,
                person: event.target.value
              })}><option value="all">ทุกคน</option>{people.map(item => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label></div></details>
        <p className="resource-result-count">{calendarLabel(range.start)} – {calendarLabel(range.end)}</p>
        {analysisTab === "usage" ? <>
          <div className="equipment-metrics">{[["ครั้งยืมที่บันทึก", analytics.borrows, "เหตุการณ์ในช่วงที่เลือก"], ["ครั้งคืนที่บันทึก", analytics.returns, "ไม่หักจากจำนวนครั้งยืม"], ["กำลังยืมตอนนี้", analytics.outstanding, "สถานะปัจจุบัน ไม่จำกัดวันที่หรือผู้ปฏิบัติงาน"], ["จับคู่ทะเบียนไม่ได้", analytics.unmatched, "ไม่เดาจากชื่อหรือข้อความ"]].map(([label, value, note]) => <article key={label}><span>{label}</span><strong data-metric={label}>{value}</strong><small>{note}</small></article>)}</div>
          <section className="equipment-ranking"><h2>อุปกรณ์ที่มีการยืมมาก</h2>{analytics.ranking.some(item => item.borrows) ? analytics.ranking.filter(item => item.borrows).slice(0, 5).map(item => <button type="button" key={item.id} className="equipment-bar" onClick={() => showAsset(item.id)} aria-label={`${item.assetCode} ยืม ${item.borrows} ครั้ง`}><span>{item.name}<small>{item.assetCode}</small></span><span className="equipment-bar-track" aria-hidden="true"><i style={{
                  width: `${item.borrows / maxCount * 100}%`
                }} /></span><strong>{item.borrows} ครั้ง</strong></button>) : <p className="resource-empty">ยังไม่มีเหตุการณ์ยืมที่จับคู่ทะเบียนได้ในช่วงนี้</p>}</section>
          <div className="equipment-usage-list">{analytics.ranking.map(item => <button type="button" key={item.id} data-usage-asset={item.id} onClick={() => showAsset(item.id)}><span><strong>{item.name}</strong><small>{item.assetCode} · {item.location}</small></span><span>{item.borrows} ยืม · {item.returns} คืน</span><Badge item={item} /><ArrowRight size={16} aria-hidden="true" /></button>)}</div>
        </> : <>
          <div className="equipment-metrics">{[["คืนสมบูรณ์", analytics.returnConditions.normal], ["คืนชำรุด / สูญหาย", analytics.returnConditions.damaged + analytics.returnConditions.lost], ["ยังไม่ระบุสภาพ", analytics.returnConditions.unknown]].map(([label, value]) => <article key={label}><span>{label}</span><strong data-metric={label}>{value}</strong><small>เหตุการณ์คืนในช่วงที่เลือก</small></article>)}</div>
          <label className="resource-filter"><span>สภาพที่บันทึกตอนคืน</span><select aria-label="สภาพที่บันทึกตอนคืน" value={conditionFilter} onChange={event => setConditionFilter(event.target.value)}><option value="all">ทุกสภาพ</option>{Object.entries(EQUIPMENT_CONDITIONS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <div className="equipment-events">{analytics.events.filter(row => row.action === "return" && (conditionFilter === "all" || row.returnCondition === conditionFilter)).map(row => <button type="button" key={row.id} onClick={() => showAsset(row.asset.id)}><span>{calendarLabel(row.date)} · {row.time}</span><strong>{row.asset.name}</strong><span>{EQUIPMENT_CONDITIONS[row.returnCondition]}</span></button>)}</div>
          {!analytics.events.some(row => row.action === "return" && (conditionFilter === "all" || row.returnCondition === conditionFilter)) && <p className="resource-empty">ไม่พบเหตุการณ์คืนตามช่วงวันที่และสภาพที่เลือก</p>}
        </>}
        <p className="ui-caption resource-note">สังกัดที่กรองคือทะเบียนปัจจุบัน ประวัติแสดงสังกัดเมื่อทำรายการเฉพาะแถวที่มีบันทึกไว้ ({analytics.unknownEventLocation} เหตุการณ์ยังไม่มีสังกัดขณะทำรายการ) · จำนวน 0 หมายถึงไม่มีเหตุการณ์ที่บันทึกในช่วงนี้</p>
        {analytics.unmatched > 0 && <GlassButton mode="quick" onClick={() => setDialog("unmatched")}>ดูรายการที่จับคู่ไม่ได้ {analytics.unmatched} รายการ</GlassButton>}
      </>}
    </> : <section className="resource-empty"><h2>หน้านี้สำหรับผู้ดูแล</h2><p>บัญชีตัวอย่าง Staff ดูสถานะและยืม/คืนได้ที่ห้องและทรัพยากร</p><GlassButton mode="quick" onClick={() => navigate("/resources")}>เปิดห้องและทรัพยากร</GlassButton></section>}
    <details className="resource-test-controls"><summary>ตัวเลือกตรวจแบบ · Development</summary><label className="ui-field"><span>บทบาทตัวอย่าง</span><select className="apple-input" aria-label="บทบาทตัวอย่าง" value={role} onChange={event => {
          setRole(event.target.value);
          setPersonId(people[0].id);
          setDialog(null);
          setAction(null);
        }}>{["staff", "admin", "superadmin"].map(value => <option key={value} value={value}>{value}</option>)}</select></label><GlassButton mode="quick" onClick={() => {
        recordLedger.failNext();
        setStatus("ตั้งให้คำสั่งครั้งถัดไปล้มเหลวในข้อมูลจำลองแล้ว");
      }}>จำลองบันทึกไม่สำเร็จครั้งถัดไป</GlassButton><p className="ui-caption">ใช้ role และข้อมูลจำลอง ไม่ใช่ Auth จริง · เริ่มใหม่เมื่อ refresh · ไม่มี Firebase requests</p></details>
    <p className="resource-live-status" role="status" aria-live="polite">{status}</p>
    {action && <ResourceDialog key={action.requestId} action={action} actor={actor} person={person} dateTime={dateTime} onClose={() => {
      const back = action.returnTo;
      setAction(null);
      if (back) setDialog(back);
    }} onSaved={setStatus} />}
    <Dialog open={Boolean(dialog)} onClose={dismissDialog} title={{
      resourceDetail: "รายละเอียดทรัพยากร",
      resourceHistory: "ประวัติทรัพยากร",
      resourceExport: "ตรวจไฟล์สถานะ",
      deviceDetail: "รายละเอียดอุปกรณ์",
      device: editing ? "แก้ไขทะเบียนอุปกรณ์" : "เพิ่มอุปกรณ์",
      range: "ช่วงวันที่",
      asset: data.devices.find(item => item.id === selectedAsset)?.name || "ประวัติอุปกรณ์",
      unmatched: "รายการที่จับคู่ทะเบียนไม่ได้"
    }[dialog] || ""} className={`resource-dialog ${dialog === "device" ? "equipment-editor-dialog" : ""} ${["resourceHistory", "resourceExport"].includes(dialog) ? "resource-wide-dialog" : ""}`} footer={dialog === "device" && <div className="equipment-editor-footer"><p id="equipment-form-error" role="alert" className="resource-error">{error}</p><div className="equipment-editor-actions"><GlassButton mode="quick" onClick={closeDialog}>ยกเลิก</GlassButton><GlassButton mode="quick" variant="prominent" type="submit" form={formId}><Check size={16} aria-hidden="true" />{editing ? "บันทึกการแก้ไข" : "เพิ่มอุปกรณ์"}</GlassButton></div></div> || dialog === "resourceExport" && <><GlassButton mode="quick" onClick={closeDialog}>ยกเลิก</GlassButton><GlassButton mode="quick" variant="prominent" onClick={exportStatus}><Download size={16} aria-hidden="true" />ดาวน์โหลด CSV</GlassButton></>} description="Development · ข้อมูลตัวอย่าง ไม่เขียน production">
      {dialog === "resourceDetail" && <div className="equipment-inspector-content">{resourceDetails()}</div>}
      {dialog === "resourceHistory" && historySelection && <ResourceHistory key={historySelection.kind + historySelection.id} data={data} actor={actor} selection={historySelection} range={historyRange} onRange={setHistoryRange} onBack={closeDialog} />}
      {dialog === "resourceExport" && <><ResourceExportPreview rows={exportRows} /><p role="alert" className="resource-error">{error}</p></>}
      {dialog === "deviceDetail" && <div className="equipment-inspector-content">{registryDetails()}</div>}
      {dialog === "device" && <form id={formId} ref={formRef} className="equipment-editor" onSubmit={submitDevice} noValidate>
        <fieldset className="ui-form-group"><legend>ข้อมูลอุปกรณ์</legend><div className="equipment-form-grid">{field("name", "ชื่ออุปกรณ์")}{field("assetCode", "รหัสอุปกรณ์")}<label className="ui-field"><span>ประเภทอุปกรณ์</span><select name="kind" aria-label="ประเภทอุปกรณ์ในทะเบียน" className="apple-input" value={draft.kind} disabled={Boolean(editing && data.logs.some(row => row.resource?.id === editing.id))} onChange={event => setDraft({
                ...draft,
                kind: event.target.value
              })}><TypeOptions /></select></label></div></fieldset>
        <fieldset className="ui-form-group"><legend>พื้นที่และสถานะ</legend><div className="equipment-form-grid">{field("location", "สังกัดปัจจุบัน")}<label className="ui-field"><span>สภาพล่าสุดที่ทราบ</span><select name="condition" aria-label="สภาพล่าสุดที่ทราบ" className="apple-input" value={draft.condition} onChange={event => setDraft({
                ...draft,
                condition: event.target.value
              })}>{Object.entries(EQUIPMENT_CONDITIONS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div><label className="equipment-active"><input name="active" type="checkbox" className="ui-checkbox" checked={draft.active} onChange={event => setDraft({
              ...draft,
              active: event.target.checked
            })} /><span>แสดงในบันทึกด่วน</span></label><p className="ui-caption">สภาพยังไม่ระบุ ชำรุด หรือสูญหายจะไม่พร้อมให้ยืม การซ่อนรายการยังคงประวัติและรายการคืนที่ค้างอยู่</p></fieldset>
        <details className="equipment-advanced" open={advancedOpen} onToggle={event => setAdvancedOpen(event.currentTarget.open)}><summary>ข้อมูลเพิ่มเติม</summary><div className="equipment-form-grid">{field("barcode", "บาร์โค้ด (ถ้ามี)")}{field("order", "ลำดับแสดงผล", "number")}</div></details>
      </form>}
      {dialog === "range" && <form noValidate onSubmit={event => {
        event.preventDefault();
        try {
          equipmentSummary(data, rangeDraft, filters);
          setRange(rangeDraft);
          setPeriod("custom");
          setDialog(null);
        } catch (failure) {
          setError(failure.message);
        }
      }}><label className="ui-field"><span>จากวันที่</span><input aria-label="จากวันที่" type="date" className="apple-input" value={rangeDraft.start} onChange={event => setRangeDraft({
            ...rangeDraft,
            start: event.target.value
          })} /></label><label className="ui-field"><span>ถึงวันที่</span><input aria-label="ถึงวันที่" type="date" className="apple-input" value={rangeDraft.end} onChange={event => setRangeDraft({
            ...rangeDraft,
            end: event.target.value
          })} /></label><p className="resource-error" role="alert">{error}</p><GlassButton mode="quick" variant="prominent" type="submit">ใช้ช่วงวันที่</GlassButton></form>}
      {dialog === "asset" && <><p className="ui-caption">{calendarLabel(range.start)} – {calendarLabel(range.end)} · {assetEvents.length} เหตุการณ์</p><div className="equipment-events">{assetEvents.map(row => <div key={row.id}><span>{calendarLabel(row.date)} · {row.time}</span><strong>{row.action === "borrow" ? "ยืม" : "คืน / ปิดรายการ"} · {row.assetCodeAtEvent || row.asset.assetCode}</strong><small>ขณะทำรายการ: {row.locationAtEvent || "ไม่ระบุ"} · {row.action === "return" ? EQUIPMENT_CONDITIONS[row.returnCondition] : row.person}</small></div>)}</div>{!assetEvents.length && <p>ไม่มีเหตุการณ์ที่บันทึกในช่วงนี้</p>}<GlassButton mode="quick" onClick={historyForAsset}>เปิดประวัติงานของอุปกรณ์นี้<ArrowRight size={16} aria-hidden="true" /></GlassButton></>}
      {dialog === "unmatched" && <div className="equipment-events">{analytics.unmatchedEvents.map(row => <div key={row.id}><strong>{row.minorTask}</strong><span>{row.date} · {row.time}</span><small>ไม่มี ID ที่จับคู่ทะเบียนได้</small></div>)}</div>}
    </Dialog>
  </WorkspaceFrame>;
}
