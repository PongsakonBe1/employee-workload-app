import { describe, expect, it } from "vitest";
import { dockMotionTargets } from "./dockMotion";
describe("Dock magnification geometry", () => {
  const centers = [100, 164, 228, 292, 356];
  it("magnifies the pointed icon and fans its neighbors symmetrically", () => {
    const targets = dockMotionTargets(centers, 228);
    expect(targets[2].scale).toBeCloseTo(1.48);
    expect(targets[1].scale).toBeGreaterThan(targets[0].scale);
    expect(targets[0].shift).toBeCloseTo(-targets[4].shift);
    expect(targets[2].shift).toBeCloseTo(0);
  });
  it("preserves a gap between adjacent magnified icon bounds", () => {
    for (const pointer of [80, 100, 195, 228, 370]) {
      const targets = dockMotionTargets(centers, pointer);
      for (let i = 1; i < centers.length; i++) {
        const gap = centers[i] + targets[i].shift - centers[i-1] - targets[i-1].shift - 46 * (targets[i].scale + targets[i-1].scale) / 2;
        expect(gap).toBeCloseTo(18);
      }
    }
  });
  it("limits spread to the available viewport margin", () => {
    const targets = dockMotionTargets(centers, 100, 46, 8);
    expect(targets.every(target => Math.abs(target.shift) <= 8 && target.scale >= 1 && target.scale <= 1.48)).toBe(true);
    expect(targets[0].scale).toBeLessThan(1.48);
  });
  it("returns rest geometry when the pointer leaves or motion is limited", () => {
    for (const pointer of [null, NaN, 900]) expect(dockMotionTargets(centers, pointer)).toEqual(centers.map(() => ({ scale: 1, shift: 0 })));
    expect(dockMotionTargets(centers, 228, 46, 0)).toEqual(centers.map(() => ({ scale: 1, shift: 0 })));
  });
  it("is deterministic without mutating measured layout centers", () => {
    const frozen = Object.freeze([...centers]);
    expect(dockMotionTargets(frozen, 195)).toEqual(dockMotionTargets(frozen, 195));
    expect(frozen).toEqual(centers);
  });
  it("tapers continuously to rest at the influence boundary", () => {
    expect(dockMotionTargets([100], 279.9)[0].scale - 1).toBeLessThan(.00001);
    expect(dockMotionTargets([100], 280)[0]).toEqual({ scale: 1, shift: 0 });
  });
});
