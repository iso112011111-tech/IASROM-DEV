"use client";

import { useEffect, useState } from "react";
import { useLang } from "../i18n";

type Data = {
  reviews: { count: number; average: number; items: { name: string; rating: number; text: string; topic: string; at: number }[] };
  stats: { delivered: number; active: number; customers: number };
};

// แสดงเฉพาะเมื่อมีข้อมูลจริงพอ (ไม่โชว์ตัวเลขน้อยๆ ที่ทำให้ร้านดูเงียบ)
export default function ReviewsSection() {
  const { t } = useLang();
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => { fetch("/api/public").then((r) => r.json()).then(setData).catch(() => {}); }, []);
  if (!data) return null;
  const { reviews, stats } = data;
  const chips = [
    reviews.count >= 3 && { v: `★ ${reviews.average.toFixed(1)}`, l: t(`จาก ${reviews.count} รีวิวจริง`, `from ${reviews.count} real reviews`) },
    stats.delivered >= 5 && { v: `${stats.delivered}+`, l: t("งานส่งมอบแล้ว", "jobs delivered") },
    stats.customers >= 20 && { v: `${stats.customers}+`, l: t("ลูกค้าที่ดูแลผ่านไลน์", "clients served on LINE") },
    stats.active >= 2 && { v: String(stats.active), l: t("งานที่กำลังทำอยู่ตอนนี้", "jobs in progress now") },
  ].filter(Boolean) as { v: string; l: string }[];
  if (!reviews.items.length && !chips.length) return null;

  return <section className="pf-section rvw-section" id="reviews">
    <header className="pf-head" data-reveal>
      <p className="pf-kicker">★ REAL REVIEWS</p>
      <h2>{t("เสียงจาก", "What our")}<em>{t("ลูกค้าจริง", " clients say")}</em></h2>
      <p>{t("ทุกรีวิวมาจากลิงก์ที่ระบบส่งให้หลังจบงานเท่านั้น — ไม่มีรีวิวปลอม", "Every review comes from a link our system sends after a completed job — no fake reviews.")}</p>
    </header>
    {chips.length > 0 && <div className="rvw-stats" data-reveal>{chips.map((c) => <div key={c.l}><b>{c.v}</b><span>{c.l}</span></div>)}</div>}
    {reviews.items.length > 0 && <div className="rvw-grid">
      {reviews.items.map((r, i) => <figure key={i} className="rvw-card" data-reveal style={{ "--d": i % 3 } as React.CSSProperties}>
        <div className="rvw-stars" aria-label={`${r.rating} ดาว`}>{"★".repeat(r.rating)}<span>{"★".repeat(5 - r.rating)}</span></div>
        {r.text && <blockquote>“{r.text}”</blockquote>}
        <figcaption><b>{r.name}</b><span className="rvw-verified">✓ {t("ลูกค้าจริง", "Verified client")}</span>{r.topic && <small>{r.topic}</small>}</figcaption>
      </figure>)}
    </div>}
  </section>;
}
