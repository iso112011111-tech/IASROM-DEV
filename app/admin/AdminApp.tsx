"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
type Data = {
  me: string; storeKind: string;
  config: { aiPaused: boolean; pausedBy?: string; pausedAt?: number };
  admins: { name: string; addedAt: number }[];
  pricing: PriceItem[]; customers: Customer[]; tickets: Ticket[];
  stats: { customers: number; today: number; openTickets: number; humanHandled: number; pipeline: { min: number; max: number } };
};

const TABS = [
  { id: "overview", label: "ภาพรวม", icon: "◎" },
  { id: "tickets", label: "เรื่องรอทีม", icon: "🎫" },
  { id: "customers", label: "ลูกค้า", icon: "👥" },
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
            <a className="adm-ghost" href="https://chat.line.biz/" target="_blank" rel="noopener noreferrer">เปิดแชตใน LINE OA ↗</a>
          </> : <p className="adm-empty">เลือกลูกค้าทางซ้ายเพื่อดูรายละเอียด</p>}
        </div>
      </div>}

      {tab === "pricing" && <PricingEditor items={data.pricing} busy={Boolean(busy)} onSave={(items) => act({ type: "savePricing", items }, "บันทึกราคาแล้ว — AI ใช้ราคาใหม่ทันที")} onReset={() => act({ type: "resetPricing" }, "คืนค่าราคาเริ่มต้นแล้ว")} />}
    </section>

    {toast && <div className="adm-toast" role="status">{toast}</div>}
  </main>;
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
