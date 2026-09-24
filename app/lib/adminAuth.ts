// ล็อกอินหน้าหลังบ้าน: รหัสผ่านเดียวของทีม (env ADMIN_PASSWORD) + session ในคุกกี้ที่เซ็นด้วย HMAC
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./ai";

export const SESSION_COOKIE = "iasrom_admin";
const SESSION_HOURS = 12;
const PASSWORD = env("ADMIN_PASSWORD");
const SECRET = env("ADMIN_SESSION_SECRET") || createHash("sha256").update(`iasrom-admin:${PASSWORD ?? ""}`).digest("hex");

export const adminConfigured = () => Boolean(PASSWORD && PASSWORD.length >= 10);

const hmac = (s: string) => createHmac("sha256", SECRET).update(s).digest("base64url");
const same = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** เทียบรหัสผ่านแบบเวลาคงที่ (ไม่ให้เดาทีละตัวจากเวลาตอบ) */
export function checkPassword(input: string) {
  if (!adminConfigured()) return false;
  return same(hmac(`pw:${input}`), hmac(`pw:${PASSWORD}`));
}

export type Session = { name: string; exp: number };

export function createSession(name: string) {
  const payload = Buffer.from(JSON.stringify({ name: name.slice(0, 40), exp: Date.now() + SESSION_HOURS * 3_600_000 })).toString("base64url");
  return { value: `${payload}.${hmac(payload)}`, maxAge: SESSION_HOURS * 3600 };
}

export function readSession(value: string | undefined | null): Session | null {
  if (!value || !adminConfigured()) return null;
  const [payload, sig] = value.split(".");
  if (!payload || !sig || !same(sig, hmac(payload))) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    return s.exp > Date.now() ? s : null;
  } catch { return null; }
}

/** อ่าน session จาก Request (ใช้ใน API) — ตรวจ Origin ด้วยสำหรับคำสั่งที่เปลี่ยนข้อมูล */
export function requireAdmin(req: Request, mutate = false): Session | null {
  if (mutate) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    try { if (!origin || new URL(origin).host !== host) return null; } catch { return null; }
  }
  const cookie = req.headers.get("cookie") ?? "";
  const value = cookie.split(/;\s*/).find((c) => c.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  return readSession(value ? decodeURIComponent(value) : null);
}
