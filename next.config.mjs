import createNextIntlPlugin from "next-intl/plugin";

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Run middleware on the Node.js runtime so the InsForge SSR helper (which uses
  // crypto APIs unavailable in the Edge runtime) can refresh sessions there.
  experimental: {
    nodeMiddleware: true,
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
