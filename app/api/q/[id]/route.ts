import { NextResponse } from "next/server";
import { takeKey } from "../../../lib/ai";
import { clientIp, sameOrigin } from "../../../lib/ids";
import { acceptQuote, declineQuote, getQuote } from "../../../lib/quotes";

export const preferredRegion = ["sin1"];

// ลูกค้ากดตอบรับ / ปฏิเสธใบเสนอราคา (ลิงก์สุ่มเดาไม่ได้ + ต้องมาจากหน้าเว็บเรา)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!takeKey(`quote:${clientIp(req)}`, 10)) return NextResponse.json({ error: "ลองใหม่อีกสักครู่" }, { status: 429 });
  const { id } = await params;
  const q = await getQuote(id);
  if (!q) return NextResponse.json({ error: "ไม่พบใบเสนอราคา" }, { status: 404 });
  const { action } = (await req.json().catch(() => ({}))) as { action?: string };
  try {
    const next = action === "accept" ? await acceptQuote(q) : action === "decline" ? await declineQuote(q) : null;
    if (!next) return NextResponse.json({ error: "bad request" }, { status: 400 });
    return NextResponse.json({ ok: true, status: next.status, invoiceId: next.invoiceId });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed" }, { status: 409 });
  }
}
