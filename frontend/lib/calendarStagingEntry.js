import { getWorkspaceNavigation } from "./navigation.js";
export const calendarStagingEntryEnabled = (environment, flag) => environment === "development" && flag === "1";
export const calendarStagingEntryPath = pathname => pathname === "/calendar" || pathname === "/staging";
const extra = [{ id: "profile", href: "/profile", label: "โปรไฟล์" }, { id: "help", href: "/help", label: "คู่มือการใช้งาน" }];
export function stagingEntryLinks(role) { return [...getWorkspaceNavigation(role).flatMap(group => group.items), ...extra]; }
export function resolveStagingHref(href) {
  if (href === "/calendar") return "/calendar";
  const entry = stagingEntryLinks("superadmin").find(item => item.href === href);
  return !entry || entry.id === "dashboard" ? "/staging" : `/staging?section=${encodeURIComponent(entry.id)}`;
}
export function stagingEntrySection(section, role) {
  return stagingEntryLinks(role).find(item => item.id === section) || { id: "dashboard", href: "/dashboard", label: "พื้นที่ทดลอง staging" };
}
