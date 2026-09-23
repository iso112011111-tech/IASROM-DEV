import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy: อนุญาตให้โหลดได้เฉพาะไฟล์จากเว็บเราเอง + Google Fonts
// - script 'unsafe-inline' จำเป็นสำหรับสคริปต์ธีม/intro ที่รันก่อน paint และสคริปต์ที่ Next.js ฝังในหน้า
// - โหมด dev ต้องเปิด 'unsafe-eval' และ websocket สำหรับ hot reload
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "manifest-src 'self'",
  "worker-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },                       // กันเว็บอื่นเอาไปฝังใน iframe (clickjacking)
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }, // มีผลเมื่อเปิดผ่าน https
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false, // ไม่บอกคนนอกว่าใช้ Next.js
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // service worker ต้องไม่ถูกแคช ไม่งั้นผู้ใช้จะค้างเวอร์ชันเก่า
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
    ];
  },
};

export default nextConfig;
