import { NextResponse } from "next/server";
import { estimate } from "../../../data/pricing";
import { requireAdmin } from "../../../lib/adminAuth";
import { getConfig, listAdmins, type Customer, type Ticket } from "../../../lib/concierge";
import { after } from "next/server";
import { listInvoices, paymentsConfigured, paymentsTestMode, payUrl, refreshOpenInvoices } from "../../../lib/payments";
import { listBookings, SERVICES } from "../../../lib/bookings";
import { signLink } from "../../../lib/ids";
import { jobUrl, listJobs, warrantyUntil } from "../../../lib/jobs";
import { SITE } from "../../../lib/line";
import { getPricing } from "../../../lib/pricingStore";
import { listQuotes, quoteTotal, quoteUrl } from "../../../lib/quotes";
import { listReviews } from "../../../lib/reviews";
import { store, storeKind } from "../../../lib/store";

export const preferredRegion = ["sin1"];
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = requireAdmin(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [config, admins, pricing, customers, tickets, invoices, quotes, jobs, bookings, reviews] = await Promise.all([
    getConfig(), listAdmins(), getPricing(), store.list<Customer>("line_customers"), store.list<Ticket>("line_tickets"), listInvoices(),
    listQuotes(), listJobs(), listBookings(), listReviews(),
  ]);
  after(() => refreshOpenInvoices(invoices)); // เช็กยอดบิลค้างกับ Omise เบื้องหลัง (ผลขึ้นในรอบโหลดถัดไป)
  const now = Date.now();
  const withEstimate = <T extends { estimateSpec?: string }>(x: T) => {
    const e = x.estimateSpec ? estimate(x.estimateSpec, pricing) : null;
    return { ...x, estimate: e ? { min: e.total.min, max: e.total.max, items: e.lines.map((l) => `${l.item.name}${l.qty > 1 ? ` × ${l.qty}` : ""}`) } : null };
  };
  const cs = customers
    .map((c) => withEstimate({ ...c, mode: c.mode === "human" && (c.humanUntil ?? 0) < now ? "ai" : c.mode }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const ts = tickets.map(withEstimate).sort((a, b) => b.createdAt - a.createdAt);
  const open = ts.filter((t) => t.status === "open");

  return NextResponse.json({
    me: session.name,
    storeKind,
    config,
    admins: admins.map((a) => ({ name: a.name, addedAt: a.addedAt })),
    pricing,
    customers: cs,
    tickets: ts,
    payments: { configured: paymentsConfigured(), testMode: paymentsTestMode() },
    quotes: quotes.slice(0, 100).map((q) => ({ ...q, total: quoteTotal(q), url: quoteUrl(q) })),
    jobs: jobs.slice(0, 150).map((j) => ({ ...j, url: jobUrl(j), warrantyUntil: warrantyUntil(j) })),
    bookings: bookings.filter((b) => b.date >= new Date(now - 7 * 86_400_000).toISOString().slice(0, 10)).slice(0, 200),
    services: SERVICES,
    reviews,
    calendarUrl: `${SITE}/api/book/ics?k=${signLink({ ics: "team" }, 3650)}`,
    invoices: invoices.slice(0, 100).map(({ qrUri: _q, ...i }) => ({ ...i, url: payUrl(i) })),
    stats: {
      customers: cs.length,
      today: cs.filter((c) => now - c.updatedAt < 86_400_000).length,
      openTickets: open.length,
      paidMonth: invoices.filter((i) => i.status === "paid" && !i.testMode && now - (i.paidAt ?? 0) < 30 * 86_400_000).reduce((s, i) => s + i.amount, 0),
      pendingBookings: bookings.filter((b) => b.status === "pending").length,
      pendingReviews: reviews.filter((r) => !r.approved).length,
      activeJobs: jobs.filter((j) => !j.deliveredAt).length,
      humanHandled: cs.filter((c) => c.mode === "human").length,
      pipeline: ts.filter((t) => t.status !== "closed").reduce((s, t) => ({ min: s.min + (t.estimate?.min ?? 0), max: s.max + (t.estimate?.max ?? 0) }), { min: 0, max: 0 }),
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
