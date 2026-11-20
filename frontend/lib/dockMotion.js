// Stable layout centers keep magnification from feeding back into pointer geometry.
export function dockMotionTargets(centers, pointerY, tileSize = 46, maxSpread = 36) {
  const sizes = Array.isArray(tileSize) ? centers.map((_, index) => tileSize[index]) : centers.map(() => tileSize);
  if (!Number.isFinite(pointerY) || sizes.some(size => !Number.isFinite(size) || size <= 0) || !Number.isFinite(maxSpread) || maxSpread <= 0) return centers.map(() => ({ scale: 1, shift: 0 }));
  const extras = centers.map((center, index) => {
    if (!Number.isFinite(center)) return 0;
    const distance = Math.abs(center - pointerY);
    const edge = Math.max(0, Math.min(1, (180 - distance) / 40));
    return .48 * sizes[index] * Math.exp(-.5 * (distance / 70) ** 2) * edge * edge * (3 - 2 * edge);
  });
  const total = extras.reduce((sum, extra) => sum + extra, 0);
  const factor = total ? Math.min(1, maxSpread * 2 / total) : 1;
  let before = 0;
  return extras.map((extra, index) => {
    const growth = extra * factor;
    const target = { scale: 1 + growth / sizes[index], shift: before + growth / 2 - total * factor / 2 };
    before += growth;
    return target;
  });
}
