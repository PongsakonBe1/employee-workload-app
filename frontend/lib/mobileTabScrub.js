const holdMs = 180;
const movementPx = 9;

function containsPoint(box, { clientX, clientY }) {
  return clientX >= box.left && clientX <= box.right && clientY >= box.top && clientY <= box.bottom;
}

// Touch already has implicit capture on the starting link. Keep native taps and vertical scroll.
export function attachMobileTabScrub(host, { canStart, onMove, onEnd }) {
  let gesture;
  let suppressClickUntil = 0;

  function start(event) {
    if (event.pointerType !== "touch" || !event.isPrimary || event.button !== 0) return;
    suppressClickUntil = 0;
    if (!canStart(event.target)) return;
    gesture = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, started: performance.now(), phase: "waiting" };
  }

  function move(event) {
    if (gesture?.pointerId !== event.pointerId || gesture.phase === "canceled") return;
    if (gesture.phase === "waiting") {
      const dx = Math.abs(event.clientX - gesture.x), dy = Math.abs(event.clientY - gesture.y);
      const vertical = dy >= movementPx && dy >= dx;
      const early = dx >= movementPx && performance.now() - gesture.started < holdMs;
      if (vertical || early) {
        gesture.phase = "canceled";
        return;
      }
      if (dx < movementPx || dy >= dx) return;
      gesture.phase = "dragging";
    }
    if (!containsPoint(host.getBoundingClientRect(), event)) {
      gesture.phase = "canceled";
      onEnd(null);
      return;
    }
    onMove(event.clientX, tabUnderPointer(event));
  }

  function tabUnderPointer(event) {
    return [...host.querySelectorAll(":scope > a")].find(tab => containsPoint(tab.getBoundingClientRect(), event)) ?? null;
  }

  function finish(event, commit) {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const phase = gesture.phase;
    gesture = undefined;
    if (phase === "waiting") return;
    // Only suppress the synthetic tap following this gesture. A fresh touch resets it.
    suppressClickUntil = performance.now() + 700;
    if (phase === "dragging") onEnd(commit ? tabUnderPointer(event) : null);
  }

  const release = event => finish(event, true);
  const cancel = event => finish(event, false);
  const suppressClick = event => {
    if (event.isTrusted && event.detail > 0 && (event.pointerType === "touch" || !event.pointerType) && performance.now() < suppressClickUntil) {
      event.preventDefault();
    }
  };
  host.addEventListener("pointerdown", start, { passive: true });
  host.addEventListener("pointermove", move, { passive: true });
  host.addEventListener("pointerup", release);
  host.addEventListener("pointercancel", cancel);
  host.addEventListener("click", suppressClick, true);
  return () => {
    host.removeEventListener("pointerdown", start);
    host.removeEventListener("pointermove", move);
    host.removeEventListener("pointerup", release);
    host.removeEventListener("pointercancel", cancel);
    host.removeEventListener("click", suppressClick, true);
  };
}
