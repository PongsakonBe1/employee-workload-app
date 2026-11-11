import createNextIntlPlugin from "next-intl/plugin";
import path from "node:path";
import { fileURLToPath } from "node:url";

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  // Static export for Firebase Hosting
  output: "export",
  distDir: process.env.UI_BUILD_CHECK === "1" ? ".ui-build-check" : process.env.NODE_ENV === "development" ? process.env.CALENDAR_STAGING_ENTRY_RUNTIME === "1" ? ".next-staging-entry" : ".next-dev" : "out",
  images: {
    unoptimized: true,
  },
};

export default withNextIntl(nextConfig);
