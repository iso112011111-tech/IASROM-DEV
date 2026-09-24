import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { API_KEY, callModel, env, systemPrompt, takeKey, type ChatMessage } from "../../lib/ai";

// เรียก AI ฝั่งเซิร์ฟเวอร์เท่านั้น — API key อยู่ใน .env.local และไม่ถูกส่งไปที่เบราว์เซอร์ (config/prompt อยู่ใน lib/ai.ts)
// รันใกล้ผู้ใช้ไทย (สิงคโปร์) แทนค่าเริ่มต้นที่สหรัฐฯ — ลดเวลาตอบ
export const preferredRegion = ["sin1"];
export const maxDuration = 60;

const MAX_HISTORY = 10;
const MAX_CHARS = 500;
const MAX_BODY_BYTES = 16 * 1024;

// IP จริงของผู้ใช้: เชื่อ header เฉพาะเมื่ออยู่หลัง proxy ที่เชื่อถือได้ (Vercel ตั้งค่า header นี้เองและผู้ใช้ปลอมไม่ได้)
// รันบนเครื่องตัวเองจะรวมเป็นกลุ่มเดียว — ปลอม IP ก็ไม่ช่วยให้ได้โควตาเพิ่ม
function clientIp(req: Request) {
  if (process.env.VERCEL || process.env.TRUST_PROXY === "1") {
    return req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  }
  return "local";
}

// รับเฉพาะคำขอจากหน้าเว็บของเราเอง (เบราว์เซอร์ส่ง Origin มากับ POST เสมอ)
function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const allowed = (process.env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  try {
    const o = new URL(origin);
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    return o.host === host || allowed.includes(o.origin);
  } catch { return false; }
}

// ---------- ลายเซ็นคำตอบของ AI ----------
// ประวัติแชตถูกส่งกลับมาจากเบราว์เซอร์ จึงเซ็นทุกคำตอบของ AI ไว้ และทิ้งข้อความ "ของ AI" ที่ไม่มีลายเซ็นถูกต้อง
// (กันคนแต่งประวัติปลอมเพื่อหลอกให้ AI ทำตามคำสั่งอื่น)
const SIGNING_KEY = env("CHAT_SIGNING_SECRET") || createHash("sha256").update(`iasrom-chat-sign:${API_KEY ?? ""}`).digest("hex");
const sign = (text: string) => createHmac("sha256", SIGNING_KEY).update(text).digest("base64url");
function validSig(text: string, sig: unknown) {
  if (typeof sig !== "string") return false;
  const a = Buffer.from(sign(text));
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

type IncomingMessage = { role?: unknown; content?: unknown; sig?: unknown };

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  if (!API_KEY) return fail("AI ยังไม่ได้ตั้งค่า", 503);
  if (!sameOrigin(req)) return fail("ไม่อนุญาต", 403);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return fail("ข้อความยาวเกินไป", 413);
  if (!takeKey(clientIp(req))) return fail("ส่งข้อความถี่เกินไป กรุณารอสักครู่", 429);

  let history: ChatMessage[];
  let lang: "th" | "en" = "th";
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return fail("ข้อความยาวเกินไป", 413);
    const body = JSON.parse(raw);
    if (body?.lang === "en") lang = "en";
    const list: IncomingMessage[] = Array.isArray(body?.messages) ? body.messages.slice(-MAX_HISTORY * 2) : [];
    history = list
      .filter((m) => typeof m?.content === "string" && m.content.trim() && (
        m.role === "user" || (m.role === "assistant" && validSig(m.content, m.sig))
      ))
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role as ChatMessage["role"], content: (m.content as string).slice(0, m.role === "user" ? MAX_CHARS : 4000) }));
  } catch {
    return fail("รูปแบบข้อมูลไม่ถูกต้อง", 400);
  }
  if (!history.length || history[history.length - 1].role !== "user") return fail("ไม่มีคำถาม", 400);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55_000);
  const system = systemPrompt(lang);

  // ลองโมเดลหลักก่อน ถ้า error (ก่อนเริ่มส่งคำตอบ) ค่อยลองโมเดลสำรอง
  let upstream: Response | null = null;
  try {
    const res = await callModel([{ role: "system", content: system }, ...history], { stream: true, signal: controller.signal });
    if (res === "budget") { clearTimeout(timer); return fail("ขณะนี้มีผู้ใช้งานจำนวนมาก กรุณาลองใหม่ภายหลัง", 429); }
    upstream = res;
  } catch (err) {
    clearTimeout(timer);
    console.error("AI request failed", err);
    return fail("เชื่อมต่อ AI ไม่สำเร็จ", 504);
  }
  if (!upstream?.body) { clearTimeout(timer); return fail("AI ไม่ตอบสนอง", 502); }

  // ส่งต่อคำตอบทีละส่วนเป็น NDJSON: {"d":"ข้อความ"} ... แล้วปิดท้ายด้วย {"done":true,"sig":"..."}
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(out) {
      const send = (obj: unknown) => out.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      let buffer = "";
      let full = "";
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const data = line.trim();
            if (!data.startsWith("data:")) continue;
            const payload = data.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const delta: string = JSON.parse(payload)?.choices?.[0]?.delta?.content ?? "";
              if (delta) { full += delta; send({ d: delta }); }
            } catch { /* บรรทัดที่ไม่ใช่ JSON — ข้าม */ }
          }
        }
        const reply = full.trim();
        if (reply) send({ done: true, sig: sign(reply) });
        else send({ error: "AI ไม่ได้ส่งคำตอบ" });
      } catch (err) {
        console.error("AI stream failed", err);
        send({ error: "เชื่อมต่อ AI ไม่สำเร็จ" });
      } finally {
        clearTimeout(timer);
        out.close();
      }
    },
    cancel() { controller.abort(); clearTimeout(timer); },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
