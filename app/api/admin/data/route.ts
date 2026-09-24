import { NextResponse } from "next/server";
import { estimate } from "../../../data/pricing";
import { requireAdmin } from "../../../lib/adminAuth";
import { getConfig, listAdmins, type Customer, type Ticket } from "../../../lib/concierge";
import { listInvoices, paymentsConfigured, paymentsTestMode, payUrl } from "../../../lib/payments";
import { getPricing } from "../../../lib/pricingStore";
import { store, storeKind } from "../../../lib/store";

export const preferredRegion = ["sin1"];
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = requireAdmin(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [config, admins, pricing, customers, tickets, invoices] = await Promise.all([
    getConfig(), listAdmins(), getPricing(), store.list<Customer>("line_customers"), store.list<Ticket>("line_tickets"), listInvoices(),
  ]);
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
    invoices: invoices.slice(0, 100).map(({ qrUri: _q, ...i }) => ({ ...i, url: payUrl(i) })),
    stats: {
      customers: cs.length,
      today: cs.filter((c) => now - c.updatedAt < 86_400_000).length,
      openTickets: open.length,
      paidMonth: invoices.filter((i) => i.status === "paid" && !i.testMode && now - (i.paidAt ?? 0) < 30 * 86_400_000).reduce((s, i) => s + i.amount, 0),
      humanHandled: cs.filter((c) => c.mode === "human").length,
      pipeline: ts.filter((t) => t.status !== "closed").reduce((s, t) => ({ min: s.min + (t.estimate?.min ?? 0), max: s.max + (t.estimate?.max ?? 0) }), { min: 0, max: 0 }),
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
