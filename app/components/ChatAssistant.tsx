"use client";

import { useEffect, useRef, useState } from "react";
import { LANGUAGES, PROJECTS, SKILL_GROUPS, TEAM, localizeMember, localizeProject } from "../data/portfolio";
import { useLang, type Lang } from "../i18n";

type Link = { label: string; href: string; external?: boolean };
// raw/sig: คำตอบดิบจาก AI พร้อมลายเซ็นจากเซิร์ฟเวอร์ — ส่งกลับไปเป็นประวัติแชตได้ (ข้อความที่ไม่มีลายเซ็นจะถูกเซิร์ฟเวอร์ทิ้ง)
// cards: id ผลงานที่แสดงเป็นการ์ดในแชต, streaming: กำลังรับคำตอบทีละส่วน
interface Message { from: "bot" | "user"; text: string; links?: Link[]; raw?: string; sig?: string; cards?: string[]; streaming?: boolean }

const BOT_NAME = "IASROM AI";
// ปุ่มคำถามลัด: ข้อความบนปุ่ม → คำถามที่ส่งจริง (ไทย / อังกฤษ)
const QUICK: Record<Lang, [string, string][]> = {
  th: [
    ["บริการของเรา", "มีบริการอะไรบ้าง"],
    ["ดูผลงาน", "ดูผลงาน"],
    ["ภาษาที่ใช้", "ใช้ภาษาอะไรได้บ้าง"],
    ["ติดต่อทีม", "ติดต่อยังไง"],
  ],
  en: [
    ["Our services", "What services do you offer?"],
    ["Our work", "Show me your work"],
    ["Tech stack", "Which languages and tools do you use?"],
    ["Contact the team", "How can I contact the team?"],
  ],
};

const has = (q: string, words: string[]) => words.some((w) => q.includes(w));
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// ชื่อทักษะต้องเป็นคำเต็ม เช่น "go" ต้องไม่ไปจับคำว่า "google"
const mentions = (q: string, name: string) => new RegExp(`(^|[^a-z0-9+])${escape(name.toLowerCase())}($|[^a-z0-9+])`).test(q);

const teamLinks = (): Link[] => TEAM.filter((m) => m.facebook).map((m) => ({ label: `ทัก${m.nickname} (Facebook)`, href: m.facebook!, external: true }));

// คำตอบสำรอง (ไม่ใช้ AI) — ใช้เมื่อเรียก AI ไม่สำเร็จ ตอบจากข้อมูลบนเว็บเท่านั้น
function reply(input: string): Message {
  const q = input.toLowerCase().trim();
  const skills = SKILL_GROUPS.flatMap((g) => g.skills);

  const skill = skills.find((s) => mentions(q, s.name));
  if (skill) {
    const name = skill.name.toLowerCase();
    const lang = LANGUAGES.find((l) => l.name.toLowerCase() === name);
    const used = PROJECTS.filter((p) => p.stack.some((t) => t.toLowerCase() === name) || (lang && p.langs.includes(lang.id)));
    return {
      from: "bot",
      text: `ทีมเราใช้ ${skill.name} ได้ในระดับ ${skill.level}% ครับ` + (used.length ? `\nผลงานที่เกี่ยวข้อง: ${used.map((p) => p.title).join(", ")}` : ""),
      links: used.length ? [{ label: "ดูผลงาน", href: "#projects" }] : undefined,
      cards: used.slice(0, 3).map((p) => p.id),
    };
  }

  if (has(q, ["สวัสดี", "หวัดดี", "hello", "ดีครับ", "ดีค่ะ"])) {
    return { from: "bot", text: "สวัสดีครับ 👋 ยินดีต้อนรับสู่ IASROM-DEV\nอยากรู้เรื่องไหน เลือกจากปุ่มด้านล่าง หรือพิมพ์ถามได้เลยครับ" };
  }
  if (has(q, ["ราคา", "เท่าไหร่", "เท่าไร", "งบ", "ค่าใช้จ่าย", "ใบเสนอราคา"])) {
    return { from: "bot", text: "ราคาขึ้นอยู่กับขอบเขตงานครับ แนะนำให้ทักทีมเพื่อเล่ารายละเอียดงาน แล้วทีมจะประเมินราคาให้ครับ", links: teamLinks() };
  }
  if (has(q, ["บริการ", "รับทำ", "ทำอะไร", "service"])) {
    return {
      from: "bot",
      text: "บริการของเราครับ\n• เว็บไซต์ / แอปพลิเคชัน / ระบบหลังบ้าน\n• LINE OA / LIFF และ Dashboard รายงาน\n• ซ่อมคอม / โน้ตบุ๊ก และดูแลไอทีสำนักงาน\n• ติดตั้งกล้อง CCTV และระบบเครือข่าย",
      links: [{ label: "ติดต่อเรา", href: "#contact" }],
    };
  }
  if (has(q, ["ผลงาน", "portfolio", "ตัวอย่างงาน", "เคยทำ"])) {
    return {
      from: "bot",
      text: `ตัวอย่างผลงานของเรา ${PROJECTS.length} ชิ้น เช่น\n` + PROJECTS.slice(0, 5).map((p) => `• ${p.title}`).join("\n"),
      links: [{ label: "ดูผลงานทั้งหมด", href: "#projects" }],
    };
  }
  if (has(q, ["ภาษา", "สกิล", "skill", "tech", "เทคโนโลยี", "เครื่องมือ", "stack"])) {
    return {
      from: "bot",
      text: SKILL_GROUPS.map((g) => `${g.title}: ${[...g.skills].sort((a, b) => b.level - a.level).slice(0, 4).map((s) => s.name).join(", ")}`).join("\n") + `\nรวมทั้งหมด ${skills.length} ทักษะครับ`,
      links: [{ label: "ดู Tech Stack", href: "#skills" }],
    };
  }
  if (has(q, ["ทีม", "ใคร", "สมาชิก", "เกี่ยวกับ", "about"])) {
    return { from: "bot", text: "ทีมของเราครับ\n" + TEAM.map((m) => `• ${m.name} (${m.nickname}) — ${m.role}`).join("\n"), links: [{ label: "ดูทีม", href: "#team" }] };
  }
  if (has(q, ["ซ่อม", "คอมเสีย", "cctv", "กล้อง", "เน็ต", "wifi", "network", "เครือข่าย"])) {
    const tech = TEAM.find((m) => m.handles?.some((h) => h.includes("CCTV") || h.includes("ซ่อม")));
    return { from: "bot", text: `งานฮาร์ดแวร์ ซ่อมคอม ติดตั้งกล้อง และระบบเครือข่าย ติดต่อ${tech ? tech.nickname : "ทีมช่าง"}ได้โดยตรงครับ`, links: tech?.facebook ? [{ label: `ทัก${tech.nickname} (Facebook)`, href: tech.facebook, external: true }] : [{ label: "ติดต่อเรา", href: "#contact" }] };
  }
  if (has(q, ["ติดต่อ", "facebook", "เฟส", "โทร", "อีเมล", "line id", "คุย"])) {
    return { from: "bot", text: "ติดต่อทีมได้ทาง Facebook เลยครับ\n• งานเว็บ / แอป / ระบบ → โซ่\n• งานซ่อมคอม / CCTV / เครือข่าย → อาม", links: teamLinks() };
  }
  if (has(q, ["เว็บ", "แอป", "app", "ระบบ", "line", "dashboard"])) {
    const dev = TEAM.find((m) => m.handles?.includes("เว็บไซต์"));
    return { from: "bot", text: `งานเว็บไซต์ แอป และระบบ ติดต่อ${dev ? dev.nickname : "ทีมพัฒนา"}ได้โดยตรงครับ`, links: dev?.facebook ? [{ label: `ทัก${dev.nickname} (Facebook)`, href: dev.facebook, external: true }] : [{ label: "ติดต่อเรา", href: "#contact" }] };
  }
  if (has(q, ["ขอบคุณ", "thank", "ขอบใจ"])) {
    return { from: "bot", text: "ยินดีครับ 😊 มีอะไรถามเพิ่มได้ตลอดเลยนะครับ" };
  }
  return { from: "bot", text: "ขออภัยครับ ยังตอบเรื่องนี้ไม่ได้ ลองเลือกหัวข้อด้านล่าง หรือทักทีมโดยตรงได้เลยครับ", links: [{ label: "ติดต่อเรา", href: "#contact" }] };
}

const SECTION_LINKS: Record<string, { th: string; en: string; href: string }> = {
  projects: { th: "ดูผลงาน", en: "See our work", href: "#projects" },
  skills: { th: "ดูทักษะ", en: "See skills", href: "#skills" },
  team: { th: "ดูทีม", en: "Meet the team", href: "#team" },
  contact: { th: "ติดต่อเรา", en: "Contact us", href: "#contact" },
};

const fbLabel = (nickname: string, lang: Lang) => (lang === "en" ? `Message ${nickname} (Facebook)` : `ทัก${nickname} (Facebook)`);

// แปลงคำตอบจาก AI: ดึงแท็ก [[...]] ออกมาเป็นปุ่มลิงก์ และล้าง markdown ที่หลุดมา
function parseAi(raw: string, lang: Lang): Message {
  const links: Link[] = [];
  const cards: string[] = [];
  const text = raw.replace(/\[\[([^\]]+)\]\]/g, (_, tag: string) => {
    const t = tag.trim();
    if (t.startsWith("project:")) {
      const id = t.slice(8).trim();
      if (PROJECTS.some((p) => p.id === id) && !cards.includes(id) && cards.length < 3) cards.push(id);
    } else if (t.startsWith("fb:")) {
      const key = t.slice(3).trim();
      const raw = TEAM.find((x) => x.nickname === key || localizeMember(x, "en").nickname.toLowerCase() === key.toLowerCase());
      if (raw?.facebook) links.push({ label: fbLabel(localizeMember(raw, lang).nickname, lang), href: raw.facebook, external: true });
    } else if (SECTION_LINKS[t]) links.push({ label: SECTION_LINKS[t][lang], href: SECTION_LINKS[t].href });
    return "";
  })
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/^#+\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const unique = links.filter((l, i) => links.findIndex((x) => x.href === l.href) === i);
  return { from: "bot", text, links: unique.length ? unique : undefined, cards: cards.length ? cards : undefined };
}

// ข้อความที่แสดงระหว่างกำลังรับคำตอบ: ซ่อนแท็ก [[...]] (รวมแท็กที่ยังพิมพ์ไม่จบ) และ markdown
const liveText = (raw: string) => raw
  .replace(/\[\[[^\]]*\]\]/g, "")
  .replace(/\[\[[^\]]*$|\[$/, "")
  .replace(/\*\*/g, "")
  .replace(/^\s*[-*]\s+/gm, "• ")
  .replace(/^#+\s*/gm, "")
  .trimEnd();

class AiError extends Error { constructor(message: string, public status: number) { super(message); } }

// เรียก AI แบบ streaming: เรียก onDelta ทุกครั้งที่ได้ข้อความเพิ่ม แล้วคืนคำตอบฉบับเต็มพร้อมลายเซ็น
async function askAi(history: Message[], lang: Lang, onDelta: (raw: string) => void): Promise<Message> {
  const messages = history
    .filter((m) => m.from === "user" || (m.raw && m.sig))
    .map((m) => m.from === "user" ? { role: "user", content: m.text } : { role: "assistant", content: m.raw, sig: m.sig });
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lang, messages }),
  });
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new AiError(data.error || `HTTP ${res.status}`, res.status);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "", raw = "", sig = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const evt = JSON.parse(line);
      if (evt.d) { raw += evt.d; onDelta(raw); }
      else if (evt.done) sig = evt.sig;
      else if (evt.error) throw new AiError(evt.error, 502);
    }
  }
  const final = raw.trim();
  if (!final) throw new AiError("empty reply", 502);
  return { ...parseAi(final, lang), raw: final, sig };
}

// โลโก้ IASROM-DEV (เฉพาะสัญลักษณ์ AD สีขาว พื้นโปร่งใส) สำหรับวางบนพื้นสีเขียว
function Logo() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="ai-logo" src="/logo-mark-white.png" alt="" aria-hidden="true" draggable={false} />;
}

// คำตอบสำรองภาษาอังกฤษ — ข้อมูลหลักของเว็บเป็นภาษาไทย จึงพาไปติดต่อทีมโดยตรง
function replyEn(): Message {
  return {
    from: "bot",
    text: "Sorry, the assistant can't answer right now. Please reach out to the team directly:\n• Websites / apps / systems → So\n• PC repair / CCTV / networking → Arm",
    links: TEAM.filter((m) => m.facebook).map((m) => ({ label: fbLabel(localizeMember(m, "en").nickname, "en"), href: m.facebook!, external: true })),
  };
}

export default function ChatAssistant() {
  const { lang, t } = useLang();
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const session = useRef(0); // เปลี่ยนทุกครั้งที่ปิดแชต เพื่อทิ้งคำตอบที่ยังค้างอยู่

  // ปิดแชต = ล้างบทสนทนาทันที
  const close = () => {
    session.current += 1;
    setOpen(false);
    setMessages([]);
    setText("");
    setTyping(false);
  };

  // เปิดแชตทันทีเมื่อเข้าผ่านลิงก์ ?chat=1 (เช่น เมนู "ถาม AI" ใน LINE OA)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("chat") === "1") setOpen(true);
  }, []);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, [messages, typing]);
  // เปิดแชต → โฟกัสช่องพิมพ์, ปิดแชต → คืนโฟกัสให้ปุ่มลอย
  useEffect(() => {
    if (open) inputRef.current?.focus();
    else if (wasOpen.current) fabRef.current?.focus();
    wasOpen.current = open;
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = async (value: string) => {
    const q = value.trim();
    if (!q || typing) return;
    const id = session.current;
    const history: Message[] = [...messages, { from: "user", text: q }];
    setMessages(history);
    setText("");
    setTyping(true);
    let answer: Message;
    let started = false; // มีข้อความ streaming อยู่ในรายการแล้วหรือยัง
    const showLive = (raw: string) => {
      if (id !== session.current) return;
      const msg: Message = { from: "bot", text: liveText(raw), streaming: true };
      if (!started) { started = true; setMessages((m) => [...m, msg]); }
      else setMessages((m) => [...m.slice(0, -1), msg]);
    };
    try {
      answer = await askAi(history, lang, showLive);
    } catch (err) {
      if (err instanceof AiError && err.status === 429) {
        // ถูกจำกัดการใช้งาน — แจ้งผู้ใช้ตรง ๆ แทนการตอบแบบสำรอง
        answer = { from: "bot", text: t("ขณะนี้มีการใช้งานผู้ช่วยจำนวนมาก กรุณารอสักครู่แล้วลองใหม่ หรือติดต่อทีมโดยตรงได้เลยครับ", "The assistant is busy right now. Please wait a moment and try again, or contact the team directly."), links: [{ label: t("ติดต่อเรา", "Contact us"), href: "#contact" }] };
      } else {
        console.warn("AI unavailable, using fallback answers", err);
        answer = lang === "en" ? replyEn() : reply(q);
      }
    }
    if (id !== session.current) return; // แชตถูกปิดไปแล้วระหว่างรอคำตอบ
    // แทนที่ข้อความที่กำลังไหลด้วยคำตอบฉบับเต็ม (ลิงก์ + การ์ดผลงาน)
    setMessages((m) => started ? [...m.slice(0, -1), answer] : [...m, answer]);
    setTyping(false);
  };

  return <div className={open ? "ai-widget is-open" : "ai-widget"}>
    {open && <section className="ai-panel" role="dialog" aria-label={t(`แชตกับ ${BOT_NAME}`, `Chat with ${BOT_NAME}`)}>
      <header className="ai-head">
        <span className="ai-avatar"><Logo /></span>
        <span className="ai-title">
          <b>{BOT_NAME} <svg className="ai-verified" viewBox="0 0 24 24" aria-label={t("บัญชีทางการ", "Official account")}><path d="M12 2l2.4 1.8 3-.2 1 2.8 2.6 1.6-.8 2.9.8 2.9-2.6 1.6-1 2.8-3-.2L12 22l-2.4-1.8-3 .2-1-2.8-2.6-1.6.8-2.9-.8-2.9 2.6-1.6 1-2.8 3 .2z" /><path d="m8.5 12 2.3 2.3 4.7-4.7" fill="none" /></svg></b>
          <small>{t("ถามเรื่องบริการและผลงานได้เลย", "Ask about our services and work")}</small>
        </span>
        <button className="ai-close" onClick={close} aria-label={t("ปิดแชต", "Close chat")}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </header>

      <div className="ai-messages" ref={listRef} aria-live="polite">
        <div className="ai-row">
          <span className="ai-mini"><Logo /></span>
          <div className="ai-msg ai-bot">
            <p>{lang === "en"
              ? <>Hi there! I&apos;m <strong>{BOT_NAME}</strong>. Ask me anything about our services, work or team.</>
              : <>สวัสดีครับ! ผม <strong>{BOT_NAME}</strong> ถามเรื่องบริการ ผลงาน หรือทีมของเราได้เลยครับ</>}</p>
          </div>
        </div>
        {/* คำถามแนะนำ: แสดงเฉพาะก่อนเริ่มคุย และหายทันทีที่เริ่มพิมพ์ */}
        {messages.length === 0 && !text.trim() && <QuickReplies items={QUICK[lang]} onPick={send} />}

        {messages.map((m, i) => m.from === "bot"
          ? <div key={i}>
              <div className="ai-row">
                <span className="ai-mini"><Logo /></span>
                <div className="ai-msg ai-bot">
                  <p>{m.text}{m.streaming && <span className="ai-caret" aria-hidden="true" />}</p>
                  {m.cards && <div className="ai-cards">
                    {m.cards.map((cid) => {
                      const raw = PROJECTS.find((p) => p.id === cid);
                      if (!raw) return null;
                      const p = localizeProject(raw, lang);
                      return <button key={cid} type="button" className="ai-card" onClick={() => window.dispatchEvent(new CustomEvent("pf-open", { detail: cid }))}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.image} alt="" loading="lazy" />
                        <span><small>{p.category}</small><b>{p.title}</b><i>{t("ดูรายละเอียด →", "View details →")}</i></span>
                      </button>;
                    })}
                  </div>}
                  {m.links && <div className="ai-links">
                    {m.links.map((l) => <a key={l.href + l.label} href={l.href} target={l.external ? "_blank" : undefined} rel={l.external ? "noopener noreferrer" : undefined} onClick={() => { if (!l.external) close(); }}>{l.label} →</a>)}
                  </div>}
                </div>
              </div>
            </div>
          : <div key={i} className="ai-msg ai-user"><p>{m.text}</p></div>)}

        {typing && !messages[messages.length - 1]?.streaming && <div className="ai-row">
          <span className="ai-mini"><Logo /></span>
          <div className="ai-msg ai-bot ai-typing" aria-label={t("กำลังพิมพ์", "Typing")}><span /><span /><span /></div>
        </div>}
      </div>

      <footer className="ai-foot">
        <form className="ai-input" onSubmit={(e) => { e.preventDefault(); send(text); }}>
          <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("ถามเรื่องบริการหรือผลงาน...", "Ask about our services or work...")} aria-label={t("พิมพ์คำถาม", "Type your question")} maxLength={300} />
          <button type="submit" disabled={!text.trim() || typing} aria-label={t("ส่ง", "Send")}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 3 10 14M21 3l-7 18-4-7-7-4 18-7z" /></svg>
          </button>
        </form>
        <p className="ai-note">{lang === "en"
          ? <>This assistant only answers from information on this website. If an answer seems off, please rely on the <a href="#contact" onClick={close}>Contact section</a>.</>
          : <>ผู้ช่วยนี้ตอบจากข้อมูลบนเว็บไซต์เท่านั้น หากคำตอบคลาดเคลื่อน ให้ยึดตามข้อมูลใน<a href="#contact" onClick={close}>ส่วนติดต่อเรา</a>เป็นหลัก</>}</p>
      </footer>
    </section>}

    {!open && <button ref={fabRef} className="ai-fab" onClick={() => setOpen(true)} aria-label={t("เปิดผู้ช่วย AI", "Open AI assistant")}>
      <span className="ai-fab-core"><Logo /></span>
      <span className="ai-badge">AI</span>
    </button>}
  </div>;
}

function QuickReplies({ items, onPick }: { items: [string, string][]; onPick: (q: string) => void }) {
  return <div className="ai-quick">
    {items.map(([label, q]) => <button key={label} onClick={() => onPick(q)}>{label}</button>)}
  </div>;
}
