"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useAppearance } from "./AppearanceProvider";
import { GlassSurface } from "./GlassSurface";
import { ReviewSymbol } from "./ReviewSymbol";
import { Tooltip } from "./Tooltip";

const primaryIds = ["record", "worklogs", "calendar", "resources", "dashboard"];

// Real anchors own navigation. Magnification only changes the decorative tile.
export function DockNavigation({ groups, current, area, collapsed, mode, initial, displayName, onNavigate, onTools, onAppearance, onAccount, toolsOpen }) {
  const root = useRef(null), { resolved } = useAppearance();
  const entries = groups.flatMap(group => group.items);
  const items = primaryIds.map(id => entries.find(entry => entry.id === id)).filter(Boolean);
  useEffect(() => {
    const host = root.current;
    if (!host) return;
    let frame = 0, pointerY = 0;
    const links = [...host.querySelectorAll(".ui-dock-link")];
    const reset = () => { cancelAnimationFrame(frame);frame = 0;links.forEach(link => link.style.removeProperty("--dock-scale")); };
    if (resolved.reducedMotion) { reset();return; }
    const paint = () => {
      frame = 0;
      links.forEach(link => {
        const box = link.getBoundingClientRect(), distance = Math.abs(pointerY - box.top - box.height / 2);
        link.style.setProperty("--dock-scale", String(1 + .16 * Math.max(0, 1 - distance / 95) ** 2));
      });
    };
    const move = event => {
      if (event.pointerType === "touch" || !matchMedia("(hover:hover) and (pointer:fine)").matches) return;
      pointerY = event.clientY;if (!frame) frame = requestAnimationFrame(paint);
    };
    host.addEventListener("pointermove", move, { passive: true });host.addEventListener("pointerleave", reset);window.addEventListener("blur", reset);
    return () => { reset();host.removeEventListener("pointermove", move);host.removeEventListener("pointerleave", reset);window.removeEventListener("blur", reset); };
  }, [resolved.reducedMotion]);

  function keyboard(event) {
    const controls = [...root.current.querySelectorAll("a,button")];
    const index = controls.indexOf(event.target);
    if (index < 0) return;
    const next = event.key === "ArrowDown" ? (index + 1) % controls.length : event.key === "ArrowUp" ? (index + controls.length - 1) % controls.length : event.key === "Home" ? 0 : event.key === "End" ? controls.length - 1 : null;
    if (next !== null) { event.preventDefault();controls[next].focus(); }
  }
  return <aside ref={root} id="workspace-sidebar" className="ui-dock ui-glass" aria-label="Dock พื้นที่ทำงาน" hidden={collapsed}>
    <GlassSurface as="span" mode={mode} radius={30} name="dock" interactive />
    <Link href={items[0]?.href || "/dashboard"} prefetch={false} className="ui-dock-brand" aria-label="labboy — บันทึกงาน" onKeyDown={keyboard} onClick={event => onNavigate(event, items[0]?.href || "/dashboard")}>
      <Image src="/labboy-logo.png" alt="" width={30} height={30} />
    </Link>
    <div className="ui-dock-separator" aria-hidden="true" />
    <nav className="ui-dock-links" aria-label="เมนูหลัก Dock">
      {items.map(entry => <Tooltip key={entry.id} label={entry.label} className="ui-dock-label" delay={140}><Link href={entry.href} prefetch={false} className="ui-dock-link" aria-label={entry.label} aria-current={area === entry.id ? current === entry.id ? "page" : "location" : undefined} onKeyDown={keyboard} onClick={event => onNavigate(event, entry.href)}>
        <span className="ui-dock-tile" data-tone={entry.tone}><ReviewSymbol name={entry.icon} size={27} /></span>
        <span className="ui-dock-active-dot" aria-hidden="true" />
      </Link></Tooltip>)}
    </nav>
    <div className="ui-dock-separator" aria-hidden="true" />
    <div className="ui-dock-utilities">
      <Tooltip label="หน้าและเครื่องมือ" className="ui-dock-label" delay={140}><button type="button" className="ui-dock-link" aria-label="หน้าและเครื่องมือทั้งหมด" aria-haspopup="dialog" aria-expanded={toolsOpen} onKeyDown={keyboard} onClick={onTools}>
        <span className="ui-dock-tile" data-tone="neutral"><ReviewSymbol name="tools" size={25}/></span>
      </button></Tooltip>
      <Tooltip label="รูปแบบการแสดงผล" className="ui-dock-label" delay={140}><button type="button" className="ui-dock-link" aria-label="รูปแบบการแสดงผล" aria-haspopup="dialog" onKeyDown={keyboard} onClick={onAppearance}>
        <span className="ui-dock-tile" data-tone="neutral"><ReviewSymbol name="settings" size={25}/></span>
      </button></Tooltip>
      <Tooltip label={displayName} className="ui-dock-label" delay={140}><button type="button" className="ui-dock-link" aria-label="บัญชีและพื้นที่ทำงาน" aria-haspopup="dialog" onKeyDown={keyboard} onClick={onAccount}>
        <span className="ui-dock-tile ui-dock-person">{initial}</span>
      </button></Tooltip>
    </div>
  </aside>;
}
