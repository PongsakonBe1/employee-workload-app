'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { getCommentSuggestions, getCommentSuggestionsFromHistory } from '../lib/commentSuggestions';
import { useAuth } from './AuthProvider';

export function CommentSuggestions({ minorTask, selected, onSelect, userId }) {
  const t = useTranslations('worklog.commentSuggestions');
  const { user } = useAuth();
  const [historySuggestions, setHistorySuggestions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const resolvedUserId = userId || user?.uid;

  // Fetch history-based suggestions when minorTask changes
  useEffect(() => {
    if (!resolvedUserId || !minorTask) {
      setHistorySuggestions([]);
      return;
    }

    let cancelled = false;
    setLoadingHistory(true);

    getCommentSuggestionsFromHistory(resolvedUserId, minorTask, 5)
      .then((results) => {
        if (!cancelled) setHistorySuggestions(results);
      })
      .catch(() => {
        if (!cancelled) setHistorySuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });

    return () => { cancelled = true; };
  }, [resolvedUserId, minorTask]);

  // Static suggestions from commentSuggestionMap
  const staticSuggestions = getCommentSuggestions(minorTask);

  // Merge: history first, then static that aren't duplicates
  const historySet = new Set(historySuggestions);
  const filteredStatic = staticSuggestions.filter((s) => !historySet.has(s));

  const hasAnySuggestion = historySuggestions.length > 0 || filteredStatic.length > 0;

  if (!hasAnySuggestion && !loadingHistory) {
    return null;
  }

  return (
    <div className="mt-2">
      <p className="text-xs font-medium text-slate-500 mb-2">{t('title')}</p>

      {loadingHistory && historySuggestions.length === 0 && filteredStatic.length === 0 && (
        <p className="text-xs text-slate-400 animate-pulse">กำลังโหลดคำแนะนำ…</p>
      )}

      <div className="flex flex-wrap gap-2">
        {/* History suggestions first — with badge */}
        {historySuggestions.map((suggestion) => (
          <button
            key={`hist-${suggestion}`}
            type="button"
            onClick={() => onSelect(suggestion)}
            className={`
              px-3 py-1.5 text-sm rounded-full transition-all duration-200
              ${selected === suggestion
                ? 'bg-slate-950 text-white shadow-md'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
              }
            `}
          >
            {suggestion}
            <span className="ml-1 text-[10px] opacity-75">(บ่อย)</span>
          </button>
        ))}

        {/* Static suggestions — no badge */}
        {filteredStatic.map((suggestion) => (
          <button
            key={`static-${suggestion}`}
            type="button"
            onClick={() => onSelect(suggestion)}
            className={`
              px-3 py-1.5 text-sm rounded-full transition-all duration-200
              ${selected === suggestion
                ? 'bg-slate-950 text-white shadow-md'
                : 'bg-white/60 text-slate-700 hover:bg-white border border-slate-200'
              }
            `}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
