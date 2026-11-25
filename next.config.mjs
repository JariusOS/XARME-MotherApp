/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  experimental: { serverComponentsExternalPackages: ["@electric-sql/pglite"] },
  images: { unoptimized: true },
};
