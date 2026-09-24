// ใบเสนอราคา: ร่างจากบรีฟที่ AI สรุป → ทีมแก้ในหลังบ้าน → ส่งเข้าไลน์ → ลูกค้ากดยอมรับ → ออกบิลมัดจำ QR ให้อัตโนมัติ
import { estimate, type PriceItem } from "../data/pricing";
import type { Customer } from "./concierge";
import { listAdmins } from "./concierge";
import { docNo, token, validToken } from "./ids";
import { bubble, C, flex, push, SITE, text, uriButton, type LineMessage } from "./line";
import { createInvoice, formatSatang, paymentsConfigured } from "./payments";
import { store } from "./store";

export type QuoteLine = { name: string; detail?: string; qty: number; price: number /* สตางค์ต่อหน่วย */ };
export type QuoteStatus = "draft" | "sent" | "accepted" | "declined";
export type Quote = {
  id: string;             // ลิงก์สาธารณะ (สุ่ม เดาไม่ได้)
  no: string;             // เลขที่เอกสาร เช่น QT-260924-7K2P
  userId: string;
  name: string;           // ชื่อลูกค้าที่แสดงบนเอกสาร
  title: string;
  lines: QuoteLine[];
  scope: string[];        // ขอบเขตงาน / สิ่งที่ได้รับ
  terms: string[];        // เงื่อนไข
  days: number;           // ระยะเวลาทำงาน (วัน)
  depositPercent: number; // มัดจำกี่ % (0 = ไม่เก็บมัดจำ)
  validDays: number;      // ใบเสนอราคามีอายุกี่วัน
  status: QuoteStatus;
  createdBy: string;
  createdAt: number;
  sentAt?: number;
  respondedAt?: number;
  invoiceId?: string;
};

const COL = "quotes";
export const DEFAULT_TERMS = [
  "ราคานี้ยังไม่รวมภาษีมูลค่าเพิ่ม (ถ้ามี)",
  "แก้ไขงานได้ 2 รอบในขอบเขตงานที่ตกลง งานนอกขอบเขตประเมินราคาเพิ่มก่อนทำทุกครั้ง",
  "ชำระมัดจำก่อนเริ่มงาน ส่วนที่เหลือชำระเมื่อส่งมอบงาน",
];

export const getQuote = (id: string) => (validToken(id) ? store.get<Quote>(COL, id) : Promise.resolve(null));
export const listQuotes = async () => (await store.list<Quote>(COL)).sort((a, b) => b.createdAt - a.createdAt);
export const saveQuote = (q: Quote) => store.set(COL, q.id, q);

export const quoteTotal = (q: Pick<Quote, "lines">) => q.lines.reduce((s, l) => s + l.price * l.qty, 0);
export const quoteDeposit = (q: Pick<Quote, "lines" | "depositPercent">) => Math.round((quoteTotal(q) * q.depositPercent) / 100);
export const quoteUrl = (q: Pick<Quote, "id">) => `${SITE}/q/${q.id}`;
export const quoteExpired = (q: Quote) => q.status === "sent" && Date.now() > (q.sentAt ?? q.createdAt) + q.validDays * 86_400_000;

/** ร่างใบเสนอราคาจากสิ่งที่ AI คุยกับลูกค้า (ราคากลางของช่วงประเมิน ปัดเป็นหลักร้อย) */
export function draftFromCustomer(c: Customer, table: PriceItem[], by: string): Quote {
  const est = c.estimateSpec ? estimate(c.estimateSpec, table) : null;
  const mid = (min: number, max: number) => Math.round((min + max) / 2 / 100) * 100 * 100;
  const lines: QuoteLine[] = est
    ? [
        ...est.lines.map((l) => ({ name: l.item.name, detail: l.item.note, qty: l.qty, price: mid(l.item.min, l.item.max) })),
        ...est.recurring.map((r) => ({ name: `${r.item.name} (ต่อ${r.item.recurring})`, qty: 1, price: mid(r.item.min, r.item.max) })),
      ]
    : [{ name: "ค่าบริการตามขอบเขตงาน", qty: 1, price: 0 }];
  return {
    id: token(), no: docNo("QT"), userId: c.userId, name: c.name,
    title: est?.lines[0]?.item.name ?? "ใบเสนอราคา",
    lines, scope: c.brief ? [c.brief] : [], terms: DEFAULT_TERMS, days: 14, depositPercent: 50, validDays: 14,
    status: "draft", createdBy: by, createdAt: Date.now(),
  };
}

/** ตรวจและทำความสะอาดข้อมูลที่ทีมแก้มาจากหลังบ้าน */
export function cleanQuote(input: Partial<Quote>, base: Quote): Quote {
  const str = (v: unknown, max: number) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, max);
  const lines = (Array.isArray(input.lines) ? input.lines : base.lines).slice(0, 30).map((l) => ({
    name: str(l.name, 120),
    ...(l.detail ? { detail: str(l.detail, 200) } : {}),
    qty: Math.min(Math.max(Math.round(Number(l.qty) || 1), 1), 999),
    price: Math.min(Math.max(Math.round(Number(l.price) || 0), 0), 100_000_000_00),
  })).filter((l) => l.name);
  if (!lines.length) throw new Error("ต้องมีรายการอย่างน้อย 1 รายการ");
  const list = (v: unknown, fallback: string[]) => (Array.isArray(v) ? v : fallback).map((x) => str(x, 300)).filter(Boolean).slice(0, 15);
  return {
    ...base,
    name: str(input.name ?? base.name, 60) || base.name,
    title: str(input.title ?? base.title, 120) || "ใบเสนอราคา",
    lines,
    scope: list(input.scope, base.scope),
    terms: list(input.terms, base.terms),
    days: Math.min(Math.max(Math.round(Number(input.days ?? base.days) || 0), 1), 365),
    depositPercent: Math.min(Math.max(Math.round(Number(input.depositPercent ?? base.depositPercent) || 0), 0), 100),
    validDays: Math.min(Math.max(Math.round(Number(input.validDays ?? base.validDays) || 0), 1), 90),
  };
}

export async function sendQuote(q: Quote) {
  if (!quoteTotal(q)) throw new Error("ยอดรวมเป็น 0 — ใส่ราคาก่อนส่ง");
  // กดส่งซ้อนกัน → ส่งได้ครั้งเดียว
  if (!(await store.create("quote_locks", `send_${q.id}`, { at: Date.now() }))) throw new Error("ใบนี้กำลังส่ง/ส่งไปแล้ว");
  const sent: Quote = { ...q, status: "sent", sentAt: Date.now() };
  // ส่งไลน์ก่อน ถ้าไม่สำเร็จ ใบยังเป็น "ร่าง" ให้ลองส่งใหม่ได้
  if (!(await push(q.userId, [quoteCard(sent)]).catch(() => false))) {
    await store.delete("quote_locks", `send_${q.id}`);
    throw new Error("ส่งเข้าไลน์ไม่สำเร็จ ลองใหม่อีกครั้ง");
  }
  await saveQuote(sent);
  return sent;
}

/** ลูกค้ากดยอมรับ → แจ้งทีม + ออกบิลมัดจำอัตโนมัติ (ถ้าเปิดระบบชำระเงินไว้) */
export async function acceptQuote(q: Quote) {
  if (q.status !== "sent" || quoteExpired(q)) throw new Error("ใบเสนอราคานี้ตอบรับไม่ได้แล้ว");
  // กดตอบรับ/ปฏิเสธซ้อนกันหลายครั้ง → ทำได้ครั้งเดียว (กันออกบิลมัดจำซ้ำ)
  if (!(await store.create("quote_locks", `respond_${q.id}`, { at: Date.now(), action: "accept" }))) throw new Error("ใบเสนอราคานี้ตอบไปแล้ว");
  const accepted: Quote = { ...q, status: "accepted", respondedAt: Date.now() };
  await saveQuote(accepted);
  const deposit = quoteDeposit(q);
  if (deposit >= 2_000 && paymentsConfigured()) {
    try {
      const inv = await createInvoice({
        userId: q.userId, name: q.name, amount: formatSatang(deposit), createdBy: "ระบบ (ใบเสนอราคา)",
        description: `มัดจำ ${q.depositPercent}% · ${q.title} (${q.no})`, quoteId: q.id, inviteReview: false,
      });
      accepted.invoiceId = inv.id;
      await saveQuote(accepted);
    } catch (err) { console.error("deposit invoice failed", err); }
  }
  await notifyTeam(`🎉 ลูกค้าตอบรับใบเสนอราคาแล้ว\n${q.name} · ${q.title}\nยอด ฿${formatSatang(quoteTotal(q))} (${q.no})${accepted.invoiceId ? `\nส่งบิลมัดจำ ฿${formatSatang(deposit)} ให้แล้ว` : ""}`);
  return accepted;
}

export async function declineQuote(q: Quote) {
  if (q.status !== "sent") throw new Error("ใบเสนอราคานี้ตอบไปแล้ว");
  if (!(await store.create("quote_locks", `respond_${q.id}`, { at: Date.now(), action: "decline" }))) throw new Error("ใบเสนอราคานี้ตอบไปแล้ว");
  const d: Quote = { ...q, status: "declined", respondedAt: Date.now() };
  await saveQuote(d);
  await notifyTeam(`ลูกค้าปฏิเสธใบเสนอราคา\n${q.name} · ${q.title} (${q.no})\nลองทักไปคุยต่อได้ครับ`);
  return d;
}

async function notifyTeam(message: string) {
  const admins = await listAdmins();
  await Promise.all(admins.map((a) => push(a.userId, [{ type: "text", text: message }]).catch(() => null)));
}

function quoteCard(q: Quote): LineMessage {
  const total = quoteTotal(q);
  return flex(`ใบเสนอราคา ${q.no} ยอด ฿${formatSatang(total)}`, bubble({
    header: {
      type: "box", layout: "vertical", paddingAll: "20px", spacing: "xs",
      background: { type: "linearGradient", angle: "135deg", startColor: "#1c2b27", endColor: "#2f8a74" },
      contents: [
        { type: "text", text: `IASROM-DEV · ${q.no}`, size: "xxs", color: "#bfe9da", weight: "bold" },
        { type: "text", text: "ใบเสนอราคา", size: "xl", color: "#ffffff", weight: "bold" },
        { type: "text", text: q.title, size: "xs", color: "#e8faf3", wrap: true },
      ],
    },
    body: {
      type: "box", layout: "vertical", spacing: "sm", paddingAll: "20px", contents: [
        ...q.lines.slice(0, 5).map((l) => ({
          type: "box", layout: "horizontal", contents: [
            text(`${l.name}${l.qty > 1 ? ` × ${l.qty}` : ""}`, { flex: 5, size: "xs" }),
            text(`฿${formatSatang(l.price * l.qty)}`, { flex: 3, size: "xs", align: "end", color: C.sub }),
          ],
        })),
        ...(q.lines.length > 5 ? [text(`และอีก ${q.lines.length - 5} รายการ`, { size: "xxs", color: C.sub })] : []),
        { type: "separator", color: C.line, margin: "md" },
        {
          type: "box", layout: "horizontal", margin: "md", contents: [
            text("ยอดรวม", { weight: "bold" }),
            text(`฿${formatSatang(total)}`, { weight: "bold", align: "end", color: C.deep, size: "lg" }),
          ],
        },
        text(`ระยะเวลา ~${q.days} วัน${q.depositPercent ? ` · มัดจำ ${q.depositPercent}%` : ""} · ยืนราคา ${q.validDays} วัน`, { size: "xxs", color: C.sub }),
      ],
    },
    footer: { type: "box", layout: "vertical", paddingAll: "16px", contents: [uriButton("เปิดดูและตอบรับ", quoteUrl(q), true)] },
  }));
}
