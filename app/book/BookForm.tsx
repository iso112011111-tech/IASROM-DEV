"use client";

import { useEffect, useState } from "react";

type Day = { date: string; slots: { slot: string; free: boolean }[] };
const dayLabel = (date: string) => {
  const d = new Date(`${date}T12:00:00+07:00`);
  return { wd: d.toLocaleDateString("th-TH", { weekday: "short", timeZone: "Asia/Bangkok" }), dm: d.toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" }) };
};

export default function BookForm({ services, u, defaultName }: { services: { id: string; name: string; icon: string }[]; u: string; defaultName: string }) {
  const [days, setDays] = useState<Day[] | null>(null);
  const [service, setService] = useState("");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ no: string; line: boolean } | null>(null);

  const load = () => fetch("/api/book", { cache: "no-store" }).then((r) => r.json()).then((d) => setDays(d.days)).catch(() => setError("โหลดตารางเวลาไม่สำเร็จ"));
  useEffect(() => { load(); }, []);

  const day = days?.find((d) => d.date === date);
  const ready = service && date && slot && name.trim().length >= 2 && /^(\+66|0)\d{8,9}$/.test(phone.replace(/[^\d+]/g, ""));

  const submit = async () => {
    setBusy(true); setError("");
    const res = await fetch("/api/book", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ service, date, slot, name, phone, note, u }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) setDone(d); else { setError(d.error ?? "จองไม่สำเร็จ"); setSlot(""); load(); }
  };

  if (done) return <div className="rv-done"><b>🎉 ส่งคำขอจองแล้ว</b><span>เลขที่ {done.no} — {done.line ? "ทีมจะยืนยันกลับในไลน์ของคุณ" : "ทีมจะโทรยืนยันกลับเร็วๆ นี้"}</span></div>;

  return <div className="bk-form">
    <h2><i>1</i>บริการ</h2>
    <div className="bk-services">
      {services.map((s) => <button key={s.id} type="button" className={service === s.id ? "on" : ""} onClick={() => setService(s.id)}><span>{s.icon}</span>{s.name}</button>)}
    </div>

    <h2><i>2</i>วัน</h2>
    {!days ? <p className="pro-note">กำลังโหลดตารางเวลา…</p> : <div className="bk-days">
      {days.map((d) => {
        const free = d.slots.some((s) => s.free), l = dayLabel(d.date);
        return <button key={d.date} type="button" disabled={!free} className={date === d.date ? "on" : ""} onClick={() => { setDate(d.date); setSlot(""); }}><small>{l.wd}</small><b>{l.dm}</b></button>;
      })}
    </div>}

    {day && <><h2><i>3</i>เวลา</h2>
      <div className="bk-slots">{day.slots.map((s) => <button key={s.slot} type="button" disabled={!s.free} className={slot === s.slot ? "on" : ""} onClick={() => setSlot(s.slot)}>{s.slot}{!s.free && <small>เต็ม</small>}</button>)}</div>
    </>}

    <h2><i>4</i>ข้อมูลติดต่อ</h2>
    <div className="bk-fields">
      <label>ชื่อ<input maxLength={60} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
      <label>เบอร์โทร<input inputMode="tel" maxLength={15} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08x-xxx-xxxx" autoComplete="tel" /></label>
      <label className="wide">รายละเอียดเพิ่มเติม (ไม่บังคับ)<textarea rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น โน้ตบุ๊กเปิดไม่ติด / ต้องการกล้อง 4 ตัวรอบบ้าน" /></label>
    </div>
    {error && <p className="doc-state bad">{error}</p>}
    <button className="pro-btn" disabled={!ready || busy} onClick={submit}>{busy ? "กำลังจอง…" : "ยืนยันการจอง"}</button>
  </div>;
}
