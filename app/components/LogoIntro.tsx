"use client";

import { useEffect, useState } from "react";

const DURATION = 1900;

// Intro ตอนเปิดเว็บครั้งแรก: สัญลักษณ์ AD ค่อย ๆ ปรากฏ วงโคจรวาดล้อมรอบ แล้วเฟดเข้าหน้าเว็บ
// การแสดงผลถูกเปิดด้วย class "show-intro" ที่ <html> (ตั้งใน layout ก่อน paint)
export default function LogoIntro() {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains("show-intro")) return;
    const finish = () => {
      root.classList.remove("show-intro");
      try { localStorage.setItem("intro-seen", "1"); } catch {}
    };
    const t1 = window.setTimeout(() => setLeaving(true), DURATION - 400);
    const t2 = window.setTimeout(finish, DURATION);
    const skip = () => { window.clearTimeout(t1); window.clearTimeout(t2); finish(); };
    window.addEventListener("keydown", skip, { once: true });
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); window.removeEventListener("keydown", skip); };
  }, []);

  return <div
    className={leaving ? "logo-intro is-leaving" : "logo-intro"}
    aria-hidden="true"
    onClick={() => { document.documentElement.classList.remove("show-intro"); try { localStorage.setItem("intro-seen", "1"); } catch {} }}
  >
    <div className="li-stage">
      <svg className="li-orbit" viewBox="0 0 300 300">
        <ellipse cx="150" cy="150" rx="138" ry="52" transform="rotate(-18 150 150)" pathLength="1" />
        <circle className="li-dot" r="5" />
      </svg>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="li-mark" src="/logo-mark.png" alt="" width={180} height={180} />
    </div>
    <p className="li-word">IASROM<span>-DEV</span></p>
  </div>;
}
