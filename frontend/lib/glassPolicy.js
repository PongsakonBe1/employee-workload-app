// Conservative experiment policy: a parseable filter is not proof of rendered refraction.
export function isChromiumGlassBrowser({ userAgent = "", brands = [], platform = "", touchPoints = 0 } = {}) {
  if (/iPhone|iPad|iPod|CriOS|EdgiOS|FxiOS/i.test(userAgent) || (platform === "MacIntel" && touchPoints > 1)) return false;
  return brands.some(brand => /Chromium|Google Chrome|Microsoft Edge/i.test(brand.brand || "")) || /(?:Chrome|Chromium|Edg)\//.test(userAgent);
}

export function glassPolicy({ mode = "css", development = false, ready = false, solid = false, reducedMotion = false, forcedColors = false, chromium = false, backdrop = false, coarse = false } = {}) {
  const reason = !development ? "production" : mode !== "quick" ? "baseline" : solid ? "solid" : forcedColors ? "forced-colors" : !ready ? "initializing" : !backdrop ? "unsupported" : null;
  return { active: reason === null, reason, refractionMode: chromium ? "svg" : "css", quality: coarse ? "low" : "medium", motion: !reducedMotion };
}

export function glassConfiguration(policy, theme, radius) {
  return {
    material: "thin", appearance: theme === "dark" ? "dark" : "light",
    refractionMode: policy.refractionMode, quality: policy.quality, borderRadius: radius,
    blur: 6, refractionStrength: policy.quality === "low" ? 10 : 16, bezelWidth: 20,
    tintOpacity: theme === "dark" ? .16 : .12,
    chromaticAberration: .12, specularStrength: .32, edgeHighlight: .9,
    cursorTracking: policy.motion, hoverLighting: policy.motion, dynamicLighting: false,
    parallax: false, respectPreferences: true,
  };
}
