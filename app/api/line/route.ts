// Webhook ของ LINE OA: รับข้อความ → ตอบด้วยการ์ด (เมนู) หรือ IASROM AI
// ตั้ง Webhook URL ใน LINE เป็น https://<โดเมน>/api/line
import { after, NextResponse } from "next/server";
import { askOnce, takeKey, type ChatMessage } from "../../lib/ai";
import {
  askAiMessage, contactMessage, lineConfigured, linksMessage, parseAiForLine, projectsCarousel, quickReply,
  repairMessage, reply, showLoading, startProjectMessage, validSignature, welcomeMessage, type LineMessage,
} from "../../lib/line";
import { PROJECTS } from "../../data/portfolio";

export const preferredRegion = ["sin1"];
export const maxDuration = 60;

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { type: string; userId?: string };
  message?: { type: string; text?: string };
};

// ความจำบทสนทนาสั้น ๆ ต่อผู้ใช้ (ในหน่วยความจำ — หายเมื่อเซิร์ฟเวอร์รีสตาร์ท)
const memory = new Map<string, { at: number; history: ChatMessage[] }>();
const MEMORY_MS = 30 * 60_000;
function recall(userId: string) {
  const m = memory.get(userId);
  return m && Date.now() - m.at < MEMORY_MS ? m.history : [];
}
function remember(userId: string, history: ChatMessage[]) {
  memory.delete(userId);
  memory.set(userId, { at: Date.now(), history: history.slice(-6) });
  while (memory.size > 2000) memory.delete(memory.keys().next().value!);
}

const LINE_ADDENDUM = `

ช่องทาง: ผู้ใช้กำลังคุยผ่าน LINE OA
- ตอบสั้นกระชับกว่าปกติ (ไม่เกินประมาณ 4 บรรทัด) ใช้อีโมจิได้เล็กน้อย
- ใช้แท็กลิงก์และแท็ก [[project:<id>]] ได้ตามกฎเดิม (ระบบจะแปลงเป็นปุ่มและการ์ดให้เอง)`;

const isEnglish = (t: string) => /[a-z]/i.test(t) && !/[฀-๿]/.test(t);

/** ข้อความที่ตรงกับปุ่มในริชเมนู → ตอบด้วยการ์ดทันที ไม่ต้องใช้ AI */
function menuReply(text: string): LineMessage[] | null {
  const t = text.trim().toLowerCase();
  if (["เริ่มโปรเจกต์", "start project"].includes(t)) return [startProjectMessage()];
  if (["แจ้งซ่อม", "repair"].includes(t)) return [repairMessage()];
  if (["ติดต่อทีม", "ติดต่อ", "contact"].includes(t)) return [contactMessage()];
  if (["ถาม ai", "ai"].includes(t)) return [askAiMessage()];
  if (["ดูผลงาน", "ผลงาน", "portfolio", "our work"].includes(t)) {
    const carousel = projectsCarousel(PROJECTS.slice(0, 8).map((p) => p.id));
    return [
      { type: "text", text: "ตัวอย่างผลงานของทีมครับ 👇 เลื่อนดูได้เลย แตะการ์ดเพื่อดูรายละเอียดบนเว็บ" },
      ...(carousel ? [{ ...carousel, quickReply: quickReply() }] : []),
    ];
  }
  if (["สวัสดี", "หวัดดี", "hello", "hi", "เริ่ม", "เมนู", "menu"].includes(t)) return [welcomeMessage()];
  return null;
}

async function handleText(event: LineEvent, text: string) {
  const userId = event.source?.userId ?? "anon";
  const quick = menuReply(text);
  if (quick) return reply(event.replyToken!, quick);

  if (!takeKey(`line:${userId}`, 8)) {
    return reply(event.replyToken!, [{ type: "text", text: "ส่งข้อความถี่ไปนิดครับ รอสักครู่แล้วลองใหม่นะครับ 🙏", quickReply: quickReply() }]);
  }

  if (event.source?.type === "user" && event.source.userId) await showLoading(event.source.userId, 20);
  const lang = isEnglish(text) ? "en" : "th";
  const history: ChatMessage[] = [...recall(userId), { role: "user", content: text.slice(0, 500) }];
  const answer = await askOnce(history, lang, LINE_ADDENDUM);

  if (!answer || answer === "budget") {
    return reply(event.replyToken!, [{
      type: "text",
      text: answer === "budget"
        ? "ตอนนี้มีคนใช้ผู้ช่วยเยอะมากครับ ลองใหม่อีกสักครู่ หรือกดเมนู \"ติดต่อทีม\" เพื่อคุยกับทีมโดยตรงได้เลย"
        : "ขออภัยครับ ผู้ช่วยตอบไม่ได้ชั่วคราว 🙏 กดเมนู \"ติดต่อทีม\" เพื่อคุยกับทีมโดยตรงได้เลยครับ",
      quickReply: quickReply(),
    }]);
  }
  remember(userId, [...history, { role: "assistant", content: answer }]);

  const { text: clean, cards, links } = parseAiForLine(answer, lang);
  const carousel = projectsCarousel(cards, lang);
  const buttons = linksMessage(links, lang);
  const messages: LineMessage[] = [{ type: "text", text: clean.slice(0, 4900) || "…" }];
  if (carousel) messages.push(carousel);
  if (buttons) messages.push(buttons);
  // quick reply แสดงได้เฉพาะข้อความสุดท้าย
  messages[messages.length - 1] = { ...messages[messages.length - 1], quickReply: quickReply() };
  return reply(event.replyToken!, messages);
}

async function handle(event: LineEvent) {
  if (!event.replyToken) return;
  try {
    if (event.type === "follow") return reply(event.replyToken, [welcomeMessage()]);
    if (event.type === "message" && event.message?.type === "text" && event.message.text) return handleText(event, event.message.text);
    if (event.type === "message") {
      return reply(event.replyToken, [{ type: "text", text: "ได้รับแล้วครับ 👍 ถ้าเป็นเรื่องแจ้งซ่อม ทีมจะดูรูป/ไฟล์ให้ หรือพิมพ์คำถามมาได้เลยครับ", quickReply: quickReply() }]);
    }
  } catch (err) {
    console.error("LINE event failed", err);
  }
}

export async function POST(req: Request) {
  if (!lineConfigured()) return NextResponse.json({ error: "LINE not configured" }, { status: 503 });
  const body = await req.text();
  if (body.length > 256 * 1024) return NextResponse.json({ error: "too large" }, { status: 413 });
  if (!validSignature(body, req.headers.get("x-line-signature"))) return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  let events: LineEvent[] = [];
  try { events = JSON.parse(body).events ?? []; } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  // ตอบ LINE ว่า "รับแล้ว" ทันที แล้วค่อยประมวลผล (AI ใช้เวลาหลายวินาที)
  after(() => Promise.all(events.slice(0, 20).map(handle)));
  return NextResponse.json({ ok: true });
}

// LINE / เบราว์เซอร์เช็กว่ามี endpoint อยู่
export function GET() {
  return NextResponse.json({ ok: true, service: "IASROM-DEV LINE webhook" });
}
