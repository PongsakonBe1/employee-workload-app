"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const ButtonMaterialContext = createContext({ engine: "quick", library: null, phase: "baseline", requestPreview: () => {} });
let candidateModule;

export function ButtonMaterialProvider({ children }) {
  const [engine, setEngine] = useState("quick");
  const [previewRequested, setPreviewRequested] = useState(false);
  const [library, setLibrary] = useState(null), [phase, setPhase] = useState("baseline");
  const requestPreview = useCallback(() => setPreviewRequested(true), []);
  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || (!previewRequested && engine !== "zak")) return;
    let disposed = false;
    setPhase("loading");
    candidateModule ||= import("@zakisheriff/liquid-glass");
    candidateModule.then(module => {
      if (!module.usePress || !module.useRefraction) throw Error("Unsupported glass API");
      if (!disposed) { setLibrary(module); setPhase("ready"); }
    }).catch(() => { if (!disposed) setPhase("fallback"); });
    return () => { disposed = true; };
  }, [previewRequested, engine]);
  return <ButtonMaterialContext.Provider value={{ engine, library, phase, requestPreview, setEngine: value => setEngine(value === "zak" ? "zak" : "quick") }}>{children}</ButtonMaterialContext.Provider>;
}

export const useButtonMaterial = () => useContext(ButtonMaterialContext);
