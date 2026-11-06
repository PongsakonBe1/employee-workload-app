"use client";

import { GlassSurface } from "./GlassSurface";

// The optical layer is decorative; the native button owns focus, form and pointer behavior.
export function GlassButton({ children, mode = "css", variant = "regular", className = "", type = "button", ...props }) {
  return <button
    {...props} type={type}
    className={`ui-glass-button ${className}`} data-kind={variant}
  >
    <GlassSurface
      as="span" mode={mode}
      radius={24}
      name="button"
    />
    <span className="ui-glass-button-label">{children}</span>
  </button>;
}

export function GlassControlGroup({ children, mode = "css", label, className = "" }) {
  return <div
    className={`ui-glass-controls ${className}`} role="group"
    aria-label={label}
  >
    <GlassSurface
      mode={mode} radius={15}
      name="control-group"
    />
    {children}
  </div>;
}
