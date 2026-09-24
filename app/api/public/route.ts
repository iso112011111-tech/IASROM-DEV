import { NextResponse } from "next/server";
import { listJobs } from "../../lib/jobs";
import { publicReviews } from "../../lib/reviews";
import { store } from "../../lib/store";

export const preferredRegion = ["sin1"];
export const dynamic = "force-dynamic";

// ข้อมูลสาธารณะสำหรับหน้าแรก: รีวิวที่อนุมัติแล้ว + สถิติจริงจากระบบ (แคช 5 นาที)
let cache: { at: number; data: unknown } | null = null;

export async function GET() {
  if (!cache || Date.now() - cache.at > 300_000) {
    const [reviews, jobs, customers] = await Promise.all([publicReviews(), listJobs(), store.list<{ userId: string }>("line_customers")]);
    cache = {
      at: Date.now(),
      data: {
        reviews,
        stats: {
          delivered: jobs.filter((j) => j.deliveredAt).length,
          active: jobs.filter((j) => !j.deliveredAt).length,
          customers: customers.length,
        },
      },
    };
  }
  return NextResponse.json(cache.data, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
