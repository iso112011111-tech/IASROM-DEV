"use client";

import { useEffect, useState } from "react";

const IDEAS = [
  { business: "ร้านกาแฟสเปเชียลตี้ มีขนมโฮมเมด", vibe: "อบอุ่น มินิมอล" },
  { business: "คลินิกทันตกรรม จัดฟัน ฟอกสีฟัน", vibe: "สะอาด น่าเชื่อถือ" },
  { business: "ร้านซ่อมรถยนต์และเปลี่ยนยาง", vibe: "แข็งแรง ดุดัน" },
  { business: "สตูดิโอโยคะและพิลาทิส", vibe: "สงบ ธรรมชาติ" },
  { business: "ร้านหมูกระทะบุฟเฟต์", vibe: "สนุก สีสันจัดจ้าน" },
];
const STEPS = ["กำลังวิเคราะห์ธุรกิจของคุณ…", "เลือกโทนสีและฟอนต์…", "เขียนพาดหัวที่ขายได้…", "จัดวางเลย์เอาต์…", "เก็บรายละเอียดสุดท้าย…"];

export default function StudioForm() {
  const [business, setBusiness] = useState("");
  const [name, setName] = useState("");
  const [vibe, setVibe] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!busy) return;
    setStep(0);
    const id = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 3000);
    return () => clearInterval(id);
  }, [busy]);

  const go = async () => {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/studio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ business, name, vibe }) });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.id) { window.location.href = `/studio/${d.id}`; return; }
      setError(d.error ?? "ออกแบบไม่สำเร็จ ลองใหม่อีกครั้งครับ");
    } catch { setError("เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้งครับ"); }
    setBusy(false);
  };

  if (busy) return <div className="studio-busy" role="status">
    <div className="studio-orb" aria-hidden="true"><span /><span /><span /></div>
    <b>{STEPS[step]}</b>
    <small>AI กำลังออกแบบให้ “{name || business}”</small>
  </div>;

  return <div className="studio-form">
    <label>ธุรกิจของคุณคืออะไร?
      <textarea rows={2} maxLength={200} value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="เช่น ร้านกาแฟสเปเชียลตี้ในเชียงใหม่ มีขนมโฮมเมด" />
    </label>
    <div className="studio-row">
      <label>ชื่อร้าน / แบรนด์<input maxLength={50} value={name} onChange={(e) => setName(e.target.value)} placeholder="ไม่ใส่ก็ได้ AI ตั้งให้" /></label>
      <label>สไตล์ที่ชอบ<input maxLength={80} value={vibe} onChange={(e) => setVibe(e.target.value)} placeholder="เช่น หรูหรา / มินิมอล / สดใส" /></label>
    </div>
    <div className="studio-ideas">
      <small>ลองไอเดีย:</small>
      {IDEAS.map((i) => <button key={i.business} type="button" onClick={() => { setBusiness(i.business); setVibe(i.vibe); }}>{i.business.split(" ")[0]}</button>)}
    </div>
    {error && <p className="doc-state bad">{error}</p>}
    <button className="pro-btn big" disabled={business.trim().length < 4} onClick={go}>✨ ให้ AI ออกแบบเลย</button>
  </div>;
}
