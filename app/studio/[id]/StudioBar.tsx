"use client";

import { useState } from "react";

export default function StudioBar({ url, lineUrl, children }: { url: string; lineUrl: string; children: React.ReactNode }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [copied, setCopied] = useState(false);
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "เว็บไซต์ที่ AI ออกแบบให้", url });
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    } catch { /* ผู้ใช้ปิดหน้าต่างแชร์ */ }
  };
  return <>
    <header className="sv-bar">
      <a href="/studio" className="sv-brand">✨ <b>AI Studio</b><small>by IASROM-DEV</small></a>
      <div className="sv-seg" role="group" aria-label="ขนาดหน้าจอ">
        <button className={device === "desktop" ? "on" : ""} onClick={() => setDevice("desktop")}>🖥 เดสก์ท็อป</button>
        <button className={device === "mobile" ? "on" : ""} onClick={() => setDevice("mobile")}>📱 มือถือ</button>
      </div>
      <div className="sv-actions">
        <button className="pro-btn ghost sm" onClick={share}>{copied ? "✓ คัดลอกลิงก์แล้ว" : "🔗 แชร์"}</button>
        <a className="pro-btn ghost sm" href="/studio">🎨 ออกแบบใหม่</a>
        <a className="pro-btn sm line" href={lineUrl} target="_blank" rel="noopener noreferrer">อยากได้แบบนี้ → ส่งให้ทีม</a>
      </div>
    </header>
    <div className={`sv-stage ${device}`}>
      <div className="sv-frame">
        <div className="sv-chrome"><i /><i /><i /><span>{device === "desktop" ? "www.your-brand.com" : "your-brand.com"}</span></div>
        <div className="sv-screen">{children}</div>
      </div>
    </div>
    <p className="sv-note">ตัวอย่างนี้ AI ออกแบบอัตโนมัติ — เว็บจริงทีม IASROM-DEV ออกแบบละเอียดกว่านี้ ใส่รูปจริง ระบบจอง/ชำระเงิน และหลังบ้านได้ครบ</p>
  </>;
}
