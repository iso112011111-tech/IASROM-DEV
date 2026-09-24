"use client";

import { useState } from "react";

const LABELS = ["", "ต้องปรับปรุง", "พอใช้", "ดี", "ดีมาก", "ประทับใจสุดๆ"];

export default function ReviewForm({ token, defaultName }: { token: string; defaultName: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const [name, setName] = useState(defaultName);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");

  const submit = async () => {
    setState("busy"); setError("");
    const res = await fetch("/api/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token, rating, text, name }) });
    const d = await res.json().catch(() => ({}));
    if (res.ok) setState("done"); else { setState("idle"); setError(d.error ?? "ส่งไม่สำเร็จ"); }
  };

  if (state === "done") return <div className="rv-done"><b>ขอบคุณมากครับ 🎉</b><span>รีวิวของคุณช่วยทีมเล็กๆ ของเราได้มากจริงๆ</span></div>;
  const shown = hover || rating;
  return <div className="rv-form">
    <div className="rv-stars" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="ให้คะแนน">
      {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} ดาว`}
        className={n <= shown ? "on" : ""} onMouseEnter={() => setHover(n)} onClick={() => setRating(n)}>★</button>)}
    </div>
    <p className="rv-label">{LABELS[shown] || "แตะดาวเพื่อให้คะแนน"}</p>
    <textarea maxLength={500} rows={4} placeholder="เล่าให้ฟังหน่อย ชอบอะไร หรืออยากให้ปรับตรงไหน (ไม่บังคับ)" value={text} onChange={(e) => setText(e.target.value)} />
    <label>ชื่อที่แสดงบนเว็บ<input maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น คุณเอ ร้านกาแฟ" /></label>
    {error && <p className="doc-state bad">{error}</p>}
    <button className="pro-btn" disabled={!rating || state === "busy"} onClick={submit}>ส่งรีวิว</button>
    <small className="pro-note">รีวิวจะแสดงบนเว็บหลังทีมตรวจแล้ว พร้อมป้าย “ลูกค้าจริง ✓”</small>
  </div>;
}
