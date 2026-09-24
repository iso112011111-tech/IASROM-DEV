// ระบบชำระเงินด้วย PromptPay QR ผ่าน Omise (Opn Payments)
// - ยอดเงินกำหนดได้จากหลังบ้านเท่านั้น (AI / ลูกค้าตั้งยอดเองไม่ได้)
// - เก็บยอดเป็น "สตางค์" (จำนวนเต็ม) ตลอด ไม่ใช้เลขทศนิยมแบบ float
// - สถานะ "ชำระแล้ว" เชื่อจากการถาม Omise โดยตรงเท่านั้น (ไม่เชื่อข้อมูลที่ส่งมากับ webhook)
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "./ai";
import { listAdmins } from "./concierge";
import { bubble, C, flex, push, SITE, text, uriButton, type LineMessage } from "./line";
import { inviteReview } from "./reviews";
import { store } from "./store";

const SECRET_KEY = env("OMISE_SECRET_KEY");
const WEBHOOK_SECRET = env("OMISE_WEBHOOK_SECRET");
const API = "https://api.omise.co";

export const paymentsConfigured = () => Boolean(SECRET_KEY && /^skey_(test_)?[a-z0-9]+$/i.test(SECRET_KEY));
export const paymentsTestMode = () => Boolean(SECRET_KEY?.startsWith("skey_test_"));

export const MIN_SATANG = 2_000;        // ฿20.00 — ขั้นต่ำของ PromptPay ที่ Omise
export const MAX_SATANG = 15_000_000;   // ฿150,000.00 — สูงสุดต่อรายการ
export const QR_MINUTES = 60;           // QR ใช้ได้กี่นาที (Omise ให้ไม่เกิน 24 ชม.)

export type InvoiceStatus = "pending" | "paid" | "failed" | "expired" | "canceled";
export type Invoice = {
  id: string;             // สุ่ม 128 บิต ใช้เป็นลิงก์หน้าชำระเงินด้วย (เดาไม่ได้)
  userId: string;         // LINE userId ของลูกค้า
  name: string;
  amount: number;         // สตางค์
  description: string;
  chargeId: string;
  qrUri: string;
  status: InvoiceStatus;
  createdBy: string;
  createdAt: number;
  expiresAt: number;
  paidAt?: number;
  checkedAt?: number;
  testMode: boolean;
  quoteId?: string;          // บิลมัดจำที่สร้างจากใบเสนอราคา
  inviteReview?: boolean;    // false = ไม่ต้องชวนรีวิวหลังจ่าย (เช่น บิลมัดจำ ยังไม่ได้เริ่มงาน)
};

const COL = "pay_invoices";

// ---------------------------------------------------------------- ยอดเงิน

/** "1,500.5" → 150050 (สตางค์) — รับทศนิยมไม่เกิน 2 ตำแหน่ง ไม่ผ่าน float */
export function parseAmount(input: string): number | null {
  const s = String(input ?? "").replace(/[,\s฿]/g, "");
  const m = s.match(/^(\d{1,7})(?:\.(\d{1,2}))?$/);
  if (!m) return null;
  const satang = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(satang) ? satang : null;
}

/** 150050 → "1,500.50" */
export const formatSatang = (satang: number) =>
  `${Math.floor(satang / 100).toLocaleString("en-US")}.${String(satang % 100).padStart(2, "0")}`;

// ---------------------------------------------------------------- Omise

type OmiseCharge = {
  object: "charge"; id: string; amount: number; currency: string; status: "pending" | "successful" | "failed" | "expired" | "reversed";
  paid: boolean; livemode: boolean; expires_at?: string; metadata?: Record<string, string>;
  failure_message?: string | null;
  source?: { type: string; scannable_code?: { image?: { download_uri?: string } } };
};

async function omise<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!paymentsConfigured()) throw new Error("ยังไม่ได้ตั้งค่า OMISE_SECRET_KEY");
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Basic ${Buffer.from(`${SECRET_KEY}:`).toString("base64")}`, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.object === "error") throw new Error(`Omise: ${data.message ?? res.status}`);
  return data as T;
}

const getCharge = (id: string) => omise<OmiseCharge>(`/charges/${encodeURIComponent(id)}`);

// ---------------------------------------------------------------- ใบแจ้งชำระ

export const getInvoice = (id: string) => (/^[A-Za-z0-9_-]{16,40}$/.test(id) ? store.get<Invoice>(COL, id) : Promise.resolve(null));
export const listInvoices = async () => (await store.list<Invoice>(COL)).sort((a, b) => b.createdAt - a.createdAt);
const saveInvoice = (inv: Invoice) => store.set(COL, inv.id, inv);
export const payUrl = (inv: Pick<Invoice, "id">) => `${SITE}/pay/${inv.id}`;

export async function createInvoice(opts: { userId: string; name: string; amount: string; description: string; createdBy: string; quoteId?: string; inviteReview?: boolean }) {
  const amount = parseAmount(opts.amount);
  if (amount === null) throw new Error("ยอดเงินไม่ถูกต้อง (ใส่ตัวเลข ทศนิยมไม่เกิน 2 ตำแหน่ง)");
  if (amount < MIN_SATANG || amount > MAX_SATANG) throw new Error(`ยอดต้องอยู่ระหว่าง ฿${formatSatang(MIN_SATANG)} – ฿${formatSatang(MAX_SATANG)}`);
  const description = opts.description.trim().replace(/\s+/g, " ").slice(0, 120);
  if (!description) throw new Error("ใส่รายละเอียดบิลด้วย");
  if (!/^U[0-9a-f]{32}$/.test(opts.userId)) throw new Error("ไม่พบลูกค้า LINE");

  const id = randomBytes(16).toString("base64url");
  const expiresAt = Date.now() + QR_MINUTES * 60_000;
  const charge = await omise<OmiseCharge>("/charges", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": id },
    body: new URLSearchParams({
      amount: String(amount),
      currency: "THB",
      "source[type]": "promptpay",
      expires_at: new Date(expiresAt).toISOString(),
      description: `IASROM-DEV · ${description}`.slice(0, 255),
      "metadata[invoice_id]": id,
    }),
  });
  const qrUri = charge.source?.scannable_code?.image?.download_uri;
  if (charge.amount !== amount || charge.currency.toUpperCase() !== "THB" || !qrUri) throw new Error("Omise ตอบกลับไม่ตรงกับบิล");

  const inv: Invoice = {
    id, userId: opts.userId, name: opts.name, amount, description, chargeId: charge.id, qrUri,
    status: "pending", createdBy: opts.createdBy, createdAt: Date.now(), expiresAt, testMode: !charge.livemode,
    ...(opts.quoteId ? { quoteId: opts.quoteId } : {}), ...(opts.inviteReview === false ? { inviteReview: false } : {}),
  };
  await saveInvoice(inv);
  // ส่งไลน์ไม่สำเร็จก็ยังเก็บบิลไว้ (ทีมเปิด/ส่งลิงก์ให้ลูกค้าเองจากหลังบ้านได้)
  await push(inv.userId, [invoiceCard(inv)]).catch((err) => console.error("invoice push failed", err));
  return inv;
}

/**
 * ถาม Omise ว่าบิลนี้จ่ายแล้วหรือยัง แล้วอัปเดตสถานะ — ใช้ทั้งจาก webhook, หน้าชำระเงิน และหลังบ้าน
 * แจ้ง "ชำระแล้ว" ทางไลน์ได้ครั้งเดียวต่อบิล (ล็อกด้วยเอกสาร pay_receipts ที่สร้างได้ครั้งเดียว)
 */
export async function refreshInvoice(inv: Invoice, minGapMs = 4_000): Promise<Invoice> {
  if (inv.status === "paid") return inv;
  if (inv.checkedAt && Date.now() - inv.checkedAt < minGapMs) return inv;
  const charge = await getCharge(inv.chargeId);
  // ตรวจซ้ำว่า charge นี้เป็นของบิลนี้จริง และยอดตรงถึงสตางค์
  if (charge.metadata?.invoice_id !== inv.id || charge.amount !== inv.amount || charge.currency.toUpperCase() !== "THB") {
    console.error("payment mismatch", inv.id, charge.id);
    return inv;
  }
  const next: InvoiceStatus =
    charge.status === "successful" && charge.paid ? "paid"
      : charge.status === "failed" || charge.status === "reversed" ? "failed"
        : charge.status === "expired" ? "expired"
          : inv.status === "canceled" ? "canceled"
            : Date.now() > inv.expiresAt + 5 * 60_000 ? "expired" : "pending";
  const updated: Invoice = { ...inv, status: next, checkedAt: Date.now(), ...(next === "paid" ? { paidAt: Date.now() } : {}) };
  await saveInvoice(updated);
  if (next === "paid" && await store.create("pay_receipts", inv.id, { at: Date.now(), chargeId: charge.id })) {
    await notifyPaid(updated).catch((err) => console.error("notify paid failed", err));
  }
  return updated;
}

export async function cancelInvoice(inv: Invoice) {
  const fresh = await refreshInvoice(inv, 0);
  if (fresh.status !== "pending") throw new Error(fresh.status === "paid" ? "บิลนี้ชำระแล้ว ยกเลิกไม่ได้" : "บิลนี้ปิดไปแล้ว");
  await omise(`/charges/${encodeURIComponent(fresh.chargeId)}/expire`, { method: "POST" }).catch(() => null);
  await saveInvoice({ ...fresh, status: "canceled" });
}

/** ดึงรูป QR (SVG) จาก Omise ฝั่งเซิร์ฟเวอร์ แล้วส่งให้หน้าเว็บเป็น data URI (ลิงก์จริงของ Omise ไม่หลุดไปฝั่งลูกค้า) */
export async function qrDataUri(inv: Invoice): Promise<string | null> {
  if (inv.status !== "pending" || !/^https:\/\/[a-z0-9.-]+\.omise\.co\//.test(inv.qrUri)) return null;
  try {
    const res = await fetch(inv.qrUri, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
    if (!res.ok) return null;
    const svg = await res.text();
    if (!svg.includes("<svg") || svg.length > 500_000) return null;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  } catch { return null; }
}

// ---------------------------------------------------------------- webhook

/** ตรวจลายเซ็น Omise-Signature (HMAC-SHA256 ของ "timestamp.body" ด้วย secret แบบ base64) และเวลาไม่เก่าเกิน 5 นาที */
export function validWebhook(body: string, signature: string | null, timestamp: string | null) {
  if (!WEBHOOK_SECRET) return true; // ไม่ได้ตั้ง secret — ยังปลอดภัยเพราะเราถาม Omise ซ้ำเองทุกครั้ง
  if (!signature || !timestamp || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", Buffer.from(WEBHOOK_SECRET, "base64")).update(`${timestamp}.${body}`).digest();
  return signature.split(",").some((s) => {
    const got = Buffer.from(s.trim(), "hex");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

// ---------------------------------------------------------------- LINE cards

const amountRow = (satang: number) => ({
  type: "box", layout: "baseline", spacing: "sm", contents: [
    { type: "text", text: "฿", size: "lg", color: C.deep, weight: "bold", flex: 0 },
    { type: "text", text: formatSatang(satang), size: "3xl", color: C.deep, weight: "bold", flex: 0 },
  ],
});

export function invoiceCard(inv: Invoice): LineMessage {
  const until = new Date(inv.expiresAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
  return flex(`บิลชำระเงิน ฿${formatSatang(inv.amount)} — ${inv.description}`, bubble({
    header: {
      type: "box", layout: "vertical", paddingAll: "20px", spacing: "xs",
      background: { type: "linearGradient", angle: "135deg", startColor: "#1f5fa8", endColor: "#123f73" },
      contents: [
        { type: "text", text: "IASROM-DEV · PromptPay", size: "xxs", color: "#cfe0f5", weight: "bold" },
        { type: "text", text: "บิลชำระเงิน", size: "xl", color: "#ffffff", weight: "bold" },
        { type: "text", text: inv.testMode ? "โหมดทดสอบ — ยังไม่ตัดเงินจริง" : "สแกนจ่ายได้ทุกธนาคาร", size: "xs", color: "#e3eefb" },
      ],
    },
    body: {
      type: "box", layout: "vertical", spacing: "md", paddingAll: "20px", contents: [
        text(inv.description, { weight: "bold" }),
        amountRow(inv.amount),
        { type: "separator", color: C.line },
        text(`🔒 QR ใช้ได้ถึง ${until} น. · ยอดถูกล็อกไว้ในระบบ`, { size: "xs", color: C.sub }),
        text("ระบบยืนยันยอดให้อัตโนมัติ ไม่ต้องส่งสลิป", { size: "xs", color: C.sub }),
      ],
    },
    footer: { type: "box", layout: "vertical", paddingAll: "16px", contents: [uriButton("เปิด QR ชำระเงิน", payUrl(inv), true)] },
  }));
}

export function receiptCard(inv: Invoice): LineMessage {
  const at = new Date(inv.paidAt ?? Date.now()).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });
  return flex(`ชำระเงินสำเร็จ ฿${formatSatang(inv.amount)}`, bubble({
    body: {
      type: "box", layout: "vertical", spacing: "md", paddingAll: "22px", contents: [
        { type: "text", text: "✅ ชำระเงินสำเร็จ", size: "lg", weight: "bold", color: C.deep },
        text(inv.description),
        amountRow(inv.amount),
        { type: "separator", color: C.line },
        text(`${at} น. · เลขที่ ${inv.id.slice(0, 10).toUpperCase()}`, { size: "xs", color: C.sub }),
        text("ขอบคุณที่ใช้บริการ IASROM-DEV ครับ 🙏", { size: "xs", color: C.sub }),
      ],
    },
  }));
}

async function notifyPaid(inv: Invoice) {
  await push(inv.userId, [receiptCard(inv)]);
  if (inv.inviteReview !== false) await inviteReview(inv.userId, `inv:${inv.id}`, inv.description, inv.name).catch(() => null);
  const admins = await listAdmins();
  await Promise.all(admins.map((a) => push(a.userId, [{
    type: "text",
    text: `💰 ได้รับเงินแล้ว ฿${formatSatang(inv.amount)}\nจาก ${inv.name} · ${inv.description}${inv.testMode ? "\n(โหมดทดสอบ)" : ""}`,
  }])));
}
