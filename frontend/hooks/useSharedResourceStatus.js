"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../components/AuthProvider";
import { auth } from "../lib/firebase";

const statusEvents = ["roomStatusUpdated", "equipmentStatusUpdated", "worklogDeleted", "worklogUpdated"];
const api = process.env.NEXT_PUBLIC_API_URL;

async function fetchStatus(uid, signal) {
  const account = auth.currentUser;
  if (!api || account?.uid !== uid) throw Error("Resource status unavailable");
  const base = api.replace(/\/+$/, "").replace(/\/api$/, "");
  const endpoint = new URL(base + "/api/resource-status");
  const loopback = ["127.0.0.1", "localhost"].includes(endpoint.hostname);
  if (endpoint.protocol !== "https:" && !(endpoint.protocol === "http:" && loopback)) throw Error("Invalid resource service");
  const token = await account.getIdToken();
  if (signal.aborted || auth.currentUser?.uid !== uid) throw Error("Resource session changed");
  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
    signal, redirect: "error", cache: "no-store"
  });
  if (!response.ok || auth.currentUser?.uid !== uid) throw Error("Resource status unavailable");
  return response.json();
}

export function useSharedResourceStatus({ enabled = true, refreshEveryMs = 0 } = {}) {
  const { user, loading: authLoading } = useAuth();
  const uid = enabled && !authLoading ? user?.uid : null;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!uid) {
      setResult(null);
      return;
    }
    let controller;
    let refreshTimer;
    const load = () => {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      const timeout = setTimeout(() => {
        if (!request.signal.aborted) {
          request.abort();
          setResult({ uid, attempt, error: true });
        }
      }, 20_000);
      fetchStatus(uid, request.signal).then(
        status => {
          if (!request.signal.aborted) setResult({ uid, attempt, status, updatedAt: new Date() });
        },
        () => {
          if (!request.signal.aborted) setResult({ uid, attempt, error: true });
        }
      ).finally(() => clearTimeout(timeout));
    };
    const refreshSoon = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(load, 400);
    };
    for (const event of statusEvents) window.addEventListener(event, refreshSoon);
    load();
    const interval = refreshEveryMs ? setInterval(load, refreshEveryMs) : null;
    return () => {
      controller?.abort();
      clearTimeout(refreshTimer);
      clearInterval(interval);
      for (const event of statusEvents) window.removeEventListener(event, refreshSoon);
    };
  }, [uid, attempt, refreshEveryMs]);

  const current = uid && result?.uid === uid && result.attempt === attempt ? result : null;
  return {
    status: current?.status,
    updatedAt: current?.updatedAt,
    loading: enabled && !current && (authLoading || Boolean(uid)),
    error: enabled && (current?.error || !uid && !authLoading),
    retry: () => setAttempt(value => value + 1)
  };
}
