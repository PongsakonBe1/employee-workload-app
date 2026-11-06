"use client";

import { GlassSurface } from "./GlassSurface";
import { GlassSelection } from "./GlassSelection";
import { Children, isValidElement } from "react";

// The optical layer is decorative; the native button owns focus, form and pointer behavior.
export function GlassButton({ children, mode = "css", variant = "regular", className = "", type = "button", ...props }) {
  return <button
    {...props} type={type}
    className={`ui-glass-button ${className}`} data-kind={variant}
  >
    <GlassSurface
      as="span" mode={mode}
      interactive={!props.disabled}
      radius={24}
      name="button"
    />
    <span className="ui-glass-button-label">{children}</span>
  </button>;
}

export function GlassControlGroup({ children, mode = "css", label, className = "" }) {
  const selected = Children.toArray(children).findIndex(child => isValidElement(child) && (child.props["aria-pressed"] === true || child.props["aria-pressed"] === "true"));
  return <div
    className={`ui-glass-controls ${className}`} role="group"
    aria-label={label}
  >
    <GlassSurface
      mode={mode} radius={15}
      name="control-group"
    />
    {selected >= 0 && <GlassSelection
      mode={mode} selected={selected}
      targetSelector='button[aria-pressed="true"]' itemSelector="button"
      className="ui-control-indicator" layoutMeasurement
    />}
    {children}
  </div>;
}
