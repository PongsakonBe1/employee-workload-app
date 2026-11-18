"use client";

import { useEffect, useRef, useState } from "react";

const cachedScopes = 6;
const empty = { rows: [], cursor: null, pages: 0 };

// A cache belongs to one mounted account workspace. Loading a new page never discards earlier pages.
export function useAnalyticsPages(reader, range, employee, pageCount, retry = 0) {
  const cache = useRef({ reader, scopes: new Map() });
  const start = range?.start, end = range?.end;
  const scope = reader && start && end ? JSON.stringify([start, end, employee]) : null;
  const [state, setState] = useState(null);

  useEffect(() => {
    if (!scope) return;
    let current = true;
    if (cache.current.reader !== reader) cache.current = { reader, scopes: new Map() };
    const scopes = cache.current.scopes;
    const entry = scopes.get(scope) || { data: empty, pending: null };
    scopes.delete(scope);
    scopes.set(scope, entry);
    if (scopes.size > cachedScopes) scopes.delete(scopes.keys().next().value);
    const data = entry.data;
    if (data.pages && (!data.cursor || data.pages >= pageCount)) {
      setState({ reader, scope, data, loading: false, error: false });
      return;
    }
    setState({ reader, scope, data, loading: true, error: false });
    entry.pending ??= reader.page({ start, end }, employee, data.cursor).then(page => {
      entry.data = {
        rows: [...data.rows, ...page.rows],
        cursor: page.cursor,
        pages: data.pages + 1
      };
      return entry.data;
    }).finally(() => { entry.pending = null; });
    entry.pending.then(
      next => { if (current) setState({ reader, scope, data: next, loading: false, error: false }); },
      () => { if (current) setState({ reader, scope, data, loading: false, error: true }); }
    );
    return () => { current = false; };
  }, [reader, start, end, employee, scope, pageCount, retry]);

  if (!scope) return { ...empty, loading: false, error: false };
  if (state?.scope !== scope || state.reader !== reader) return { ...empty, loading: true, error: false };
  return { ...state.data, loading: state.loading, error: state.error };
}
