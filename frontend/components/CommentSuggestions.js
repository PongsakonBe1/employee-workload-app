'use client';

import { useTranslations } from 'next-intl';
import { getCommentSuggestions } from '../lib/commentSuggestions';

export function CommentSuggestions({ minorTask, selected, onSelect }) {
  const t = useTranslations('worklog');
  const suggestions = getCommentSuggestions(minorTask);

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="mt-2">
      <p className="text-xs font-medium text-slate-500 mb-2">{t('commentSuggestions.title')}</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
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
