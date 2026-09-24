// IASROM AI Concierge — AI คุยแทนทีมระหว่างรอ: เก็บความต้องการ แนะนำ ประเมินราคาคร่าว ๆ และส่งต่อให้ทีม
import { baht, estimate, pricingForPrompt, type Estimate, type PriceItem } from "../data/pricing";
import type { ChatMessage } from "./ai";
import {
  C, bubble, flex, header, listRow, msgButton, postbackButton, push, quickReply, text, uriButton, type LineMessage,
} from "./line";
import { store } from "./store";

export const HUMAN_HOURS = 12; // ทีมรับเรื่องแล้ว AI จะเงียบนานเท่านี้ (หรือจนกว่าทีมกด "คืนให้ AI")

export type Customer = {
  userId: string;
  name: string;
  mode: "ai" | "human";
  humanBy?: string;
  humanUntil?: number;
  brief?: string;
  estimateSpec?: string;
  ticketId?: string;
  lastText?: string;   // ข้อความล่าสุดของลูกค้า (แสดงในรายการลูกค้าของทีม)
  history: ChatMessage[];
  updatedAt: number;
};

export type Ticket = {
  id: string;
  userId: string;
  name: string;
  brief?: string;
  estimateSpec?: string;
  reason: string;
  status: "open" | "accepted" | "closed";
  acceptedBy?: string;
  createdAt: number;
};

type Admin = { userId: string; name: string; addedAt: number };

// ---------------------------------------------------------------- ข้อมูล

export async function loadCustomer(userId: string, name: () => Promise<string>): Promise<Customer> {
  const c = await store.get<Customer>("line_customers", userId);
  if (c) {
    // หมดเวลาที่ทีมดูแล → กลับมาให้ AI
    if (c.mode === "human" && (c.humanUntil ?? 0) < Date.now()) { c.mode = "ai"; delete c.humanBy; delete c.humanUntil; }
    return c;
  }
  return { userId, name: await name(), mode: "ai", history: [], updatedAt: Date.now() };
}

export const saveCustomer = (c: Customer) => store.set("line_customers", c.userId, { ...c, history: c.history.slice(-10), updatedAt: Date.now() });

export const listAdmins = () => store.list<Admin>("line_admins");
export const isAdmin = async (userId: string) => Boolean(await store.get<Admin>("line_admins", userId));
export const addAdmin = (a: Admin) => store.set("line_admins", a.userId, a);
export const getTicket = (id: string) => store.get<Ticket>("line_tickets", id);
export const saveTicket = (t: Ticket) => store.set("line_tickets", t.id, t);

// ---------------------------------------------------------------- สวิตช์ AI ของทีม

type Config = { aiPaused: boolean; pausedBy?: string; pausedAt?: number };
export const getConfig = async (): Promise<Config> => (await store.get<Config>("line_config", "global")) ?? { aiPaused: false };
export const setConfig = (c: Config) => store.set("line_config", "global", c);

/** ลูกค้าที่ทักมาล่าสุด (ใหม่สุดก่อน) */
export async function recentCustomers(limit = 8) {
  const all = await store.list<Customer>("line_customers");
  return all.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, limit);
}

export const muteCustomer = (c: Customer, by: string) =>
  saveCustomer(Object.assign(c, { mode: "human" as const, humanBy: by, humanUntil: Date.now() + HUMAN_HOURS * 3_600_000 }));
export const unmuteCustomer = (c: Customer) =>
  saveCustomer(Object.assign(c, { mode: "ai" as const, humanBy: undefined, humanUntil: undefined }));

/** ปุ่มลัดของทีม (แนบท้ายทุกข้อความที่ตอบทีม) */
export const adminQuick = () => quickReply([
  { label: "⏸ หยุด AI ทั้งหมด", text: "/หยุด" },
  { label: "▶️ เปิด AI", text: "/เปิด" },
  { label: "👥 ลูกค้าล่าสุด", text: "/ลูกค้า" },
  { label: "📊 สถานะ", text: "/สถานะ" },
]);

const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60_000);
  return m < 1 ? "เมื่อสักครู่" : m < 60 ? `${m} นาทีที่แล้ว` : m < 1440 ? `${Math.round(m / 60)} ชม.ที่แล้ว` : `${Math.round(m / 1440)} วันที่แล้ว`;
};

/** รายการลูกค้าล่าสุด พร้อมปุ่มหยุด/เปิด AI ทีละคน */
export function customerListCard(list: Customer[], globalPaused: boolean): LineMessage {
  const rows = list.map((c) => {
    const human = c.mode === "human";
    return {
      type: "box", layout: "vertical", spacing: "xs", paddingAll: "12px", cornerRadius: "12px", backgroundColor: human ? "#fff7e6" : C.bg, contents: [
        { type: "box", layout: "horizontal", contents: [
          text(c.name, { weight: "bold", size: "sm", flex: 1 }),
          text(human ? `🧑 ${c.humanBy ?? "ทีม"}` : "🤖 AI", { size: "xxs", color: human ? "#b45309" : C.deep, align: "end", flex: 0 }),
        ] },
        text(`${c.lastText ? `"${c.lastText.slice(0, 40)}"` : "—"} · ${ago(c.updatedAt)}`, { size: "xxs", color: C.sub }),
        human
          ? postbackButton("🤖 คืนให้ AI", `a=unmute&u=${c.userId}`, false, `คืนให้ AI: ${c.name}`)
          : postbackButton("🤫 หยุด AI (ทีมตอบเอง)", `a=mute&u=${c.userId}`, true, `หยุด AI: ${c.name}`),
      ],
    };
  });
  return flex("ลูกค้าล่าสุด", bubble({
    header: header("ลูกค้าล่าสุด 👥", globalPaused ? "⏸ ตอนนี้ AI หยุดตอบทุกคนอยู่" : "กดหยุด AI ก่อนเข้าไปตอบลูกค้าเอง"),
    body: { type: "box", layout: "vertical", spacing: "sm", paddingAll: "16px",
      contents: rows.length ? rows : [text("ยังไม่มีลูกค้าทักมาครับ", { color: C.sub })] },
  }), adminQuick());
}

// ---------------------------------------------------------------- prompt

export function conciergeAddendum(c: Customer, table: PriceItem[]) {
  const status = c.mode === "human" ? "ทีมรับเรื่องแล้ว" : c.ticketId ? "แจ้งทีมแล้ว กำลังรอทีมตอบ — คุยช่วยระหว่างรอได้" : "ยังไม่ได้แจ้งทีม";
  return `

ช่องทาง: LINE OA — โหมด "ผู้ช่วยขาย" (คุยแทนทีมระหว่างรอทีมตอบ)
- เป้าหมาย: เข้าใจความต้องการ แนะนำบริการ/แพ็กเกจที่เหมาะ และประเมินราคาคร่าว ๆ ให้ลูกค้า
- ถามทีละ 1–2 คำถาม (ประเภทงาน, ใช้ทำอะไร, ฟีเจอร์ที่ต้องมี, จำนวนหน้า/ผู้ใช้/จุดติดตั้ง, ช่วงเวลาที่ต้องการ)
- ตอบสั้น ไม่เกินประมาณ 4 บรรทัด อบอุ่น เป็นกันเอง ใช้อีโมจิได้เล็กน้อย
- ราคา (ใช้แทนกฎข้อ 4 ในโหมดนี้): ห้ามพิมพ์ตัวเลขราคาเอง เมื่อข้อมูลพอประเมิน ให้ใส่แท็ก [[estimate:<id>,<id> x<จำนวน>]]
  โดยเลือก id จากตารางด้านล่างเท่านั้น ระบบจะคำนวณและแสดงการ์ดราคาให้ แล้วบอกลูกค้าว่าเป็นราคาประมาณการ ทีมจะยืนยันอีกครั้ง
- ทุกครั้งที่รู้ความต้องการเพิ่ม ให้สรุปสั้น ๆ ในแท็ก [[brief:<สรุป 1–2 บรรทัด>]]
- ถ้าลูกค้าอยากคุยกับคน / พร้อมเริ่มงาน / ต้องนัดช่างหรือดูหน้างาน / ขอใบเสนอราคาจริง ให้ใส่แท็ก [[handoff]]
- งานซ่อม: แนะนำวิธีเช็กเบื้องต้นที่ปลอดภัยได้ แต่อย่าฟันธงสาเหตุ และแนะนำให้ส่งต่อทีมถ้าต้องดูเครื่อง
- ใช้แท็กลิงก์ / [[project:<id>]] ได้ตามกฎเดิม

ตารางราคาประมาณการ (id):
${pricingForPrompt(table)}

สถานะลูกค้าตอนนี้: ${status}${c.brief ? `\nความต้องการที่รู้แล้ว: ${c.brief}` : ""}${c.estimateSpec ? `\nประเมินไปแล้ว: ${c.estimateSpec}` : ""}`;
}

/** ดึงแท็กของโหมด concierge ออกจากคำตอบ AI */
export function parseConciergeTags(raw: string) {
  let estimateSpec: string | undefined;
  let brief: string | undefined;
  let handoff = false;
  const rest = raw.replace(/\[\[(estimate|brief):([^\]]+)\]\]/g, (_, kind: string, value: string) => {
    if (kind === "estimate") estimateSpec = value.trim();
    else brief = value.trim().slice(0, 300);
    return "";
  }).replace(/\[\[handoff\]\]/g, () => { handoff = true; return ""; });
  return { rest, estimateSpec, brief, handoff };
}

// ---------------------------------------------------------------- การ์ด

export function estimateCard(est: Estimate): LineMessage {
  const row = (name: string, range: string, strong = false) => ({
    type: "box", layout: "horizontal", spacing: "md", contents: [
      text(name, { flex: 5, size: "xs", ...(strong ? { weight: "bold" } : {}) }),
      text(range, { flex: 4, size: "xs", align: "end", color: strong ? C.deep : C.ink, weight: "bold" }),
    ],
  });
  return flex(`ประเมินราคาเบื้องต้น ${baht(est.total.min)} – ${baht(est.total.max)}`, bubble({
    header: header("ประเมินราคาเบื้องต้น 💰", "คำนวณจากข้อมูลที่คุยกัน — ทีมจะยืนยันอีกครั้ง"),
    body: { type: "box", layout: "vertical", spacing: "md", paddingAll: "20px", contents: [
      ...est.lines.map((l) => row(`${l.item.name}${l.qty > 1 ? ` × ${l.qty}` : ""}`, `${baht(l.min)} – ${baht(l.max)}`)),
      { type: "separator", color: C.line },
      { type: "box", layout: "vertical", paddingAll: "14px", cornerRadius: "12px", backgroundColor: C.light, spacing: "xs", contents: [
        text("รวมโดยประมาณ", { size: "xs", color: C.sub }),
        text(`${baht(est.total.min)} – ${baht(est.total.max)}`, { size: "xl", weight: "bold", color: C.deep }),
      ] },
      ...est.recurring.map((r) => row(`${r.item.name} (ต่อ${r.item.recurring})`, `${baht(r.min)} – ${baht(r.max)}`)),
      text("* ราคาประมาณการจากข้อมูลเบื้องต้น ไม่ใช่ใบเสนอราคา ทีมจะประเมินจริงหลังคุยรายละเอียดครับ", { size: "xxs", color: C.sub }),
    ] },
    footer: { type: "box", layout: "vertical", spacing: "sm", paddingAll: "16px", contents: [
      postbackButton("✅ ส่งให้ทีมยืนยันราคา", "a=handoff&r=estimate", true, "ส่งให้ทีมยืนยันราคา"),
      msgButton("✏️ ปรับรายละเอียด", "อยากปรับรายละเอียดงาน"),
    ] },
  }));
}

export function waitingCard(): LineMessage {
  return flex("แจ้งทีมแล้ว", bubble({
    header: header("แจ้งทีมแล้ว 📨", "ทีมจะมาตอบในแชตนี้โดยเร็วที่สุด"),
    body: { type: "box", layout: "vertical", spacing: "sm", paddingAll: "20px", contents: [
      text("ระหว่างรอ คุยกับ IASROM AI ต่อได้เลยครับ 🤖", { weight: "bold" }),
      listRow("•", "ถามรายละเอียดบริการหรือผลงาน"),
      listRow("•", "ปรับขอบเขตงาน / ดูราคาประมาณการใหม่"),
      listRow("•", "ส่งรูปหรือไฟล์ตัวอย่างไว้ให้ทีมดู"),
    ] },
  }), quickReply([
    { label: "🗂 ดูผลงาน", text: "ดูผลงาน" },
    { label: "💰 ประเมินราคาใหม่", text: "ขอประเมินราคาใหม่" },
    { label: "👥 ติดต่อทีมโดยตรง", text: "ติดต่อทีม" },
  ]));
}

export function adminTicketCard(t: Ticket, table: PriceItem[]): LineMessage {
  const est = t.estimateSpec ? estimate(t.estimateSpec, table) : null;
  return flex(`🔔 ลูกค้าใหม่: ${t.name}`, bubble({
    header: header("🔔 ลูกค้ารอคุยกับทีม", `${t.id} · ${new Date(t.createdAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" })}`),
    body: { type: "box", layout: "vertical", spacing: "md", paddingAll: "20px", contents: [
      text(t.name, { size: "lg", weight: "bold" }),
      text(`เหตุผล: ${t.reason}`, { size: "xs", color: C.sub }),
      { type: "box", layout: "vertical", paddingAll: "14px", cornerRadius: "12px", backgroundColor: C.bg, spacing: "xs", contents: [
        text("ความต้องการ (สรุปโดย AI)", { size: "xxs", color: C.deep, weight: "bold" }),
        text(t.brief || "ยังไม่มีรายละเอียด — ลูกค้าขอคุยกับทีมโดยตรง", { size: "sm" }),
      ] },
      ...(est ? [text(`ราคาประมาณการ: ${baht(est.total.min)} – ${baht(est.total.max)}`, { size: "sm", weight: "bold", color: C.deep })] : []),
    ] },
    footer: { type: "box", layout: "vertical", spacing: "sm", paddingAll: "16px", contents: [
      postbackButton("✋ รับเรื่อง", `a=accept&t=${t.id}`, true, `รับเรื่อง ${t.id}`),
      uriButton("💬 เปิดแชต OA", "https://chat.line.biz/"),
    ] },
  }));
}

export function acceptedAdminCard(t: Ticket): LineMessage {
  return flex(`รับเรื่อง ${t.id} แล้ว`, bubble({
    header: header("รับเรื่องแล้ว ✅", `${t.id} · ${t.name}`),
    body: { type: "box", layout: "vertical", spacing: "sm", paddingAll: "20px", contents: [
      text(`AI หยุดตอบลูกค้าคนนี้ ${HUMAN_HOURS} ชม. — ตอบลูกค้าได้ที่หน้าแชตของ LINE OA`, { size: "sm" }),
      text("คุยเสร็จแล้วกด \"คืนให้ AI\" เพื่อให้ AI ดูแลต่อ", { size: "xs", color: C.sub }),
    ] },
    footer: { type: "box", layout: "vertical", spacing: "sm", paddingAll: "16px", contents: [
      uriButton("💬 เปิดแชต OA", "https://chat.line.biz/", true),
      postbackButton("🤖 คืนให้ AI", `a=release&t=${t.id}`, false, `คืนให้ AI ${t.id}`),
    ] },
  }));
}

// ---------------------------------------------------------------- ส่งต่อทีม

/** สร้างเรื่องใหม่ (ถ้ายังไม่มีเรื่องที่เปิดอยู่) แล้วแจ้งทีมทุกคน */
export async function handoff(c: Customer, reason: string, table: PriceItem[]): Promise<{ ticket: Ticket; notified: number; isNew: boolean }> {
  if (c.ticketId) {
    const existing = await getTicket(c.ticketId);
    if (existing && existing.status !== "closed") return { ticket: existing, notified: 0, isNew: false };
  }
  const ticket: Ticket = {
    id: `T${Date.now().toString(36).toUpperCase().slice(-6)}`,
    userId: c.userId, name: c.name, brief: c.brief, estimateSpec: c.estimateSpec,
    reason, status: "open", createdAt: Date.now(),
  };
  await saveTicket(ticket);
  c.ticketId = ticket.id;
  const admins = await listAdmins();
  await Promise.all(admins.map((a) => push(a.userId, [adminTicketCard(ticket, table)])));
  return { ticket, notified: admins.length, isNew: true };
}
