import { NextResponse } from "next/server";
import { takeKey } from "../../../lib/ai";
import { adminConfigured, checkPassword, createSession, SESSION_COOKIE } from "../../../lib/adminAuth";
import { clientIp, sameOrigin } from "../../../lib/ids";

export const preferredRegion = ["sin1"];

export async function POST(req: Request) {
  if (!adminConfigured()) return NextResponse.json({ error: "ยังไม่ได้ตั้งรหัสผ่านหลังบ้าน (ADMIN_PASSWORD)" }, { status: 503 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const ip = clientIp(req);
  // จำกัด 5 ครั้งต่อนาทีต่อ IP กันการสุ่มรหัส
  if (!takeKey(`admin-login:${ip}`, 5)) return NextResponse.json({ error: "ลองบ่อยเกินไป รอ 1 นาทีแล้วลองใหม่" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().replace(/\s+/g, " ").slice(0, 30) : "ทีม";
  if (typeof body.password !== "string" || !checkPassword(body.password)) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: "รหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }
  const session = createSession(name);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, session.value, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: session.maxAge,
  });
  return res;
}
