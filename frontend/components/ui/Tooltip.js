"use client";

import { cloneElement, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function Tooltip({ label, enabled = true, children, className = "", delay = 320 }) {
  const id = useId(), anchor = useRef(null), timer = useRef(null), [position, setPosition] = useState(null), tip = useRef(null);
  const hide = () => { clearTimeout(timer.current);setPosition(null); };
  const show = (delay = 320) => {
    if (!enabled) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { const box = (anchor.current?.querySelector("a,button") || anchor.current)?.getBoundingClientRect();if (box) setPosition({ left: Math.min(box.right + 12, innerWidth - 268), top: Math.min(Math.max(8, box.top + box.height / 2 - 20), innerHeight - 64) }); }, delay);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { if (!enabled) hide(); }, [enabled]);
  useEffect(() => {
    if (!position) return;
    const dismiss = () => hide(), escape = event => { if (event.key === "Escape") hide(); };
    window.addEventListener("resize", dismiss);document.addEventListener("scroll", dismiss, true);document.addEventListener("keydown", escape);
    return () => { window.removeEventListener("resize", dismiss);document.removeEventListener("scroll", dismiss, true);document.removeEventListener("keydown", escape); };
  }, [position]);
  return <span
    className="ui-tooltip-anchor" ref={anchor}
    onMouseEnter={() => show(delay)} onMouseLeave={event => { if (!tip.current?.contains(event.relatedTarget)) { clearTimeout(timer.current);timer.current = setTimeout(hide, 140); } }}
    onFocus={() => show(0)} onBlur={hide}
    onPointerDown={hide}
  >
    {cloneElement(children, { "aria-describedby": position ? [children.props["aria-describedby"], id].filter(Boolean).join(" ") : children.props["aria-describedby"] })}
    {position && createPortal(<span
      ref={tip} id={id}
      role="tooltip" className={`ui-tooltip ${className}`}
      style={position} onMouseEnter={() => clearTimeout(timer.current)}
      onMouseLeave={hide}
    >
      {label}
    </span>, document.body)}
  </span>;
}
