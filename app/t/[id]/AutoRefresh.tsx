"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** รีเฟรชข้อมูลจากเซิร์ฟเวอร์เป็นระยะ (เฉพาะตอนแท็บเปิดอยู่) */
export default function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!seconds) return;
    const id = setInterval(() => { if (!document.hidden) router.refresh(); }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
