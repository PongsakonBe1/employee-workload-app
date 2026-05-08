'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { locales, localeLabels } from '../i18n/config';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const t = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  function onSelectChange(nextLocale) {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Globe size={16} className="text-slate-500" />
      <select
        value={locale}
        onChange={(e) => onSelectChange(e.target.value)}
        className="bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer"
        aria-label={t('language')}
      >
        {locales.map((loc) => (
          <option key={loc} value={loc}>
            {localeLabels[loc]}
          </option>
        ))}
      </select>
    </div>
  );
}
