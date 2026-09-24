import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatSatang } from "../../lib/payments";
import { getQuote, quoteDeposit, quoteExpired, quoteTotal } from "../../lib/quotes";
import QuoteActions from "./QuoteActions";
import "../../pro.css";

export const dynamic = "force-dynamic";
export const preferredRegion = ["sin1"];
export const metadata: Metadata = { title: "ใบเสนอราคา · IASROM-DEV", robots: { index: false, follow: false } };

const d = (t: number) => new Date(t).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" });

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = await getQuote(id);
  if (!q || q.status === "draft") notFound();
  const total = quoteTotal(q), deposit = quoteDeposit(q);
  const issued = q.sentAt ?? q.createdAt;
  const expired = quoteExpired(q);

  return <main className="pro-page">
    <article className="pro-doc">
      <header className="doc-head">
        <div className="doc-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="" width={46} height={46} />
          <div><b>IASROM-DEV</b><small>เว็บไซต์ · ระบบ · แอป · บริการไอที</small></div>
        </div>
        <div className="doc-title"><h1>ใบเสนอราคา</h1><span>QUOTATION</span></div>
      </header>

      <section className="doc-meta">
        <div><small>เสนอให้</small><b>คุณ{/^[A-Za-z]/.test(q.name) ? " " : ""}{q.name}</b></div>
        <div><small>เลขที่</small><b>{q.no}</b></div>
        <div><small>วันที่</small><b>{d(issued)}</b></div>
        <div><small>ยืนราคาถึง</small><b>{d(issued + q.validDays * 86_400_000)}</b></div>
      </section>

      <h2 className="doc-project">{q.title}</h2>

      <table className="doc-table">
        <thead><tr><th>#</th><th>รายการ</th><th>จำนวน</th><th>ราคา/หน่วย</th><th>รวม</th></tr></thead>
        <tbody>
          {q.lines.map((l, i) => <tr key={i}>
            <td>{i + 1}</td>
            <td><b>{l.name}</b>{l.detail && <small>{l.detail}</small>}</td>
            <td>{l.qty}</td>
            <td>฿{formatSatang(l.price)}</td>
            <td>฿{formatSatang(l.price * l.qty)}</td>
          </tr>)}
        </tbody>
      </table>

      <section className="doc-sum">
        <div><span>ยอดรวมทั้งสิ้น</span><b>฿{formatSatang(total)}</b></div>
        {q.depositPercent > 0 && <div className="dep"><span>มัดจำ {q.depositPercent}% (ชำระก่อนเริ่มงาน)</span><b>฿{formatSatang(deposit)}</b></div>}
        <div className="dep"><span>ระยะเวลาดำเนินงานโดยประมาณ</span><b>{q.days} วัน</b></div>
      </section>

      {q.scope.length > 0 && <section className="doc-list"><h3>ขอบเขตงาน</h3><ul>{q.scope.map((s, i) => <li key={i}>{s}</li>)}</ul></section>}
      {q.terms.length > 0 && <section className="doc-list"><h3>เงื่อนไข</h3><ol>{q.terms.map((s, i) => <li key={i}>{s}</li>)}</ol></section>}

      <QuoteActions id={q.id} status={q.status} expired={expired} hasDeposit={deposit >= 2_000} />

      <footer className="doc-foot">
        <span>ผู้เสนอราคา: {q.createdBy} · IASROM-DEV</span>
        <span>iasrom-dev.vercel.app · LINE @891dpcst</span>
      </footer>
    </article>
  </main>;
}
