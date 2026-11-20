import createNextIntlPlugin from "next-intl/plugin";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const withNextIntl = createNextIntlPlugin();

if (process.env.NODE_ENV === "production" && existsSync(new URL("./public/dev-staging-config.json", import.meta.url))) {
  throw new Error("Move the local staging Web SDK config out of frontend/public before building production");
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  // Static export for Firebase Hosting
  output: "export",
  distDir: process.env.UI_BUILD_CHECK === "1" ? ".ui-build-check" : process.env.NODE_ENV === "development" ? process.env.CALENDAR_TRUSTED_DENIAL_RUNTIME === "1" ? ".next-trusted-cutover" : process.env.CALENDAR_TRUSTED_EMULATOR_RUNTIME === "1" ? ".next-trusted-emulator" : process.env.CALENDAR_MUTATION_EMULATOR_RUNTIME === "1" ? ".next-mutation-emulator" : process.env.CALENDAR_STAGING_ENTRY_RUNTIME === "1" ? ".next-staging-entry" : ".next-dev" : "out",
  images: {
    unoptimized: true,
  },
};

export default withNextIntl(nextConfig);
