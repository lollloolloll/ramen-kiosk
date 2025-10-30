import withPWA from "next-pwa";
import path from "path";

const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, "./"),
  // 필요한 옵션 (예: i18n 등) 여기에 추가 가능
};

// PWA 설정 래핑
export default withPWA({
  dest: "public", // service worker, manifest 위치
  register: true, // 자동 등록
  skipWaiting: true, // 새 SW가 즉시 활성화되도록
  disable: process.env.NODE_ENV === "development", // dev 모드에서는 비활성화
})(nextConfig);
