// ตารางราคาประมาณการสำหรับ IASROM AI (ใช้ใน LINE OA)
// ⚠️ ร่างจากราคาตลาดทั่วไป — ทีมควรตรวจ/แก้ตัวเลขให้ตรงกับราคาจริงของทีม
// AI จะเลือก "id" จากตารางนี้เท่านั้น แล้วเซิร์ฟเวอร์คำนวณราคาเอง (AI แต่งตัวเลขเองไม่ได้)

export type PriceItem = {
  id: string;
  group: "web" | "addon" | "it" | "recurring";
  name: string;
  min: number;
  max: number;
  unit?: string;       // เช่น "/ตัว", "/ปี" — รายการที่มี per ตัวคูณจำนวนได้
  perUnit?: boolean;   // true = คูณตามจำนวน (qty)
  recurring?: string;  // "ปี" / "เดือน" — ไม่รวมในยอดครั้งเดียว
  note?: string;
};

export const PRICING: PriceItem[] = [
  // ---- เว็บ / แอป / ระบบ (แพ็กเกจหลัก)
  { id: "web_starter", group: "web", name: "เว็บไซต์ Starter (1–3 หน้า)", min: 8000, max: 15000, note: "แลนดิ้งเพจ/โปรไฟล์ธุรกิจ" },
  { id: "web_business", group: "web", name: "เว็บไซต์ Business (5–10 หน้า + หลังบ้านลงข่าว)", min: 15000, max: 25000 },
  { id: "web_ecommerce", group: "web", name: "เว็บร้านค้าออนไลน์ (E-commerce)", min: 25000, max: 80000 },
  { id: "system_backoffice", group: "web", name: "ระบบหลังบ้าน / ERP", min: 40000, max: 200000, note: "ขึ้นกับจำนวนโมดูล" },
  { id: "app_mobile", group: "web", name: "แอปมือถือ (iOS / Android)", min: 60000, max: 250000 },
  { id: "line_richmenu", group: "web", name: "LINE OA + ริชเมนู + ข้อความอัตโนมัติ", min: 3000, max: 10000 },
  { id: "line_liff", group: "web", name: "LINE OA + LIFF / ระบบจองในไลน์", min: 20000, max: 60000 },
  { id: "dashboard", group: "web", name: "Dashboard / รายงาน (Power BI)", min: 10000, max: 40000 },

  // ---- ฟีเจอร์เสริม
  { id: "addon_payment", group: "addon", name: "ระบบชำระเงิน / QR พร้อมเพย์", min: 5000, max: 15000 },
  { id: "addon_booking", group: "addon", name: "ระบบจอง / นัดหมาย", min: 8000, max: 25000 },
  { id: "addon_member", group: "addon", name: "ระบบสมาชิก / ล็อกอิน", min: 5000, max: 15000 },
  { id: "addon_ai_chat", group: "addon", name: "AI แชตบอทตอบลูกค้า", min: 10000, max: 30000 },
  { id: "addon_i18n", group: "addon", name: "รองรับหลายภาษา", min: 3000, max: 8000 },

  // ---- งานไอที / ฮาร์ดแวร์
  { id: "repair_check", group: "it", name: "ตรวจเช็ก/ซ่อมคอม-โน้ตบุ๊ก", min: 300, max: 800, note: "ยังไม่รวมค่าอะไหล่" },
  { id: "cctv_4", group: "it", name: "ติดตั้งกล้อง CCTV ชุด 4 ตัว", min: 12000, max: 25000 },
  { id: "cctv_extra", group: "it", name: "กล้อง CCTV เพิ่ม", min: 2500, max: 5000, unit: "/ตัว", perUnit: true },
  { id: "network_office", group: "it", name: "วางระบบเน็ต / WiFi สำนักงาน", min: 5000, max: 30000 },

  // ---- ค่าบริการต่อเนื่อง (ไม่รวมในยอดครั้งเดียว)
  { id: "hosting_year", group: "recurring", name: "โดเมน + โฮสติ้ง + ดูแลเว็บ", min: 3000, max: 12000, recurring: "ปี" },
  { id: "it_monthly", group: "recurring", name: "ดูแลไอทีรายเดือน (MA)", min: 2000, max: 10000, recurring: "เดือน" },
];

export const baht = (n: number) => `฿${n.toLocaleString("en-US")}`;

export type Estimate = {
  lines: { item: PriceItem; qty: number; min: number; max: number }[];
  total: { min: number; max: number };
  recurring: { item: PriceItem; min: number; max: number }[];
};

/** คำนวณจากแท็ก เช่น "web_business,addon_booking,cctv_extra x2" — ข้าม id ที่ไม่มีในตาราง */
export function estimate(spec: string, table: PriceItem[] = PRICING): Estimate | null {
  const lines: Estimate["lines"] = [];
  const recurring: Estimate["recurring"] = [];
  for (const part of spec.split(",")) {
    const m = part.trim().match(/^([a-z0-9_]+)\s*(?:x\s*(\d+))?$/i);
    if (!m) continue;
    const item = table.find((p) => p.id === m[1]);
    if (!item || lines.some((l) => l.item.id === item.id) || recurring.some((r) => r.item.id === item.id)) continue;
    const qty = item.perUnit ? Math.min(Math.max(Number(m[2] ?? 1), 1), 100) : 1;
    if (item.recurring) recurring.push({ item, min: item.min, max: item.max });
    else lines.push({ item, qty, min: item.min * qty, max: item.max * qty });
  }
  if (!lines.length && !recurring.length) return null;
  return {
    lines,
    recurring,
    total: { min: lines.reduce((s, l) => s + l.min, 0), max: lines.reduce((s, l) => s + l.max, 0) },
  };
}

/** ตารางสำหรับใส่ใน prompt ของ AI */
export const pricingForPrompt = (table: PriceItem[] = PRICING) => table.map((p) =>
  `- ${p.id}: ${p.name}${p.unit ? ` (${p.unit} ใส่จำนวนได้ เช่น ${p.id} x3)` : ""}${p.recurring ? ` [รายปี/เดือน]` : ""}${p.note ? ` — ${p.note}` : ""}`,
).join("\n");
