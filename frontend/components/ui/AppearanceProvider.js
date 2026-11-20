"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { APPEARANCE_KEY, DEFAULT_APPEARANCE, normalizeAppearance, parseAppearance, resolveAppearance } from "../../lib/appearance";

const AppearanceContext = createContext(null);

export function AppearanceProvider({ children }) {
  const [preferences, setPreferences] = useState(DEFAULT_APPEARANCE);
  const [ready, setReady] = useState(false);
  const [system, setSystem] = useState({});

  useEffect(() => {
    try { setPreferences(parseAppearance(localStorage.getItem(APPEARANCE_KEY))); } catch { setPreferences(DEFAULT_APPEARANCE); }
    setReady(true);
    const media = {
      dark: matchMedia("(prefers-color-scheme: dark)"),
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)"),
      reducedTransparency: matchMedia("(prefers-reduced-transparency: reduce)"),
      increasedContrast: matchMedia("(prefers-contrast: more)"),
    };
    const update = () => setSystem(Object.fromEntries(Object.entries(media).map(([key, query]) => [key, query.matches])));
    update();Object.values(media).forEach(query => query.addEventListener("change", update));
    const sync = event => { if (event.key === APPEARANCE_KEY || event.key === null) setPreferences(parseAppearance(event.newValue)); };
    window.addEventListener("storage", sync);
    return () => { Object.values(media).forEach(query => query.removeEventListener("change", update));window.removeEventListener("storage", sync); };
  }, []);

  const resolved = resolveAppearance(preferences, system);
  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    root.dataset.uiTheme = resolved.resolvedTheme;
    root.dataset.uiBackground = resolved.background;
    root.dataset.uiMaterial = resolved.solid ? "solid" : "regular";
    root.dataset.uiMotion = resolved.reducedMotion ? "reduce" : "system";
    root.style.colorScheme = resolved.resolvedTheme;
    root.dataset.uiReady = "true";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved.resolvedTheme === "dark" ? "#182127" : "#f8fafc");
  }, [ready, resolved.resolvedTheme, resolved.background, resolved.solid, resolved.reducedMotion]);

  function updatePreferences(patch) {
    setPreferences(current => {
      const next = normalizeAppearance({ ...current, ...patch });
      try { localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next)); } catch { /* Display changes still work when storage is unavailable. */ }
      return next;
    });
  }
  return <AppearanceContext.Provider value={{ preferences, resolved, ready, updatePreferences }}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const value = useContext(AppearanceContext);
  if (!value) throw new Error("useAppearance requires AppearanceProvider");
  return value;
}
