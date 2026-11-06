import { describe, it, expect } from "vitest";
import { isChromiumGlassBrowser, glassPolicy, glassConfiguration } from "./glassPolicy";

const usable = { development: true, mode: "quick", ready: true, backdrop: true };
describe("development glass experiment boundaries", () => {
  it("never activates in production, even with a requested quick mode", () => {
    expect(glassPolicy({ ...usable, development: false }).active).toBe(false);
    expect(glassPolicy({ ...usable, mode: "css" }).reason).toBe("baseline");
  });
  it("defers before hydration and keeps unsupported browsers on the baseline", () => {
    expect(glassPolicy({ ...usable, ready: false }).reason).toBe("initializing");
    expect(glassPolicy({ ...usable, backdrop: false }).active).toBe(false);
  });
  it("turns optics off for solid or forced colors, rather than merely reducing blur", () => {
    expect(glassPolicy({ ...usable, solid: true }).active).toBe(false);
    expect(glassPolicy({ ...usable, forcedColors: true }).active).toBe(false);
  });
  it("uses an explicit CSS fallback on Safari, Firefox and iOS Chromium brands", () => {
    for (const userAgent of ["Version/18 Safari/605.1", "Firefox/140", "iPhone CriOS/140", "iPhone EdgiOS/140"] ) expect(isChromiumGlassBrowser({ userAgent })).toBe(false);
    expect(isChromiumGlassBrowser({ brands: [{ brand: "Chromium" }], platform: "MacIntel", touchPoints: 5 })).toBe(false);
    expect(glassPolicy(usable).refractionMode).toBe("css");
  });
  it("allows the SVG experiment on desktop and Android Chromium without claiming pixel support", () => {
    expect(isChromiumGlassBrowser({ userAgent: "Windows Chrome/140 Edg/140" })).toBe(true);
    expect(isChromiumGlassBrowser({ userAgent: "Android Chrome/140" })).toBe(true);
    expect(glassPolicy({ ...usable, chromium: true }).refractionMode).toBe("svg");
  });
  it("uses lower map quality for coarse input and disables pointer lighting under reduced motion", () => {
    const policy = glassPolicy({ ...usable, coarse: true, reducedMotion: true });
    const config = glassConfiguration(policy, "dark", 25);
    expect(policy.quality).toBe("low");expect(config.cursorTracking).toBe(false);expect(config.hoverLighting).toBe(false);expect(config.parallax).toBe(false);
  });
  it("passes the app's resolved theme explicitly instead of following the OS again", () => {
    expect(glassConfiguration(glassPolicy(usable), "light", 24).appearance).toBe("light");
    expect(glassConfiguration(glassPolicy(usable), "dark", 24).appearance).toBe("dark");
  });
});
