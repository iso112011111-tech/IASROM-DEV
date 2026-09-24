"use client";

import { useState } from "react";

const NAMES = ["โซ่", "อาม"];

export default function AdminLogin({ configured }: { configured: boolean }) {
  const [name, setName] = useState(NAMES[0]);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) { setError("กรอกรหัสผ่านก่อนครับ"); return; }
    setBusy(true); setError("");
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, password }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) window.location.reload();
    else { setError(data.error || "เข้าสู่ระบบไม่สำเร็จ"); setBusy(false); }
  };

  return <main className="adm adm-login">
    <form className="adm-login-card" onSubmit={submit}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-mark.png" alt="" width={72} height={72} />
      <h1>หลังบ้าน IASROM-DEV</h1>
      <p>จัดการลูกค้า LINE OA · AI · ราคา</p>
      {!configured && <div className="adm-alert">ยังไม่ได้ตั้งรหัสผ่านหลังบ้าน (ADMIN_PASSWORD)</div>}
      <label>ใครเข้าใช้
        <div className="adm-seg">
          {NAMES.map((n) => <button type="button" key={n} className={n === name ? "on" : ""} onClick={() => setName(n)}>{n}</button>)}
        </div>
      </label>
      <label>รหัสผ่าน
        <input type="password" autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} autoFocus />
      </label>
      {error && <p className="adm-error" role="alert">{error}</p>}
      <button className="adm-primary" disabled={busy || !configured}>{busy ? "กำลังเข้า…" : "เข้าสู่ระบบ"}</button>
      <a href="/" className="adm-link">← กลับหน้าเว็บ</a>
    </form>
  </main>;
}
