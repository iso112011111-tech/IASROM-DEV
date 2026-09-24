import { bookingsIcs, listBookings } from "../../../lib/bookings";
import { readLink } from "../../../lib/ids";

export const preferredRegion = ["sin1"];
export const dynamic = "force-dynamic";

// ปฏิทินคิวนัดสำหรับทีม — เอาลิงก์ (มีกุญแจลับ) ไป "เพิ่มปฏิทินจาก URL" ใน Google Calendar
export async function GET(req: Request) {
  if (readLink(new URL(req.url).searchParams.get("k"))?.ics !== "team") return new Response("forbidden", { status: 403 });
  return new Response(bookingsIcs(await listBookings()), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-store", "Content-Disposition": "inline; filename=iasrom-bookings.ics" },
  });
}
