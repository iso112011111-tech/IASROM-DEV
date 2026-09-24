// LINE Messaging API: ตรวจลายเซ็น webhook, ขอ token, ส่งข้อความ และหน้าตาการ์ด (Flex Message) ธีมมิ้นต์ของเว็บ
import { createHmac, timingSafeEqual } from "node:crypto";
import { PROJECTS, TEAM, localizeMember, localizeProject } from "../data/portfolio";
import { env } from "./ai";

export const SITE = (env("NEXT_PUBLIC_SITE_URL") ?? "https://iasrom-dev.vercel.app").replace(/\/+$/, "");
const CHANNEL_ID = env("LINE_CHANNEL_ID");
const CHANNEL_SECRET = env("LINE_CHANNEL_SECRET");
const API = "https://api.line.me/v2/bot";

export const lineConfigured = () => Boolean(CHANNEL_ID && CHANNEL_SECRET);

/** ตรวจว่า webhook มาจาก LINE จริง (HMAC-SHA256 ของ body ด้วย Channel Secret) */
export function validSignature(body: string, signature: string | null) {
  if (!CHANNEL_SECRET || !signature) return false;
  const expected = Buffer.from(createHmac("sha256", CHANNEL_SECRET).update(body).digest("base64"));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

// token ชั่วคราว (15 นาที) จาก Channel ID + Secret — เก็บไว้ใช้ซ้ำ 10 นาที
let cached: { token: string; until: number } | null = null;
async function token() {
  if (cached && cached.until > Date.now()) return cached.token;
  const res = await fetch("https://api.line.me/oauth2/v3/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: CHANNEL_ID!, client_secret: CHANNEL_SECRET! }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error(`LINE token error: ${JSON.stringify(data)}`);
  cached = { token: data.access_token, until: Date.now() + 10 * 60_000 };
  return cached.token;
}

async function post(path: string, body: unknown) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) console.error(`LINE ${path} → ${res.status}`, (await res.text()).slice(0, 400));
  return res.ok;
}

export type LineMessage = Record<string, unknown>;
export const reply = (replyToken: string, messages: LineMessage[]) => post("/message/reply", { replyToken, messages: messages.slice(0, 5) });
/** ส่งข้อความหาผู้ใช้โดยตรง (ใช้แจ้งทีม / แจ้งลูกค้าว่าทีมรับเรื่องแล้ว — นับโควตาข้อความของ LINE OA) */
export const push = (to: string, messages: LineMessage[]) => post("/message/push", { to, messages: messages.slice(0, 5) });

/** ชื่อที่แสดงใน LINE ของผู้ใช้ */
export async function profileName(userId: string): Promise<string> {
  try {
    const res = await fetch(`${API}/profile/${userId}`, { headers: { Authorization: `Bearer ${await token()}` } });
    return res.ok ? (await res.json()).displayName ?? "ลูกค้า" : "ลูกค้า";
  } catch { return "ลูกค้า"; }
}

/** แสดงแอนิเมชัน "กำลังพิมพ์…" ในแชต 1:1 ระหว่างรอ AI */
export const showLoading = (userId: string, seconds = 20) => post("/chat/loading/start", { chatId: userId, loadingSeconds: seconds });

// ---------------------------------------------------------------- หน้าตา (Flex)

export const C = { mint: "#3f9d87", deep: "#16795c", light: "#e9faf3", ink: "#17211e", sub: "#5f716b", line: "#e3ece8", bg: "#f3f6f5" };

type QR = { label: string; text: string };
const QUICK_DEFAULT: QR[] = [
  { label: "🗂 ดูผลงาน", text: "ดูผลงาน" },
  { label: "🚀 เริ่มโปรเจกต์", text: "เริ่มโปรเจกต์" },
  { label: "🛠 แจ้งซ่อม", text: "แจ้งซ่อม" },
  { label: "👥 ติดต่อทีม", text: "ติดต่อทีม" },
];
export const quickReply = (items: QR[] = QUICK_DEFAULT) => ({
  items: items.slice(0, 13).map((q) => ({ type: "action", action: { type: "message", label: q.label.slice(0, 20), text: q.text } })),
});

export const text = (t: string, extra: Record<string, unknown> = {}) => ({ type: "text", text: t, wrap: true, color: C.ink, size: "sm", ...extra });
export const uriButton = (label: string, uri: string, primary = false) => ({
  type: "button", style: primary ? "primary" : "secondary", height: "sm", color: primary ? C.mint : C.light,
  action: { type: "uri", label: label.slice(0, 20), uri },
});
export const msgButton = (label: string, t: string, primary = false) => ({
  type: "button", style: primary ? "primary" : "secondary", height: "sm", color: primary ? C.mint : C.light,
  action: { type: "message", label: label.slice(0, 20), text: t },
});
/** ปุ่มที่ส่งข้อมูลกลับมาที่บอท (ไม่แสดงเป็นข้อความในแชต ยกเว้น displayText) */
export const postbackButton = (label: string, data: string, primary = false, displayText?: string) => ({
  type: "button", style: primary ? "primary" : "secondary", height: "sm", color: primary ? C.mint : C.light,
  action: { type: "postback", label: label.slice(0, 20), data, ...(displayText ? { displayText } : {}) },
});

/** หัวการ์ดสีมิ้นต์ (ลายเส้นเฉียงแบบเดียวกับเว็บใช้ gradient แทน) */
export const header = (title: string, subtitle: string) => ({
  type: "box", layout: "vertical", paddingAll: "20px", spacing: "xs",
  background: { type: "linearGradient", angle: "135deg", startColor: "#5dbfa8", endColor: "#2f8a74" },
  contents: [
    { type: "text", text: "IASROM-DEV", size: "xxs", color: "#d7f5ea", weight: "bold" },
    { type: "text", text: title, size: "xl", color: "#ffffff", weight: "bold", wrap: true },
    { type: "text", text: subtitle, size: "xs", color: "#e8faf3", wrap: true },
  ],
});

export const listRow = (icon: string, t: string) => ({
  type: "box", layout: "horizontal", spacing: "md", contents: [
    { type: "text", text: icon, size: "sm", flex: 0 },
    text(t, { flex: 1 }),
  ],
});

export const bubble = (b: Record<string, unknown>) => ({ type: "bubble", size: "mega", styles: { footer: { separator: false } }, ...b });
export const flex = (altText: string, contents: unknown, qr?: ReturnType<typeof quickReply>) =>
  ({ type: "flex", altText: altText.slice(0, 400), contents, ...(qr ? { quickReply: qr } : {}) });

export function welcomeMessage(name?: string) {
  return flex("ยินดีต้อนรับสู่ IASROM-DEV", bubble({
    hero: { type: "image", url: `${SITE}/line/welcome.jpg`, size: "full", aspectRatio: "1080:878", aspectMode: "cover" },
    body: {
      type: "box", layout: "vertical", spacing: "md", paddingAll: "20px", contents: [
        text(`สวัสดีครับ${name ? ` คุณ${name}` : ""} 👋`, { size: "lg", weight: "bold" }),
        text("ขอบคุณที่เพิ่ม IASROM-DEV เป็นเพื่อน เรารับทำ", { color: C.sub }),
        { type: "box", layout: "vertical", spacing: "sm", paddingAll: "14px", cornerRadius: "12px", backgroundColor: C.bg, contents: [
          listRow("💻", "เว็บไซต์ · แอป · ระบบหลังบ้าน"),
          listRow("💬", "LINE OA / LIFF · Dashboard"),
          listRow("🛠", "ซ่อมคอม · กล้อง CCTV · เครือข่าย"),
        ] },
        text("พิมพ์ถามอะไรก็ได้ในแชตนี้ IASROM AI ตอบให้ทันที 🤖", { size: "xs", color: C.deep, weight: "bold" }),
      ],
    },
    footer: { type: "box", layout: "vertical", spacing: "sm", paddingAll: "16px", contents: [
      msgButton("💬 มีบริการอะไรบ้าง", "มีบริการอะไรบ้าง", true),
      uriButton("🌐 เปิดเว็บไซต์", SITE),
    ] },
  }), quickReply());
}

export function askAiMessage() {
  return flex("ถาม IASROM AI", bubble({
    header: header("ถาม IASROM AI 🤖", "ตอบทันที ตลอด 24 ชม. จากข้อมูลของทีม"),
    body: { type: "box", layout: "vertical", spacing: "sm", paddingAll: "20px", contents: [
      text("พิมพ์คำถามมาได้เลยครับ เช่น", { color: C.sub }),
      listRow("•", "เคยทำระบบ POS ไหม"),
      listRow("•", "ทีมใช้ภาษาอะไรบ้าง"),
      listRow("•", "อยากทำเว็บร้านค้า ต้องเตรียมอะไร"),
    ] },
  }), quickReply([
    { label: "เคยทำ POS ไหม", text: "เคยทำระบบ POS ไหม" },
    { label: "ใช้ภาษาอะไรบ้าง", text: "ทีมใช้ภาษาอะไรบ้าง" },
    { label: "มีบริการอะไรบ้าง", text: "มีบริการอะไรบ้าง" },
    ...QUICK_DEFAULT.slice(1),
  ]));
}

export function startProjectMessage() {
  return flex("เริ่มโปรเจกต์กับ IASROM-DEV", bubble({
    header: header("เริ่มโปรเจกต์ 🚀", "เล่าไอเดีย แล้วทีมช่วยประเมินขอบเขตงานให้"),
    body: { type: "box", layout: "vertical", spacing: "md", paddingAll: "20px", contents: [
      text("พิมพ์ตอบ 5 ข้อนี้มาได้เลยครับ", { weight: "bold" }),
      { type: "box", layout: "vertical", spacing: "sm", paddingAll: "14px", cornerRadius: "12px", backgroundColor: C.bg, contents: [
        listRow("1", "อยากได้อะไร (เว็บ / แอป / ระบบ / LINE OA)"),
        listRow("2", "ใช้ทำอะไร และใครเป็นคนใช้"),
        listRow("3", "ฟีเจอร์ที่ต้องมี"),
        listRow("4", "มีตัวอย่างที่ชอบไหม"),
        listRow("5", "อยากได้ภายในช่วงไหน"),
      ] },
      text("ราคาขึ้นอยู่กับขอบเขตงาน ทีมจะประเมินให้หลังได้รายละเอียดครับ", { size: "xs", color: C.sub }),
    ] },
    footer: { type: "box", layout: "vertical", spacing: "sm", paddingAll: "16px", contents: [
      msgButton("🗂 ดูตัวอย่างผลงาน", "ดูผลงาน", true),
      uriButton(`คุยกับ${TEAM[0].nickname} (Facebook)`, TEAM[0].facebook ?? SITE),
    ] },
  }), quickReply([
    { label: "💻 อยากทำเว็บไซต์", text: "อยากทำเว็บไซต์" },
    { label: "📱 อยากทำแอป", text: "อยากทำแอป" },
    { label: "🗄 ระบบหลังบ้าน", text: "อยากทำระบบหลังบ้าน" },
    { label: "💬 LINE OA", text: "อยากทำ LINE OA" },
  ]));
}

export function repairMessage() {
  const arm = TEAM.find((m) => m.handles?.some((h) => h.includes("CCTV"))) ?? TEAM[1];
  return flex("แจ้งซ่อมกับ IASROM-DEV", bubble({
    header: header("แจ้งซ่อม 🛠", "คอม · โน้ตบุ๊ก · กล้อง CCTV · เน็ต"),
    body: { type: "box", layout: "vertical", spacing: "md", paddingAll: "20px", contents: [
      text("รบกวนแจ้งข้อมูลนี้ครับ", { weight: "bold" }),
      { type: "box", layout: "vertical", spacing: "sm", paddingAll: "14px", cornerRadius: "12px", backgroundColor: C.bg, contents: [
        listRow("🖥", "อุปกรณ์ที่มีปัญหา"),
        listRow("⚠️", "อาการ และเริ่มเป็นเมื่อไร"),
        listRow("📍", "สถานที่ (ถ้าต้องเข้าไปดูหน้างาน)"),
        listRow("📷", "แนบรูปหรือวิดีโออาการได้เลย"),
      ] },
      text("ช่างจะติดต่อกลับโดยเร็วที่สุดครับ", { size: "xs", color: C.sub }),
    ] },
    footer: { type: "box", layout: "vertical", paddingAll: "16px", contents: [
      uriButton(`คุยกับ${arm.nickname}โดยตรง`, arm.facebook ?? SITE, true),
    ] },
  }), quickReply([
    { label: "คอมเปิดไม่ติด", text: "คอมเปิดไม่ติด ทำไงดี" },
    { label: "โน้ตบุ๊กช้ามาก", text: "โน้ตบุ๊กช้ามาก ทำไงดี" },
    { label: "CCTV ไม่ขึ้นภาพ", text: "กล้อง CCTV ไม่ขึ้นภาพ" },
    { label: "เน็ต/WiFi หลุดบ่อย", text: "เน็ต WiFi หลุดบ่อย" },
  ]));
}

export function contactMessage() {
  const person = (m: (typeof TEAM)[number]) => ({
    type: "box", layout: "horizontal", spacing: "md", alignItems: "center", paddingAll: "12px", cornerRadius: "14px", backgroundColor: C.bg, contents: [
      { type: "image", url: `${SITE}${m.photo ?? "/icons/icon-192.png"}`, size: "56px", aspectMode: "cover", aspectRatio: "1:1", flex: 0 },
      { type: "box", layout: "vertical", flex: 1, contents: [
        text(`${m.nickname} · ${m.name}`, { weight: "bold", size: "sm" }),
        text(m.role, { size: "xs", color: C.deep }),
        text((m.handles ?? []).slice(0, 3).join(" · "), { size: "xxs", color: C.sub }),
      ] },
    ],
  });
  return flex("ติดต่อทีม IASROM-DEV", bubble({
    header: header("ติดต่อทีม 👥", "คุยกับคนที่ดูแลงานนั้นได้โดยตรง"),
    body: { type: "box", layout: "vertical", spacing: "md", paddingAll: "20px", contents: [
      ...TEAM.map(person),
      text("หรือพิมพ์ในแชตนี้ได้เลย ทีมจะตอบกลับครับ", { size: "xs", color: C.sub }),
    ] },
    footer: { type: "box", layout: "vertical", spacing: "sm", paddingAll: "16px", contents: [
      ...TEAM.filter((m) => m.facebook).map((m, i) => uriButton(`${m.nickname} (Facebook)`, m.facebook!, i === 0)),
      uriButton("🌐 เว็บไซต์", SITE),
    ] },
  }), quickReply());
}

/** การ์ดผลงานแบบเลื่อนดูได้ (carousel) */
export function projectsCarousel(ids: string[], lang: "th" | "en" = "th") {
  const items = ids.map((id) => PROJECTS.find((p) => p.id === id)).filter(Boolean).slice(0, 10).map((raw) => {
    const p = localizeProject(raw!, lang);
    return {
      type: "bubble", size: "kilo",
      hero: { type: "image", url: `${SITE}/projects/jpg/${p.id}.jpg`, size: "full", aspectRatio: "3:2", aspectMode: "cover", action: { type: "uri", uri: `${SITE}/?project=${p.id}` } },
      body: { type: "box", layout: "vertical", spacing: "xs", paddingAll: "16px", contents: [
        { type: "text", text: p.category.toUpperCase(), size: "xxs", color: C.mint, weight: "bold" },
        text(p.title, { weight: "bold", size: "md" }),
        text(p.summary, { size: "xs", color: C.sub, maxLines: 2 }),
        text(p.stack.slice(0, 3).join(" · "), { size: "xxs", color: C.deep }),
      ] },
      footer: { type: "box", layout: "vertical", paddingAll: "12px", contents: [uriButton(lang === "en" ? "View details" : "ดูรายละเอียด", `${SITE}/?project=${p.id}`, true)] },
    };
  });
  if (!items.length) return null;
  return flex(lang === "en" ? "Our work" : "ผลงานของ IASROM-DEV", { type: "carousel", contents: items });
}

/** ปุ่มลิงก์ท้ายคำตอบ AI (จากแท็ก [[contact]] [[fb:โซ่]] ฯลฯ) */
export function linksMessage(links: { label: string; uri: string }[], lang: "th" | "en") {
  if (!links.length) return null;
  return flex(lang === "en" ? "Links" : "ลิงก์ที่เกี่ยวข้อง", {
    type: "bubble", size: "kilo",
    body: { type: "box", layout: "vertical", spacing: "sm", paddingAll: "14px", contents: links.slice(0, 4).map((l, i) => uriButton(l.label, l.uri, i === 0)) },
  });
}

/** ตัวช่วยสำหรับคำตอบ AI: ดึงแท็กออกเป็นลิงก์/การ์ด และล้าง markdown */
export function parseAiForLine(raw: string, lang: "th" | "en") {
  const cards: string[] = [];
  const links: { label: string; uri: string }[] = [];
  const sections: Record<string, [string, string]> = {
    projects: ["ดูผลงาน", "See our work"], skills: ["ดูทักษะทีม", "Tech stack"], team: ["ดูทีม", "Meet the team"], contact: ["ติดต่อเรา", "Contact us"],
  };
  const clean = raw.replace(/\[\[([^\]]+)\]\]/g, (_, tag: string) => {
    const t = tag.trim();
    if (t.startsWith("project:")) { const id = t.slice(8).trim(); if (PROJECTS.some((p) => p.id === id) && !cards.includes(id)) cards.push(id); }
    else if (t.startsWith("fb:")) {
      const m = TEAM.find((x) => x.nickname === t.slice(3).trim() || localizeMember(x, "en").nickname.toLowerCase() === t.slice(3).trim().toLowerCase());
      if (m?.facebook) links.push({ label: `${lang === "en" ? "Message " : "คุยกับ"}${localizeMember(m, lang).nickname}`, uri: m.facebook });
    } else if (sections[t]) links.push({ label: sections[t][lang === "en" ? 1 : 0], uri: `${SITE}/#${t}` });
    return "";
  })
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/^#+\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const unique = links.filter((l, i) => links.findIndex((x) => x.uri === l.uri) === i);
  return { text: clean, cards: cards.slice(0, 3), links: unique };
}
