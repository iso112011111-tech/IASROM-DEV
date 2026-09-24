import { NextResponse } from "next/server";
import { takeKey } from "../../../lib/ai";
import { getInvoice, refreshInvoice } from "../../../lib/payments";

export const preferredRegion = ["sin1"];
export const dynamic = "force-dynamic";

// หน้าชำระเงินถามสถานะที่นี่เป็นระยะ (ส่งกลับแค่สถานะ ไม่มีข้อมูลส่วนตัว)
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ip = (process.env.VERCEL ? (req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()) : null) || "local";
  if (!takeKey(`pay:${ip}`, 30)) return NextResponse.json({ error: "slow down" }, { status: 429 });
  const { id } = await params;
  const inv = await getInvoice(id);
  if (!inv) return NextResponse.json({ error: "not found" }, { status: 404 });
  const fresh = inv.status === "pending" ? await refreshInvoice(inv).catch(() => inv) : inv;
  return NextResponse.json({ status: fresh.status }, { headers: { "Cache-Control": "no-store" } });
}
