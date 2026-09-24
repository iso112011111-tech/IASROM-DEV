import type { Metadata } from "next";
import { readLink } from "../lib/ids";
import { getReview, reviewId } from "../lib/reviews";
import ReviewForm from "./ReviewForm";
import "../pro.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ให้คะแนน · IASROM-DEV", robots: { index: false, follow: false } };

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const link = readLink(t);
  const done = link?.ref ? Boolean(await getReview(reviewId(link.ref))) : false;
  return <main className="pro-page">
    <section className="pro-card rv">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="rv-logo" src="/logo-mark.png" alt="" width={54} height={54} />
      {!link ? <><h1>ลิงก์หมดอายุ</h1><p className="pro-sub">ลิงก์รีวิวนี้ใช้ไม่ได้แล้ว ขอบคุณที่อยากช่วยเรานะครับ 🙏</p></>
        : done ? <><h1>ขอบคุณมากครับ 🙏</h1><p className="pro-sub">งานนี้ได้รับรีวิวจากคุณแล้ว</p></>
          : <>
            <h1>งานของเราเป็นยังไงบ้าง?</h1>
            <p className="pro-sub">{link.topic}</p>
            <ReviewForm token={t!} defaultName={link.name ?? ""} />
          </>}
    </section>
  </main>;
}
