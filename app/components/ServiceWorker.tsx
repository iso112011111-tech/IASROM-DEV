"use client";

import { useEffect } from "react";

// ลงทะเบียน service worker (เฉพาะ production) — ให้ติดตั้งเป็นแอปได้ และเปิดหน้าเว็บได้แม้เน็ตหลุด
export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
