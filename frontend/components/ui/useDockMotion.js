"use client";
import { useEffect, useRef } from "react";
import { dockMotionTargets } from "../../lib/dockMotion";

export function useDockMotion(root, { reducedMotion, paused, collapsed }) {
  const driver = useRef(null), blocked = useRef(paused);
  blocked.current = paused;
  useEffect(() => {
    const host = root.current;
    if (!host) return;
    const links = [...host.querySelectorAll(".ui-dock-brand,.ui-dock-link")], nav = host.querySelector(".ui-dock-links");
    let frame = 0, disposed = false, springs = [], shell, centers = [], pointer = null, pressed = null, limited = false, height = 1, tileSizes = [], margin = 0, pending = null;
    function clear() {
      cancelAnimationFrame(frame);frame = 0;pending = null;host.dataset.moving = "false";
      links.forEach(link => { link.style.removeProperty("--dock-scale");link.style.removeProperty("--dock-shift"); });
      host.style.removeProperty("--dock-shell-x");host.style.removeProperty("--dock-shell-y");
    }
    if (reducedMotion) { clear();host.dataset.motionReady = "reduced";return; }
    function tick(now) {
      frame = 0;let moving = false;
      if (pending) {
        // Coalesce pointer events into one direct position update per frame.
        // Retargeting a spring on every event restarts its clock and stalls tracking.
        pending.targets.forEach((target, i) => { springs[i].setTarget(target);springs[i].setValue(target); });
        shell.setTarget(pending.shell);shell.setValue(pending.shell);pending = null;
      }
      springs.forEach((spring, i) => {
        moving = spring.tick(now) || moving;
        const [scale, shift] = spring.values;
        links[i].style.setProperty("--dock-scale", scale.toFixed(4));links[i].style.setProperty("--dock-shift", shift.toFixed(3) + "px");
      });
      moving = shell.tick(now) || moving;
      const [energy, spread] = shell.values;
      host.style.setProperty("--dock-shell-x", String(1 + Math.max(0, energy) * .14));
      host.style.setProperty("--dock-shell-y", String(1 + Math.max(0, spread) / height));
      host.dataset.moving = moving ? "true" : "false";
      if (moving && !document.hidden && !disposed) frame = requestAnimationFrame(tick);
    }
    function update(direct = false) {
      if (!shell) return;
      const targets = dockMotionTargets(centers, limited || blocked.current ? null : pointer, tileSizes, margin);
      const values = targets.map((target, i) => [Math.max(.9, target.scale - (pressed === links[i] ? .1 : 0)), target.shift]);
      const shellTarget = [Math.max(0, ...targets.map(target => (target.scale - 1) / .48)), targets.reduce((sum, target, index) => sum + (target.scale - 1) * tileSizes[index], 0)];
      if (direct) pending = { targets: values, shell: shellTarget };
      else {
        pending = null;const now = performance.now();
        springs.forEach((spring, i) => { spring.tick(now);spring.setTarget(values[i]); });
        shell.tick(now);shell.setTarget(shellTarget);
      }
      host.dataset.moving = "true";
      if (!frame) frame = requestAnimationFrame(tick);
    }
    function settle(snap = false) {
      pointer = null;pressed = null;
      if (snap) { springs.forEach(spring => spring.setValue([1, 0]));shell?.setValue([0, 0]);clear(); }
      else update();
    }
    function measure() {
      const box = host.getBoundingClientRect();height = Math.max(1, host.offsetHeight);
      centers = links.map(link => {
        if (link.classList.contains("ui-dock-brand")) return box.top + link.offsetTop + link.offsetHeight / 2;
        const rect = link.parentElement.getBoundingClientRect();return rect.top + rect.height / 2;
      });
      tileSizes = links.map(link => parseFloat(getComputedStyle(link.querySelector(".ui-dock-tile,img")).width));
      margin = Math.max(0, Math.min(36, box.top - 16, innerHeight - box.bottom - 16));
      limited = !host.offsetWidth || host.hidden || nav.scrollHeight > nav.clientHeight + 1;
      host.dataset.motionLimited = String(limited);settle(true);
    }
    function move(event) {
      if (blocked.current || event.pointerType === "touch" || !matchMedia("(hover:hover) and (pointer:fine)").matches) return;
      pointer = event.clientY;update(true);
    }
    const leave = () => settle(), focus = event => {
      const index = links.indexOf(event.target);
      if (index >= 0 && event.target.matches(":focus-visible") && !blocked.current) { pointer = centers[index];update(true); }
    };
    const blur = event => { if (!host.contains(event.relatedTarget)) settle(); };
    const down = event => { if (!blocked.current && event.pointerType !== "touch") { pressed = event.target.closest?.(".ui-dock-brand,.ui-dock-link");update(true); } };
    const up = () => { if (pressed) { pressed = null;update(true); } };
    const visibility = () => { if (document.hidden) settle(true); };
    const observer = new ResizeObserver(measure);observer.observe(host);observer.observe(nav);
    host.addEventListener("pointermove", move, { passive: true });host.addEventListener("pointerleave", leave);host.addEventListener("focusin", focus);host.addEventListener("focusout", blur);host.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up);window.addEventListener("pointercancel", up);window.addEventListener("resize", measure);window.addEventListener("blur", leave);nav.addEventListener("scroll", measure);document.addEventListener("visibilitychange", visibility);
    import("quick-liquid").then(({ SpringVector }) => {
      if (disposed) return;
      const config = { stiffness: 900, damping: 60, mass: 1, restThreshold: .002, restDisplacementThreshold: .002 };
      springs = links.map(() => new SpringVector([1, 0], config));shell = new SpringVector([0, 0], config);measure();
      driver.current = { settle };host.dataset.motionReady = "magnetic";
    }).catch(() => { clear();host.dataset.motionReady = "fallback"; });
    return () => {
      disposed = true;observer.disconnect();clear();driver.current = null;
      host.removeEventListener("pointermove", move);host.removeEventListener("pointerleave", leave);host.removeEventListener("focusin", focus);host.removeEventListener("focusout", blur);host.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);window.removeEventListener("pointercancel", up);window.removeEventListener("resize", measure);window.removeEventListener("blur", leave);nav.removeEventListener("scroll", measure);document.removeEventListener("visibilitychange", visibility);
    };
  }, [root, reducedMotion]);
  useEffect(() => { if (paused || collapsed) driver.current?.settle(collapsed); }, [paused, collapsed]);
}
