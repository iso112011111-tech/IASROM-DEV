"use client";

import { useState } from "react";

export default function QuoteActions({ id, status, expired, hasDeposit }: { id: string; status: string; expired: boolean; hasDeposit: boolean }) {
  const [state, setState] = useState(status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDecline, setConfirmDecline] = useState(false);

  const respond = async (action: "accept" | "decline") => {
    setBusy(true); setError("");
    const res = await fetch(`/api/q/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) setState(d.status); else setError(d.error ?? "ทำรายการไม่สำเร็จ");
  };

  return <section className="doc-actions">
    {state === "sent" && !expired && <>
      <p>พร้อมเริ่มงานเมื่อคุณกดตอบรับ{hasDeposit ? " — ระบบจะส่ง QR ชำระมัดจำเข้าไลน์ให้ทันที" : ""}</p>
      <div>
        <button className="pro-btn" disabled={busy} onClick={() => respond("accept")}>✅ ตอบรับใบเสนอราคา</button>
        {!confirmDecline
          ? <button className="pro-btn ghost" disabled={busy} onClick={() => setConfirmDecline(true)}>ยังไม่ตกลง</button>
          : <button className="pro-btn ghost danger" disabled={busy} onClick={() => respond("decline")}>ยืนยันปฏิเสธ</button>}
      </div>
    </>}
    {state === "sent" && expired && <p className="doc-state">ใบเสนอราคานี้หมดอายุแล้ว ทักทีมในไลน์เพื่อขอราคาใหม่ได้เลยครับ</p>}
    {state === "accepted" && <p className="doc-state ok">✅ ตอบรับแล้ว ขอบคุณที่ไว้ใจ IASROM-DEV{hasDeposit ? " — ดู QR ชำระมัดจำในไลน์ได้เลยครับ" : " ทีมจะติดต่อกลับเร็วๆ นี้"}</p>}
    {state === "declined" && <p className="doc-state">คุณปฏิเสธใบเสนอราคานี้แล้ว — อยากปรับขอบเขตหรืองบ ทักทีมในไลน์ได้ตลอดครับ</p>}
    {error && <p className="doc-state bad">{error}</p>}
    <button className="pro-btn ghost print" onClick={() => window.print()}>⬇ บันทึกเป็น PDF / พิมพ์</button>
  </section>;
}
