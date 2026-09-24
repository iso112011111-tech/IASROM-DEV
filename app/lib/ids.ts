// เครื่องมือกลาง: รหัสสุ่มสำหรับลิงก์สาธารณะ, เลขเอกสาร, ลิงก์ที่ผูกกับ LINE userId แบบเซ็นกันปลอม, และ QR
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import QRCode from "qrcode";
import { env } from "./ai";

/** รหัสสุ่ม 128 บิต (ใช้เป็นลิงก์หน้าสาธารณะ — เดาไม่ได้) */
export const token = () => randomBytes(16).toString("base64url");
export const validToken = (id: string) => /^[A-Za-z0-9_-]{16,40}$/.test(id);

const ALPHA = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // ไม่มี 0/O/1/I ให้อ่านง่ายเวลาบอกทางโทรศัพท์
/** เลขอ้างอิงอ่านง่าย เช่น QT-260924-7K2P */
export function docNo(prefix: string) {
  const d = new Date(Date.now() + 7 * 3_600_000); // เวลาไทย
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const tail = [...randomBytes(4)].map((b) => ALPHA[b % ALPHA.length]).join("");
  return `${prefix}-${ymd}-${tail}`;
}

// ---------------------------------------------------------------- ลิงก์ผูก LINE userId
// ใช้ส่งลิงก์จากบอทไปหน้าเว็บ (เช่น จองคิว / รีวิว) ให้เว็บรู้ว่าเป็นลูกค้าคนไหน โดยปลอมหรือแก้ userId ไม่ได้
const SIGN_SECRET = env("ADMIN_SESSION_SECRET") ?? env("LINE_CHANNEL_SECRET") ?? "";
const sig = (s: string) => createHmac("sha256", `link:${SIGN_SECRET}`).update(s).digest("base64url").slice(0, 32);

export function signLink(data: Record<string, string>, days = 7) {
  const payload = Buffer.from(JSON.stringify({ ...data, exp: Date.now() + days * 86_400_000 })).toString("base64url");
  return `${payload}.${sig(payload)}`;
}

export function readLink(value: string | null | undefined): Record<string, string> | null {
  if (!value || !SIGN_SECRET) return null;
  const [payload, s] = value.split(".");
  if (!payload || !s) return null;
  const a = Buffer.from(s), b = Buffer.from(sig(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const d = JSON.parse(Buffer.from(payload, "base64url").toString());
    return d.exp > Date.now() ? d : null;
  } catch { return null; }
}

// ---------------------------------------------------------------- QR

/** QR เป็น SVG (ใช้แปะหน้าเว็บ / พิมพ์สติกเกอร์) */
export const qrSvg = (text: string, color = "#17211e") =>
  QRCode.toString(text, { type: "svg", errorCorrectionLevel: "M", margin: 1, color: { dark: color, light: "#ffffff" } });

export const qrDataUri = async (text: string, color?: string) =>
  `data:image/svg+xml;base64,${Buffer.from(await qrSvg(text, color)).toString("base64")}`;

/** IP ของผู้ใช้ (เชื่อ header เฉพาะตอนอยู่หลัง proxy ของ Vercel) */
export const clientIp = (req: Request) =>
  (process.env.VERCEL || process.env.TRUST_PROXY === "1"
    ? req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    : null) || "local";

/** ตรวจว่าคำขอมาจากเว็บเราเอง (กันเว็บอื่นยิงฟอร์มแทนผู้ใช้) */
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  try { return Boolean(origin && new URL(origin).host === host); } catch { return false; }
}
