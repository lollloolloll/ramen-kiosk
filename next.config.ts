import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig = {
  /* config options here */
};

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
}) as (param: NextConfig) => NextConfig; // Explicitly cast the return type

export default pwaConfig(nextConfig as NextConfig); // Cast nextConfig to NextConfig
