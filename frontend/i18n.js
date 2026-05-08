import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from './i18n/config.js';

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = requestLocale ?? defaultLocale;
  const validLocale = locales.includes(locale) ? locale : defaultLocale;

  return {
    locale: validLocale,
    messages: (await import(`./messages/${validLocale}.json`)).default
  };
});
