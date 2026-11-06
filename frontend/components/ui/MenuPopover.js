"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GlassSurface } from "./GlassSurface";

// An anchored command menu; actions remain native buttons with keyboard navigation.
export function MenuPopover({ label, icon, items, glassMode = "css" }) {
  const [open, setOpen] = useState(false), [position, setPosition] = useState({ top: 0, left: 0 });
  const trigger = useRef(null), menu = useRef(null), id = useId();
  useEffect(() => {
    if (!open) return;
    const box = trigger.current.getBoundingClientRect();setPosition({ top: Math.max(8, Math.min(box.bottom + 8, innerHeight - (menu.current?.offsetHeight || 160) - 8)), left: Math.max(8, Math.min(box.right - 240, innerWidth - 248)) });
    const frame = requestAnimationFrame(() => menu.current?.querySelector('button:not(:disabled)')?.focus());
    const outside = event => { if (!menu.current?.contains(event.target) && !trigger.current?.contains(event.target)) setOpen(false); };
    const reposition = () => setOpen(false);
    document.addEventListener("pointerdown", outside);window.addEventListener("resize", reposition);window.addEventListener("scroll", reposition);
    return () => { cancelAnimationFrame(frame);document.removeEventListener("pointerdown", outside);window.removeEventListener("resize", reposition);window.removeEventListener("scroll", reposition); };
  }, [open]);
  function keyboard(event) {
    const buttons = Array.from(menu.current.querySelectorAll('button:not(:disabled)')), index = buttons.indexOf(document.activeElement);
    if (event.key === "Escape") { event.preventDefault();setOpen(false);trigger.current.focus(); }
    else if (event.key === "Tab") setOpen(false);
    else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) { event.preventDefault();buttons[event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length]?.focus(); }
  }
  return <>
    <button
      ref={trigger} type="button"
      className="ui-icon-button ui-menu-trigger" aria-label={label}
      aria-haspopup="menu" aria-expanded={open}
      aria-controls={open ? id : undefined} onClick={() => setOpen(!open)}
      onKeyDown={event => { if (["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault();setOpen(true); } }}
    >
      {icon}
    </button>
    {open && createPortal(<div
      id={id} ref={menu}
      className="ui-command-menu" role="menu"
      aria-label={label} style={position}
      onKeyDown={keyboard} tabIndex={-1}
    >
      <GlassSurface
        mode={glassMode} radius={16}
        name="command-menu"
      />
      {items.map(item => <button
        type="button" role="menuitem"
        key={item.label} disabled={item.disabled}
        onClick={() => { setOpen(false);item.action(); }}
      >
        {item.icon}
        <span>{item.label}</span>
      </button>)}
    </div>, document.body)}
  </>;
}
