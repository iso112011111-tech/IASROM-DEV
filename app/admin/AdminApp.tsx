"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookingsPanel, JobsPanel, QuotesPanel, ReviewsPanel, type Booking, type Job, type Quote, type Review } from "./AdminPro";

type Est = { min: number; max: number; items: string[] } | null;
type Msg = { role: "user" | "assistant"; content: string };
type Customer = {
  userId: string; name: string; mode: "ai" | "human"; humanBy?: string; humanUntil?: number;
  brief?: string; lastText?: string; ticketId?: string; history: Msg[]; updatedAt: number; estimate: Est;
};
type Ticket = {
  id: string; userId: string; name: string; brief?: string; reason: string;
  status: "open" | "accepted" | "closed"; acceptedBy?: string; createdAt: number; estimate: Est;
};
type PriceItem = { id: string; group: string; name: string; min: number; max: number; unit?: string; perUnit?: boolean; recurring?: string; note?: string };
type Invoice = {
  id: string; userId: string; name: string; amount: number; description: string; status: "pending" | "paid" | "failed" | "expired" | "canceled";
  createdBy: string; createdAt: number; expiresAt: number; paidAt?: number; testMode: boolean; url: string;
};
type Data = {
  me: string; storeKind: string;
  config: { aiPaused: boolean; pausedBy?: string; pausedAt?: number };
  admins: { name: string; addedAt: number }[];
  pricing: PriceItem[]; customers: Customer[]; tickets: Ticket[];
  payments: { configured: boolean; testMode: boolean }; invoices: Invoice[];
  quotes: Quote[]; jobs: Job[]; bookings: Booking[]; reviews: Review[]; services: { id: string; name: string; icon: string }[]; calendarUrl: string;
  stats: {
    customers: number; today: number; openTickets: number; humanHandled: number; paidMonth: number; pipeline: { min: number; max: number };
    pendingBookings: number; pendingReviews: number; activeJobs: number;
  };
};

const TABS = [
  { id: "overview", label: "ภาพรวม", icon: "◎" },
  { id: "tickets", label: "เรื่องรอทีม", icon: "🎫" },
  { id: "customers", label: "ลูกค้า", icon: "👥" },
  { id: "quotes", label: "ใบเสนอราคา", icon: "📄" },
  { id: "jobs", label: "งาน/ซ่อม", icon: "📦" },
  { id: "bookings", label: "คิวนัด", icon: "📅" },
  { id: "billing", label: "บิล / QR", icon: "🧾" },
  { id: "reviews", label: "รีวิว", icon: "⭐" },
  { id: "pricing", label: "ราคา", icon: "💰" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const baht = (n: number) => `฿${n.toLocaleString("en-US")}`;
const range = (e: Est) => (e ? `${baht(e.min)} – ${baht(e.max)}` : "—");
const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60_000);
  return m < 1 ? "เมื่อสักครู่" : m < 60 ? `${m} นาทีที่แล้ว` : m < 1440 ? `${Math.round(m / 60)} ชม.ที่แล้ว` : `${Math.round(m / 1440)} วันที่แล้ว`;
};
const cleanAi = (t: string) => t.replace(/\[\[[^\]]*\]\]/g, "").replace(/\*\*/g, "").trim();
const satang = (n: number) => `฿${Math.floor(n / 100).toLocaleString("en-US")}.${String(n % 100).padStart(2, "0")}`;
const PAY: Record<Invoice["status"], [string, string]> = { pending: ["รอชำระ", "warn"], paid: ["ชำระแล้ว", "ok"], failed: ["ไม่สำเร็จ", "bad"], expired: ["หมดอายุ", "muted"], canceled: ["ยกเลิก", "muted"] };
const STATUS: Record<Ticket["status"], [string, string]> = { open: ["รอทีม", "warn"], accepted: ["ทีมรับแล้ว", "ok"], closed: ["ปิดแล้ว", "muted"] };
const GROUPS: Record<string, string> = { web: "เว็บ / แอป / ระบบ", addon: "ฟีเจอร์เสริม", it: "งานไอที / ฮาร์ดแวร์", recurring: "ค่าบริการต่อเนื่อง" };

export default function AdminApp({ me }: { me: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState("");
  const [open, setOpen] = useState<Customer | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "open">("open");
  const [billFor, setBillFor] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/data", { cache: "no-store" });
    if (res.status === 401) { window.location.reload(); return; }
    if (!res.ok) { setError("โหลดข้อมูลไม่สำเร็จ"); return; }
    setError("");
    const d: Data = await res.json();
    setData(d);
    setOpen((o) => (o ? d.customers.find((c) => c.userId === o.userId) ?? null : null));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15_000); // อัปเดตอัตโนมัติทุก 15 วินาที
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(""), 2500); return () => clearTimeout(t); } }, [toast]);

  const act = async (body: Record<string, unknown>, done: string) => {
    if (body.type === "noop") { setToast(done); await load(); return; } // แค่แจ้งผล + โหลดข้อมูลใหม่ (งานที่ยิง API เองแล้ว)
    setBusy(JSON.stringify(body));
    const res = await fetch("/api/admin/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    setBusy("");
    if (res.ok) { setToast(done); await load(); } else setToast(`ไม่สำเร็จ: ${d.error ?? res.status}`);
  };
  const isBusy = (body: Record<string, unknown>) => busy === JSON.stringify(body);

  const logout = async () => { await fetch("/api/admin/logout", { method: "POST" }); window.location.reload(); };

  const customers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.customers ?? []).filter((c) => !q || c.name.toLowerCase().includes(q) || (c.brief ?? "").toLowerCase().includes(q) || (c.lastText ?? "").toLowerCase().includes(q));
  }, [data, query]);
  const tickets = (data?.tickets ?? []).filter((t) => filter === "all" || t.status !== "closed");

  if (!data) return <main className="adm adm-loading">{error || "กำลังโหลด…"}</main>;
  const { config, stats } = data;

  const aiSwitch = <button
    className={config.aiPaused ? "adm-switch off" : "adm-switch"}
    disabled={Boolean(busy)}
    onClick={() => act({ type: config.aiPaused ? "resume" : "pause" }, config.aiPaused ? "▶️ เปิด AI แล้ว" : "⏸ หยุด AI ทั้งหมดแล้ว")}
    aria-pressed={!config.aiPaused}
  >
    <span className="knob" />
    <span>{config.aiPaused ? "AI หยุดอยู่" : "AI กำลังตอบ"}</span>
  </button>;

  return <main className="adm">
    <header className="adm-top">
      <a href="/" className="adm-brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.png" alt="" width={34} height={34} />
        <span><b>IASROM-DEV</b><small>หลังบ้าน</small></span>
      </a>
      <nav className="adm-tabs" aria-label="เมนูหลังบ้าน">
        {TABS.map((t) => <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
          <span aria-hidden="true">{t.icon}</span>{t.label}
          {t.id === "tickets" && stats.openTickets > 0 && <i className="adm-badge">{stats.openTickets}</i>}
          {t.id === "bookings" && stats.pendingBookings > 0 && <i className="adm-badge">{stats.pendingBookings}</i>}
          {t.id === "reviews" && stats.pendingReviews > 0 && <i className="adm-badge">{stats.pendingReviews}</i>}
        </button>)}
      </nav>
      <div className="adm-me">
        {aiSwitch}
        <span className="adm-user">{me}</span>
        <button className="adm-ghost" onClick={logout}>ออก</button>
      </div>
    </header>

    {error && <div className="adm-alert">{error}</div>}
    {data.storeKind !== "firestore" && <div className="adm-alert">ยังไม่ได้ต่อ Firestore — ข้อมูลเก็บชั่วคราวในหน่วยความจำ</div>}

    <section className="adm-body">
      {tab === "overview" && <>
        <div className="adm-stats">
          <Stat label="ลูกค้าทั้งหมด" value={stats.customers} sub={`วันนี้ ${stats.today} คน`} />
          <Stat label="เรื่องรอทีม" value={stats.openTickets} sub="ยังไม่มีใครรับ" tone={stats.openTickets ? "warn" : undefined} onClick={() => setTab("tickets")} />
          <Stat label="ทีมกำลังดูแล" value={stats.humanHandled} sub="AI เงียบกับคนเหล่านี้" />
          <Stat label="งานที่กำลังทำ" value={stats.activeJobs} sub="โปรเจกต์ + งานซ่อม" onClick={() => setTab("jobs")} />
          <Stat label="คิวรอยืนยัน" value={stats.pendingBookings} sub="จองผ่านเว็บ/ไลน์" tone={stats.pendingBookings ? "warn" : undefined} onClick={() => setTab("bookings")} />
          <Stat label="รับชำระแล้ว (30 วัน)" value={satang(stats.paidMonth)} sub="ผ่าน PromptPay QR" small onClick={() => setTab("billing")} />
          <Stat label="มูลค่างานประเมิน" value={stats.pipeline.max ? `${baht(stats.pipeline.min)}–${baht(stats.pipeline.max)}` : "—"} sub="เรื่องที่ยังไม่ปิด" small />
        </div>

        <div className="adm-grid2">
          <div className="adm-card">
            <h2>สถานะ AI</h2>
            <p className="adm-muted">{config.aiPaused ? `หยุดทั้งหมดโดย ${config.pausedBy ?? "ทีม"}${config.pausedAt ? ` · ${ago(config.pausedAt)}` : ""}` : "AI ตอบลูกค้าทุกคน ยกเว้นคนที่ทีมกดหยุดไว้รายคน"}</p>
            {aiSwitch}
            <h3>ทีมที่รับแจ้งเตือนใน LINE</h3>
            <ul className="adm-list">{data.admins.length ? data.admins.map((a) => <li key={a.name}>👤 {a.name}</li>) : <li className="adm-muted">ยังไม่มี — ทักบอทด้วย /admin &lt;รหัส&gt;</li>}</ul>
          </div>
          <div className="adm-card">
            <h2>ลูกค้าล่าสุด</h2>
            <ul className="adm-rows">{data.customers.slice(0, 6).map((c) => <CustomerRow key={c.userId} c={c} onOpen={() => { setOpen(c); setTab("customers"); }} />)}
              {!data.customers.length && <li className="adm-muted">ยังไม่มีลูกค้าทักมา</li>}
            </ul>
          </div>
        </div>
      </>}

      {tab === "tickets" && <>
        <div className="adm-toolbar">
          <h2>เรื่องที่ส่งต่อทีม</h2>
          <div className="adm-seg">
            <button className={filter === "open" ? "on" : ""} onClick={() => setFilter("open")}>ยังไม่ปิด</button>
            <button className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>ทั้งหมด</button>
          </div>
        </div>
        <div className="adm-tickets">
          {tickets.map((t) => <article key={t.id} className="adm-card adm-ticket">
            <header>
              <span className={`adm-pill ${STATUS[t.status][1]}`}>{STATUS[t.status][0]}{t.acceptedBy ? ` · ${t.acceptedBy}` : ""}</span>
              <small>{t.id} · {ago(t.createdAt)}</small>
            </header>
            <h3>{t.name}</h3>
            <p className="adm-muted">{t.reason}</p>
            <div className="adm-brief"><small>ความต้องการ (AI สรุป)</small>{t.brief || "—"}</div>
            {t.estimate && <div className="adm-est"><small>ราคาประมาณการ</small><b>{range(t.estimate)}</b><span>{t.estimate.items.join(" · ")}</span></div>}
            <footer>
              {t.status === "open" && <button className="adm-primary" disabled={isBusy({ type: "accept", ticketId: t.id })} onClick={() => act({ type: "accept", ticketId: t.id }, `รับเรื่อง ${t.name} แล้ว — AI หยุดตอบคนนี้`)}>✋ รับเรื่อง</button>}
              {t.status !== "closed" && <button className="adm-ghost" onClick={() => act({ type: "close", ticketId: t.id }, "ปิดเรื่องแล้ว — คืนให้ AI")}>✓ ปิดเรื่อง</button>}
              <button className="adm-ghost" onClick={() => { const c = data.customers.find((x) => x.userId === t.userId); if (c) { setOpen(c); setTab("customers"); } }}>ดูบทสนทนา</button>
              <a className="adm-ghost" href="https://chat.line.biz/" target="_blank" rel="noopener noreferrer">ตอบใน LINE ↗</a>
            </footer>
          </article>)}
          {!tickets.length && <div className="adm-card adm-empty">🎉 ไม่มีเรื่องค้าง</div>}
        </div>
      </>}

      {tab === "customers" && <div className="adm-split">
        <div className="adm-card">
          <div className="adm-toolbar">
            <h2>ลูกค้า ({customers.length})</h2>
            <input className="adm-search" placeholder="ค้นหาชื่อ / ข้อความ / ความต้องการ" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <ul className="adm-rows">{customers.map((c) => <CustomerRow key={c.userId} c={c} active={open?.userId === c.userId} onOpen={() => setOpen(c)} />)}
            {!customers.length && <li className="adm-muted">ไม่พบลูกค้า</li>}
          </ul>
        </div>
        <div className="adm-card adm-detail">
          {open ? <>
            <div className="adm-toolbar">
              <div><h2>{open.name}</h2><p className="adm-muted">{open.mode === "human" ? `🧑 ${open.humanBy ?? "ทีม"} ดูแลอยู่${open.humanUntil ? ` · ถึง ${new Date(open.humanUntil).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}` : ""}` : "🤖 AI ดูแลอยู่"} · อัปเดต {ago(open.updatedAt)}</p></div>
              {open.mode === "human"
                ? <button className="adm-ghost" onClick={() => act({ type: "unmute", userId: open.userId }, `คืนให้ AI ดูแล ${open.name} แล้ว`)}>🤖 คืนให้ AI</button>
                : <button className="adm-primary" onClick={() => act({ type: "mute", userId: open.userId }, `หยุด AI สำหรับ ${open.name} แล้ว`)}>🤫 หยุด AI (ทีมตอบเอง)</button>}
            </div>
            {open.brief && <div className="adm-brief"><small>ความต้องการ (AI สรุป)</small>{open.brief}</div>}
            {open.estimate && <div className="adm-est"><small>ราคาประมาณการที่ AI ให้ไป</small><b>{range(open.estimate)}</b><span>{open.estimate.items.join(" · ")}</span></div>}
            <h3>บทสนทนาล่าสุดกับ AI</h3>
            <div className="adm-chat">
              {open.history.length ? open.history.map((m, i) => <p key={i} className={m.role === "user" ? "u" : "a"}>{m.role === "user" ? m.content : cleanAi(m.content)}</p>)
                : <p className="adm-muted">ยังไม่มีบทสนทนากับ AI{open.lastText ? ` — ข้อความล่าสุด: "${open.lastText}"` : ""}</p>}
            </div>
            <div className="adm-actions">
              <button className="adm-primary" onClick={() => { setBillFor(open.userId); setTab("quotes"); }}>📄 ใบเสนอราคา</button>
              <button className="adm-ghost" onClick={() => { setBillFor(open.userId); setTab("billing"); }}>🧾 ออกบิล QR</button>
              <a className="adm-ghost" href="https://chat.line.biz/" target="_blank" rel="noopener noreferrer">เปิดแชตใน LINE OA ↗</a>
            </div>
          </> : <p className="adm-empty">เลือกลูกค้าทางซ้ายเพื่อดูรายละเอียด</p>}
        </div>
      </div>}

      {tab === "quotes" && <QuotesPanel quotes={data.quotes} customers={data.customers} busy={Boolean(busy)} act={act} preset={billFor} />}
      {tab === "jobs" && <JobsPanel jobs={data.jobs} customers={data.customers} busy={Boolean(busy)} act={act} />}
      {tab === "bookings" && <BookingsPanel bookings={data.bookings} services={data.services} calendarUrl={data.calendarUrl} busy={Boolean(busy)} act={act} />}
      {tab === "reviews" && <ReviewsPanel reviews={data.reviews} busy={Boolean(busy)} act={act} />}
      {tab === "billing" && <Billing data={data} busy={Boolean(busy)} preset={billFor} act={act} />}

      {tab === "pricing" && <PricingEditor items={data.pricing} busy={Boolean(busy)} onSave={(items) => act({ type: "savePricing", items }, "บันทึกราคาแล้ว — AI ใช้ราคาใหม่ทันที")} onReset={() => act({ type: "resetPricing" }, "คืนค่าราคาเริ่มต้นแล้ว")} />}
    </section>

    {toast && <div className="adm-toast" role="status">{toast}</div>}
  </main>;
}

function Billing({ data, busy, preset, act }: { data: Data; busy: boolean; preset: string; act: (b: Record<string, unknown>, done: string) => Promise<void> }) {
  const [userId, setUserId] = useState(preset || data.customers[0]?.userId || "");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { if (preset) setUserId(preset); }, [preset]);

  // ตรวจยอดแบบเดียวกับฝั่งเซิร์ฟเวอร์ (ทศนิยมไม่เกิน 2 ตำแหน่ง, ฿20 – ฿150,000)
  const parsed = (() => {
    const m = amount.replace(/[,\s฿]/g, "").match(/^(\d{1,7})(?:\.(\d{1,2}))?$/);
    if (!m) return null;
    const v = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
    return v >= 2000 && v <= 15_000_000 ? v : null;
  })();
  const customer = data.customers.find((c) => c.userId === userId);
  const ready = Boolean(parsed && customer && description.trim() && data.payments.configured);

  const send = async () => {
    await act({ type: "createInvoice", userId, amount, description }, `ส่งบิล ${satang(parsed!)} ให้ ${customer!.name} ในไลน์แล้ว`);
    setConfirm(false); setAmount(""); setDescription("");
  };

  return <div className="adm-split">
    <div className="adm-card adm-bill">
      <h2>ออกบิล PromptPay QR</h2>
      {!data.payments.configured
        ? <div className="adm-alert">ยังไม่ได้เชื่อม Omise — ใส่ OMISE_SECRET_KEY ใน Vercel ก่อน</div>
        : data.payments.testMode && <div className="adm-alert soft">🧪 โหมดทดสอบ — QR ยังไม่ตัดเงินจริง</div>}
      <label>ลูกค้า
        <select value={userId} onChange={(e) => { setUserId(e.target.value); setConfirm(false); }}>
          {data.customers.map((c) => <option key={c.userId} value={c.userId}>{c.name}</option>)}
        </select>
      </label>
      <label>ยอดเงิน (บาท)
        <input inputMode="decimal" placeholder="เช่น 1500.50" value={amount} onChange={(e) => { setAmount(e.target.value); setConfirm(false); }} aria-invalid={Boolean(amount && !parsed)} />
        <small className={amount && !parsed ? "bad" : ""}>{amount && !parsed ? "ใส่ตัวเลข ทศนิยมไม่เกิน 2 ตำแหน่ง ยอด ฿20 – ฿150,000" : parsed ? `ลูกค้าจะเห็นยอด ${satang(parsed)}` : "ทศนิยมได้ 2 ตำแหน่ง"}</small>
      </label>
      <label>รายละเอียด
        <input maxLength={120} placeholder="เช่น มัดจำงานเว็บไซต์ 50%" value={description} onChange={(e) => { setDescription(e.target.value); setConfirm(false); }} />
      </label>
      {!confirm
        ? <button className="adm-primary" disabled={!ready || busy} onClick={() => setConfirm(true)}>ตรวจสอบก่อนส่ง</button>
        : <div className="adm-confirm">
            <p>ส่ง QR ยอด <b>{satang(parsed!)}</b><br />ให้ <b>{customer?.name}</b> · {description}</p>
            <div><button className="adm-primary" disabled={busy} onClick={send}>✅ ยืนยันส่งเข้าไลน์</button><button className="adm-ghost" onClick={() => setConfirm(false)}>แก้ไข</button></div>
          </div>}
      <p className="adm-muted">QR ใช้ได้ 60 นาที ระบบยืนยันยอดให้อัตโนมัติ แล้วส่งใบเสร็จเข้าไลน์ลูกค้าและแจ้งทีม</p>
    </div>
    <div className="adm-card">
      <h2>บิลล่าสุด</h2>
      <ul className="adm-rows">
        {data.invoices.map((i) => <li key={i.id} className="adm-inv">
          <div className="adm-row-main"><b>{satang(i.amount)} · {i.name}</b><small>{i.description} · {i.createdBy} · {ago(i.createdAt)}{i.testMode ? " · ทดสอบ" : ""}</small></div>
          <div className="adm-inv-side">
            <i className={`adm-pill ${PAY[i.status][1]}`}>{PAY[i.status][0]}</i>
            {(i.status === "pending" || (i.status === "canceled" && Date.now() < i.expiresAt + 600_000)) && <button className="adm-ghost sm" disabled={busy} onClick={() => act({ type: "refreshInvoice", invoiceId: i.id }, "เช็กสถานะแล้ว")}>เช็ก</button>}
            {i.status === "pending" && <>
              <button className="adm-ghost sm" disabled={busy} onClick={() => { if (window.confirm(`ยกเลิกบิล ${satang(i.amount)} ของ ${i.name}?\n\nหน้าชำระเงินจะซ่อน QR ทันที แต่ถ้าลูกค้าบันทึกรูป QR ไว้แล้ว ยังสแกนจ่ายได้จนหมดเวลา (ระบบจะตรวจให้และเปลี่ยนเป็น “ชำระแล้ว” เองถ้ามีการจ่าย)`)) act({ type: "cancelInvoice", invoiceId: i.id }, "ยกเลิกบิลแล้ว"); }}>ยกเลิก</button>
            </>}
            <a className="adm-ghost sm" href={i.url} target="_blank" rel="noopener noreferrer">เปิด ↗</a>
          </div>
        </li>)}
        {!data.invoices.length && <li className="adm-muted">ยังไม่มีบิล</li>}
      </ul>
    </div>
  </div>;
}

function Stat({ label, value, sub, tone, small, onClick }: { label: string; value: number | string; sub: string; tone?: "warn"; small?: boolean; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return <Tag className={`adm-card adm-stat${tone ? ` ${tone}` : ""}`} onClick={onClick}>
    <small>{label}</small><b className={small ? "sm" : ""}>{value}</b><span>{sub}</span>
  </Tag>;
}

function CustomerRow({ c, onOpen, active }: { c: Customer; onOpen: () => void; active?: boolean }) {
  return <li><button className={`adm-row${active ? " on" : ""}`} onClick={onOpen}>
    <span className={`adm-dot ${c.mode}`} aria-hidden="true" />
    <span className="adm-row-main"><b>{c.name}</b><small>{c.lastText ? `"${c.lastText}"` : c.brief ?? "—"}</small></span>
    <span className="adm-row-side">{c.mode === "human" ? <i className="adm-pill ok">{c.humanBy ?? "ทีม"}</i> : <i className="adm-pill">AI</i>}<small>{ago(c.updatedAt)}</small></span>
  </button></li>;
}

function PricingEditor({ items, busy, onSave, onReset }: { items: PriceItem[]; busy: boolean; onSave: (items: PriceItem[]) => void; onReset: () => void }) {
  const [rows, setRows] = useState(items);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { if (!dirty) setRows(items); }, [items, dirty]);
  const update = (id: string, patch: Partial<PriceItem>) => { setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x))); setDirty(true); };
  const invalid = rows.some((r) => !r.name.trim() || r.min < 0 || r.max < r.min);

  return <div className="adm-card">
    <div className="adm-toolbar">
      <div><h2>ตารางราคาประมาณการ</h2><p className="adm-muted">AI เลือกได้แค่รายการในตารางนี้ แล้วระบบคำนวณราคาให้ลูกค้าเอง · บันทึกแล้วมีผลทันที</p></div>
      <div className="adm-actions">
        <button className="adm-ghost" disabled={busy} onClick={() => { if (confirm("คืนค่าราคาเริ่มต้นทั้งหมด?")) { setDirty(false); onReset(); } }}>คืนค่าเริ่มต้น</button>
        <button className="adm-primary" disabled={busy || !dirty || invalid} onClick={() => { setDirty(false); onSave(rows); }}>บันทึกราคา</button>
      </div>
    </div>
    {invalid && <p className="adm-error">ตรวจรายการที่ชื่อว่าง หรือราคาสูงสุดน้อยกว่าราคาต่ำสุด</p>}
    {Object.entries(GROUPS).map(([g, label]) => {
      const list = rows.filter((r) => r.group === g);
      if (!list.length) return null;
      return <div key={g} className="adm-price-group">
        <h3>{label}</h3>
        <div className="adm-price-head" aria-hidden="true"><span>รายการ</span><span>ต่ำสุด (฿)</span><span>สูงสุด (฿)</span></div>
        {list.map((r) => <div key={r.id} className={`adm-price-row${r.max < r.min || !r.name.trim() ? " bad" : ""}`}>
          <label><span className="sr">ชื่อรายการ</span><input value={r.name} onChange={(e) => update(r.id, { name: e.target.value })} /><small>{r.id}{r.unit ? ` · ${r.unit}` : ""}{r.recurring ? ` · ต่อ${r.recurring}` : ""}</small></label>
          <label><span className="sr">ราคาต่ำสุด</span><input type="number" min={0} step={500} value={r.min} onChange={(e) => update(r.id, { min: Number(e.target.value) })} /></label>
          <label><span className="sr">ราคาสูงสุด</span><input type="number" min={0} step={500} value={r.max} onChange={(e) => update(r.id, { max: Number(e.target.value) })} /></label>
        </div>)}
      </div>;
    })}
  </div>;
}
