import { NextResponse } from "next/server";
import { takeKey } from "../../lib/ai";
import { availability, createBooking } from "../../lib/bookings";
import { clientIp, readLink, sameOrigin } from "../../lib/ids";

export const preferredRegion = ["sin1"];
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ days: await availability() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!takeKey(`book:${clientIp(req)}`, 4)) return NextResponse.json({ error: "จองถี่เกินไป ลองใหม่อีกสักครู่" }, { status: 429 });
  const body = (await req.json().catch(() => ({}))) as Record<string, string>;
  const link = readLink(body.u); // มาจากลิงก์ในไลน์ → ส่งยืนยันกลับเข้าไลน์ได้
  try {
    const b = await createBooking({ service: body.service, date: body.date, slot: body.slot, name: body.name, phone: body.phone, note: body.note, userId: link?.u });
    return NextResponse.json({ ok: true, no: b.no, line: Boolean(b.userId) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "จองไม่สำเร็จ" }, { status: 400 });
  }
}
