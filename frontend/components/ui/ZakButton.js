"use client";

import { useImperativeHandle, useRef, useState } from "react";

// Use the pinned package's public hooks with our native button. Its desktop press
// hook is disabled on touch devices, leaving browser pan/zoom untouched. No haptic
// function is invoked; the app's input behavior stays independent of the material.
export function ZakButton({ library, coarse, chromium, children, icon, variant, className, type, ref: forwardedRef, ...props }) {
  const button = useRef(null);
  const [pressed, setPressed] = useState(false);
  const { usePress, useRefraction } = library;
  useImperativeHandle(forwardedRef, () => button.current);
  usePress(button, { disabled: coarse || props.disabled });
  // Preserve the app's conservative WebKit policy. No mirrored worklog DOM is
  // supplied; non-Chromium browsers use the scoped blur, rim border and lighting.
  // Pinned 0.3.20 API: useRefraction(ref, shape, enabled). Check types on upgrade.
  useRefraction(button, { kind: "surface", strength: .6, bezel: Math.min(44 * .36, 22) * .7 }, chromium);
  const { onPointerDown, onPointerUp, onPointerCancel, onKeyDown, onKeyUp, onBlur, ...native } = props;
  const kind = variant === "prominent" ? "filled" : variant === "tinted" ? "tinted" : "glass";
  return <button
    {...native} ref={button} type={type}
    className={`lg-glass lg-button lg-button--md lg-button--${kind} ui-glass-button ui-zak-button ${className}`} data-kind={variant}
    data-button-engine="zak" data-ui-touch-pressed={pressed || undefined}
    data-liquid-glass="" data-shimmer="" data-destructive={variant === "destructive" ? "" : undefined}
    data-icon-only={icon && children == null ? "" : undefined}
    onPointerDown={event => {
      onPointerDown?.(event);
      if (!event.defaultPrevented && !native.disabled && coarse) setPressed(true);
    }}
    onPointerUp={event => { setPressed(false); onPointerUp?.(event); }}
    onPointerCancel={event => { setPressed(false); onPointerCancel?.(event); }}
    onKeyDown={event => { onKeyDown?.(event); if (!event.defaultPrevented && [" ", "Enter"].includes(event.key)) setPressed(true); }}
    onKeyUp={event => { setPressed(false); onKeyUp?.(event); }}
    onBlur={event => { setPressed(false); onBlur?.(event); }}
  ><span className="ui-glass-button-label">{icon}{children}</span></button>;
}
