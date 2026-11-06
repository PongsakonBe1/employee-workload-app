import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export for Firebase Hosting
  output: "export",
  distDir: "out",
  images: {
    unoptimized: true,
  },
};

export default withNextIntl(nextConfig);
