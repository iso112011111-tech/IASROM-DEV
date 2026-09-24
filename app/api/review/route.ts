import { NextResponse } from "next/server";
import { takeKey } from "../../lib/ai";
import { listAdmins } from "../../lib/concierge";
import { clientIp, readLink, sameOrigin } from "../../lib/ids";
import { push } from "../../lib/line";
import { createReview, reviewId } from "../../lib/reviews";

export const preferredRegion = ["sin1"];

// รับรีวิวได้เฉพาะจากลิงก์ที่ระบบส่งให้ลูกค้าจริง (เซ็นกันปลอม) และ 1 งานรีวิวได้ครั้งเดียว
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!takeKey(`review:${clientIp(req)}`, 5)) return NextResponse.json({ error: "ลองใหม่อีกสักครู่" }, { status: 429 });
  const body = (await req.json().catch(() => ({}))) as { t?: string; rating?: number; text?: string; name?: string };
  const link = readLink(body.t);
  if (!link?.ref) return NextResponse.json({ error: "ลิงก์รีวิวหมดอายุหรือไม่ถูกต้อง" }, { status: 400 });
  const rating = Math.round(Number(body.rating));
  if (!(rating >= 1 && rating <= 5)) return NextResponse.json({ error: "เลือกคะแนนก่อนครับ" }, { status: 400 });
  const text = String(body.text ?? "").replace(/\s+/g, " ").trim().slice(0, 500);
  const name = String(body.name ?? "").replace(/\s+/g, " ").trim().slice(0, 40) || "ลูกค้า IASROM-DEV";

  const ok = await createReview({
    id: reviewId(link.ref), ref: link.ref, ...(link.u ? { userId: link.u } : {}), name, rating, text,
    topic: link.topic ?? "", approved: false, createdAt: Date.now(),
  });
  if (!ok) return NextResponse.json({ error: "งานนี้รีวิวไปแล้ว ขอบคุณมากครับ 🙏" }, { status: 409 });

  const admins = await listAdmins();
  await Promise.all(admins.map((a) => push(a.userId, [{ type: "text", text: `${"⭐".repeat(rating)} รีวิวใหม่จาก ${name}\n${link.topic ?? ""}\n"${text || "(ไม่มีข้อความ)"}"\nอนุมัติขึ้นเว็บได้ในหลังบ้าน → แท็บรีวิว` }]).catch(() => null)));
  return NextResponse.json({ ok: true });
}
