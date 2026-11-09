"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

export function Dialog({ open, onClose, title, description, children, footer, className = "", origin }) {
  const ref = useRef(null), closeRef = useRef(onClose), titleId = useId(), descriptionId = useId();
  const originRef = useRef(origin);originRef.current = origin;
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previous = document.activeElement;
    dialog.showModal();
    let animation;
    const source = originRef.current;
    const reduced = matchMedia("(prefers-reduced-motion:reduce)").matches || document.documentElement.dataset.uiMotion === "reduce";
    if (source && !reduced && dialog.animate) {
      // Native modality and focus stay intact; only the presentation is animated.
      dialog.style.animation = "none";
      const box = dialog.getBoundingClientRect();
      const x = Math.max(0, Math.min(box.width, source.x - box.left));
      const y = Math.max(0, Math.min(box.height, source.y - box.top));
      animation = dialog.animate([
        { opacity: 0, transform: `translateX(-18px) scale(.93)`, transformOrigin: `${x}px ${y}px` },
        { opacity: 1, transform: "translateX(0) scale(1)", transformOrigin: `${x}px ${y}px` },
      ], { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)" });
    }
    return () => { animation?.cancel();dialog.style.removeProperty("animation");if (dialog.open) dialog.close();if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, [open]);
  return <dialog
    ref={ref} className={`ui-dialog ${className}`}
    aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}
    onCancel={event => { event.preventDefault();closeRef.current(); }} onPointerDown={event => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect();if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeRef.current(); } }}
  >
    <div className="ui-dialog-header">
      <div>
        <h2 id={titleId}>{title}</h2>
        {description && <p id={descriptionId}>{description}</p>}
      </div>
      <button
        type="button" className="ui-icon-button"
        aria-label="ปิดหน้าต่าง" onClick={onClose}
      >
        <X size={20} aria-hidden="true" />
      </button>
    </div>
    <div className="ui-dialog-body">{children}</div>
    {footer && <div className="ui-dialog-footer">{footer}</div>}
  </dialog>;
}
