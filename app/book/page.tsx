import type { Metadata } from "next";
import { SERVICES } from "../lib/bookings";
import { readLink } from "../lib/ids";
import BookForm from "./BookForm";
import "../pro.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "จองคิว · IASROM-DEV", description: "จองคิวปรึกษาโปรเจกต์ ส่งซ่อมคอม หรือนัดสำรวจหน้างาน CCTV ออนไลน์" };

export default async function BookPage({ searchParams }: { searchParams: Promise<{ u?: string }> }) {
  const { u } = await searchParams;
  const link = readLink(u);
  return <main className="pro-page">
    <section className="pro-card bk">
      <a href="/" className="pro-back">← IASROM-DEV</a>
      <h1>📅 จองคิวออนไลน์</h1>
      <p className="pro-sub">เลือกบริการและเวลาที่สะดวก ทีมจะยืนยันกลับ{link?.u ? "ในไลน์ของคุณ" : "ทางโทรศัพท์"} และเตือนก่อนนัด 1 วัน</p>
      {link?.u && <p className="pro-chip ok">✓ เชื่อมกับไลน์ของคุณแล้ว</p>}
      <BookForm services={SERVICES.map((s) => ({ id: s.id, name: s.name, icon: s.icon }))} u={link?.u ? u! : ""} defaultName={link?.name ?? ""} />
    </section>
  </main>;
}
