import { NextResponse } from "next/server";
import type { PriceItem } from "../../../data/pricing";
import { requireAdmin } from "../../../lib/adminAuth";
import { getTicket, HUMAN_HOURS, loadCustomer, muteCustomer, saveCustomer, saveTicket, setConfig, unmuteCustomer } from "../../../lib/concierge";
import { push } from "../../../lib/line";
import { resetPricing, savePricing } from "../../../lib/pricingStore";

export const preferredRegion = ["sin1"];

type Body =
  | { type: "pause" } | { type: "resume" }
  | { type: "mute" | "unmute"; userId: string }
  | { type: "accept" | "close"; ticketId: string }
  | { type: "savePricing"; items: PriceItem[] } | { type: "resetPricing" };

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
      default: return NextResponse.json({ error: "unknown action" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin action failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed" }, { status: 500 });
  }
}
