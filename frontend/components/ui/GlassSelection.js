"use client";

import { useEffect, useRef } from "react";
import { useAppearance } from "./AppearanceProvider";
import { useGlassEnvironment } from "./GlassSurface";

// Motion is decorative: anchor elements remain the sole navigation controls.
export function GlassSelection({ mode, selected }) {
  const { resolved } = useAppearance(), indicator = useRef(null), controller = useRef(null);
  const environment = useGlassEnvironment(process.env.NODE_ENV === "development" && mode === "quick");
  const active = process.env.NODE_ENV === "development" && mode === "quick" && !resolved.solid && environment.ready && environment.backdrop && !environment.forcedColors;
  const latest = useRef({ selected, reducedMotion: resolved.reducedMotion });latest.current = { selected, reducedMotion: resolved.reducedMotion };
  useEffect(() => {
    if (!active) return;
    const element = indicator.current, nav = element.parentElement;
    let disposed = false, frame = 0, initialized = false;
    let position, width;
    const paint = () => { element.style.transform = `translate3d(${position.value}px,0,0)`;element.style.width = Math.max(0, width.value) + "px"; };
    const stop = () => { cancelAnimationFrame(frame);frame = 0;element.dataset.moving = "false"; };
    const tick = now => { frame = 0;const xMoving = position.tick(now), widthMoving = width.tick(now);paint();if ((xMoving || widthMoving) && !document.hidden) frame = requestAnimationFrame(tick);else stop(); };
    function update() {
      if (!position || disposed) return;
      const anchor = nav.querySelector('a[aria-current="page"]'), visible = anchor && nav.offsetWidth && nav.offsetHeight;
      element.dataset.ready = visible ? "true" : "false";
      if (!visible) { stop();return; }
      const target = anchor.getBoundingClientRect(), bounds = nav.getBoundingClientRect(), x = target.left - bounds.left - nav.clientLeft;
      element.style.top = target.top - bounds.top - nav.clientTop + "px";element.style.height = target.height + "px";
      if (!initialized || latest.current.reducedMotion || document.hidden) { stop();position.setValue(x);width.setValue(target.width);paint();initialized = true;return; }
      position.setTarget(x);width.setTarget(target.width);element.dataset.moving = "true";cancelAnimationFrame(frame);frame = requestAnimationFrame(tick);
    }
    controller.current = update;
    let observer;
    import("quick-liquid").then(({ Spring }) => {
      if (disposed) return;
      position = new Spring(0, "snappy");width = new Spring(0, "snappy");
      observer = new ResizeObserver(update);observer.observe(nav);nav.querySelectorAll("a").forEach(anchor => observer.observe(anchor));update();
    }).catch(() => { element.dataset.ready = "false"; });
    const visibility = () => { if (document.hidden) stop();else update(); };
    document.addEventListener("visibilitychange", visibility);
    return () => { disposed = true;stop();observer?.disconnect();document.removeEventListener("visibilitychange", visibility);element.dataset.ready = "false";controller.current = null; };
  }, [active]);
  useEffect(() => { controller.current?.(); }, [selected, resolved.reducedMotion]);
  return <span
    className="ui-glass-indicator" ref={indicator}
    aria-hidden="true" data-ready="false"
    data-moving="false" hidden={!active}
  />;
}
