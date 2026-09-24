// ตารางราคาที่ใช้จริง: ค่าที่ทีมแก้ในหน้าหลังบ้าน (Firestore) ถ้ามี ไม่งั้นใช้ค่าเริ่มต้นใน data/pricing.ts
import { PRICING, type PriceItem } from "../data/pricing";
import { store } from "./store";

let cache: { table: PriceItem[]; until: number } | null = null;

export async function getPricing(): Promise<PriceItem[]> {
  if (cache && cache.until > Date.now()) return cache.table;
  let table = PRICING;
  try {
    const saved = await store.get<{ items: PriceItem[] }>("line_config", "pricing");
    if (saved?.items?.length) table = saved.items;
  } catch (err) {
    console.error("load pricing failed, using defaults", err);
  }
  cache = { table, until: Date.now() + 60_000 };
  return table;
}

/** บันทึกตารางราคาใหม่ (ตรวจค่าก่อนบันทึก) */
export async function savePricing(items: PriceItem[]) {
  const clean = items
    .filter((i) => /^[a-z0-9_]{2,40}$/.test(i.id) && i.name?.trim())
    .map((i) => ({
      ...i,
      name: i.name.trim().slice(0, 80),
      min: Math.max(0, Math.round(Number(i.min) || 0)),
      max: Math.max(0, Math.round(Number(i.max) || 0)),
    }))
    .map((i) => (i.max < i.min ? { ...i, max: i.min } : i));
  if (!clean.length) throw new Error("ตารางราคาว่าง");
  await store.set("line_config", "pricing", { items: clean, updatedAt: Date.now() });
  cache = { table: clean, until: Date.now() + 60_000 };
  return clean;
}

export async function resetPricing() {
  await store.delete("line_config", "pricing");
  cache = null;
}
