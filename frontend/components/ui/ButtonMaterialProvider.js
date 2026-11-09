"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ButtonMaterialContext = createContext({ engine: "quick", library: null, phase: "baseline" });
let candidateModule;

export function ButtonMaterialProvider({ children }) {
  const [engine, setEngine] = useState(process.env.NODE_ENV === "development" ? "zak" : "quick");
  const [library, setLibrary] = useState(null), [phase, setPhase] = useState("loading");
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    let disposed = false;
    candidateModule ||= import("@zakisheriff/liquid-glass");
    candidateModule.then(module => {
      if (!module.usePress || !module.useRefraction) throw Error("Unsupported glass API");
      if (!disposed) { setLibrary(module); setPhase("ready"); }
    }).catch(() => { if (!disposed) setPhase("fallback"); });
    return () => { disposed = true; };
  }, []);
  return <ButtonMaterialContext.Provider value={{ engine, library, phase, setEngine: value => setEngine(value === "zak" ? "zak" : "quick") }}>{children}</ButtonMaterialContext.Provider>;
}

export const useButtonMaterial = () => useContext(ButtonMaterialContext);
