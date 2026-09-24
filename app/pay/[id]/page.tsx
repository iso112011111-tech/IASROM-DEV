import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatSatang, getInvoice, needsCheck, qrDataUri, refreshInvoice } from "../../lib/payments";
import PayStatus from "./PayStatus";
import "../pay.css";

export const dynamic = "force-dynamic";
export const preferredRegion = ["sin1"];
export const metadata: Metadata = { title: "ชำระเงิน · IASROM-DEV", robots: { index: false, follow: false } };

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await getInvoice(id);
  if (!found) notFound();
  const inv = needsCheck(found) ? await refreshInvoice(found).catch(() => found) : found;
  const qr = inv.status === "pending" ? await qrDataUri(inv) : null;

  return <main className="pay-page">
    <section className="pay-card">
      <header className="pay-head">
        <span className="pay-brand">IASROM-DEV</span>
        <span className="pay-pp">PromptPay</span>
      </header>
      {inv.testMode && <p className="pay-test">โหมดทดสอบ — ยังไม่ตัดเงินจริง</p>}
      <p className="pay-desc">{inv.description}</p>
      <p className="pay-amount"><small>฿</small>{formatSatang(inv.amount)}</p>
      <PayStatus id={inv.id} initial={inv.status} expiresAt={inv.expiresAt} qr={qr} amount={formatSatang(inv.amount)} />
      <ul className="pay-safe">
        <li>🔒 ยอดถูกล็อกในระบบ สแกนแล้วยอดขึ้นเอง ไม่ต้องพิมพ์</li>
        <li>✅ ระบบยืนยันการชำระให้อัตโนมัติ ไม่ต้องส่งสลิป</li>
        <li>⚠️ ตรวจชื่อผู้รับในแอปธนาคารก่อนกดยืนยันทุกครั้ง</li>
      </ul>
      <p className="pay-ref">เลขที่บิล {inv.id.slice(0, 10).toUpperCase()}</p>
    </section>
  </main>;
}
