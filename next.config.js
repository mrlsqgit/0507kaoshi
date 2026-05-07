/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pg'],
  },
  reactStrictMode: true,
  swcMinify: true,
};

module.exports = nextConfig;