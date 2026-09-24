// Webhook ของ LINE OA: รับข้อความ → ตอบด้วยการ์ด (เมนู) หรือ IASROM AI Concierge
// ตั้ง Webhook URL ใน LINE เป็น https://<โดเมน>/api/line
import { after, NextResponse } from "next/server";
import { askOnce, env, takeKey, type ChatMessage } from "../../lib/ai";
import {
  acceptedAdminCard, addAdmin, adminQuick, conciergeAddendum, customerListCard, estimateCard, getConfig, getTicket, handoff,
  HUMAN_HOURS, isAdmin, listAdmins, loadCustomer, muteCustomer, parseConciergeTags, recentCustomers, saveCustomer, saveTicket,
  setConfig, unmuteCustomer, waitingCard, type Customer,
} from "../../lib/concierge";
import {
  askAiMessage, contactMessage, lineConfigured, linksMessage, parseAiForLine, profileName, projectsCarousel, push, quickReply,
  repairMessage, reply, showLoading, startProjectMessage, validSignature, welcomeMessage, type LineMessage,
} from "../../lib/line";
import { estimate } from "../../data/pricing";
import { getPricing } from "../../lib/pricingStore";
import { PROJECTS } from "../../data/portfolio";

export const preferredRegion = ["sin1"];
export const maxDuration = 60;

const ADMIN_CODE = env("LINE_ADMIN_CODE");

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { type: string; userId?: string };
  message?: { type: string; text?: string };
  postback?: { data: string };
};

const isEnglish = (t: string) => /[a-z]/i.test(t) && !/[฀-๿]/.test(t);
const say = (t: string, withQuick = true): LineMessage => ({ type: "text", text: t, ...(withQuick ? { quickReply: quickReply() } : {}) });

/** ข้อความที่ตรงกับปุ่มในริชเมนู → ตอบด้วยการ์ดทันที ไม่ต้องใช้ AI */
function menuReply(text: string): LineMessage[] | null {
  const t = text.trim().toLowerCase();
  if (["เริ่มโปรเจกต์", "start project"].includes(t)) return [startProjectMessage()];
  if (["แจ้งซ่อม", "repair"].includes(t)) return [repairMessage()];
  if (["ติดต่อทีม", "ติดต่อ", "contact"].includes(t)) return [contactMessage()];
  if (["ถาม ai", "ai"].includes(t)) return [askAiMessage()];
  if (["ดูผลงาน", "ผลงาน", "portfolio", "our work"].includes(t)) {
    const carousel = projectsCarousel(PROJECTS.slice(0, 8).map((p) => p.id));
    return [say("ตัวอย่างผลงานของทีมครับ 👇 เลื่อนดูได้เลย แตะการ์ดเพื่อดูรายละเอียดบนเว็บ", false), ...(carousel ? [{ ...carousel, quickReply: quickReply() }] : [])];
  }
  if (["สวัสดี", "หวัดดี", "hello", "hi", "เมนู", "menu"].includes(t)) return [welcomeMessage()];
  return null;
}

// ---------------------------------------------------------------- คำสั่งของทีม

async function adminCommand(userId: string, text: string): Promise<LineMessage[] | null> {
  const [cmd, arg] = text.trim().split(/\s+/, 2);
  if (cmd === "/admin") {
    if (!ADMIN_CODE || arg !== ADMIN_CODE) return [say("รหัสไม่ถูกต้องครับ", false)];
    const name = await profileName(userId);
    await addAdmin({ userId, name, addedAt: Date.now() });
    return [{ type: "text", text: `✅ ลงทะเบียน ${name} เป็นทีมแล้ว\n• ลูกค้าขอคุยกับทีม → การ์ดแจ้งเตือนพร้อมปุ่ม "รับเรื่อง" มาที่แชตนี้\n• จะเข้าไปตอบลูกค้าเอง → กด "👥 ลูกค้าล่าสุด" แล้ว "หยุด AI" คนนั้นก่อน\n• ทีมว่างตอบเองทั้งหมด → กด "⏸ หยุด AI ทั้งหมด"`, quickReply: adminQuick() }];
  }
  if (!cmd.startsWith("/") || !(await isAdmin(userId))) return null;
  const toAdmin = (t: string): LineMessage => ({ type: "text", text: t, quickReply: adminQuick() });

  if (cmd === "/team") {
    const admins = await listAdmins();
    return [toAdmin(`ทีมที่รับแจ้งเตือน (${admins.length} คน)\n${admins.map((a) => `• ${a.name}`).join("\n")}`)];
  }
  if (["/หยุด", "/pause", "/off"].includes(cmd)) {
    await setConfig({ aiPaused: true, pausedBy: await profileName(userId), pausedAt: Date.now() });
    return [toAdmin("⏸ หยุด AI แล้ว — AI จะไม่ตอบลูกค้าคนไหนเลย ทีมตอบเองในหน้าแชต LINE OA ได้เต็มที่\nกด \"▶️ เปิด AI\" เมื่อจะให้ AI กลับมาดูแล")];
  }
  if (["/เปิด", "/resume", "/on"].includes(cmd)) {
    await setConfig({ aiPaused: false });
    return [toAdmin("▶️ เปิด AI แล้ว — AI กลับมาตอบลูกค้า (ยกเว้นคนที่ทีมกดหยุด AI ไว้รายคน)")];
  }
  if (["/ลูกค้า", "/customers"].includes(cmd)) {
    const [list, cfg] = await Promise.all([recentCustomers(), getConfig()]);
    return [customerListCard(list, cfg.aiPaused)];
  }
  if (["/สถานะ", "/status"].includes(cmd)) {
    const [cfg, list] = await Promise.all([getConfig(), recentCustomers(50)]);
    const handled = list.filter((c) => c.mode === "human");
    return [toAdmin(`📊 สถานะ\nAI: ${cfg.aiPaused ? `⏸ หยุดทั้งหมด (โดย ${cfg.pausedBy ?? "ทีม"})` : "▶️ เปิดอยู่"}\nทีมกำลังดูแลรายคน: ${handled.length} คน${handled.map((c) => `\n• ${c.name} — ${c.humanBy ?? "ทีม"}`).join("")}`)];
  }
  return [toAdmin("คำสั่งทีม (กดปุ่มด้านล่างได้เลย):\n⏸ /หยุด — หยุด AI ทุกคน\n▶️ /เปิด — เปิด AI\n👥 /ลูกค้า — ลูกค้าล่าสุด + หยุด AI รายคน\n📊 /สถานะ — ดูสถานะ\n/team — รายชื่อทีม")];
}

// ---------------------------------------------------------------- ลูกค้า

async function startHandoff(event: LineEvent, c: Customer, reason: string, extra: LineMessage[] = []) {
  const { notified, isNew } = await handoff(c, reason, await getPricing());
  await saveCustomer(c);
  const note = !isNew
    ? say("แจ้งทีมไว้แล้วครับ 🙏 ทีมจะมาตอบในแชตนี้เร็ว ๆ นี้ ระหว่างรอถามผมต่อได้เลย")
    : notified === 0 ? say("รับเรื่องไว้แล้วครับ 🙏 ทีมจะติดต่อกลับในแชตนี้ ระหว่างรอถามผมต่อได้เลย") : waitingCard();
  return reply(event.replyToken!, [...extra, note].slice(-5));
}

async function handleCustomerText(event: LineEvent, c: Customer, text: string) {
  c.lastText = text.slice(0, 120);
  // ทีมดูแลลูกค้าคนนี้อยู่ หรือทีมหยุด AI ทั้งหมด → AI เงียบ ให้ทีมตอบเองในหน้าแชตของ LINE OA
  if (c.mode === "human" || (await getConfig()).aiPaused) { await saveCustomer(c); return; }

  const quick = menuReply(text);
  if (quick) return reply(event.replyToken!, quick);
  if (/^(คุยกับคน|คุยกับทีม|ขอคุยกับเจ้าหน้าที่|talk to (a )?human)/i.test(text.trim())) return startHandoff(event, c, "ลูกค้าขอคุยกับทีม");

  if (!takeKey(`line:${c.userId}`, 8)) return reply(event.replyToken!, [say("ส่งข้อความถี่ไปนิดครับ รอสักครู่แล้วลองใหม่นะครับ 🙏")]);

  await showLoading(c.userId, 25);
  const lang = isEnglish(text) ? "en" : "th";
  const history: ChatMessage[] = [...c.history, { role: "user", content: text.slice(0, 500) }];
  const table = await getPricing();
  const answer = await askOnce(history, lang, conciergeAddendum(c, table));

  if (!answer || answer === "budget") {
    return reply(event.replyToken!, [say(answer === "budget"
      ? "ตอนนี้มีคนใช้ผู้ช่วยเยอะมากครับ ลองใหม่อีกสักครู่ หรือกด \"ติดต่อทีม\" เพื่อคุยกับทีมโดยตรง"
      : "ขออภัยครับ ผู้ช่วยตอบไม่ได้ชั่วคราว 🙏 กด \"ติดต่อทีม\" เพื่อคุยกับทีมโดยตรงได้เลยครับ")]);
  }

  const tags = parseConciergeTags(answer);
  if (tags.brief) c.brief = tags.brief;
  const est = tags.estimateSpec ? estimate(tags.estimateSpec, table) : null;
  if (est && tags.estimateSpec) c.estimateSpec = tags.estimateSpec;
  c.history = [...history, { role: "assistant", content: answer }];

  const { text: clean, cards, links } = parseAiForLine(tags.rest, lang);
  const messages: LineMessage[] = [say(clean.slice(0, 4900) || "…", false)];
  const carousel = projectsCarousel(cards, lang);
  if (carousel) messages.push(carousel);
  if (est) messages.push(estimateCard(est));
  const buttons = linksMessage(links, lang);
  if (buttons && messages.length < 4) messages.push(buttons);

  if (tags.handoff) return startHandoff(event, c, tags.estimateSpec ? "ลูกค้าพร้อมคุยเรื่องราคา" : "AI ประเมินว่าควรส่งต่อทีม", messages.slice(0, 4));

  await saveCustomer(c);
  messages[messages.length - 1] = { ...messages[messages.length - 1], quickReply: quickReply() };
  return reply(event.replyToken!, messages);
}

// ---------------------------------------------------------------- ปุ่ม (postback)

async function handlePostback(event: LineEvent, userId: string, data: string) {
  const p = new URLSearchParams(data);
  const action = p.get("a");

  if (action === "handoff") {
    const c = await loadCustomer(userId, () => profileName(userId));
    if (c.mode === "human") return reply(event.replyToken!, [say("ทีมกำลังดูแลเรื่องนี้อยู่ครับ จะตอบในแชตนี้เร็ว ๆ นี้ 🙏", false)]);
    return startHandoff(event, c, p.get("r") === "estimate" ? "ลูกค้าขอให้ทีมยืนยันราคา" : "ลูกค้าขอคุยกับทีม");
  }

  if (action === "mute" || action === "unmute") {
    if (!(await isAdmin(userId))) return reply(event.replyToken!, [say("ปุ่มนี้สำหรับทีมเท่านั้นครับ", false)]);
    const target = p.get("u") ?? "";
    const c = await loadCustomer(target, async () => "ลูกค้า");
    if (action === "mute") {
      await muteCustomer(c, await profileName(userId));
      return reply(event.replyToken!, [{ type: "text", text: `🤫 หยุด AI สำหรับ ${c.name} แล้ว (${HUMAN_HOURS} ชม.) — เข้าไปตอบในหน้าแชต LINE OA ได้เลย\nhttps://chat.line.biz/`, quickReply: adminQuick() }]);
    }
    await unmuteCustomer(c);
    return reply(event.replyToken!, [{ type: "text", text: `🤖 คืนให้ AI แล้ว — AI กลับมาดูแล ${c.name}`, quickReply: adminQuick() }]);
  }

  if (action === "accept" || action === "release") {
    if (!(await isAdmin(userId))) return reply(event.replyToken!, [say("ปุ่มนี้สำหรับทีมเท่านั้นครับ", false)]);
    const ticket = await getTicket(p.get("t") ?? "");
    if (!ticket) return reply(event.replyToken!, [say("ไม่พบเรื่องนี้แล้วครับ", false)]);
    const c = await loadCustomer(ticket.userId, async () => ticket.name);
    const adminName = await profileName(userId);

    if (action === "accept") {
      if (ticket.status === "accepted" && ticket.acceptedBy !== adminName) {
        return reply(event.replyToken!, [say(`${ticket.acceptedBy} รับเรื่อง ${ticket.id} ไปแล้วครับ`, false)]);
      }
      Object.assign(ticket, { status: "accepted", acceptedBy: adminName });
      Object.assign(c, { mode: "human", humanBy: adminName, humanUntil: Date.now() + HUMAN_HOURS * 3_600_000 });
      await Promise.all([saveTicket(ticket), saveCustomer(c)]);
      await push(ticket.userId, [say(`✅ ${adminName} จากทีม IASROM-DEV รับเรื่องแล้ว กำลังมาตอบในแชตนี้ครับ`, false)]);
      return reply(event.replyToken!, [acceptedAdminCard(ticket)]);
    }

    Object.assign(ticket, { status: "closed" });
    Object.assign(c, { mode: "ai", humanBy: undefined, humanUntil: undefined, ticketId: undefined });
    await Promise.all([saveTicket(ticket), saveCustomer(c)]);
    return reply(event.replyToken!, [say(`🤖 คืนให้ AI แล้ว — AI จะกลับมาดูแล ${ticket.name} ต่อครับ`, false)]);
  }
}

// ---------------------------------------------------------------- จัดการ event

async function handle(event: LineEvent) {
  if (!event.replyToken) return;
  const userId = event.source?.userId;
  try {
    if (event.type === "follow") return reply(event.replyToken, [welcomeMessage()]);
    if (event.type === "postback" && userId && event.postback?.data) return handlePostback(event, userId, event.postback.data);
    if (event.type !== "message" || !userId) return;

    if (event.message?.type === "text" && event.message.text) {
      const text = event.message.text;
      if (text.startsWith("/")) {
        const res = await adminCommand(userId, text);
        if (res) return reply(event.replyToken, res);
      }
      if (event.source?.type !== "user") return; // แชตกลุ่ม: ไม่ตอบ
      const c = await loadCustomer(userId, () => profileName(userId));
      return handleCustomerText(event, c, text);
    }

    // รูป / ไฟล์ / สติกเกอร์
    const c = await loadCustomer(userId, () => profileName(userId));
    c.lastText = `[${event.message?.type ?? "ไฟล์"}]`;
    if (c.mode === "human" || (await getConfig()).aiPaused) { await saveCustomer(c); return; }
    await saveCustomer(c);
    return reply(event.replyToken, [say("ได้รับแล้วครับ 👍 ถ้าเป็นรูปอาการเสีย ทีมจะดูให้ — พิมพ์เล่าอาการเพิ่มได้เลย หรือกด \"ติดต่อทีม\"")]);
  } catch (err) {
    console.error("LINE event failed", err);
    try { await reply(event.replyToken, [say("ขออภัยครับ ระบบขัดข้องชั่วคราว กด \"ติดต่อทีม\" เพื่อคุยกับทีมโดยตรงได้เลย")]); } catch {}
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

export function GET() {
  return NextResponse.json({ ok: true, service: "IASROM-DEV LINE webhook" });
}

