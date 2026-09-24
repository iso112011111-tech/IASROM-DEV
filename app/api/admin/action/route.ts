import { NextResponse } from "next/server";
import type { PriceItem } from "../../../data/pricing";
import { requireAdmin } from "../../../lib/adminAuth";
import { type Customer, getTicket, HUMAN_HOURS, loadCustomer, muteCustomer, saveCustomer, saveTicket, setConfig, unmuteCustomer } from "../../../lib/concierge";
import { push } from "../../../lib/line";
import { getBooking, setBookingStatus, type BookingStatus } from "../../../lib/bookings";
import { addJobUpdate, createJob, getJob, moveJob, setJobInfo, type JobKind } from "../../../lib/jobs";
import { getPricing } from "../../../lib/pricingStore";
import { cleanQuote, draftFromCustomer, getQuote, saveQuote, sendQuote, type Quote } from "../../../lib/quotes";
import { deleteReview, getReview, saveReview } from "../../../lib/reviews";
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
  | { type: "cancelInvoice" | "refreshInvoice"; invoiceId: string }
  | { type: "quoteDraft"; userId: string } | { type: "quoteSave"; id: string; quote: Partial<Quote> }
  | { type: "quoteSend" | "quoteDelete"; id: string }
  | { type: "jobCreate"; kind: JobKind; userId?: string; name: string; title: string; device?: string }
  | { type: "jobMove"; id: string; to: number; note?: string } | { type: "jobUpdate"; id: string; note: string }
  | { type: "jobInfo"; id: string; previewUrl?: string; warrantyMonths?: number }
  | { type: "bookingStatus"; id: string; status: BookingStatus }
  | { type: "reviewApprove"; id: string; approved: boolean } | { type: "reviewDelete"; id: string };

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
      case "quoteDraft": {
        const c = /^U[0-9a-f]{32}$/.test(String(body.userId)) ? await store.get<Customer>("line_customers", body.userId) : null;
        if (!c) return NextResponse.json({ error: "ไม่พบลูกค้าคนนี้" }, { status: 404 });
        const q = draftFromCustomer(c, await getPricing(), session.name);
        await saveQuote(q);
        return NextResponse.json({ ok: true, id: q.id });
      }
      case "quoteSave":
      case "quoteSend":
      case "quoteDelete": {
        const q = await getQuote(String(body.id ?? ""));
        if (!q) return NextResponse.json({ error: "ไม่พบใบเสนอราคา" }, { status: 404 });
        if (q.status !== "draft" && body.type !== "quoteSend") return NextResponse.json({ error: "ส่งไปแล้ว แก้ไข/ลบไม่ได้ — สร้างฉบับใหม่แทน" }, { status: 409 });
        if (body.type === "quoteSave") await saveQuote(cleanQuote(body.quote ?? {}, q));
        else if (body.type === "quoteDelete") await store.delete("quotes", q.id);
        else {
          if (q.status !== "draft") return NextResponse.json({ error: "ใบนี้ส่งไปแล้ว" }, { status: 409 });
          await sendQuote(q);
        }
        break;
      }
      case "jobCreate": {
        const j = await createJob({ kind: body.kind, userId: body.userId, name: body.name, title: body.title, device: body.device, createdBy: session.name });
        return NextResponse.json({ ok: true, id: j.id });
      }
      case "jobMove":
      case "jobUpdate":
      case "jobInfo": {
        const j = await getJob(String(body.id ?? ""));
        if (!j) return NextResponse.json({ error: "ไม่พบงานนี้" }, { status: 404 });
        if (body.type === "jobMove") await moveJob(j, Number(body.to), session.name, body.note);
        else if (body.type === "jobUpdate") await addJobUpdate(j, String(body.note ?? ""), session.name);
        else await setJobInfo(j, { previewUrl: body.previewUrl, warrantyMonths: body.warrantyMonths });
        break;
      }
      case "bookingStatus": {
        const b = await getBooking(String(body.id ?? ""));
        if (!b) return NextResponse.json({ error: "ไม่พบคิวนี้" }, { status: 404 });
        if (!["pending", "confirmed", "canceled", "done"].includes(body.status)) return NextResponse.json({ error: "bad status" }, { status: 400 });
        await setBookingStatus(b, body.status);
        break;
      }
      case "reviewApprove":
      case "reviewDelete": {
        const r = await getReview(String(body.id ?? ""));
        if (!r) return NextResponse.json({ error: "ไม่พบรีวิว" }, { status: 404 });
        if (body.type === "reviewDelete") await deleteReview(r.id); else await saveReview({ ...r, approved: Boolean(body.approved) });
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
