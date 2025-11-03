import withPWA from "next-pwa";
import path from "path";

const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, "./"),
  output: "standalone" as const,
  images: {
    unoptimized: true,
  },
  serverActions: {
    bodySizeLimit: "100mb",
  },
};

// PWA 설정 래핑
export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
})(nextConfig);
