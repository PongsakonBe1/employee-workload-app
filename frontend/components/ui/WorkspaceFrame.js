"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BarChart2, CalendarDays, ChevronDown, ChevronRight, ClipboardList, Download, FileText, Headphones, HelpCircle, LayoutGrid, LogOut, Menu, Package, PanelLeft, Search, Settings, ShieldCheck, SunMoon, User, Users, Zap } from "lucide-react";
import { activeNavigation, getWorkspaceNavigation, mobileNavigation } from "../../lib/navigation";
import { Dialog } from "./Dialog";
import { Tooltip } from "./Tooltip";
import { AppearanceSettings } from "./AppearanceSettings";
import { GlassSurface } from "./GlassSurface";
import { GlassSelection } from "./GlassSelection";

const icons = { record: FileText, history: ClipboardList, calendar: CalendarDays, resources: Headphones, chart: BarChart2, export: Download, staff: Users, equipment: Package, settings: Settings, templates: Zap, audit: ShieldCheck, admin: LayoutGrid };
const roleLabels = { staff: "Staff", admin: "Admin", superadmin: "Superadmin" };

export function WorkspaceFrame({ user, pathname, notificationSlot, children, onLogout, onNavigate, glassMode = "css" }) {
  const groups = getWorkspaceNavigation(user.role), all = groups.flatMap(group => group.items), current = activeNavigation(pathname, groups);
  const [collapsed, setCollapsed] = useState(false), [wide, setWide] = useState(false), [scrolled, setScrolled] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(() => groups.find(group => group.id === "tools")?.items.some(entry => entry.id === current));
  const [dialog, setDialog] = useState(null), [search, setSearch] = useState("");
  const calendar = ["/calendar", "/admin/classroom-schedules", "/admin/dl-exam-schedules"].includes(pathname);
  const compact = calendar && wide && !collapsed;
  const label = all.find(entry => entry.id === current)?.label || ({ "/profile": "โปรไฟล์", "/help": "คู่มือการใช้งาน" }[pathname] || "พื้นที่ทำงาน");
  const displayName = user.displayName || user.nickname || user.fullName || "ผู้ใช้งาน";
  const initial = user.initial || Array.from(displayName.trim())[0] || "?";
  const pilotMode = process.env.NODE_ENV === "development" && glassMode === "quick" ? "quick" : "css";
  useEffect(() => {
    const query = matchMedia("(min-width:1241px)"), update = () => setWide(query.matches);
    update();query.addEventListener("change", update);return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    let frame = 0;
    const update = () => { cancelAnimationFrame(frame);frame = requestAnimationFrame(() => setScrolled(scrollY > 18)); };
    update();window.addEventListener("scroll", update, { passive: true });return () => { cancelAnimationFrame(frame);window.removeEventListener("scroll", update); };
  }, []);
  useEffect(() => { setDialog(null); }, [pathname]);
  useEffect(() => {
    const shortcut = event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault();setSearch("");setDialog("routes"); } };
    document.addEventListener("keydown", shortcut);return () => document.removeEventListener("keydown", shortcut);
  }, []);
  function navigate(event, href) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button > 0) return;
    setDialog(null);if (onNavigate) { event.preventDefault();onNavigate(href); }
  }
  function navLink(entry, tooltip = false) {
    const Icon = icons[entry.icon];
    const link = <Link
      key={entry.id} href={entry.href}
      prefetch={false} className="ui-sidebar-link"
      aria-label={entry.label} aria-current={current === entry.id ? "page" : undefined}
      onClick={event => navigate(event, entry.href)}
    >
      <span className="ui-nav-symbol" data-tone={entry.tone}><Icon size={19} aria-hidden="true" /></span>
      <span className="ui-nav-text">{entry.label}</span>
    </Link>;
    return tooltip ? <Tooltip
      key={entry.id} label={entry.label}
      enabled={compact}
    >
      {link}
    </Tooltip> : link;
  }
  const menuItems = [...all, { id: "profile", href: "/profile", label: "โปรไฟล์", icon: "staff", tone: "blue" }, { id: "help", href: "/help", label: "คู่มือการใช้งาน", icon: "audit", tone: "blue" }].filter(entry => entry.label.toLocaleLowerCase("th").includes(search.trim().toLocaleLowerCase("th")));
  return <div
    className="ui-workspace" data-workspace
    data-compact={compact} data-sidebar-hidden={collapsed}
    data-calendar={calendar}
    data-glass-pilot={pilotMode}
  >
    <a href="#workspace-content" className="ui-skip-link">ข้ามไปเนื้อหา</a>
    <aside
      className="ui-sidebar ui-glass" aria-label="พื้นที่ทำงาน"
      id="workspace-sidebar" hidden={collapsed}
    >
      <Link
        href={all[0]?.href || "/dashboard"} prefetch={false}
        onClick={event => navigate(event, all[0]?.href || "/dashboard")} className="ui-brand"
        aria-label="labboy — บันทึกงาน"
      >
        <Image
          src="/labboy-logo.png" alt=""
          width={33} height={33}
        />
        <span>
          <strong>labboy</strong>
          <small>ICIT Workspace</small>
        </span>
      </Link>
      <nav className="ui-sidebar-menu" aria-label="เมนูงาน">
        {groups.map(group => <section className="ui-sidebar-group" key={group.id}>
          {group.id === "tools" ? <>
            <Tooltip label={group.label} enabled={compact}>
              <button
                type="button" className="ui-tools-disclosure"
                aria-label={group.label} aria-expanded={Boolean(toolsOpen)}
                aria-controls="workspace-tools" onClick={() => setToolsOpen(value => !value)}
              >
                <ChevronRight size={14} aria-hidden="true" />
                <span>{group.label}</span>
              </button>
            </Tooltip>
            <div id="workspace-tools" hidden={!toolsOpen}>{group.items.map(entry => navLink(entry, true))}</div>
          </> : <>
            <h2>{group.label}</h2>
            {group.items.map(entry => navLink(entry, true))}
          </>}
        </section>)}
      </nav>
      <div className="ui-sidebar-footer">
        <Tooltip label="รูปแบบการแสดงผล" enabled={compact}>
          <button
            type="button" className="ui-sidebar-link"
            aria-label="รูปแบบการแสดงผล" onClick={() => setDialog("appearance")}
          >
            <span className="ui-nav-symbol" data-tone="blue"><SunMoon size={19} aria-hidden="true" /></span>
            <span className="ui-nav-text">รูปแบบการแสดงผล</span>
          </button>
        </Tooltip>
        <Tooltip label="บัญชีและพื้นที่ทำงาน" enabled={compact}>
          <button
            type="button" className="ui-workspace-person"
            aria-label="บัญชีและพื้นที่ทำงาน" onClick={() => setDialog("account")}
          >
            <span className="ui-avatar" aria-hidden="true">{initial}</span>
            <span className="ui-person-name">
              <strong>{displayName}</strong>
              <small>{roleLabels[user.role]}</small>
            </span>
            <ChevronDown size={14} aria-hidden="true" />
          </button>
        </Tooltip>
      </div>
    </aside>
    <header className="ui-header" data-scrolled={scrolled}>
      <div className="ui-header-leading">
        <button
          type="button" className="ui-icon-button ui-sidebar-toggle"
          aria-label={collapsed ? "แสดงแถบด้านข้าง" : "ซ่อนแถบด้านข้าง"} aria-expanded={!collapsed}
          aria-controls="workspace-sidebar" onClick={() => setCollapsed(value => !value)}
        >
          <PanelLeft size={20} aria-hidden="true" />
        </button>
        <Link
          className="ui-mobile-brand" href={all[0]?.href || "/dashboard"}
          prefetch={false} onClick={event => navigate(event, all[0]?.href || "/dashboard")}
        >
          labboy
        </Link>
        <span className="ui-location">{label}</span>
      </div>
      <div className="ui-header-actions">
        <GlassSurface
          mode={pilotMode} radius={99}
          name="toolbar"
        />
        <button
          type="button" className="ui-icon-button"
          aria-label="ค้นหาหน้าและเครื่องมือ" onClick={() => { setSearch("");setDialog("routes"); }}
        >
          <Search size={20} aria-hidden="true" />
        </button>
        {notificationSlot}
        <button
          type="button" className="ui-icon-button"
          aria-label="บัญชีและเครื่องมือ" onClick={() => setDialog("account")}
        >
          <span className="ui-avatar" aria-hidden="true">{initial}</span>
        </button>
      </div>
    </header>
    <main
      id="workspace-content" tabIndex={-1}
      className="ui-page"
    >
      {user.role === "staff" && !user.displayName && pathname !== "/profile" && <section className="ui-profile-alert" aria-label="ตั้งชื่อที่ใช้ลงงาน">
        <User size={20} aria-hidden="true" />
        <div>
          <strong>กรุณาตั้งชื่อที่ใช้ลงงาน</strong>
          <p>ใช้ชื่อภาษาไทยที่ทีมแยกแยะได้ เพื่อให้อ่านรายการและรายงานได้ถูกต้อง</p>
        </div>
        <Link href="/profile" onClick={event => navigate(event, "/profile")}>ตั้งชื่อ</Link>
      </section>}
      {children}
      <footer className="ui-footer">
        <Link
          href="/help" prefetch={false}
          onClick={event => navigate(event, "/help")}
        >
          <HelpCircle size={14} aria-hidden="true" />
          คู่มือการใช้งาน
        </Link>
        <span>labboy Workload</span>
        {process.env.NODE_ENV === "development" && <span className="ui-develop-label">Development · UI Foundation</span>}
      </footer>
    </main>
    <nav className="ui-mobile-nav ui-glass" aria-label="เมนูประจำ">
      <GlassSurface
        mode={pilotMode} radius={25}
        name="tabbar"
      />
      <GlassSelection mode={pilotMode} selected={current} />
      {mobileNavigation(groups).map(entry => { const Icon = icons[entry.icon];return <Link
        key={entry.id} href={entry.href}
        prefetch={false} aria-current={current === entry.id ? "page" : undefined}
        onClick={event => navigate(event, entry.href)}
      >
        <Icon size={21} aria-hidden="true" />
        <span>{entry.id === "record" ? "งาน" : entry.label}</span>
      </Link>; })}
    </nav>
    <Dialog
      open={dialog === "appearance"} onClose={() => setDialog(null)}
      title="รูปแบบการแสดงผล" description="ปรับพื้นที่ทำงานให้สบายตาบนอุปกรณ์ของคุณ"
    >
      <AppearanceSettings />
    </Dialog>
    <Dialog
      open={dialog === "routes" || dialog === "menu"} onClose={() => setDialog(null)}
      title="หน้าและเครื่องมือ" description="ค้นหาปลายทางจากงานที่ต้องการทำ"
    >
      <label className="ui-field">
        <span>ค้นหาหน้า</span>
        <input
          type="search" className="apple-input"
          placeholder="ชื่อหน้า หรือเครื่องมือ" value={search}
          onChange={event => setSearch(event.target.value)}
        />
      </label>
      <nav className="ui-route-list" aria-label="ผลการค้นหาหน้า">{menuItems.length ? menuItems.map(entry => navLink(entry)) : <p className="ui-caption">ไม่พบหน้า ลองใช้คำอื่น</p>}</nav>
    </Dialog>
    <Dialog
      open={dialog === "account"} onClose={() => setDialog(null)}
      title="บัญชีและพื้นที่ทำงาน" description={`${displayName} · ${roleLabels[user.role]}`}
    >
      <nav className="ui-account-menu" aria-label="บัญชีและเครื่องมือ">
        <Link href="/profile" onClick={event => navigate(event, "/profile")}>
          <User size={20} aria-hidden="true" />
          โปรไฟล์
        </Link>
        <Link href="/worklogs" onClick={event => navigate(event, "/worklogs")}>
          <ClipboardList size={20} aria-hidden="true" />
          ประวัติงาน
        </Link>
        <button type="button" onClick={() => { setSearch("");setDialog("routes"); }}>
          <Menu size={20} aria-hidden="true" />
          หน้าและเครื่องมือทั้งหมด
        </button>
        <button type="button" onClick={() => setDialog("appearance")}>
          <SunMoon size={20} aria-hidden="true" />
          รูปแบบการแสดงผล
        </button>
        <Link href="/help" onClick={event => navigate(event, "/help")}>
          <HelpCircle size={20} aria-hidden="true" />
          คู่มือการใช้งาน
        </Link>
        {onLogout && <button
          type="button" className="ui-destructive"
          onClick={() => { setDialog(null);onLogout(); }}
        >
          <LogOut size={20} aria-hidden="true" />
          ออกจากระบบ
        </button>}
      </nav>
    </Dialog>
  </div>;
}
