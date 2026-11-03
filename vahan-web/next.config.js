/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: process.env.DOCKER_BUILD ? "standalone" : undefined,
  experimental: {
    serverComponentsExternalPackages: ["exceljs"],
  },
};

module.exports = nextConfig;
