import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { readSession, SESSION_COOKIE } from "../../../lib/adminAuth";
import { qrDataUri } from "../../../lib/ids";
import { getJob, jobUrl } from "../../../lib/jobs";
import PrintButton from "./PrintButton";
import "./sticker.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "สติกเกอร์ QR · IASROM-DEV", robots: { index: false, follow: false } };

// สติกเกอร์แปะเครื่องลูกค้า: สแกนแล้วเห็นสถานะงาน + ใบรับประกัน (เฉพาะทีมที่ล็อกอินพิมพ์ได้)
export default async function StickerPage({ params }: { params: Promise<{ id: string }> }) {
  if (!readSession((await cookies()).get(SESSION_COOKIE)?.value)) redirect("/admin");
  const j = await getJob((await params).id);
  if (!j) notFound();
  const qr = await qrDataUri(jobUrl(j));
  const label = <div className="stk">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={qr} alt="" />
    <div>
      <b>IASROM-DEV</b>
      <strong>{j.code}</strong>
      <span>{j.title}</span>
      <small>📱 สแกนดูสถานะงาน & ใบรับประกัน</small>
    </div>
  </div>;
  return <main className="stk-page">
    <div className="stk-tools"><PrintButton /><span>ขนาดสติกเกอร์ 60 × 30 มม. · ปริ้นท์แล้วตัดตามเส้น</span></div>
    <div className="stk-sheet">{label}{label}{label}{label}</div>
  </main>;
}
