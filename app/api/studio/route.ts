import { NextResponse } from "next/server";
import { takeKey } from "../../lib/ai";
import { clientIp, sameOrigin } from "../../lib/ids";
import { generateMockup } from "../../lib/mockups";

export const preferredRegion = ["sin1"];
export const maxDuration = 60;

// จำกัดต่อ IP: 2 ครั้ง/นาที และ 10 ครั้ง/วัน (AI มีค่าใช้จ่าย)
const daily = new Map<string, { day: string; n: number }>();
function takeDaily(ip: string) {
  const day = new Date().toISOString().slice(0, 10);
  const e = daily.get(ip);
  if (!e || e.day !== day) { daily.set(ip, { day, n: 1 }); if (daily.size > 5000) daily.delete(daily.keys().next().value!); return true; }
  return ++e.n <= 10;
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const ip = clientIp(req);
  if (!takeKey(`studio:${ip}`, 2) || !takeDaily(ip)) return NextResponse.json({ error: "ใช้งานถี่เกินไป ลองใหม่อีกสักครู่นะครับ" }, { status: 429 });
  const body = (await req.json().catch(() => ({}))) as Record<string, string>;
  const clip = (v: unknown, n: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
  const prompt = { business: clip(body.business, 200), name: clip(body.name, 50), vibe: clip(body.vibe, 80) };
  if (prompt.business.length < 4) return NextResponse.json({ error: "เล่าธุรกิจของคุณสั้นๆ ก่อนครับ" }, { status: 400 });
  const m = await generateMockup(prompt);
  if (m === "budget") return NextResponse.json({ error: "ตอนนี้มีคนใช้เยอะมาก ลองใหม่อีกสักครู่ครับ" }, { status: 503 });
  if (!m) return NextResponse.json({ error: "AI ออกแบบไม่สำเร็จ ลองใหม่อีกครั้งครับ" }, { status: 502 });
  return NextResponse.json({ id: m.id });
}
