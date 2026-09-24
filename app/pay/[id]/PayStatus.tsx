"use client";

import { useEffect, useState } from "react";

type Status = "pending" | "paid" | "failed" | "expired" | "canceled";

export default function PayStatus({ id, initial, expiresAt, qr, amount }: { id: string; initial: Status; expiresAt: number; qr: string | null; amount: string }) {
  const [status, setStatus] = useState<Status>(initial);
  const [left, setLeft] = useState(() => Math.max(0, expiresAt - Date.now()));

  useEffect(() => {
    if (status !== "pending") return;
    const tick = setInterval(() => setLeft(Math.max(0, expiresAt - Date.now())), 1000);
    const poll = setInterval(async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/pay/${id}`, { cache: "no-store" });
        if (res.ok) setStatus((await res.json()).status);
      } catch { /* ลองใหม่รอบถัดไป */ }
    }, 5000);
    return () => { clearInterval(tick); clearInterval(poll); };
  }, [id, status, expiresAt]);

  // บันทึก QR เป็น PNG (แปลงจาก SVG ในเครื่อง) เพื่อเปิดในแอปธนาคาร
  const save = async () => {
    if (!qr) return;
    const img = new Image();
    img.src = qr;
    await img.decode();
    // รูปของ Omise เป็นการ์ด Thai QR แนวตั้ง — ขยาย 1.5 เท่าตามสัดส่วนเดิมให้แอปธนาคารอ่านง่าย
    const w = Math.round((img.naturalWidth || 740) * 1.5), h = Math.round((img.naturalHeight || 1050) * 1.5);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `IASROM-PromptPay-${amount.replace(/,/g, "")}.png`;
    a.click();
  };

  if (status === "paid") return <div className="pay-state ok"><b>✅ ชำระเงินสำเร็จ</b><span>ขอบคุณครับ ใบเสร็จส่งเข้าไลน์ให้แล้ว</span></div>;
  if (status === "expired" || (status === "pending" && left === 0)) return <div className="pay-state">⏰ QR หมดอายุแล้ว ทักทีมในไลน์เพื่อขอบิลใหม่</div>;
  if (status === "canceled") return <div className="pay-state">บิลนี้ถูกยกเลิกแล้ว</div>;
  if (status === "failed") return <div className="pay-state bad">การชำระไม่สำเร็จ ทักทีมในไลน์ได้เลยครับ</div>;

  const mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
  return <>
    <div className="pay-qr">
      {qr ? <img src={qr} alt={`QR PromptPay ยอด ${amount} บาท`} /> : <p>โหลด QR ไม่สำเร็จ ลองรีเฟรชหน้านี้</p>}
    </div>
    <p className="pay-timer">QR ใช้ได้อีก <b>{mm}:{String(ss).padStart(2, "0")}</b> นาที · <span className="pay-live">กำลังรอการชำระ…</span></p>
    {qr && <button type="button" className="pay-save" onClick={save}>⬇ บันทึกรูป QR ไปสแกนในแอปธนาคาร</button>}
  </>;
}
