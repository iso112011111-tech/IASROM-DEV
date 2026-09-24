"use client";

// แท็บหลังบ้านชุดใหม่: ใบเสนอราคา / งาน-ซ่อม / คิวนัด / รีวิว
import { useEffect, useMemo, useState } from "react";

type Act = (body: Record<string, unknown>, done: string) => Promise<void>;
type Cust = { userId: string; name: string };

export type QuoteLine = { name: string; detail?: string; qty: number; price: number };
export type Quote = {
  id: string; no: string; userId: string; name: string; title: string; lines: QuoteLine[]; scope: string[]; terms: string[];
  days: number; depositPercent: number; validDays: number; status: "draft" | "sent" | "accepted" | "declined";
  createdBy: string; createdAt: number; sentAt?: number; respondedAt?: number; invoiceId?: string; total: number; url: string;
};
export type Job = {
  id: string; code: string; kind: "project" | "repair"; userId?: string; name: string; title: string; device?: string;
  stages: string[]; current: number; stageAt: number[]; updates: { at: number; text: string; by: string }[];
  previewUrl?: string; warrantyMonths?: number; deliveredAt?: number; warrantyUntil: number | null; createdAt: number; updatedAt: number; url: string;
};
export type Booking = { id: string; no: string; userId?: string; name: string; phone: string; service: string; date: string; slot: string; note: string; status: "pending" | "confirmed" | "canceled" | "done"; createdAt: number };
export type Review = { id: string; name: string; rating: number; text: string; topic: string; approved: boolean; createdAt: number };

const satang = (n: number) => `฿${Math.floor(n / 100).toLocaleString("en-US")}.${String(n % 100).padStart(2, "0")}`;
const toSatang = (v: string) => {
  const m = v.replace(/[,\s฿]/g, "").match(/^(\d{1,9})(?:\.(\d{1,2}))?$/);
  return m ? Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0")) : null;
};
const fromSatang = (n: number) => (n % 100 ? (n / 100).toFixed(2) : String(n / 100));
const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60_000);
  return m < 1 ? "เมื่อสักครู่" : m < 60 ? `${m} นาทีที่แล้ว` : m < 1440 ? `${Math.round(m / 60)} ชม.ที่แล้ว` : `${Math.round(m / 1440)} วันที่แล้ว`;
};
const day = (t: number) => new Date(t).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });

// ================================================================ ใบเสนอราคา

const QSTATUS: Record<Quote["status"], [string, string]> = { draft: ["ร่าง", "muted"], sent: ["ส่งแล้ว รอตอบ", "warn"], accepted: ["ตอบรับแล้ว 🎉", "ok"], declined: ["ปฏิเสธ", "bad"] };

export function QuotesPanel({ quotes, customers, busy, act, preset }: { quotes: Quote[]; customers: Cust[]; busy: boolean; act: Act; preset: string }) {
  const [openId, setOpenId] = useState("");
  const [newFor, setNewFor] = useState(preset || customers[0]?.userId || "");
  useEffect(() => { if (preset) setNewFor(preset); }, [preset]);
  const open = quotes.find((q) => q.id === openId) ?? null;

  const create = async () => {
    const res = await fetch("/api/admin/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "quoteDraft", userId: newFor }) });
    const d = await res.json().catch(() => ({}));
    if (res.ok) { await act({ type: "noop" }, "สร้างร่างใบเสนอราคาแล้ว — ราคาดึงจากที่ AI ประเมินไว้ แก้ได้เลย"); setOpenId(d.id); }
    else await act({ type: "noop" }, `ไม่สำเร็จ: ${d.error}`);
  };

  return <div className="adm-split">
    <div className="adm-card">
      <div className="adm-toolbar"><h2>ใบเสนอราคา</h2></div>
      <div className="adm-newrow">
        <select value={newFor} onChange={(e) => setNewFor(e.target.value)}>{customers.map((c) => <option key={c.userId} value={c.userId}>{c.name}</option>)}</select>
        <button className="adm-primary" disabled={busy || !newFor} onClick={create}>＋ ร่างใหม่จากบรีฟ</button>
      </div>
      <ul className="adm-rows">
        {quotes.map((q) => <li key={q.id}><button className={`adm-row${openId === q.id ? " on" : ""}`} onClick={() => setOpenId(q.id)}>
          <span className="adm-row-main"><b>{q.title}</b><small>{q.no} · {q.name} · {ago(q.createdAt)}</small></span>
          <span className="adm-row-side"><i className={`adm-pill ${QSTATUS[q.status][1]}`}>{QSTATUS[q.status][0]}</i><small>{satang(q.total)}</small></span>
        </button></li>)}
        {!quotes.length && <li className="adm-muted">ยังไม่มีใบเสนอราคา — เลือกลูกค้าแล้วกด “ร่างใหม่จากบรีฟ”</li>}
      </ul>
    </div>
    <div className="adm-card adm-detail">
      {open ? <QuoteEditor key={open.id + open.status} q={open} busy={busy} act={act} onDeleted={() => setOpenId("")} /> : <p className="adm-empty">เลือกใบเสนอราคาทางซ้าย หรือสร้างใหม่</p>}
    </div>
  </div>;
}

function QuoteEditor({ q, busy, act, onDeleted }: { q: Quote; busy: boolean; act: Act; onDeleted: () => void }) {
  const editable = q.status === "draft";
  const [title, setTitle] = useState(q.title);
  const [name, setName] = useState(q.name);
  const [lines, setLines] = useState(q.lines.map((l) => ({ ...l, priceText: fromSatang(l.price) })));
  const [scope, setScope] = useState(q.scope.join("\n"));
  const [terms, setTerms] = useState(q.terms.join("\n"));
  const [days, setDays] = useState(String(q.days));
  const [deposit, setDeposit] = useState(String(q.depositPercent));
  const [valid, setValid] = useState(String(q.validDays));
  const [confirmSend, setConfirmSend] = useState(false);

  const total = lines.reduce((s, l) => s + (toSatang(l.priceText) ?? 0) * (Number(l.qty) || 0), 0);
  const invalid = lines.some((l) => !l.name.trim() || toSatang(l.priceText) === null);
  const payload = () => ({
    type: "quoteSave", id: q.id,
    quote: {
      title, name, days: Number(days), depositPercent: Number(deposit), validDays: Number(valid),
      scope: scope.split("\n"), terms: terms.split("\n"),
      lines: lines.map((l) => ({ name: l.name, detail: l.detail, qty: Number(l.qty), price: toSatang(l.priceText) ?? 0 })),
    },
  });
  const setLine = (i: number, patch: Partial<(typeof lines)[number]>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return <div className="adm-quote">
    <div className="adm-toolbar">
      <div><h2>{q.no}</h2><p className="adm-muted">{QSTATUS[q.status][0]}{q.sentAt ? ` · ส่งเมื่อ ${day(q.sentAt)}` : ""}{q.invoiceId ? " · ออกบิลมัดจำแล้ว" : ""}</p></div>
      <a className="adm-ghost" href={q.url} target="_blank" rel="noopener noreferrer">{editable ? "ตัวอย่างหลังส่ง" : "เปิดหน้าลูกค้า ↗"}</a>
    </div>
    <fieldset disabled={!editable || busy} className="adm-form">
      <div className="adm-2col">
        <label>ชื่องาน<input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} /></label>
        <label>ชื่อลูกค้าบนเอกสาร<input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /></label>
      </div>
      <div className="adm-lines">
        <div className="adm-line head"><span>รายการ</span><span>จำนวน</span><span>ราคา/หน่วย (บาท)</span><span /></div>
        {lines.map((l, i) => <div key={i} className="adm-line">
          <span><input value={l.name} placeholder="ชื่อรายการ" onChange={(e) => setLine(i, { name: e.target.value })} /><input className="sub" value={l.detail ?? ""} placeholder="รายละเอียด (ไม่บังคับ)" onChange={(e) => setLine(i, { detail: e.target.value })} /></span>
          <input type="number" min={1} value={l.qty} onChange={(e) => setLine(i, { qty: Number(e.target.value) })} />
          <input inputMode="decimal" value={l.priceText} aria-invalid={toSatang(l.priceText) === null} onChange={(e) => setLine(i, { priceText: e.target.value })} />
          <button type="button" className="adm-ghost sm" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} aria-label="ลบรายการ">✕</button>
        </div>)}
        <button type="button" className="adm-ghost sm" onClick={() => setLines((ls) => [...ls, { name: "", qty: 1, price: 0, priceText: "0" }])}>＋ เพิ่มรายการ</button>
      </div>
      <div className="adm-3col">
        <label>ระยะเวลา (วัน)<input type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} /></label>
        <label>มัดจำ (%)<input type="number" min={0} max={100} value={deposit} onChange={(e) => setDeposit(e.target.value)} /></label>
        <label>ยืนราคา (วัน)<input type="number" min={1} max={90} value={valid} onChange={(e) => setValid(e.target.value)} /></label>
      </div>
      <label>ขอบเขตงาน (บรรทัดละข้อ)<textarea rows={3} value={scope} onChange={(e) => setScope(e.target.value)} /></label>
      <label>เงื่อนไข (บรรทัดละข้อ)<textarea rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} /></label>
    </fieldset>
    <div className="adm-quote-total"><span>ยอดรวม</span><b>{satang(total)}</b>{Number(deposit) > 0 && <small>มัดจำ {deposit}% = {satang(Math.round((total * Number(deposit)) / 100))}</small>}</div>
    {editable && <div className="adm-actions">
      <button className="adm-ghost" disabled={busy || invalid} onClick={() => act(payload(), "บันทึกร่างแล้ว")}>💾 บันทึก</button>
      {!confirmSend
        ? <button className="adm-primary" disabled={busy || invalid || !total} onClick={() => setConfirmSend(true)}>📨 ส่งให้ลูกค้าในไลน์…</button>
        : <button className="adm-primary" disabled={busy} onClick={async () => { await act(payload(), "บันทึกแล้ว"); await act({ type: "quoteSend", id: q.id }, `ส่งใบเสนอราคา ${satang(total)} เข้าไลน์ ${name} แล้ว`); }}>✅ ยืนยันส่ง {satang(total)}</button>}
      <button className="adm-ghost danger" disabled={busy} onClick={async () => { if (window.confirm("ลบร่างนี้?")) { await act({ type: "quoteDelete", id: q.id }, "ลบร่างแล้ว"); onDeleted(); } }}>ลบร่าง</button>
    </div>}
  </div>;
}

// ================================================================ งาน / ซ่อม

export function JobsPanel({ jobs, customers, busy, act }: { jobs: Job[]; customers: Cust[]; busy: boolean; act: Act }) {
  const [openId, setOpenId] = useState("");
  const [show, setShow] = useState<"active" | "all">("active");
  const [form, setForm] = useState({ kind: "project", userId: "", name: "", title: "", device: "" });
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState("");
  const [warranty, setWarranty] = useState("");
  const list = jobs.filter((j) => show === "all" || !j.deliveredAt);
  const open = jobs.find((j) => j.id === openId) ?? null;
  useEffect(() => { setPreview(open?.previewUrl ?? ""); setWarranty(open?.warrantyMonths ? String(open.warrantyMonths) : ""); setNote(""); }, [openId, open?.previewUrl, open?.warrantyMonths]);

  const create = async () => {
    const res = await fetch("/api/admin/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "jobCreate", ...form }) });
    const d = await res.json().catch(() => ({}));
    await act({ type: "noop" }, res.ok ? `เปิดงานแล้ว${form.userId ? " — ส่งลิงก์ติดตามเข้าไลน์ลูกค้าแล้ว" : ""}` : `ไม่สำเร็จ: ${d.error}`);
    if (res.ok) { setOpenId(d.id); setForm({ ...form, name: "", title: "", device: "" }); }
  };

  return <div className="adm-split">
    <div className="adm-card">
      <div className="adm-toolbar">
        <h2>งาน / ซ่อม</h2>
        <div className="adm-seg"><button className={show === "active" ? "on" : ""} onClick={() => setShow("active")}>กำลังทำ</button><button className={show === "all" ? "on" : ""} onClick={() => setShow("all")}>ทั้งหมด</button></div>
      </div>
      <details className="adm-new">
        <summary>＋ เปิดงานใหม่</summary>
        <div className="adm-form">
          <div className="adm-seg"><button className={form.kind === "project" ? "on" : ""} onClick={() => setForm({ ...form, kind: "project" })}>🚀 โปรเจกต์</button><button className={form.kind === "repair" ? "on" : ""} onClick={() => setForm({ ...form, kind: "repair" })}>🛠 งานซ่อม</button></div>
          <label>ลูกค้าใน LINE (ไม่บังคับ)
            <select value={form.userId} onChange={(e) => { const c = customers.find((x) => x.userId === e.target.value); setForm({ ...form, userId: e.target.value, name: c?.name ?? form.name }); }}>
              <option value="">— ลูกค้า walk-in / ไม่มีไลน์ —</option>
              {customers.map((c) => <option key={c.userId} value={c.userId}>{c.name}</option>)}
            </select>
          </label>
          <div className="adm-2col">
            <label>ชื่อลูกค้า<input value={form.name} maxLength={60} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>ชื่องาน<input value={form.title} maxLength={100} placeholder={form.kind === "repair" ? "เช่น ซ่อมโน้ตบุ๊กเปิดไม่ติด" : "เช่น เว็บไซต์ร้านกาแฟ"} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          </div>
          {form.kind === "repair" && <label>รุ่น / S/N เครื่อง<input value={form.device} maxLength={100} placeholder="เช่น ASUS Vivobook 15 · S/N N3NRKD..." onChange={(e) => setForm({ ...form, device: e.target.value })} /></label>}
          <button className="adm-primary" disabled={busy || !form.name.trim() || !form.title.trim()} onClick={create}>เปิดงาน</button>
        </div>
      </details>
      <ul className="adm-rows">
        {list.map((j) => <li key={j.id}><button className={`adm-row${openId === j.id ? " on" : ""}`} onClick={() => setOpenId(j.id)}>
          <span className="adm-row-main"><b>{j.kind === "repair" ? "🛠" : "🚀"} {j.title}</b><small>{j.code} · {j.name} · {ago(j.updatedAt)}</small></span>
          <span className="adm-row-side"><i className={`adm-pill ${j.deliveredAt ? "ok" : "warn"}`}>{j.stages[j.current]}</i><span className="adm-mini-bar"><i style={{ width: `${(j.current / (j.stages.length - 1)) * 100}%` }} /></span></span>
        </button></li>)}
        {!list.length && <li className="adm-muted">ไม่มีงาน{show === "active" ? "ที่กำลังทำ" : ""}</li>}
      </ul>
    </div>
    <div className="adm-card adm-detail">
      {open ? <>
        <div className="adm-toolbar">
          <div><h2>{open.title}</h2><p className="adm-muted">{open.code} · {open.name}{open.device ? ` · ${open.device}` : ""}{open.userId ? " · 🟢 แจ้งเตือนทางไลน์" : " · ไม่มีไลน์ (ส่งลิงก์เอง)"}</p></div>
          <div className="adm-actions">
            <a className="adm-ghost" href={open.url} target="_blank" rel="noopener noreferrer">หน้าลูกค้า ↗</a>
            <a className="adm-ghost" href={`/admin/sticker/${open.id}`} target="_blank" rel="noopener noreferrer">🏷 สติกเกอร์ QR</a>
            <button className="adm-ghost" onClick={() => navigator.clipboard.writeText(open.url)}>คัดลอกลิงก์</button>
          </div>
        </div>
        <ol className="adm-stages">
          {open.stages.map((s, i) => <li key={s}><button disabled={busy} className={i < open.current ? "done" : i === open.current ? "now" : ""}
            onClick={() => i !== open.current && act({ type: "jobMove", id: open.id, to: i, note: note.trim() || undefined }, `ย้ายไปขั้น “${s}” แล้ว${open.userId ? " — แจ้งลูกค้าในไลน์แล้ว" : ""}`).then(() => setNote(""))}>
            <i>{i < open.current || (i === open.current && open.deliveredAt) ? "✓" : i + 1}</i>{s}
          </button></li>)}
        </ol>
        <p className="adm-muted">กดขั้นเพื่อย้ายสถานะ (ข้อความด้านล่างจะแนบไปด้วย) · ขั้นสุดท้าย = ส่งมอบ เริ่มนับประกัน + ส่งลิงก์รีวิวให้ลูกค้า</p>
        <div className="adm-form">
          <label>ข้อความอัปเดตถึงลูกค้า<textarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น ได้อะไหล่แล้ว กำลังเปลี่ยนจอ / ออกแบบหน้าแรกเสร็จแล้ว ดูพรีวิวได้เลย" /></label>
          <button className="adm-ghost" disabled={busy || !note.trim()} onClick={() => act({ type: "jobUpdate", id: open.id, note }, "ส่งอัปเดตแล้ว").then(() => setNote(""))}>💬 ส่งอัปเดต (ไม่เปลี่ยนขั้น)</button>
          <div className="adm-2col">
            <label>ลิงก์พรีวิวงาน<input value={preview} placeholder="https://..." onChange={(e) => setPreview(e.target.value)} /></label>
            <label>รับประกัน (เดือน)<input type="number" min={0} max={60} value={warranty} placeholder="เช่น 3" onChange={(e) => setWarranty(e.target.value)} /></label>
          </div>
          <button className="adm-ghost" disabled={busy} onClick={() => act({ type: "jobInfo", id: open.id, previewUrl: preview, warrantyMonths: Number(warranty) || 0 }, "บันทึกแล้ว")}>💾 บันทึกพรีวิว / ประกัน</button>
          {open.warrantyUntil && <p className="adm-muted">🛡 ประกันถึง {day(open.warrantyUntil)}</p>}
        </div>
        {open.updates.length > 0 && <><h3>ประวัติอัปเดต</h3><ul className="adm-list">{[...open.updates].reverse().map((u, i) => <li key={i}>{u.text} <small className="adm-muted">— {u.by} · {ago(u.at)}</small></li>)}</ul></>}
      </> : <p className="adm-empty">เลือกงานทางซ้าย หรือเปิดงานใหม่</p>}
    </div>
  </div>;
}

// ================================================================ คิวนัด

const BSTATUS: Record<Booking["status"], [string, string]> = { pending: ["รอยืนยัน", "warn"], confirmed: ["ยืนยันแล้ว", "ok"], canceled: ["ยกเลิก", "muted"], done: ["เสร็จแล้ว", "muted"] };

export function BookingsPanel({ bookings, services, calendarUrl, busy, act }: { bookings: Booking[]; services: { id: string; name: string; icon: string }[]; calendarUrl: string; busy: boolean; act: Act }) {
  const [copied, setCopied] = useState(false);
  const byDate = useMemo(() => {
    const m = new Map<string, Booking[]>();
    for (const b of bookings) m.set(b.date, [...(m.get(b.date) ?? []), b]);
    return [...m.entries()];
  }, [bookings]);
  const svc = (id: string) => services.find((s) => s.id === id);
  const label = (date: string) => new Date(`${date}T12:00:00+07:00`).toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" });

  return <div className="adm-grid2 adm-book">
    <div className="adm-card">
      <div className="adm-toolbar"><h2>คิวนัด</h2><a className="adm-ghost" href="/book" target="_blank" rel="noopener noreferrer">หน้าจอง ↗</a></div>
      {byDate.map(([date, list]) => <section key={date} className="adm-day">
        <h3>{label(date)}</h3>
        {list.map((b) => <article key={b.id} className={`adm-booking ${b.status}`}>
          <b className="t">{b.slot}</b>
          <div className="adm-row-main"><b>{svc(b.service)?.icon} {svc(b.service)?.name}</b><small>{b.name} · <a href={`tel:${b.phone}`}>{b.phone}</a>{b.userId ? " · ไลน์ ✓" : ""}</small>{b.note && <small>“{b.note}”</small>}</div>
          <div className="adm-inv-side">
            <i className={`adm-pill ${BSTATUS[b.status][1]}`}>{BSTATUS[b.status][0]}</i>
            {b.status === "pending" && <button className="adm-primary sm" disabled={busy} onClick={() => act({ type: "bookingStatus", id: b.id, status: "confirmed" }, `ยืนยันคิว ${b.name} แล้ว${b.userId ? " — แจ้งในไลน์แล้ว" : " — โทรแจ้งลูกค้าด้วยนะ"}`)}>ยืนยัน</button>}
            {b.status === "confirmed" && <button className="adm-ghost sm" disabled={busy} onClick={() => act({ type: "bookingStatus", id: b.id, status: "done" }, "ปิดคิวแล้ว")}>เสร็จ</button>}
            {(b.status === "pending" || b.status === "confirmed") && <button className="adm-ghost sm danger" disabled={busy} onClick={() => { if (window.confirm(`ยกเลิกคิวของ ${b.name}?`)) act({ type: "bookingStatus", id: b.id, status: "canceled" }, "ยกเลิกคิวแล้ว"); }}>ยกเลิก</button>}
          </div>
        </article>)}
      </section>)}
      {!byDate.length && <p className="adm-muted">ยังไม่มีคิว — ลูกค้าจองได้ที่หน้า /book หรือพิมพ์ “จองคิว” ในไลน์</p>}
    </div>
    <div className="adm-card">
      <h2>ซิงก์กับ Google Calendar</h2>
      <p className="adm-muted">เพิ่มลิงก์นี้ใน Google Calendar → “ปฏิทินอื่นๆ ＋” → “จาก URL” แล้วคิวทุกคิวจะขึ้นในปฏิทินของทีมเอง (Google อัปเดตทุก ~ครึ่งวัน)</p>
      <div className="adm-copy"><code>{calendarUrl.replace(/k=.*/, "k=••••••")}</code><button className="adm-ghost sm" onClick={() => { navigator.clipboard.writeText(calendarUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "✓ คัดลอกแล้ว" : "คัดลอก"}</button></div>
      <p className="adm-muted">⚠️ ลิงก์นี้มีกุญแจลับ ใครได้ไปจะเห็นคิวทั้งหมด — ใช้ในทีมเท่านั้น</p>
      <h3>เวลาเปิดจอง</h3>
      <ul className="adm-list"><li>จันทร์–เสาร์ · 09:30 / 11:00 / 13:30 / 15:00 / 16:30</li><li>จองล่วงหน้าได้ 21 วัน · ต้องจองก่อนอย่างน้อย 2 ชม.</li><li>ระบบเตือนลูกค้าและทีม 08:00 น. ของวันก่อนนัด</li></ul>
    </div>
  </div>;
}

// ================================================================ รีวิว

export function ReviewsPanel({ reviews, busy, act }: { reviews: Review[]; busy: boolean; act: Act }) {
  const approved = reviews.filter((r) => r.approved);
  const avg = approved.length ? approved.reduce((s, r) => s + r.rating, 0) / approved.length : 0;
  return <div className="adm-card">
    <div className="adm-toolbar"><h2>รีวิวจากลูกค้าจริง</h2><p className="adm-muted">ขึ้นเว็บแล้ว {approved.length} รีวิว{approved.length ? ` · เฉลี่ย ★ ${avg.toFixed(1)}` : ""} · หน้าเว็บโชว์ส่วนรีวิวเมื่อมีอย่างน้อย 1 รีวิว (โชว์ดาวเฉลี่ยเมื่อครบ 3)</p></div>
    <div className="adm-reviews">
      {reviews.map((r) => <article key={r.id} className={`adm-review${r.approved ? " on" : ""}`}>
        <div className="stars">{"★".repeat(r.rating)}<span>{"★".repeat(5 - r.rating)}</span></div>
        <p>{r.text || <i className="adm-muted">(ไม่มีข้อความ)</i>}</p>
        <small><b>{r.name}</b> · {r.topic} · {ago(r.createdAt)}</small>
        <footer>
          {r.approved
            ? <button className="adm-ghost sm" disabled={busy} onClick={() => act({ type: "reviewApprove", id: r.id, approved: false }, "เอาลงจากเว็บแล้ว")}>ซ่อนจากเว็บ</button>
            : <button className="adm-primary sm" disabled={busy} onClick={() => act({ type: "reviewApprove", id: r.id, approved: true }, "ขึ้นเว็บแล้ว ✨ (อัปเดตหน้าแรกภายใน 5 นาที)")}>✓ อนุมัติขึ้นเว็บ</button>}
          <button className="adm-ghost sm danger" disabled={busy} onClick={() => { if (window.confirm("ลบรีวิวนี้ถาวร?")) act({ type: "reviewDelete", id: r.id }, "ลบแล้ว"); }}>ลบ</button>
        </footer>
      </article>)}
      {!reviews.length && <p className="adm-muted">ยังไม่มีรีวิว — ระบบส่งลิงก์ให้คะแนนเข้าไลน์ลูกค้าอัตโนมัติหลังจ่ายเงินสำเร็จ และหลังส่งมอบงาน</p>}
    </div>
  </div>;
}
