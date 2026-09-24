import { NextResponse } from "next/server";
import type { PriceItem } from "../../../data/pricing";
import { requireAdmin } from "../../../lib/adminAuth";
import { type Customer, getTicket, HUMAN_HOURS, loadCustomer, muteCustomer, saveCustomer, saveTicket, setConfig, unmuteCustomer } from "../../../lib/concierge";
import { push } from "../../../lib/line";
import { store } from "../../../lib/store";
import { cancelInvoice, createInvoice, getInvoice, refreshInvoice } from "../../../lib/payments";
import { resetPricing, savePricing } from "../../../lib/pricingStore";

export const preferredRegion = ["sin1"];

type Body =
  | { type: "pause" } | { type: "resume" }
  | { type: "mute" | "unmute"; userId: string }
  | { type: "accept" | "close"; ticketId: string }
  | { type: "savePricing"; items: PriceItem[] } | { type: "resetPricing" }
  | { type: "createInvoice"; userId: string; amount: string; description: string }
  | { type: "cancelInvoice" | "refreshInvoice"; invoiceId: string };

export async function POST(req: Request) {
  const session = requireAdmin(req, true);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.type) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const by = `${session.name} (หลังบ้าน)`;

  try {
    switch (body.type) {
      case "pause": await setConfig({ aiPaused: true, pausedBy: by, pausedAt: Date.now() }); break;
      case "resume": await setConfig({ aiPaused: false }); break;
      case "mute":
      case "unmute": {
        const c = await loadCustomer(body.userId, async () => "ลูกค้า");
        if (body.type === "mute") await muteCustomer(c, session.name); else await unmuteCustomer(c);
        break;
      }
      case "accept":
      case "close": {
        const t = await getTicket(body.ticketId);
        if (!t) return NextResponse.json({ error: "ไม่พบเรื่องนี้" }, { status: 404 });
        const c = await loadCustomer(t.userId, async () => t.name);
        if (body.type === "accept") {
          Object.assign(t, { status: "accepted", acceptedBy: session.name });
          Object.assign(c, { mode: "human", humanBy: session.name, humanUntil: Date.now() + HUMAN_HOURS * 3_600_000 });
          await Promise.all([saveTicket(t), saveCustomer(c)]);
          await push(t.userId, [{ type: "text", text: `✅ ${session.name} จากทีม IASROM-DEV รับเรื่องแล้ว กำลังมาตอบในแชตนี้ครับ` }]);
        } else {
          Object.assign(t, { status: "closed" });
          Object.assign(c, { mode: "ai", humanBy: undefined, humanUntil: undefined, ticketId: undefined });
          await Promise.all([saveTicket(t), saveCustomer(c)]);
        }
        break;
      }
      case "savePricing": await savePricing(body.items); break;
      case "resetPricing": await resetPricing(); break;
      case "createInvoice": {
        const userId = String(body.userId ?? "");
        const c = /^U[0-9a-f]{32}$/.test(userId) ? await store.get<Customer>("line_customers", userId) : null;
        if (!c) return NextResponse.json({ error: "ไม่พบลูกค้าคนนี้ (ต้องเคยทักไลน์มาก่อน)" }, { status: 404 });
        const inv = await createInvoice({ userId: c.userId, name: c.name, amount: String(body.amount ?? ""), description: String(body.description ?? ""), createdBy: session.name });
        return NextResponse.json({ ok: true, invoiceId: inv.id });
      }
      case "cancelInvoice":
      case "refreshInvoice": {
        const inv = await getInvoice(String(body.invoiceId ?? ""));
        if (!inv) return NextResponse.json({ error: "ไม่พบบิลนี้" }, { status: 404 });
        if (body.type === "cancelInvoice") await cancelInvoice(inv); else await refreshInvoice(inv, 0);
        break;
      }
      default: return NextResponse.json({ error: "unknown action" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin action failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed" }, { status: 500 });
  }
}
