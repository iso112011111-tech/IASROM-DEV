"use client";

import { useEffect } from "react";

// ใส่ data-reveal ให้ element ไหนก็ได้ แล้วมันจะค่อย ๆ ลอยขึ้นมาตอนเลื่อนถึง (ครั้งเดียว)
// ใช้ style={{ "--d": i }} เพื่อหน่วงเวลาทีละใบ (stagger)
// ถ้า JS ไม่ทำงาน หรือผู้ใช้ตั้งค่าลดการเคลื่อนไหว เนื้อหาจะแสดงตามปกติทันที
export default function ScrollReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    root.classList.add("reveal-ready");

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        // เปิดทั้งตัวที่เข้าจอ และตัวที่อยู่เหนือจอไปแล้ว (เช่น รีโหลดหน้ากลางเพจ)
        if (e.isIntersecting || e.boundingClientRect.top < 0) {
          e.target.classList.add("is-revealed");
          io.unobserve(e.target);
        }
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    const scan = () => document.querySelectorAll("[data-reveal]:not(.is-revealed)").forEach((el) => io.observe(el));
    scan();
    // การ์ดที่เพิ่มเข้ามาทีหลัง (กรองผลงาน / ดูทั้งหมด)
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => { io.disconnect(); mo.disconnect(); root.classList.remove("reveal-ready"); };
  }, []);

  return null;
}
