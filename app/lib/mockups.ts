// AI Studio: ลูกค้าเล่าธุรกิจสั้นๆ → AI ออกแบบหน้าเว็บตัวอย่างให้ดูทันที (แชร์ลิงก์ได้)
// ความปลอดภัย: ให้ AI ตอบเป็น "ข้อมูล" (JSON) เท่านั้น แล้วเราตรวจ/ตัดความยาว/เช็กสีเอง ก่อนเรนเดอร์ด้วยเทมเพลตของเรา
// → AI เขียน HTML/สคริปต์ใส่หน้าเว็บไม่ได้เลย
import { complete } from "./ai";
import { token, validToken } from "./ids";
import { store } from "./store";

export type Mood = "modern" | "bold" | "minimal" | "warm" | "luxury";
export type Mockup = {
  id: string;
  prompt: { business: string; name: string; vibe: string };
  brand: string; tagline: string; headline: string; sub: string; cta: string;
  palette: { primary: string; accent: string; bg: string; ink: string };
  mood: Mood; font: "sans" | "serif" | "rounded";
  heroIcon: string;
  nav: string[];
  features: { icon: string; title: string; text: string }[];
  showcase: { title: string; items: { name: string; price: string; note: string }[] };
  testimonial: { quote: string; author: string };
  contact: string;
  createdAt: number;
};

const COL = "mockups";
export const getMockup = (id: string) => (validToken(id) ? store.get<Mockup>(COL, id) : Promise.resolve(null));

const SYSTEM = `คุณคือนักออกแบบเว็บไซต์ระดับท็อปของทีม IASROM-DEV
หน้าที่: รับคำอธิบายธุรกิจของลูกค้า แล้วออกแบบ "หน้าแรกเว็บไซต์" ของธุรกิจนั้นให้ดูพรีเมียม น่าเชื่อถือ ขายของได้จริง
ตอบเป็น JSON ล้วน ๆ บรรทัดเดียว ห้ามมีข้อความอื่น ห้ามมี markdown ตามโครงนี้:
{"brand":"ชื่อแบรนด์","tagline":"สโลแกนสั้น","headline":"พาดหัวหลัก ทรงพลัง ไม่เกิน 60 ตัวอักษร","sub":"คำโปรยใต้พาดหัว 1-2 ประโยค","cta":"ข้อความปุ่มหลัก",
"palette":{"primary":"#hex","accent":"#hex","bg":"#hex","ink":"#hex"},"mood":"modern|bold|minimal|warm|luxury","font":"sans|serif|rounded","heroIcon":"อีโมจิ 1 ตัวที่แทนธุรกิจ",
"nav":["เมนู 4 อัน"],"features":[{"icon":"อีโมจิ","title":"จุดเด่น","text":"อธิบาย 1 ประโยค"} x3],
"showcase":{"title":"หัวข้อสินค้า/บริการ","items":[{"name":"ชื่อ","price":"ราคา เช่น ฿120 (ถ้าไม่เหมาะให้ว่าง)","note":"คำอธิบายสั้น"} x3]},
"testimonial":{"quote":"รีวิวตัวอย่างจากลูกค้าสมมติ","author":"ชื่อลูกค้าสมมติ"},"contact":"ข้อความชวนติดต่อ/ที่อยู่สมมติสั้นๆ"}
กติกา: ภาษาเดียวกับที่ลูกค้าพิมพ์ (ปกติภาษาไทย) · สีต้องเข้ากับอารมณ์ธุรกิจและตัวอักษร (ink) ต้องอ่านง่ายบนพื้น (bg) · เนื้อหาเฉพาะเจาะจงกับธุรกิจนั้นจริง ไม่ใช่คำกลางๆ`;

// ---------------------------------------------------------------- ตรวจข้อมูลจาก AI

const s = (v: unknown, max: number, fallback = "") => {
  const t = String(v ?? "").replace(/[<>{}\[\]`]/g, "").replace(/\s+/g, " ").trim();
  return (t || fallback).slice(0, max);
};
const hex = (v: unknown, fallback: string) => (/^#[0-9a-f]{6}$/i.test(String(v)) ? String(v).toLowerCase() : fallback);
const emoji = (v: unknown, fallback: string) => {
  const t = String(v ?? "").trim();
  return /^\p{Extended_Pictographic}/u.test(t) ? [...t].slice(0, 2).join("") : fallback;
};
const lum = (h: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

export function cleanMockup(raw: Record<string, unknown>, prompt: Mockup["prompt"]): Mockup {
  const p = (raw.palette ?? {}) as Record<string, unknown>;
  const bg = hex(p.bg, "#fbfaf7");
  let ink = hex(p.ink, lum(bg) > 0.4 ? "#1b1b1b" : "#f5f5f5");
  if (contrast(ink, bg) < 4.5) ink = lum(bg) > 0.4 ? "#161616" : "#f7f7f7"; // บังคับให้อ่านออกเสมอ
  const moods: Mood[] = ["modern", "bold", "minimal", "warm", "luxury"];
  const arr = <T,>(v: unknown, n: number, map: (x: Record<string, unknown>) => T) => (Array.isArray(v) ? v : []).slice(0, n).map((x) => map((x ?? {}) as Record<string, unknown>));
  const features = arr(raw.features, 3, (f) => ({ icon: emoji(f.icon, "✨"), title: s(f.title, 32), text: s(f.text, 110) })).filter((f) => f.title);
  const sc = (raw.showcase ?? {}) as Record<string, unknown>;
  const t = (raw.testimonial ?? {}) as Record<string, unknown>;
  return {
    id: token(), prompt,
    brand: s(raw.brand, 40, prompt.name || "Your Brand"),
    tagline: s(raw.tagline, 60), headline: s(raw.headline, 80, prompt.business), sub: s(raw.sub, 180), cta: s(raw.cta, 24, "ติดต่อเรา"),
    palette: { primary: hex(p.primary, "#2f8a74"), accent: hex(p.accent, "#f2b84b"), bg, ink },
    mood: moods.includes(raw.mood as Mood) ? (raw.mood as Mood) : "modern",
    font: raw.font === "serif" || raw.font === "rounded" ? raw.font : "sans",
    heroIcon: emoji(raw.heroIcon, "✨"),
    nav: arr(raw.nav, 5, (x) => s(x as unknown, 16)).filter(Boolean),
    features: features.length ? features : [{ icon: "✨", title: "คุณภาพเยี่ยม", text: "ใส่ใจทุกรายละเอียด" }],
    showcase: { title: s(sc.title, 40, "สินค้าและบริการ"), items: arr(sc.items, 6, (i) => ({ name: s(i.name, 32), price: s(i.price, 20), note: s(i.note, 70) })).filter((i) => i.name) },
    testimonial: { quote: s(t.quote, 160), author: s(t.author, 32) },
    contact: s(raw.contact, 90),
    createdAt: Date.now(),
  };
}

/** ให้ AI ออกแบบ แล้วบันทึกไว้ให้แชร์ลิงก์ได้ */
export async function generateMockup(prompt: Mockup["prompt"]): Promise<Mockup | "budget" | null> {
  const ask = `ธุรกิจ: ${prompt.business}\nชื่อร้าน/แบรนด์: ${prompt.name || "(ช่วยตั้งให้)"}\nสไตล์ที่อยากได้: ${prompt.vibe || "(เลือกให้เหมาะ)"}`;
  const out = await complete([{ role: "system", content: SYSTEM }, { role: "user", content: ask }], 45_000);
  if (out === "budget") return "budget";
  if (!out) return null;
  const json = out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1);
  try {
    const m = cleanMockup(JSON.parse(json), prompt);
    await store.set(COL, m.id, m);
    return m;
  } catch {
    console.error("mockup JSON parse failed", out.slice(0, 200));
    return null;
  }
}
