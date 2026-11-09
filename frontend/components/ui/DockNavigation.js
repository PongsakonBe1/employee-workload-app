"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { useAppearance } from "./AppearanceProvider";
import { GlassSurface } from "./GlassSurface";
import { ReviewSymbol } from "./ReviewSymbol";
import { Tooltip } from "./Tooltip";
import { useDockMotion } from "./useDockMotion";

const primaryIds = ["record", "worklogs", "calendar", "resources", "dashboard"];

// Native controls own navigation; transforms do not reflow the page content.
export function DockNavigation({ groups, current, area, collapsed, mode, initial, displayName, onNavigate, onTools, onAppearance, onAccount, toolsOpen, paused }) {
  const root = useRef(null), { resolved } = useAppearance();
  const entries = groups.flatMap(group => group.items);
  const items = primaryIds.map(id => entries.find(entry => entry.id === id)).filter(Boolean);
  useDockMotion(root, { reducedMotion: resolved.reducedMotion, paused, collapsed });

  function keyboard(event) {
    const controls = [...root.current.querySelectorAll("a,button")];
    const index = controls.indexOf(event.target);
    if (index < 0) return;
    const next = event.key === "ArrowDown" ? (index + 1) % controls.length : event.key === "ArrowUp" ? (index + controls.length - 1) % controls.length : event.key === "Home" ? 0 : event.key === "End" ? controls.length - 1 : null;
    if (next !== null) { event.preventDefault();controls[next].focus(); }
  }
  return <aside ref={root} id="workspace-sidebar" className="ui-dock" aria-label="Dock พื้นที่ทำงาน" hidden={collapsed}>
    <span className="ui-dock-shell ui-glass" aria-hidden="true"><GlassSurface as="span" mode={mode} radius={30} name="dock" interactive interactionRoot={root} /></span>
    <Link href={items[0]?.href || "/dashboard"} prefetch={false} className="ui-dock-brand" aria-label="labboy — บันทึกงาน" onKeyDown={keyboard} onClick={event => onNavigate(event, items[0]?.href || "/dashboard")}>
      <Image src="/labboy-logo.png" alt="" width={30} height={30} />
    </Link>
    <div className="ui-dock-separator" aria-hidden="true" />
    <nav className="ui-dock-links" aria-label="เมนูหลัก Dock">
      {items.map(entry => <Tooltip key={entry.id} label={entry.label} enabled={!paused} className="ui-dock-label" delay={140}><Link href={entry.href} prefetch={false} className="ui-dock-link" aria-label={entry.label} aria-current={area === entry.id ? current === entry.id ? "page" : "location" : undefined} onKeyDown={keyboard} onClick={event => onNavigate(event, entry.href)}>
        <span className="ui-dock-tile" data-tone={entry.tone}><ReviewSymbol name={entry.icon} size={27} /></span>
        <span className="ui-dock-active-dot" aria-hidden="true" />
      </Link></Tooltip>)}
    </nav>
    <div className="ui-dock-separator" aria-hidden="true" />
    <div className="ui-dock-utilities">
      <Tooltip label="หน้าและเครื่องมือ" enabled={!paused} className="ui-dock-label" delay={140}><button type="button" className="ui-dock-link" aria-label="หน้าและเครื่องมือทั้งหมด" aria-haspopup="dialog" aria-expanded={toolsOpen} onKeyDown={keyboard} onClick={onTools}>
        <span className="ui-dock-tile" data-tone="neutral"><ReviewSymbol name="tools" size={25}/></span>
      </button></Tooltip>
      <Tooltip label="รูปแบบการแสดงผล" enabled={!paused} className="ui-dock-label" delay={140}><button type="button" className="ui-dock-link" aria-label="รูปแบบการแสดงผล" aria-haspopup="dialog" onKeyDown={keyboard} onClick={onAppearance}>
        <span className="ui-dock-tile" data-tone="neutral"><ReviewSymbol name="settings" size={25}/></span>
      </button></Tooltip>
      <Tooltip label={displayName} enabled={!paused} className="ui-dock-label" delay={140}><button type="button" className="ui-dock-link" aria-label="บัญชีและพื้นที่ทำงาน" aria-haspopup="dialog" onKeyDown={keyboard} onClick={onAccount}>
        <span className="ui-dock-tile ui-dock-person">{initial}</span>
      </button></Tooltip>
    </div>
  </aside>;
}
