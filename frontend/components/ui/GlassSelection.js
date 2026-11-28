"use client";

import { useLayoutEffect, useRef } from "react";
import { attachMobileTabScrub } from "../../lib/mobileTabScrub";
import { useAppearance } from "./AppearanceProvider";

const travelMs = 200;
const navigationTimeoutMs = 1200;
let navigationHandoff;

function anchorBox(anchor) {
  return { x: anchor.offsetLeft, y: anchor.offsetTop, w: anchor.offsetWidth, h: anchor.offsetHeight };
}

function liveBox(indicator, host) {
  const box = indicator.getBoundingClientRect();
  const bounds = host.getBoundingClientRect();
  return { x: box.left - bounds.left - host.clientLeft, y: box.top - bounds.top - host.clientTop, w: box.width, h: box.height };
}

function boxStyle({ x, y, w, h }) {
  return { transform: "translate3d(" + x + "px," + y + "px,0)", width: w + "px", height: h + "px" };
}

const sameBox = (a, b) => a && b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

// Keep the animation decorative. Native links and buttons own all navigation and selection.
export function GlassSelection({ selected, targetSelector, itemSelector, className = "", navigationKey, scrubPreview = false }) {
  const { ready, resolved } = useAppearance();
  const indicator = useRef(null);
  const sync = useRef(null);
  const enabled = ready && !resolved.solid && !resolved.reducedMotion;

  useLayoutEffect(() => {
    if (!enabled) return;
    const element = indicator.current;
    const host = element.parentElement;
    const forcedColors = matchMedia("(forced-colors: active)");
    let animation, pending, timer, box, scrubTab;

    function show(target, from, elapsed = 0) {
      animation?.cancel();
      box = target;
      element.dataset.ready = target ? "true" : "false";
      if (!target) return;
      Object.assign(element.style, boxStyle(target));
      if (!from || sameBox(from, target) || elapsed >= travelMs || document.hidden || !element.animate) return;
      animation = element.animate([boxStyle(from), boxStyle(target)], {
        duration: travelMs, easing: "cubic-bezier(.2,.8,.2,1)",
      });
      if (elapsed) animation.currentTime = elapsed;
    }

    function clearPending() {
      clearTimeout(timer);
      if (navigationHandoff === pending?.transition) navigationHandoff = undefined;
      pending?.anchor.removeAttribute("data-selection-preview");
      pending = null;
      host.removeAttribute("data-selection-pending");
    }

    function currentAnchor() {
      return host.querySelector(targetSelector);
    }

    function measure(reason) {
      const anchor = currentAnchor();
      if (host.dataset.scrubbing === "true") clearScrubVisual();
      if (pending && anchor?.href !== pending.committedHref) clearPending();
      const isVisible = host.offsetWidth && host.offsetHeight && !forcedColors.matches;
      if (!isVisible && pending) clearPending();
      const visualAnchor = pending?.anchor ?? anchor;
      const target = isVisible && visualAnchor?.offsetWidth ? anchorBox(visualAnchor) : null;
      if (reason === "resize" && (sameBox(box, target) || (!box && !target))) return;

      if (reason === "mount" && navigationKey && navigationHandoff?.key === navigationKey) {
        const transition = navigationHandoff;
        navigationHandoff = undefined;
        if (target && anchor?.href === transition.href && sameBox(target, transition.to)) {
          show(target, transition.from, performance.now() - transition.start);
          return;
        }
      }
      if (sameBox(box, target)) return;
      const from = reason === "select" && box && target ? liveBox(element, host) : null;
      show(target, from);
    }

    function previewNavigation(event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target.closest?.(itemSelector);
      if (!anchor || anchor.parentElement !== host || !anchor.offsetWidth || forcedColors.matches) return;
      const selectedAnchor = currentAnchor();
      if (!pending && selectedAnchor === anchor) return;
      const from = box ? liveBox(element, host) : null;
      const to = anchorBox(anchor);
      clearPending();
      if (selectedAnchor !== anchor) {
        const transition = { key: navigationKey, href: anchor.href, from, to, start: performance.now() };
        pending = { anchor, committedHref: selectedAnchor?.href, transition };
        navigationHandoff = transition;
        anchor.dataset.selectionPreview = "true";
        host.dataset.selectionPending = "true";
        timer = setTimeout(() => {
          clearPending();
          measure("select");
        }, navigationTimeoutMs);
      }
      show(to, from);
    }

    function paintScrub(clientX, tab) {
      const active = currentAnchor();
      if (!active || forcedColors.matches || !host.offsetWidth) return;
      scrubTab?.removeAttribute("data-selection-preview");
      scrubTab = tab;
      scrubTab?.setAttribute("data-selection-preview", "true");
      host.dataset.scrubbing = "true";
      const start = anchorBox(active);
      const touches = [...host.querySelectorAll(itemSelector)].map(anchorBox);
      const left = Math.min(...touches.map(box => box.x));
      const right = Math.max(...touches.map(box => box.x + box.w)) - start.w;
      const x = clientX - host.getBoundingClientRect().left - host.clientLeft - start.w / 2;
      show({ ...start, x: Math.max(left, Math.min(right, x)) });
    }

    function clearScrubVisual() {
      scrubTab?.removeAttribute("data-selection-preview");
      scrubTab = null;
      host.removeAttribute("data-scrubbing");
    }

    function finishScrub(tab) {
      const confirmsPreview = host.dataset.scrubbing === "true" && !forcedColors.matches;
      clearScrubVisual();
      if (confirmsPreview && tab && tab !== currentAnchor()) tab.click();
      else measure("select");
    }

    sync.current = () => measure("select");
    measure("mount");
    const resize = () => measure("resize");
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
    if (observer) {
      observer.observe(host);
      host.querySelectorAll(itemSelector).forEach(item => observer.observe(item));
    } else window.addEventListener("resize", resize);
    forcedColors.addEventListener("change", resize);
    const detachScrub = scrubPreview && navigationKey ? attachMobileTabScrub(host, {
      canStart: target => !pending && !forcedColors.matches && Boolean(currentAnchor()?.contains(target)),
      onMove: paintScrub,
      onEnd: finishScrub,
    }) : null;
    if (navigationKey) host.addEventListener("click", previewNavigation, true);
    return () => {
      detachScrub?.();
      observer?.disconnect();
      window.removeEventListener("resize", resize);
      forcedColors.removeEventListener("change", resize);
      host.removeEventListener("click", previewNavigation, true);
      pending?.anchor.removeAttribute("data-selection-preview");
      clearScrubVisual();
      host.removeAttribute("data-selection-pending");
      element.dataset.ready = "false";
      animation?.cancel();
      clearTimeout(timer);
      sync.current = null;
    };
  }, [enabled, itemSelector, navigationKey, scrubPreview, targetSelector]);

  useLayoutEffect(() => { sync.current?.(); }, [selected]);

  return <span className={"ui-glass-indicator " + className} ref={indicator}
    aria-hidden="true" data-ready="false" hidden={!enabled} />;
}
