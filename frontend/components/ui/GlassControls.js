"use client";

import { GlassSurface } from "./GlassSurface";
import { GlassSelection } from "./GlassSelection";
import { Children, isValidElement } from "react";
import { useButtonMaterial } from "./ButtonMaterialProvider";
import { useAppearance } from "./AppearanceProvider";
import { useGlassEnvironment } from "./GlassSurface";
import { ZakButton } from "./ZakButton";

// The optical layer is decorative; the native button owns focus, form and pointer behavior.
// Variants: regular, tinted, prominent (safe primary action), destructive (loss/rejection).
// The variant is a visual intent, not a nonstandard ARIA role or an authorization check.
export function GlassButton({ children, icon, engine, mode = "css", variant = "regular", className = "", type = "button", ...props }) {
  const material = useButtonMaterial(), { resolved } = useAppearance();
  const environment = useGlassEnvironment(process.env.NODE_ENV === "development" && mode === "quick");
  const candidate = (engine || material.engine) === "zak" && material.library && environment.ready && environment.backdrop && !environment.forcedColors && !resolved.solid && !resolved.reducedMotion && mode === "quick" && process.env.NODE_ENV === "development";
  if (candidate) return <ZakButton {...props} library={material.library} coarse={environment.coarse} chromium={environment.chromium} icon={icon} variant={variant} className={className} type={type}>{children}</ZakButton>;
  return <button
    {...props} type={type}
    className={`ui-glass-button ${className}`} data-kind={variant}
    data-button-engine={mode === "quick" ? "quick" : "css"} data-icon-only={icon && children == null ? "" : undefined}
  >
    <GlassSurface
      as="span" mode={mode}
      interactive={!props.disabled}
      radius={24}
      name="button"
    />
    <span className="ui-glass-button-label">{icon}{children}</span>
  </button>;
}

export function GlassControlGroup({ children, mode = "css", label, className = "" }) {
  const buttons = Children.toArray(children);
  const selectable = buttons.length > 1 && buttons.every(child => isValidElement(child) && child.type === "button" && child.props["aria-pressed"] != null);
  const pressed = selectable ? buttons.filter(child => String(child.props["aria-pressed"]) === "true") : [];
  return <div
    className={`ui-glass-controls ${className}`} role="group"
    aria-label={label}
  >
    <GlassSurface
      mode={mode} radius={15}
      name="control-group"
    />
    {pressed.length === 1 && <GlassSelection
      selected={buttons.indexOf(pressed[0])}
      targetSelector='button[aria-pressed="true"]' itemSelector="button"
      className="ui-control-indicator"
    />}
    {children}
  </div>;
}
