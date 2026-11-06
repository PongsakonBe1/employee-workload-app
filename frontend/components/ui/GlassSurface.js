"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { glassConfiguration, glassPolicy, isChromiumGlassBrowser } from "../../lib/glassPolicy";
import { useAppearance } from "./AppearanceProvider";

export function useGlassEnvironment(enabled) {
  const [environment, setEnvironment] = useState({ ready: false });
  useEffect(() => {
    if (!enabled) return;
    const coarse = matchMedia("(any-pointer:coarse)"), colors = matchMedia("(forced-colors:active)");
    const update = () => setEnvironment({ ready: true, coarse: coarse.matches, forcedColors: colors.matches,
      backdrop: typeof ResizeObserver !== "undefined" && (CSS.supports("backdrop-filter", "blur(1px)") || CSS.supports("-webkit-backdrop-filter", "blur(1px)")),
      chromium: isChromiumGlassBrowser({ userAgent: navigator.userAgent, brands: navigator.userAgentData?.brands, platform: navigator.platform, touchPoints: navigator.maxTouchPoints }),
    });
    update();coarse.addEventListener("change", update);colors.addEventListener("change", update);
    return () => { coarse.removeEventListener("change", update);colors.removeEventListener("change", update); };
  }, [enabled]);
  return environment;
}

export function GlassSurface({ mode, radius, name }) {
  const { resolved } = useAppearance(), environment = useGlassEnvironment(process.env.NODE_ENV === "development" && mode === "quick");
  const host = useRef(null), engine = useRef(null);
  const failedMap = useRef(false);
  const [phase, setPhase] = useState("loading");
  const policy = glassPolicy({ ...environment, mode, development: process.env.NODE_ENV === "development", solid: resolved.solid, reducedMotion: resolved.reducedMotion });
  const { refractionMode, quality, motion } = policy;
  const config = useMemo(() => glassConfiguration({ refractionMode, quality, motion }, resolved.resolvedTheme, radius), [refractionMode, quality, motion, resolved.resolvedTheme, radius]);
  const latestConfig = useRef(config);latestConfig.current = config;

  useEffect(() => {
    const element = host.current;
    if (!policy.active || !element) { setPhase("loading");return; }
    let disposed = false, pending = false, healthTimer = 0, releasePointer = () => {};
    failedMap.current = false;
    setPhase("loading");
    function release() { clearTimeout(healthTimer);releasePointer();releasePointer = () => {};engine.current?.destroy();engine.current = null; }
    function checkMap(attempt = 0) {
      if (disposed || !engine.current) return;
      const metrics = engine.current.getPerformanceMetrics();
      if (metrics.mapError || attempt >= 15) { failedMap.current = true;engine.current.setConfig({ ...latestConfig.current, refractionMode: "css" });setPhase("css"); }
      else if (metrics.mapPixelsComputed > 0) setPhase("svg");
      else healthTimer = setTimeout(() => checkMap(attempt + 1), 100);
    }
    async function measure() {
      if (disposed) return;
      if (!element.offsetWidth || !element.offsetHeight) { release();setPhase("hidden");return; }
      if (engine.current || pending) return;
      pending = true;
      try {
        const { LiquidGlassEngine } = await import("quick-liquid/core");
        if (disposed || !element.offsetWidth || !element.offsetHeight) return;
        engine.current = new LiquidGlassEngine(element, latestConfig.current);
        // Forward only passive lighting events to this decorative sibling. Real controls
        // remain outside the engine's clipped content and retain their own pointer events.
        const parent = element.parentElement;
        const move = event => { if (event.target === element || event.pointerType === "touch" || (!latestConfig.current.cursorTracking && !latestConfig.current.hoverLighting)) return;element.dispatchEvent(new PointerEvent("pointermove", { clientX: event.clientX, clientY: event.clientY, pointerType: event.pointerType })); };
        const enter = () => element.dispatchEvent(new MouseEvent("mouseenter"));
        const leave = () => element.dispatchEvent(new MouseEvent("mouseleave"));
        parent.addEventListener("pointermove", move, { passive: true });parent.addEventListener("mouseenter", enter);parent.addEventListener("mouseleave", leave);
        releasePointer = () => { parent.removeEventListener("pointermove", move);parent.removeEventListener("mouseenter", enter);parent.removeEventListener("mouseleave", leave); };
        if (latestConfig.current.refractionMode === "svg") checkMap();else setPhase("css");
      } catch { release();setPhase("error"); }
      finally { pending = false; }
    }
    const observer = new ResizeObserver(measure);observer.observe(element);measure();
    return () => { disposed = true;observer.disconnect();release(); };
  }, [policy.active]);

  useEffect(() => { if (engine.current) { engine.current.setConfig(failedMap.current ? { ...config, refractionMode: "css" } : config);if (failedMap.current || config.refractionMode === "css") setPhase("css"); } }, [config]);
  const active = policy.active && ["svg", "css"].includes(phase);
  return <div
    ref={host} className="ui-optical-layer"
    aria-hidden="true" data-glass-surface={name}
    data-active={active} data-glass-phase={policy.active ? phase : policy.reason}
  />;
}
