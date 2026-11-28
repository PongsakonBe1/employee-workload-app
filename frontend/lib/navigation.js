import { worklogEntryPath } from "./authUtils.js";

export const adminSystemHref = "/admin/system";
export const systemLogsHref = `${adminSystemHref}?tab=logs`;

const item = (id, href, label, icon, tone = "blue") => ({ id, href, label, icon, tone });
export function getWorkspaceNavigation(role) {
  if (!["staff", "admin", "superadmin"].includes(role)) return [];
  const admin = role === "admin" || role === "superadmin";
  const groups = [
    { id: "personal", label: "งานของฉัน", items: [
      item("record", worklogEntryPath(role), "บันทึกงาน", "record"),
      item("worklogs", "/worklogs", "ประวัติงาน", "history"),
    ] },
    { id: "workspace", label: "พื้นที่ทำงาน", items: [
      item("calendar", "/calendar", "ตาราง", "calendar", "purple"),
      item("resources", "/resources", "ทรัพยากร", "resources", "green"),
      item("dashboard", "/dashboard", "ภาพรวม", "chart"),
    ] },
    { id: "tools", label: "เครื่องมือและการจัดการ", items: [
      item("export", "/export", "ส่งออกข้อมูล", "export", "green"),
      ...(admin ? [
        item("admin", "/admin", "ศูนย์ควบคุม", "admin"),
        item("staff", "/admin/staff-analytics", "วิเคราะห์บุคลากร", "staffAnalytics"),
        item("equipment", "/admin/equipment-items", "ทะเบียนอุปกรณ์", "equipment", "green"),
        item("condition", "/admin/equipment-health", "การใช้งานและสภาพอุปกรณ์", "resources", "green"),
        item("classes", "/admin/classroom-schedules", "จัดตารางเรียน", "calendar", "purple"),
        item("dl", "/admin/dl-exam-schedules", "จัดตารางสอบ DL", "calendar", "purple"),
        item("templates", "/admin/templates", "บันทึกด่วนและ Combo", "templates", "amber"),
        item("users", "/admin/users", "จัดการผู้ใช้", "staff"),
        item("system", adminSystemHref, "เครื่องมือระบบ", "settings"),
        item("settings", "/admin/settings", "ตั้งค่าระบบ", "settings"),
        ...(role === "superadmin" ? [item("audit", systemLogsHref, "ประวัติการใช้งาน", "audit"), item("cleanup", "/admin/cleanup", "ตรวจข้อมูลซ้ำ", "audit", "amber")] : []),
      ] : []),
    ] },
  ];
  return groups;
}

export function activeNavigation(href, groups) {
  const entries = groups.flatMap(group => group.items);
  const exact = entries.find(entry => entry.href === href);
  if (exact) return exact.id;
  const [pathname] = href.split("?");
  return entries.filter(entry => pathname === entry.href || pathname.startsWith(entry.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.id || null;
}

export function mobileNavigation(groups) {
  const entries = groups.flatMap(group => group.items);
  return ["record", "calendar", "resources", "dashboard"].map(id => entries.find(entry => entry.id === id)).filter(Boolean);
}
