/* Standalone review prototype. Synthetic data only; no network or persistence. */
"use strict";

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const asOf = "2026-11-01";
const locations = ["ชั้น 3", "Finn Space"];
const equipment = [
  { id: "DEMO-001", name: "หูฟัง 01", type: "หูฟัง", location: "ชั้น 3", active: true, status: "available", count: 64 },
  { id: "DEMO-002", name: "หูฟัง 02", type: "หูฟัง", location: "ชั้น 3", active: true, status: "borrowed", count: 48 },
  { id: "DEMO-003", name: "หูฟัง 03", type: "หูฟัง", location: "Finn Space", active: true, status: "available", count: 37 },
  { id: "DEMO-004", name: "ปลั๊กพ่วง 01", type: "ปลั๊กพ่วง", location: "Finn Space", active: true, status: "available", count: 29 },
  { id: "DEMO-005", name: "USB 01", type: "USB", location: "ชั้น 3", active: true, status: "available", count: 18 },
  { id: "DEMO-006", name: "หูฟัง 04", type: "หูฟัง", location: "Finn Space", active: true, status: "damaged", count: 12 },
];
const borrowEvents = equipment.flatMap((item) => Array.from({ length: item.count }, (_, index) => ({ equipmentId: item.id, location: item.location, date: `2026-10-${String(index % 28 + 1).padStart(2, "0")}`, actor: `ช่างตัวอย่าง ${index % 8 + 1}` })));
const activity = [{ text: "คืน USB 01", detail: "ชั้น 3 · ช่างตัวอย่าง 2 · 09:10" }, { text: "ยืมหูฟัง 02", detail: "ชั้น 3 · ช่างตัวอย่าง 1 · 09:05" }];
const state = { page: "equipment", location: "all", search: "", usageMonth: "all", usageLocation: "all", fy: 2570, month: "all", scheduleTab: "exam", schedules: [], copiedClassroom: false, draft: [], reviewed: false };
const staffRecords = [];
for (const year of [2569, 2570]) {
  const start = year - 544;
  for (let offset = 0; offset < 12; offset++) {
    const month = (offset + 9) % 12 + 1;
    const ceYear = start + (month < 10 ? 1 : 0);
    for (let staff = 1; staff <= 8; staff++) {
      const count = 8 + ((staff * 7 + offset * 11) % 22);
      for (let index = 0; index < count; index++) {
        const date = `${ceYear}-${String(month).padStart(2, "0")}-${String(index % 28 + 1).padStart(2, "0")}`;
        if (date <= asOf) staffRecords.push({ staff, date, task: ["บริการบัญชี", "ยืมอุปกรณ์", "ดูแลห้อง", "คุมสอบ DL"][index % 4] });
      }
    }
  }
}
const staffNames = Array.from({ length: 8 }, (_, index) => `ช่างตัวอย่าง ${index + 1}`);
const monthLabels = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const content = $("#content");
const dialog = $("#dialog");
const dialogContent = $("#dialog-content");
dialog.addEventListener("keydown", (event) => {
  if (event.key !== "Tab") return;
  const controls = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]')].filter((element) => element.getClientRects().length > 0);
  const first = controls[0];
  const last = controls.at(-1);
  if (!first) { event.preventDefault(); return; }
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
let sourcePreviewUrl = null;
let toastTimer;

function toast(message) {
  $("#toast").textContent = message;
  $("#toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("#toast").hidden = true; }, 4200);
}
function heading(kicker, title, subtitle, actions = "") {
  return `<div class="page-heading"><div><p class="eyebrow">${kicker}</p><h1>${title}</h1><p class="subtitle">${subtitle}</p></div><div class="actions">${actions}</div></div>`;
}
function stat(label, value, unit, hint) {
  return `<div class="stat"><p class="muted">${label}</p><div class="value">${value}<span>${unit}</span></div><small>${hint}</small></div>`;
}
function options(values, selected) {
  return values.map(([value, label]) => `<option value="${escapeHtml(value)}" ${String(selected) === String(value) ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
}
function locationOptions(selected) { return options([["all", "ทุกสถานที่"], ...locations.map((name) => [name, name])], selected); }
function icon(type) {
  const shapes = type === "หูฟัง" ? '<path d="M4 14v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="12" width="5" height="8" rx="2"/><rect x="16" y="12" width="5" height="8" rx="2"/>' : type === "USB" ? '<rect x="6" y="9" width="12" height="12" rx="3"/><path d="M9 9V3h6v6M11 5v1m2-1v1"/>' : '<path d="M8 3v5m8-5v5M6 8h12v4a6 6 0 0 1-6 6v4m0-4a6 6 0 0 1-6-6"/>';
  return `<svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${shapes}</svg>`;
}
function statusBadge(item) {
  const borrowed = item.status === "borrowed";
  const label = item.status === "damaged" ? "ชำรุด" : borrowed ? "กำลังยืม" : item.active ? "พร้อมใช้" : "พักใช้งาน";
  return `<span class="badge ${item.status === "damaged" ? "bad" : borrowed ? "warn" : item.active ? "good" : ""}">${label}${!item.active && borrowed ? " · หยุดยืมใหม่" : ""}</span>`;
}
function equipmentView() {
  const visible = equipment.filter((item) => (state.location === "all" || item.location === state.location) && `${item.name} ${item.id}`.toLowerCase().includes(state.search.toLowerCase()));
  return heading("RESOURCES", "อุปกรณ์และบันทึกด่วน", "จัดการที่เดียว พร้อมใช้ในบันทึกงานของทีม", '<button data-action="add-equipment" class="primary">＋ เพิ่มอุปกรณ์</button>') +
    `<div class="stats">${stat("อุปกรณ์ในทะเบียน", equipment.length, "ชิ้น", "รวมรายการที่พักใช้งาน")}${stat("พร้อมให้ยืม", equipment.filter((item) => item.active && item.status === "available").length, "ชิ้น", "สภาพปกติและไม่มีผู้ยืม")}${stat("กำลังยืม", equipment.filter((item) => item.status === "borrowed").length, "ชิ้น", "เข้าถึงการคืนได้แม้พักใช้งาน")}</div>
    <div class="filters"><div class="segmented" aria-label="สถานที่อุปกรณ์">${["all", ...locations].map((value) => `<button data-location="${value}" aria-pressed="${state.location === value}">${value === "all" ? "ทั้งหมด" : value}</button>`).join("")}</div><input id="equipment-search" class="search" type="search" aria-label="ค้นหาอุปกรณ์" placeholder="ค้นหาชื่อหรือรหัสอุปกรณ์" value="${escapeHtml(state.search)}"></div>
    <div class="two-col"><section class="panel"><div class="panel-head"><div><h2>เลือกอุปกรณ์เพื่อบันทึก</h2><p class="muted">${visible.length} รายการ · สถานที่ประจำปัจจุบัน</p></div></div><div class="panel-body equipment-grid">${visible.map((item) => `<article class="equipment-card"><div class="equipment-icon" aria-hidden="true">${icon(item.type)}</div><h3>${escapeHtml(item.name)}</h3><p class="id">${item.id}</p><p class="location">${escapeHtml(item.location)}</p>${statusBadge(item)}<div class="card-actions"><button class="small ${item.status === "available" && item.active ? "primary" : ""}" data-action="borrow" data-id="${item.id}" ${item.status === "damaged" || (!item.active && item.status !== "borrowed") ? "disabled" : ""}>${item.status === "borrowed" ? "คืน" : "ยืม"}</button><button class="small" data-action="edit-equipment" data-id="${item.id}" aria-label="จัดการ ${escapeHtml(item.name)}">จัดการ</button></div></article>`).join("") || '<p class="empty">ไม่พบอุปกรณ์ที่ค้นหา</p>'}</div></section>
    <aside><section class="panel"><div class="panel-head"><h2>กิจกรรมล่าสุด</h2><span class="badge">ตัวอย่าง</span></div><div class="panel-body">${activity.slice(0, 5).map((event) => `<div class="history-row"><span class="avatar" aria-hidden="true">↗</span><div>${escapeHtml(event.text)}<small>${escapeHtml(event.detail)}</small></div></div>`).join("")}</div></section><p class="note">ย้ายอุปกรณ์แล้วเลือกดูในหมวดใหม่ได้ทันที ประวัติเดิมยังคงสถานที่ขณะทำรายการ</p></aside></div>`;
}
function usageEvents() { return borrowEvents.filter((event) => (state.usageMonth === "all" || event.date.startsWith(state.usageMonth)) && (state.usageLocation === "all" || event.location === state.usageLocation)); }
function usageView() {
  const events = usageEvents();
  const counts = equipment.map((item) => ({ ...item, borrowCount: events.filter((event) => event.equipmentId === item.id).length })).sort((a, b) => b.borrowCount - a.borrowCount || a.id.localeCompare(b.id));
  const maximum = Math.max(...counts.map((item) => item.borrowCount), 1);
  return heading("RESOURCE INSIGHTS", "อุปกรณ์ไหนถูกยืมบ่อย", "ดูความถี่รายชิ้น เพื่อกระจายการใช้งานและวางแผนจัดหา") +
    `<div class="filters"><div class="actions"><label>ช่วงข้อมูล<select id="usage-month">${options([["all", "1 ต.ค.–1 พ.ย. 2569"], ["2026-10", "ตุลาคม 2569"], ["2026-11", "พฤศจิกายน 2569 (ถึงวันที่ 1)"]], state.usageMonth)}</select></label><label>สถานที่ขณะยืม<select id="usage-location">${locationOptions(state.usageLocation)}</select></label></div></div>
    <div class="stats">${stat("การยืมทั้งหมด", events.length, "ครั้ง", "นับเฉพาะการยืม ไม่รวมการคืน")}${stat("ชิ้นที่ถูกยืม", counts.filter((item) => item.borrowCount > 0).length, "ชิ้น", "ภายในช่วงและสถานที่ที่เลือก")}${stat("ถูกยืมมากที่สุด", counts[0]?.borrowCount ? counts[0].borrowCount : 0, "ครั้ง", counts[0]?.borrowCount ? escapeHtml(counts[0].name) : "ยังไม่มีรายการ")}</div>
    <div class="two-col"><section class="panel"><div class="panel-head"><h2>จำนวนครั้งยืมรายชิ้น</h2><span class="muted">มาก → น้อย</span></div><div class="panel-body">${counts.map((item, index) => `<div class="rank-row"><div class="rank-label"><span>${index + 1}. ${escapeHtml(item.name)} <small>${item.id}</small></span><strong>${item.borrowCount} ครั้ง</strong></div><div class="bar-track"><div class="bar" style="width:${item.borrowCount / maximum * 100}%"></div></div></div>`).join("")}</div></section>
    <section class="panel"><div class="panel-head"><h2>อ่านข้อมูลอย่างไร</h2></div><div class="panel-body"><div class="detail-list"><div><span>หน่วยที่นับ</span><strong>ครั้งที่ยืมต่อชิ้น</strong></div><div><span>สถานที่ตัวกรอง</span><strong>ขณะทำรายการ</strong></div><div><span>การคืน</span><strong>ไม่นับเป็นการยืม</strong></div></div><p class="note">จำนวนครั้งยืมไม่ได้บอกชั่วโมงใช้งานหรือคุณภาพอุปกรณ์ ดูสภาพและประวัติประกอบ</p><p class="note">ข้อมูลเก่าที่ระบุอุปกรณ์ไม่ได้จะแสดงแยกในระบบจริง ต้นแบบนี้ใช้รหัสสังเคราะห์ครบทุกเหตุการณ์</p></div></section></div>
    <section class="panel" style="margin-top:20px"><div class="panel-head"><h2>ทะเบียนและประวัติ</h2></div><div class="table-scroll"><table><thead><tr><th>อุปกรณ์</th><th>สถานที่ปัจจุบัน</th><th>สภาพ / สถานะ</th><th>จำนวนครั้ง</th><th>รายละเอียด</th></tr></thead><tbody>${counts.map((item) => `<tr><td>${escapeHtml(item.name)}<small>${item.id}</small></td><td>${escapeHtml(item.location)}</td><td>${statusBadge(item)}</td><td>${item.borrowCount}</td><td><button class="small" data-action="history" data-id="${item.id}">ดูประวัติ</button></td></tr>`).join("")}</tbody></table></div></section>`;
}
function scheduleView() {
  const exam = state.scheduleTab === "exam";
  const days = [...new Set(state.schedules.map((item) => item.date))].sort();
  const cards = days.map((date) => `<div class="day-card"><strong>${Number(date.slice(-2))}</strong> <span class="muted">พฤศจิกายน 2569</span>${state.schedules.filter((item) => item.date === date).sort((a, b) => a.start.localeCompare(b.start)).map((item) => `<div class="event"><strong>${item.start}–${item.end}</strong><small>${item.count} คน · ${roomsFor(item.count)}</small><small>ช่างตัวอย่าง 1, 2, 3</small></div>`).join("")}</div>`).join("");
  return heading("SCHEDULES", "ตารางสอบและเรียน", "มองเห็นห้อง เวลา และผู้รับผิดชอบในพื้นที่เดียว", exam ? '<button class="primary" data-action="import">＋ นำเข้าตารางจากรูป</button>' : '<button class="primary" data-action="copy-class">คัดลอกสัปดาห์ตัวอย่าง</button>') +
    `<div class="filters"><div class="segmented" aria-label="ประเภทตาราง"><button data-schedule-tab="exam" aria-pressed="${exam}">สอบ Digital Literacy</button><button data-schedule-tab="class" aria-pressed="${!exam}">ตารางเรียน</button></div><span class="muted">${exam ? "พฤศจิกายน 2569" : "ภาคเรียนตัวอย่าง"}</span></div>` +
    (exam ? `<div class="stats">${stat("รอบที่ยืนยันในต้นแบบ", state.schedules.length, "รอบ", "ยังไม่บันทึกลงระบบจริง")}${stat("วันที่มีสอบ", days.length, "วัน", "รวมทุกช่วงเวลา")}${stat("รอบเย็น", state.schedules.filter((item) => item.start === "17:00").length, "รอบ", "รองรับเวลา 17:00–18:30")}</div>
    <section class="panel"><div class="panel-head"><div><h2>ปฏิทินสอบรายวัน</h2><p class="muted">แสดงตามเวลาเริ่มจริง</p></div><button class="small" data-action="evening">＋ รอบเย็นตัวอย่าง</button></div><div class="panel-body">${cards ? `<div class="calendar-days">${cards}</div>` : '<div class="empty"><h2>เริ่มตารางเดือนใหม่</h2><p style="margin:10px 0 20px">ใช้รูปตารางเป็นต้นทาง แล้วตรวจข้อมูลก่อนยืนยันทั้งชุด</p><button data-action="import">นำเข้าตารางจากรูป</button></div>'}</div></section>` :
      `<section class="panel"><div class="panel-head"><div><h2>สัปดาห์ตัวอย่าง · ห้อง 401–407</h2><p class="muted">ข้อเสนอ flow รอยืนยันรูปแบบต้นทางตารางเรียน</p></div><span class="badge">ยังไม่ใช่ requirement ยืนยัน</span></div><div class="panel-body"><div class="calendar-days">${["จันทร์", "อังคาร", "พุธ"].map((day, index) => `<div class="day-card"><strong>${day}</strong><div class="event"><strong>09:00–12:00</strong><small>ห้อง ${index === 0 ? "401" : index === 1 ? "402" : "406"} · วิชาตัวอย่าง ${index + 1}</small><small>ผู้สอนตัวอย่าง</small></div></div>`).join("")}</div><p class="note">${state.copiedClassroom ? "จำลอง preview แล้ว: 3 รายการ พร้อมกำหนดช่วงภาคเรียนและตรวจรายการชนก่อนบันทึกจริง" : "แนวทางเสนอ: คัดลอกทั้งสัปดาห์ → กำหนดช่วงภาคเรียน → ตรวจวันยกเว้นและรายการชน → ยืนยัน"}</p></div></section>`);
}
function fyMonths() {
  return Array.from({ length: 12 }, (_, index) => {
    const month = (index + 9) % 12 + 1;
    const year = state.fy - 544 + (month < 10 ? 1 : 0);
    return { value: `${year}-${String(month).padStart(2, "0")}`, label: `${monthLabels[month - 1]} ${year + 543}` };
  });
}
function staffRange() {
  const months = fyMonths();
  if (state.month === "all") return { start: `${state.fy - 544}-10-01`, end: `${state.fy - 543}-09-30`, label: `ปีงบประมาณ ${state.fy}` };
  const ceYear = Number(state.month.slice(0, 4));
  const month = Number(state.month.slice(5));
  const lastDay = new Date(Date.UTC(ceYear, month, 0)).getUTCDate();
  return { start: `${state.month}-01`, end: `${state.month}-${lastDay}`, label: months.find((item) => item.value === state.month).label };
}
function selectedStaffRecords() { const range = staffRange(); return staffRecords.filter((item) => item.date >= range.start && item.date <= range.end); }
function staffView() {
  const records = selectedStaffRecords();
  const range = staffRange();
  const counts = staffNames.map((name, index) => ({ name, count: records.filter((item) => item.staff === index + 1).length }));
  const months = fyMonths();
  const monthly = months.filter((item) => state.month === "all" || item.value === state.month).map((item) => ({ ...item, count: records.filter((record) => record.date.startsWith(item.value)).length }));
  const max = Math.max(...monthly.map((item) => item.count), 1);
  const coveredDates = new Set(records.map((item) => item.date)).size;
  return heading("TEAM WORKLOAD", "ภาระงานบุคลากร", "ข้อมูลสำหรับวางแผนงานของทีม", '<button data-action="export-staff">↓ CSV ตัวอย่าง</button>') +
    `<div class="filters"><div class="actions"><label>ปีงบประมาณ<select id="fiscal-year">${options([[2570, "2570"], [2569, "2569"]], state.fy)}</select></label><label>ช่วงข้อมูล<select id="fiscal-month">${options([["all", "ทั้งปีงบประมาณ"], ...months.map((item) => [item.value, item.label])], state.month)}</select></label></div><span class="badge">เพื่อวางแผนงาน</span></div>
    <p class="period-line" id="staff-period">${range.label} · ${range.start} ถึง ${range.end}${range.end > asOf ? " · ข้อมูลถึง 1 พ.ย. 2569 (ยังไม่ครบช่วง)" : ""}</p>
    <div class="stats">${stat("รายการที่บันทึก", records.length, "รายการย่อย", "ไม่ใช่จำนวนผู้รับบริการที่ไม่ซ้ำ")}${stat("สมาชิกที่มีรายการ", counts.filter((item) => item.count > 0).length, "คน", "จากสมาชิกตัวอย่าง 8 คน")}${stat("วันที่มีรายการ", coveredDates, "วัน", "ไม่ใช่จำนวนวันปฏิบัติงาน")}</div>
    <div class="two-col"><section class="panel"><div class="panel-head"><h2>ภาพรวมรายเดือน</h2><span class="muted">รายการย่อย</span></div><div class="panel-body"><div class="trend">${monthly.map((item) => `<div class="trend-col"><strong>${item.value > asOf.slice(0, 7) ? "—" : item.count}</strong><div class="trend-bar" style="height:${item.count / max * 145}px;opacity:${item.value > asOf.slice(0, 7) ? 0 : 1}"></div><span>${item.label.split(" ")[0]}</span></div>`).join("")}</div></div></section>
    <section class="panel"><div class="panel-head"><h2>ใช้ข้อมูลประกอบการวางแผน</h2></div><div class="panel-body"><p class="muted">จำนวนรายการช่วยดูการกระจายงาน แต่แต่ละงานใช้เวลาและความยากต่างกัน</p><p class="note">ไม่มีคะแนนสมรรถนะหรืออันดับความดีความชอบ ใช้ข้อมูลลักษณะงานและตารางปฏิบัติงานประกอบ</p><p class="note">เดือนอนาคตแสดง “—” และไม่เติมเป็นผลงานจริง</p></div></section></div>
    <section class="panel" style="margin-top:20px"><div class="panel-head"><h2>รายการแยกรายบุคคล</h2><span class="muted">ช่วงเดียวกับกราฟและ CSV</span></div><div class="table-scroll"><table><thead><tr><th>บุคลากร</th><th>รายการที่บันทึก</th><th>สัดส่วนรายการในทีม</th></tr></thead><tbody>${counts.map((item, index) => `<tr><td><span class="avatar" style="margin-right:10px">${String(index + 1).padStart(2, "0")}</span>${item.name}</td><td>${item.count}</td><td>${records.length ? (item.count / records.length * 100).toFixed(1) : "0.0"}%</td></tr>`).join("")}</tbody></table></div></section>`;
}
function render() {
  const views = { equipment: equipmentView, usage: usageView, schedules: scheduleView, staff: staffView };
  const titles = { equipment: "อุปกรณ์", usage: "การใช้งานอุปกรณ์", schedules: "ตารางสอบและเรียน", staff: "ภาระงานบุคลากร" };
  content.innerHTML = views[state.page]();
  $("#breadcrumb").textContent = titles[state.page];
  document.querySelectorAll("[data-page]").forEach((link) => { if (link.dataset.page === state.page) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current"); });
}
function openDialog(title, body, footer = "", compact = false) {
  dialog.classList.toggle("compact", compact);
  dialogContent.innerHTML = `<div class="dialog-head"><h2 id="dialog-title">${title}</h2><button class="close" data-action="close" aria-label="ปิดหน้าต่าง">×</button></div><div class="dialog-body">${body}</div>${footer ? `<div class="dialog-foot">${footer}</div>` : ""}`;
  if (!dialog.open) dialog.showModal();
}
function equipmentDialog(id) {
  const item = equipment.find((entry) => entry.id === id);
  const current = item || { name: "", location: "ชั้น 3", type: "หูฟัง", active: true };
  openDialog(item ? "จัดการอุปกรณ์" : "เพิ่มอุปกรณ์ตัวอย่าง", `<form id="equipment-form" data-id="${id || ""}"><label>ชื่ออุปกรณ์<input name="name" required maxlength="60" value="${escapeHtml(current.name)}"></label><label>ประเภท<select name="type">${options(["หูฟัง", "ปลั๊กพ่วง", "USB"].map((value) => [value, value]), current.type)}</select></label><label>สถานที่ประจำ<select name="location" ${item?.status === "borrowed" ? "disabled" : ""}>${options(locations.map((value) => [value, value]), current.location)}</select></label>${item?.status === "borrowed" ? '<p class="warning">คืนอุปกรณ์ก่อนย้ายสถานที่ในต้นแบบนี้</p>' : ""}<label class="check-label"><input type="checkbox" name="active" ${current.active ? "checked" : ""}>เปิดให้ยืมใหม่</label><p class="note">ประวัติเดิมจะเก็บสถานที่ขณะทำรายการ แม้เปลี่ยนสถานที่ประจำ</p></form>`, '<button data-action="close">ยกเลิก</button><button class="primary" type="submit" form="equipment-form">บันทึกในต้นแบบ</button>', true);
}
function roomsFor(count) { return count > 40 ? "406 + 407" : "406"; }
function draftKey(item) { return `${item.date}|${item.start}|${item.end}`; }
function duplicateCount() { return state.draft.filter((item) => state.schedules.some((existing) => draftKey(existing) === draftKey(item))).length; }
function importDialog() {
  state.draft = [];
  state.reviewed = false;
  if (sourcePreviewUrl) { URL.revokeObjectURL(sourcePreviewUrl); sourcePreviewUrl = null; }
  openDialog("นำเข้าตารางจากรูป", `<div class="import-grid"><aside class="source-card"><h3>รูปต้นทาง</h3><p class="muted">ภาพแสดงในเครื่องเท่านั้น</p><label>เลือกรูปเพื่อดูตัวอย่าง<input id="source-file" type="file" accept="image/*"></label><img id="source-preview" alt="รูปตารางที่เลือกในเครื่อง" hidden><p class="note">ต้นแบบยังอ่านรูปไม่ได้ ใช้ปุ่มด้านล่างเพื่อทดลองขั้นตรวจข้อมูล</p><button data-action="sample-draft">ใช้ตารางตัวอย่าง</button></aside><div><p class="warning">ข้อมูลสังเคราะห์สำหรับทดลอง flow ไม่ใช่ผล OCR ของรูปที่เลือก</p><div id="draft-content"><div class="empty">เลือก “ใช้ตารางตัวอย่าง” เพื่อทดลองตรวจ 18 รอบสอบ</div></div></div></div>`, '<p id="draft-summary">ยังไม่มีข้อมูลฉบับร่าง</p><div class="actions"><button data-action="close">ยกเลิก</button><button id="confirm-import" class="primary" data-action="confirm-import" disabled>ยืนยันในต้นแบบ</button></div>');
}
function drawDraft() {
  $("#draft-content").innerHTML = `<div class="table-scroll" style="max-height:310px;margin-top:16px"><table class="draft-table"><thead><tr><th>วันที่</th><th>เวลา</th><th>ผู้สอบ/รอบ</th><th>ห้อง</th></tr></thead><tbody>${state.draft.map((item, index) => `<tr><td>${Number(item.date.slice(-2))}/11/69</td><td>${item.start}–${item.end}</td><td><input type="number" min="1" required value="${item.count}" data-draft-index="${index}" aria-label="จำนวนผู้สอบ ${Number(item.date.slice(-2))} พฤศจิกายน ${item.start}"></td><td id="draft-room-${index}">${roomsFor(item.count)}</td></tr>`).join("")}</tbody></table></div><p class="note">ผู้คุมตัวอย่าง 1 และ 2 จับคู่แล้ว · ชื่อคนที่ 3 ต้องตรวจ</p><label style="margin-top:16px">จับคู่ชื่อผู้คุมคนที่ 3<select id="proctor-match"><option value="">เลือกสมาชิกในระบบ</option><option value="staff-3">ช่างตัวอย่าง 3</option></select></label><label class="check-label"><input id="draft-reviewed" type="checkbox">ตรวจวันที่ เวลา ผู้คุมทั้งสองรอบ และจำนวนคนต่อรอบแล้ว</label>`;
  updateDraftSummary();
}
function updateDraftSummary() {
  const duplicate = duplicateCount();
  const valid = state.draft.length > 0 && state.draft.every((item) => Number.isSafeInteger(item.count) && item.count >= 1);
  $("#draft-summary").textContent = `${state.draft.length} รอบ · ซ้ำ ${duplicate} · จะเพิ่ม ${state.draft.length - duplicate} รอบ${!valid ? " · จำนวนผู้สอบต้องเป็นจำนวนเต็มมากกว่า 0" : ""}`;
  $("#confirm-import").disabled = !valid || !state.reviewed || !$("#proctor-match")?.value || duplicate === state.draft.length;
}
function showHistory(id) {
  const item = equipment.find((entry) => entry.id === id);
  const events = usageEvents().filter((event) => event.equipmentId === id).sort((a, b) => b.date.localeCompare(a.date));
  openDialog(`ประวัติ ${escapeHtml(item.name)}`, `<p class="muted">${events.length} ครั้งในช่วงที่เลือก · สถานที่ปัจจุบัน ${escapeHtml(item.location)}</p><div class="table-scroll" style="max-height:400px"><table><thead><tr><th>วันที่ยืม</th><th>สถานที่ขณะยืม</th><th>ผู้บันทึกตัวอย่าง</th></tr></thead><tbody>${events.map((event) => `<tr><td>${event.date}</td><td>${escapeHtml(event.location)}</td><td>${event.actor}</td></tr>`).join("") || '<tr><td colspan="3">ไม่มีรายการในช่วงที่เลือก</td></tr>'}</tbody></table></div>`, '<button data-action="close">ปิด</button>');
}
document.addEventListener("click", (event) => {
  const target = event.target.closest("button, [data-location]");
  if (!target || target.disabled) return;
  if (target.dataset.location) { state.location = target.dataset.location; render(); return; }
  if (target.dataset.scheduleTab) { state.scheduleTab = target.dataset.scheduleTab; render(); return; }
  const { action, id } = target.dataset;
  if (action === "close") dialog.close();
  if (action === "add-equipment") equipmentDialog();
  if (action === "edit-equipment") equipmentDialog(id);
  if (action === "history") showHistory(id);
  if (action === "borrow") {
    const item = equipment.find((entry) => entry.id === id);
    const returning = item.status === "borrowed";
    item.status = returning ? "available" : "borrowed";
    if (!returning) borrowEvents.push({ equipmentId: id, location: item.location, date: asOf, actor: "ช่างตัวอย่าง 1" });
    activity.unshift({ text: `${returning ? "คืน" : "ยืม"} ${item.name}`, detail: `${item.location} · บันทึกจำลองในเครื่อง` });
    render(); toast(`${returning ? "คืน" : "ยืม"} ${item.name} แล้วในต้นแบบ`);
  }
  if (action === "import") importDialog();
  if (action === "sample-draft") {
    state.reviewed = false;
    state.draft = [3, 4, 5, 10, 11, 12, 17, 18, 19].flatMap((day) => [{ date: `2026-11-${String(day).padStart(2, "0")}`, start: "09:00", end: "10:30", count: 75 }, { date: `2026-11-${String(day).padStart(2, "0")}`, start: "13:30", end: "15:00", count: 75 }]);
    drawDraft();
  }
  if (action === "confirm-import") {
    const additions = state.draft.filter((item) => !state.schedules.some((existing) => draftKey(existing) === draftKey(item)));
    state.schedules.push(...additions.map((item) => ({ ...item })));
    dialog.close(); render(); toast(`ยืนยัน ${additions.length} รอบในต้นแบบแล้ว · ไม่ได้บันทึกฐานข้อมูล`);
  }
  if (action === "evening") {
    const item = { date: "2026-11-03", start: "17:00", end: "18:30", count: 75 };
    if (state.schedules.some((existing) => draftKey(existing) === draftKey(item))) { toast("รอบเย็นตัวอย่างนี้มีอยู่แล้ว ไม่เพิ่มซ้ำ"); return; }
    state.schedules.push(item); render(); toast("เพิ่มรอบเย็น 3 พ.ย. 17:00–18:30 ในต้นแบบแล้ว");
  }
  if (action === "copy-class") { state.copiedClassroom = true; render(); toast("แสดงตัวอย่าง flow คัดลอกสัปดาห์ · ยังไม่บันทึกรายการเรียน"); }
  if (action === "export-staff") {
    const range = staffRange();
    const records = selectedStaffRecords();
    const csvCell = (value) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = [["ข้อมูลสังเคราะห์", "ช่วงเริ่ม", "ช่วงสิ้นสุด", "บุคลากร", "รายการย่อย"], ...staffNames.map((name, index) => ["ตัวอย่าง", range.start, range.end, name, records.filter((item) => item.staff === index + 1).length])];
    const url = URL.createObjectURL(new Blob(["\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `synthetic-workload-fy-${state.fy}-${state.month}.csv`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("ดาวน์โหลด CSV ข้อมูลสังเคราะห์ตามช่วงที่เลือก");
  }
});
document.addEventListener("input", (event) => {
  if (event.target.id === "equipment-search") {
    const value = event.target.value;
    state.search = value; render();
    const search = $("#equipment-search"); search.focus();
  }
  if (event.target.dataset.draftIndex !== undefined) {
    const index = Number(event.target.dataset.draftIndex);
    state.draft[index].count = Number(event.target.value);
    $(`#draft-room-${index}`).textContent = roomsFor(state.draft[index].count);
    updateDraftSummary();
  }
});
document.addEventListener("change", (event) => {
  const { id, value } = event.target;
  if (id === "theme") applyTheme();
  if (id === "usage-month") { state.usageMonth = value; render(); }
  if (id === "usage-location") { state.usageLocation = value; render(); }
  if (id === "fiscal-year") { state.fy = Number(value); state.month = "all"; render(); }
  if (id === "fiscal-month") { state.month = value; render(); }
  if (id === "proctor-match") updateDraftSummary();
  if (id === "draft-reviewed") { state.reviewed = event.target.checked; updateDraftSummary(); }
  if (id === "source-file") {
    const file = event.target.files[0];
    if (sourcePreviewUrl) URL.revokeObjectURL(sourcePreviewUrl);
    sourcePreviewUrl = file ? URL.createObjectURL(file) : null;
    $("#source-preview").hidden = !file;
    if (file) $("#source-preview").src = sourcePreviewUrl;
    else $("#source-preview").removeAttribute("src");
  }
});
document.addEventListener("submit", (event) => {
  if (event.target.id !== "equipment-form") return;
  event.preventDefault();
  const form = event.target;
  const name = form.elements.name.value.trim();
  if (!name) { form.elements.name.setCustomValidity("กรุณากรอกชื่ออุปกรณ์"); form.elements.name.reportValidity(); return; }
  form.elements.name.setCustomValidity("");
  let item = equipment.find((entry) => entry.id === form.dataset.id);
  if (!item) { item = { id: `DEMO-${String(equipment.length + 1).padStart(3, "0")}`, status: "available", count: 0 }; equipment.push(item); }
  const previousLocation = item.location;
  Object.assign(item, { name, type: form.elements.type.value, location: form.elements.location.value, active: form.elements.active.checked });
  if (previousLocation && previousLocation !== item.location) activity.unshift({ text: `ย้าย ${item.name} ไป ${item.location}`, detail: `${previousLocation} → ${item.location} · ประวัติเดิมคงอยู่` });
  dialog.close(); render(); toast("บันทึกทะเบียนในต้นแบบแล้ว · บันทึกด่วนใช้ข้อมูลเดียวกัน");
});
document.addEventListener("input", (event) => { if (event.target.name === "name") event.target.setCustomValidity(""); });
const media = window.matchMedia("(prefers-color-scheme: dark)");
function applyTheme() { const choice = $("#theme").value; document.documentElement.dataset.theme = choice === "system" ? (media.matches ? "dark" : "light") : choice; }
media.addEventListener("change", applyTheme);
function route() {
  const page = location.hash.slice(1);
  state.page = ["equipment", "usage", "schedules", "staff"].includes(page) ? page : "equipment";
  render();
}
window.addEventListener("hashchange", () => { if (dialog.open) dialog.close(); route(); content.focus({ preventScroll: true }); });
applyTheme();
route();
