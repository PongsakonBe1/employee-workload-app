"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

export function Dialog({ open, onClose, title, description, children, className = "" }) {
  const ref = useRef(null), closeRef = useRef(onClose), titleId = useId(), descriptionId = useId();
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previous = document.activeElement;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close();if (previous?.isConnected) previous.focus({ preventScroll: true }); };
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
  </dialog>;
}
