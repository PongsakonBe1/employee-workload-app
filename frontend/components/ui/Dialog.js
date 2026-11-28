"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { useAppearance } from "./AppearanceProvider";

export function Dialog({ open, onClose, title, description, children, footer, className = "", origin, busy = false }) {
  const ref = useRef(null), entrance = useRef(null), closeRef = useRef(onClose), titleId = useId(), descriptionId = useId();
  const { resolved } = useAppearance();
  const originRef = useRef(origin);originRef.current = origin;
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previous = document.activeElement;
    dialog.showModal();
    const source = originRef.current;
    const reduced = matchMedia("(prefers-reduced-motion:reduce)").matches || document.documentElement.dataset.uiMotion === "reduce";
    if (source && !reduced && matchMedia("(min-width:761px)").matches && dialog.animate) {
      // Native modality and focus stay intact; only the presentation is animated.
      dialog.style.animation = "none";
      const box = dialog.getBoundingClientRect();
      const x = Math.max(0, Math.min(box.width, source.x - box.left));
      const y = Math.max(0, Math.min(box.height, source.y - box.top));
      entrance.current = dialog.animate([
        { opacity: .55, transform: "scale(.97)", transformOrigin: `${x}px ${y}px` },
        { opacity: 1, transform: "scale(1)", transformOrigin: `${x}px ${y}px` },
      ], { duration: 200, easing: "cubic-bezier(.2,.8,.2,1)" });
    }
    return () => {
      entrance.current?.cancel();
      entrance.current = null;
      dialog.style.removeProperty("animation");
      if (dialog.open) dialog.close();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open]);
  useEffect(() => {
    if (resolved.reducedMotion) entrance.current?.cancel();
  }, [resolved.reducedMotion]);
  return <dialog
    ref={ref} className={`ui-dialog ${className}`}
    aria-busy={busy || undefined}
    aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}
    onCancel={event => { event.preventDefault();if (!busy) closeRef.current(); }} onPointerDown={event => { if (!busy && event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect();if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeRef.current(); } }}
  >
    <div className="ui-dialog-header">
      <div>
        <h2 id={titleId}>{title}</h2>
        {description && <p id={descriptionId} role={busy ? "status" : undefined}>{description}</p>}
      </div>
      <button
        type="button" className="ui-icon-button"
        aria-label="ปิดหน้าต่าง" onClick={onClose} disabled={busy}
      >
        <X size={20} aria-hidden="true" />
      </button>
    </div>
    <div className="ui-dialog-body" inert={busy || undefined}>{children}</div>
    {footer && <div className="ui-dialog-footer">{footer}</div>}
  </dialog>;
}
