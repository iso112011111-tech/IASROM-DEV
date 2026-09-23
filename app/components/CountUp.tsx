"use client";

import { useEffect, useRef, useState } from "react";

// ตัวเลขนับขึ้นจาก 0 เมื่อเลื่อนมาเห็น (ครั้งเดียว) — ฝั่งเซิร์ฟเวอร์ render ค่าจริงไว้ก่อน
export default function CountUp({ value, suffix = "", duration = 1200 }: { value: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || done.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setShown(0);
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      done.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        setShown(Math.round(value * (1 - Math.pow(1 - t, 3)))); // ease-out
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); if (!done.current) setShown(value); };
  }, [value, duration]);

  return <span ref={ref} className="count-up">{shown}{suffix}</span>;
}
