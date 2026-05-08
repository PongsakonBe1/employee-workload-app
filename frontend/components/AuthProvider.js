"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch, clearToken, setToken } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let mounted = true;

    apiFetch("/auth/me")
      .then((data) => {
        if (mounted) setUser(data.user);
      })
      .catch(() => {
        clearToken();
        if (mounted) setUser(null);
      })
      .finally(() => {
        if (mounted) setBooting(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function login(username, password) {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });

    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    clearToken();
    setUser(null);
    window.location.href = "/login";
  }

  const value = useMemo(() => ({ user, booting, login, logout }), [user, booting]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
