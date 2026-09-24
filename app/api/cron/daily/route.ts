import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "../../../lib/ai";
import { cleanupLocks, sendReminders } from "../../../lib/bookings";

export const preferredRegion = ["sin1"];
export const maxDuration = 60;

// Vercel Cron เรียกทุกวัน 08:00 น. (เวลาไทย) — ต้องมี Authorization: Bearer <CRON_SECRET>
export async function GET(req: Request) {
  const secret = env("CRON_SECRET");
  const got = Buffer.from(req.headers.get("authorization") ?? ""), want = Buffer.from(`Bearer ${secret}`);
  if (!secret || got.length !== want.length || !timingSafeEqual(got, want)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [reminded, cleaned] = await Promise.all([sendReminders(), cleanupLocks()]);
  return NextResponse.json({ ok: true, reminded, cleaned });
}
