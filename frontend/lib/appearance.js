export const APPEARANCE_KEY = "labboy.appearance.v1";
export const DEFAULT_APPEARANCE = Object.freeze({ theme: "system", background: "classic", material: "regular", motion: "system", navigation: "auto" });

// Accept only display preferences; stored JSON never controls authorization or routes.
export function normalizeAppearance(value) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    theme: ["system", "light", "dark"].includes(input.theme) ? input.theme : "system",
    background: ["classic", "ambient", "plain"].includes(input.background) ? input.background : "classic",
    material: ["regular", "solid"].includes(input.material) ? input.material : "regular",
    motion: ["system", "reduce"].includes(input.motion) ? input.motion : "system",
    navigation: ["auto", "sidebar", "dock"].includes(input.navigation) ? input.navigation : "auto",
  };
}

export function parseAppearance(raw) {
  try { return normalizeAppearance(JSON.parse(raw)); } catch { return { ...DEFAULT_APPEARANCE }; }
}

export function resolveAppearance(value, system = {}) {
  const preferences = normalizeAppearance(value);
  return {
    ...preferences,
    resolvedTheme: preferences.theme === "system" ? (system.dark ? "dark" : "light") : preferences.theme,
    reducedMotion: preferences.motion === "reduce" || Boolean(system.reducedMotion),
    solid: preferences.material === "solid" || Boolean(system.reducedTransparency) || Boolean(system.increasedContrast),
  };
}

// Run before hydration to apply stored/system appearance without a light-theme flash.
export const appearanceBootstrap = `(()=>{try{const p=JSON.parse(localStorage.getItem('${APPEARANCE_KEY}')||'{}')||{},r=document.documentElement;const t=['light','dark'].includes(p.theme)?p.theme:matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';r.dataset.uiTheme=t;r.dataset.uiBackground=['classic','ambient','plain'].includes(p.background)?p.background:'classic';r.dataset.uiMaterial=p.material==='solid'||matchMedia('(prefers-reduced-transparency:reduce)').matches||matchMedia('(prefers-contrast:more)').matches?'solid':'regular';r.dataset.uiMotion=p.motion==='reduce'||matchMedia('(prefers-reduced-motion:reduce)').matches?'reduce':'system';r.style.colorScheme=t}catch{const r=document.documentElement;r.dataset.uiTheme=matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';r.dataset.uiBackground='classic'}})()`;
