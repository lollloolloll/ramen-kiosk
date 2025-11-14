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
    bodySizeLimit: "50mb", // 비디오 파일 업로드를 위해 증가
  },
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/uploads/:path*",
      },
    ];
  },
};

// PWA 설정 래핑
export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
})(nextConfig);
