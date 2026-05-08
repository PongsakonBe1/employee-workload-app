import { getRequestConfig } from "next-intl/server";
import { locales, defaultLocale } from "./config.js";

export default getRequestConfig(async ({ requestLocale }) => {
  // requestLocale is already a resolved string, not a Promise in newer versions
  const locale = requestLocale ?? defaultLocale;
  const validLocale = locales.includes(locale) ? locale : defaultLocale;

  return {
    locale: validLocale,
    messages: (await import(`../messages/${validLocale}.json`)).default,
  };
});
