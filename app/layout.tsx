import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./portfolio.css";
import ServiceWorker from "./components/ServiceWorker";
import { themeBootScript } from "./theme";

export const metadata: Metadata = {
  title: "IASROM-DEV",
  description: "IASROM-DEV digital solutions",
  applicationName: "IASROM-DEV",
  // iOS: เปิดจากหน้าโฮมแบบเต็มจอเหมือนแอป
  appleWebApp: { capable: true, title: "IASROM-DEV", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

// viewport-fit=cover เพื่อใช้พื้นที่รอบรอยบาก / แถบโฮมของ iPhone (จัดระยะด้วย env(safe-area-inset-*))
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f6f5" },
    { media: "(prefers-color-scheme: dark)", color: "#111a17" },
  ],
};

// Runs before paint so the saved theme (and first-visit intro) apply without a flash.
const themeScript = themeBootScript
  // Intro โลโก้: แสดงเฉพาะครั้งแรกที่เข้าเว็บ และไม่แสดงถ้าผู้ใช้ตั้งค่าลดการเคลื่อนไหว
  // ภาษา: ถ้าเคยเลือก EN ไว้ ซ่อนเนื้อหาไว้ชั่วครู่จน React เปลี่ยนเป็นภาษาอังกฤษ (กันภาษาไทยวาบ)
  + `try{if(localStorage.getItem("lang")==="en"){document.documentElement.lang="en";document.documentElement.classList.add("lang-pending")}}catch(e){}`
  + `try{if(!localStorage.getItem("intro-seen")&&!matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.classList.add("show-intro")}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th" suppressHydrationWarning>
    <head>
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
    </head>
    <body>{children}<ServiceWorker /></body>
  </html>;
}
