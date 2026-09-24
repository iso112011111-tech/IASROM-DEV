import { NextResponse } from "next/server";
import { getInvoice, refreshInvoice, validWebhook } from "../../../lib/payments";

export const preferredRegion = ["sin1"];

// Omise แจ้งเหตุการณ์ของ charge มาที่นี่ — เราใช้แค่ "id ของบิล" แล้วไปถามสถานะจริงจาก Omise เอง
export async function POST(req: Request) {
  const body = await req.text();
  if (body.length > 64_000) return NextResponse.json({ error: "too large" }, { status: 413 });
  if (!validWebhook(body, req.headers.get("omise-signature"), req.headers.get("omise-signature-timestamp"))) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }
  try {
    const event = JSON.parse(body) as { key?: string; data?: { object?: string; id?: string; metadata?: { invoice_id?: string } } };
    const invoiceId = event.data?.object === "charge" ? event.data.metadata?.invoice_id : undefined;
    if (invoiceId) {
      const inv = await getInvoice(invoiceId);
      if (inv && inv.chargeId === event.data!.id) await refreshInvoice(inv, 0);
    }
  } catch (err) {
    console.error("omise webhook failed", err);
  }
  return NextResponse.json({ ok: true });
}
