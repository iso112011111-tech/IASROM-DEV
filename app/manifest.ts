import type { MetadataRoute } from "next";

// ทำให้ติดตั้งเว็บเป็นแอปบนมือถือได้ (Add to Home Screen)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IASROM-DEV — เว็บไซต์ ระบบหลังบ้าน และไอที",
    short_name: "IASROM-DEV",
    description: "ทีมพัฒนาเว็บไซต์ แอปพลิเคชัน ระบบหลังบ้าน และบริการไอที",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#3f9d87",
    lang: "th",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
