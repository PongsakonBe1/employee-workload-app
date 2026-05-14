import { getRequestConfig } from "next-intl/server";
import { defaultLocale } from "./config.js";

export default getRequestConfig(async () => {
  // Always use defaultLocale (th) - static export compatible
  return {
    locale: defaultLocale,
    messages: (await import(`../messages/${defaultLocale}.json`)).default,
  };
});
