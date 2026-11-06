import { describe, it, expect } from "vitest";
import { normalizeAppearance, parseAppearance, resolveAppearance } from "./appearance";

describe("local display preferences", () => {
  it("rejects malformed and unrelated stored data without promoting role or URLs", () => {
    expect(parseAppearance("{broken")).toEqual(normalizeAppearance(null));
    expect(normalizeAppearance({ role: "superadmin", theme: "<script>", background: "url(secret)", motion: "forever" })).toEqual(normalizeAppearance(null));
    expect(normalizeAppearance([])).toEqual(normalizeAppearance(null));
  });
  it("keeps supported display choices independent", () => {
    expect(parseAppearance('{"theme":"dark","background":"plain","material":"solid","motion":"reduce"}')).toEqual({ theme: "dark", background: "plain", material: "solid", motion: "reduce" });
  });
  it("follows system theme without overriding an explicit theme", () => {
    expect(resolveAppearance({}, { dark: true }).resolvedTheme).toBe("dark");
    expect(resolveAppearance({ theme: "light" }, { dark: true }).resolvedTheme).toBe("light");
  });
  it("always honors system motion/contrast/transparency accessibility preferences", () => {
    expect(resolveAppearance({ motion: "system" }, { reducedMotion: true }).reducedMotion).toBe(true);
    for (const system of [{ reducedTransparency: true }, { increasedContrast: true }]) expect(resolveAppearance({ material: "regular" }, system).solid).toBe(true);
  });
});
