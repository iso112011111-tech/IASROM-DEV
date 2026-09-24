// จองคิว: ลูกค้าเลือกบริการ วัน เวลา จากหน้าเว็บ (เปิดจากไลน์ได้) → ทีมยืนยันในหลังบ้าน → เตือนก่อนนัด 1 วัน
// กันจองชนกันด้วยเอกสารล็อก 1 ช่องเวลา = 1 เอกสาร (สร้างได้ครั้งเดียว)
import { listAdmins } from "./concierge";
import { docNo, token } from "./ids";
import { bubble, C, flex, push, SITE, text, uriButton, type LineMessage } from "./line";
import { store } from "./store";

export const SERVICES = [
  { id: "consult", name: "ปรึกษาโปรเจกต์ (ออนไลน์)", icon: "💬", minutes: 30 },
  { id: "repair", name: "ส่งซ่อมคอม / โน้ตบุ๊ก", icon: "🛠", minutes: 30 },
  { id: "cctv", name: "นัดสำรวจหน้างาน CCTV / เน็ต", icon: "📹", minutes: 90 },
] as const;
export type ServiceId = (typeof SERVICES)[number]["id"];
export const SLOTS = ["09:30", "11:00", "13:30", "15:00", "16:30"];
export const OPEN_DAYS = [1, 2, 3, 4, 5, 6]; // จันทร์–เสาร์
export const BOOK_AHEAD_DAYS = 21;

export type BookingStatus = "pending" | "confirmed" | "canceled" | "done";
export type Booking = {
  id: string; no: string; userId?: string; name: string; phone: string; service: ServiceId;
  date: string; slot: string; note: string; status: BookingStatus; createdAt: number; reminded?: boolean;
};

const COL = "bookings";
const LOCKS = "booking_locks";
const lockId = (date: string, slot: string) => `${date}_${slot.replace(":", "")}`;
export const listBookings = async () => (await store.list<Booking>(COL)).sort((a, b) => `${a.date}${a.slot}`.localeCompare(`${b.date}${b.slot}`));
export const getBooking = (id: string) => store.get<Booking>(COL, id);
const saveBooking = (b: Booking) => store.set(COL, b.id, b);

/** วันที่ตามเวลาไทย "YYYY-MM-DD" */
export const thaiDate = (t = Date.now()) => new Date(t + 7 * 3_600_000).toISOString().slice(0, 10);
const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();
/** เวลาเริ่มนัด (ms) ของวันที่+ช่องเวลา ตามเวลาไทย */
export const slotTime = (date: string, slot: string) => Date.parse(`${date}T${slot}:00+07:00`);

/** ช่องเวลาที่ยังว่าง (ไม่รวมช่องที่ผ่านไปแล้ว หรือเหลือไม่ถึง 2 ชม.) */
export async function availability() {
  const taken = new Set((await store.list<{ key: string }>(LOCKS)).map((l) => l.key));
  const days: { date: string; slots: { slot: string; free: boolean }[] }[] = [];
  for (let i = 0; i <= BOOK_AHEAD_DAYS; i++) {
    const date = thaiDate(Date.now() + i * 86_400_000);
    if (!OPEN_DAYS.includes(weekday(date))) continue;
    days.push({ date, slots: SLOTS.map((slot) => ({ slot, free: !taken.has(lockId(date, slot)) && slotTime(date, slot) - Date.now() > 2 * 3_600_000 })) });
  }
  return days;
}

export async function createBooking(input: { service: string; date: string; slot: string; name: string; phone: string; note?: string; userId?: string }) {
  const service = SERVICES.find((s) => s.id === input.service);
  if (!service) throw new Error("เลือกบริการก่อน");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !SLOTS.includes(input.slot) || !OPEN_DAYS.includes(weekday(input.date))) throw new Error("วัน/เวลาไม่ถูกต้อง");
  const start = slotTime(input.date, input.slot);
  if (start - Date.now() < 2 * 3_600_000 || start - Date.now() > (BOOK_AHEAD_DAYS + 1) * 86_400_000) throw new Error("ช่วงเวลานี้จองไม่ได้แล้ว");
  const name = String(input.name ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  const phone = String(input.phone ?? "").replace(/[^\d+]/g, "").slice(0, 15);
  if (name.length < 2) throw new Error("ใส่ชื่อด้วยครับ");
  if (!/^(\+66|0)\d{8,9}$/.test(phone)) throw new Error("เบอร์โทรไม่ถูกต้อง");

  const b: Booking = {
    id: token(), no: docNo("BK"), ...(input.userId ? { userId: input.userId } : {}), name, phone, service: service.id,
    date: input.date, slot: input.slot, note: String(input.note ?? "").trim().slice(0, 300), status: "pending", createdAt: Date.now(),
  };
  if (!(await store.create(LOCKS, lockId(b.date, b.slot), { key: lockId(b.date, b.slot), bookingId: b.id }))) throw new Error("ช่วงเวลานี้มีคนจองไปแล้ว ลองเลือกเวลาอื่นครับ");
  await saveBooking(b);

  const admins = await listAdmins();
  await Promise.all(admins.map((a) => push(a.userId, [{ type: "text", text: `📅 มีคิวจองใหม่ (รอยืนยัน)\n${service.icon} ${service.name}\n${fmtWhen(b)}\n${b.name} · ${b.phone}${b.note ? `\n"${b.note}"` : ""}\nยืนยันได้ที่ ${SITE}/admin` }]).catch(() => null)));
  if (b.userId) await push(b.userId, [bookingCard(b, "📨 ได้รับคำขอจองแล้ว รอทีมยืนยันสักครู่นะครับ")]).catch(() => null);
  return b;
}

export async function setBookingStatus(b: Booking, status: BookingStatus) {
  const next = { ...b, status };
  await saveBooking(next);
  if (status === "canceled") await store.delete(LOCKS, lockId(b.date, b.slot));
  if (b.userId && (status === "confirmed" || status === "canceled")) {
    await push(b.userId, [bookingCard(next, status === "confirmed" ? "✅ ยืนยันคิวเรียบร้อย แล้วพบกันครับ" : "คิวนี้ถูกยกเลิกแล้ว — จองเวลาใหม่ได้ตลอดครับ")]).catch(() => null);
  }
  return next;
}

/** เตือนลูกค้าที่มีนัดพรุ่งนี้ (เรียกจาก cron วันละครั้ง) */
export async function sendReminders() {
  const tomorrow = thaiDate(Date.now() + 86_400_000);
  const due = (await listBookings()).filter((b) => b.date === tomorrow && b.status === "confirmed" && !b.reminded);
  for (const b of due) {
    if (b.userId) await push(b.userId, [bookingCard(b, "⏰ เตือนนัดพรุ่งนี้ครับ")]).catch(() => null);
    await saveBooking({ ...b, reminded: true });
  }
  const admins = await listAdmins();
  if (due.length) await Promise.all(admins.map((a) => push(a.userId, [{ type: "text", text: `📅 นัดพรุ่งนี้ ${due.length} คิว\n${due.map((b) => `• ${b.slot} ${serviceOf(b).name} — ${b.name} ${b.phone}`).join("\n")}` }]).catch(() => null)));
  return due.length;
}

/** ลบล็อกช่องเวลาของวันที่ผ่านไปแล้ว (ไม่ให้คอลเลกชันโตไปเรื่อยๆ) */
export async function cleanupLocks() {
  const today = thaiDate();
  const old = (await store.list<{ key: string }>(LOCKS)).filter((l) => l.key.slice(0, 10) < today);
  await Promise.all(old.map((l) => store.delete(LOCKS, l.key)));
  return old.length;
}

export const serviceOf = (b: Pick<Booking, "service">) => SERVICES.find((s) => s.id === b.service) ?? SERVICES[0];
export const fmtWhen = (b: Pick<Booking, "date" | "slot">) =>
  `${new Date(slotTime(b.date, b.slot)).toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Bangkok" })} เวลา ${b.slot} น.`;

function bookingCard(b: Booking, headline: string): LineMessage {
  const s = serviceOf(b);
  return flex(`${headline} — ${fmtWhen(b)}`, bubble({
    body: {
      type: "box", layout: "vertical", spacing: "md", paddingAll: "20px", contents: [
        text(headline, { weight: "bold" }),
        { type: "separator", color: C.line },
        text(`${s.icon} ${s.name}`),
        text(`📅 ${fmtWhen(b)}`),
        text(`เลขที่ ${b.no}`, { size: "xs", color: C.sub }),
      ],
    },
    footer: { type: "box", layout: "vertical", paddingAll: "16px", contents: [uriButton("ติดต่อทีม", `${SITE}/#contact`)] },
  }));
}

/** การ์ดชวนจองคิว (ตอบคำว่า "จองคิว" ในไลน์) — ลิงก์ผูกกับไลน์ของลูกค้า เพื่อส่งยืนยันกลับมาในแชต */
export function bookInviteCard(url: string): LineMessage {
  return flex("จองคิวกับ IASROM-DEV", bubble({
    body: {
      type: "box", layout: "vertical", spacing: "md", paddingAll: "20px", contents: [
        { type: "text", text: "📅 จองคิวออนไลน์", weight: "bold", size: "lg", color: C.deep },
        ...SERVICES.map((s) => text(`${s.icon} ${s.name}`, { size: "sm" })),
        text("เลือกวันเวลาที่สะดวกได้เอง ทีมยืนยันกลับในแชตนี้ และเตือนก่อนนัด 1 วัน", { size: "xs", color: C.sub }),
      ],
    },
    footer: { type: "box", layout: "vertical", paddingAll: "16px", contents: [uriButton("เลือกวันเวลา", url, true)] },
  }));
}

// ---------------------------------------------------------------- ปฏิทิน (ICS) ให้ทีม subscribe ใน Google Calendar
export function bookingsIcs(list: Booking[]) {
  const esc = (s: string) => s.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
  const stamp = (t: number) => new Date(t).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const events = list.filter((b) => b.status === "pending" || b.status === "confirmed").map((b) => {
    const s = serviceOf(b), start = slotTime(b.date, b.slot);
    return [
      "BEGIN:VEVENT", `UID:${b.id}@iasrom-dev`, `DTSTAMP:${stamp(b.createdAt)}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(start + s.minutes * 60_000)}`,
      `SUMMARY:${esc(`${b.status === "pending" ? "[รอยืนยัน] " : ""}${s.name} — ${b.name}`)}`,
      `DESCRIPTION:${esc(`โทร ${b.phone}\n${b.note}\nเลขที่ ${b.no}`)}`, "END:VEVENT",
    ].join("\r\n");
  });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//IASROM-DEV//Bookings//TH", "X-WR-CALNAME:IASROM-DEV คิวนัด", "X-WR-TIMEZONE:Asia/Bangkok", ...events, "END:VCALENDAR"].join("\r\n");
}
