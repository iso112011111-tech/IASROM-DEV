// IASROM-DEV service worker — เปลี่ยน VERSION ทุกครั้งที่อยากล้างแคชเก่า
const VERSION = "v2";
const CACHE = `iasrom-${VERSION}`;
const PRECACHE = ["/", "/logo-mark.png", "/logo-mark-white.png", "/icons/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;

  // หน้าเว็บ: ดึงของใหม่ก่อน ถ้าออฟไลน์ใช้ของในแคช
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request)
        .then((res) => {
          // เก็บเฉพาะหน้าแรกที่โหลดสำเร็จ — ไม่เก็บหน้า error / redirect
          if (res.ok && res.type === "basic" && url.pathname === "/") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put("/", copy));
          }
          return res;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  // ไฟล์ static (JS/CSS/รูป): ใช้แคชก่อน แล้วอัปเดตเบื้องหลัง
  if (url.pathname.startsWith("/_next/static/") || /\.(png|jpg|jpeg|svg|webp|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(request).then((hit) => {
        const net = fetch(request).then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); }
          return res;
        }).catch(() => hit);
        return hit || net;
      }),
    );
  }
});
