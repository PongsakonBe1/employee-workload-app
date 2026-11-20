"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { GlassSurface } from "./GlassSurface";
import { ReviewSymbol } from "./ReviewSymbol";

const categories = [
  { id: "all", label: "ทั้งหมด" },
  { id: "work", label: "งานของฉัน", items: ["record", "worklogs", "templates", "export", "profile", "help"] },
  { id: "resources", label: "ห้องและอุปกรณ์", items: ["calendar", "resources", "equipment", "condition", "classes", "dl"] },
  { id: "analytics", label: "วิเคราะห์", items: ["dashboard", "staff"] },
  { id: "manage", label: "ดูแลระบบ", items: ["admin", "users", "system", "settings", "audit", "cleanup"] },
];

// Native modality protects the underlying draft and provides focus containment.
// The full-window presentation is a launcher rather than a form-sized dialog.
export function WorkspaceLauncher({ open, onClose, items, current, onNavigate, mode }) {
  const ref = useRef(null), searchRef = useRef(null), grid = useRef(null), closeRef = useRef(onClose);
  const blankPress = useRef(null);
  const titleId = useId(), searchId = useId();
  const [search, setSearch] = useState(""), [category, setCategory] = useState("all");
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current;if (!open || !dialog) return;
    const previous = document.activeElement, root = document.documentElement;
    const overflow = root.style.overflow, gutter = root.style.scrollbarGutter;
    setSearch("");setCategory("all");dialog.showModal();searchRef.current?.focus({ preventScroll: true });
    root.style.scrollbarGutter = "stable";root.style.overflow = "hidden";
    const containTab = event => {
      if (event.key !== "Tab") return;
      const controls = [...dialog.querySelectorAll("a[href],button:not(:disabled),input:not(:disabled),[tabindex='0']")].filter(node => node.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault();last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault();first?.focus(); }
    };
    dialog.addEventListener("keydown", containTab);
    return () => {
      dialog.removeEventListener("keydown", containTab);
      if (dialog.open) dialog.close();root.style.overflow = overflow;root.style.scrollbarGutter = gutter;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open]);
  const available = categories.filter(group => group.id === "all" || items.some(item => group.items.includes(item.id)));
  const selected = categories.find(group => group.id === category);
  const query = search.trim().toLocaleLowerCase("th");
  const visible = items.filter(item => (category === "all" || selected?.items.includes(item.id)) && item.label.toLocaleLowerCase("th").includes(query));
  function keyboard(event) {
    if (event.nativeEvent.isComposing) return;
    const links = [...grid.current.querySelectorAll("a")], index = links.indexOf(event.currentTarget);
    const columns = getComputedStyle(grid.current).gridTemplateColumns.split(" ").length;
    const direction = getComputedStyle(grid.current).direction === "rtl" ? -1 : 1;
    let next = event.key === "ArrowRight" ? index + direction : event.key === "ArrowLeft" ? index - direction : event.key === "ArrowDown" ? index + columns : event.key === "ArrowUp" ? index - columns : event.key === "Home" ? 0 : event.key === "End" ? links.length - 1 : null;
    if (next === null) return;
    event.preventDefault();if (next < 0 && event.key === "ArrowUp") searchRef.current.focus();
    else { next = Math.max(0, Math.min(links.length - 1, next));links[next]?.focus(); }
  }
  function searchKeyboard(event) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown") { event.preventDefault();grid.current.querySelector("a")?.focus(); }
    if (event.key === "Enter" && query && !event.metaKey && !event.ctrlKey) { event.preventDefault();grid.current.querySelector("a")?.click(); }
  }
  return <dialog ref={ref} className="ui-launcher" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault();closeRef.current(); }}
    onPointerDown={event => { if (event.target === event.currentTarget || event.target.classList.contains("ui-launcher-space") || event.target === grid.current) blankPress.current = { x:event.clientX, y:event.clientY, target:event.target }; }}
    onPointerCancel={() => { blankPress.current = null; }}
    onPointerUp={event => { const press=blankPress.current;blankPress.current=null;if (press && press.target === event.target && Math.hypot(event.clientX-press.x,event.clientY-press.y)<5) closeRef.current(); }}>
    <button type="button" className="ui-icon-button ui-launcher-close ui-glass" aria-label="ปิดหน้าต่าง" onClick={onClose}><X size={22} aria-hidden="true" /></button>
    <header className="ui-launcher-header">
      <h2 id={titleId}>หน้าและเครื่องมือ</h2>
      <label className="ui-launcher-search ui-glass" htmlFor={searchId}>
        {open && <GlassSurface mode={mode} radius={99} name="launcher-search" />}
        <Search size={20} aria-hidden="true" />
        <input id={searchId} ref={searchRef} type="search" aria-label="ค้นหาหน้า" placeholder="ค้นหาหน้าและเครื่องมือ" autoComplete="off" value={search} onChange={event => setSearch(event.target.value)} onKeyDown={searchKeyboard} />
      </label>
      <div className="ui-launcher-categories" role="group" aria-label="หมวดเครื่องมือ">
        <div className="ui-launcher-category-bar ui-glass">{available.map(group => <button type="button" key={group.id} aria-pressed={category === group.id} onClick={() => setCategory(group.id)}>{group.label}</button>)}</div>
      </div>
      <div className="ui-launcher-category-picker ui-glass">
        <select aria-label="หมวดเครื่องมือ" value={category} onChange={event => setCategory(event.target.value)}>{available.map(group => <option key={group.id} value={group.id}>{group.label}</option>)}</select>
        <ChevronDown size={16} aria-hidden="true" />
      </div>
    </header>
    <div className="ui-launcher-space">
      <nav ref={grid} className="ui-launcher-grid" aria-label="ผลการค้นหาหน้า">
        {visible.map(entry => <Link key={entry.id} href={entry.href} prefetch={false} className="ui-launcher-item" aria-label={entry.label} aria-current={current === entry.id ? "page" : undefined} onKeyDown={keyboard} onClick={event => onNavigate(event, entry.href)}>
          <span className="ui-dock-tile" data-tone={entry.tone}><ReviewSymbol name={entry.icon} size={40} /></span>
          <span className="ui-launcher-label">{entry.label}</span>
        </Link>)}
      </nav>
      {!visible.length && <div className="ui-launcher-empty"><Search size={32} aria-hidden="true" /><h3>ไม่พบหน้าและเครื่องมือ</h3><p>ลองค้นหาด้วยคำอื่น หรือเลือกหมวดทั้งหมด</p><button type="button" className="ui-button" onClick={() => { setSearch("");setCategory("all");searchRef.current.focus(); }}>แสดงทั้งหมด</button></div>}
    </div>
    <footer className="ui-launcher-footer"><p role="status">{visible.length} เครื่องมือ</p><p className="ui-launcher-keyboard-hint">ใช้ปุ่มลูกศรเพื่อเลือก · Enter เพื่อเปิด · Esc เพื่อกลับ</p></footer>
  </dialog>;
}
