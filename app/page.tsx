"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import Image from "next/image";
import CodeZoomExperience from "./components/CodeZoomExperience";
import SkillMatrix from "./components/SkillMatrix";
import ProjectGallery from "./components/ProjectGallery";
import TeamSection from "./components/TeamSection";
import ContactSection from "./components/ContactSection";
import ChatAssistant from "./components/ChatAssistant";
import ScrollReveal from "./components/ScrollReveal";
import { LINE_OA_URL } from "./data/portfolio";
import LogoIntro from "./components/LogoIntro";
import { LangProvider, useLang } from "./i18n";
import { currentTheme, saveManualTheme, type Theme } from "./theme";

// href ที่ขึ้นต้นด้วย # จะเลื่อนไปยัง section ที่มี id นั้นในหน้านี้
const navigation = [
  { id: "home", th: "หน้าแรก", en: "Home", href: "#" },
  { id: "about", th: "เกี่ยวกับเรา", en: "About", href: "#team" },
  { id: "services", th: "บริการของเรา", en: "Services", href: "#services" },
  { id: "work", th: "ผลงานเว็บไซต์", en: "Our Work", href: "#projects" },
  { id: "contact", th: "ติดต่อเรา", en: "Contact", href: "#contact" },
];

function LineIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="line-icon"><path d="M12 3C6.5 3 2 6.6 2 11c0 3.9 3.5 7.2 8.3 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.5 1.1-.5 5.9-3.5 8-6C21.4 14.2 22 12.7 22 11c0-4.4-4.5-8-10-8z" fill="currentColor" /><path d="M6.5 9v4h2M10 9v4M12.2 13V9l2.6 4V9M19 9h-2.2v4H19M16.8 11H19" fill="none" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function Brand() {
  return <a className="brand" href="#" aria-label="IASROM-DEV home"><Image className="brand-image" src="/logoASROM-DEV.png" alt="IASROM-DEV" width={76} height={76} priority /></a>;
}

function ArrowIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>; }
function MoonIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" /></svg>; }
function SunIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>; }

export default function Home() {
  return <LangProvider><HomeContent /></LangProvider>;
}

function HomeContent() {
  const { lang, setLang, t } = useLang();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(navigation[0].id);
  const [dark, setDark] = useState(false);
  const toggleTheme = () => {
    const next: Theme = dark ? "light" : "dark";
    saveManualTheme(next);
    setTheme(next);
  };
  const [scrolled, setScrolled] = useState(false);

  // เมนูมือถือ: ปิดเมื่อกด Esc หรือแตะนอก navbar
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e: PointerEvent) => { if (!(e.target as Element).closest(".navbar")) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onDown); };
  }, [open]);
  useEffect(() => { setDark(document.documentElement.dataset.theme === "dark"); }, []);

  // ตรวจเวลาทุกนาที (และตอนกลับมาที่แท็บ): ถึง 18:00 เปิด Night Mode / 06:00 ปิด — ยกเว้นผู้ใช้เลือกเองไว้
  useEffect(() => {
    const check = () => {
      const want = currentTheme();
      if (document.documentElement.dataset.theme !== want) setTheme(want);
    };
    const id = window.setInterval(check, 60_000);
    const onVisible = () => { if (!document.hidden) check(); };
    document.addEventListener("visibilitychange", onVisible);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", check);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", onVisible); mq.removeEventListener("change", check); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navbar ติดด้านบน: เปลี่ยนสไตล์เมื่อเลื่อน และไฮไลต์เมนูตาม section ที่กำลังดูอยู่
  useEffect(() => {
    const spied = navigation.filter((n) => n.href.length > 1);
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      // section ที่เลื่อนผ่านมาล่าสุด (top มากที่สุดที่ยังอยู่เหนือเส้น 40% ของจอ)
      let current = navigation[0].id;
      let best = -Infinity;
      let lowest = { id: current, top: -Infinity };
      for (const item of spied) {
        const top = document.querySelector(item.href)?.getBoundingClientRect().top;
        if (top === undefined) continue;
        if (top <= window.innerHeight * 0.4 && top > best) { best = top; current = item.id; }
        if (top > lowest.top) lowest = { id: item.id, top };
      }
      if (atBottom) current = lowest.id;
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // เปลี่ยนธีมแบบวงกลมกระจายออกจากปุ่มพระจันทร์ (View Transitions) — ถ้าเบราว์เซอร์ไม่รองรับ หรือผู้ใช้ลดการเคลื่อนไหว จะสลับทันที
  const setTheme = (theme: Theme) => {
    const next = theme === "dark";
    const apply = () => {
      flushSync(() => setDark(next));
      document.documentElement.dataset.theme = theme;
    };
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
    const btn = document.querySelector<HTMLElement>(".navbar .icon-button");
    if (!btn || !doc.startViewTransition || document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { apply(); return; }

    const r = btn.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    doc.startViewTransition(apply).ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 650, easing: "cubic-bezier(.4, 0, .2, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    }).catch(() => {});
  };
  return <main>
    <header className={scrolled ? "navbar is-scrolled" : "navbar"}>
      <div className="nav-inner">
        <Brand />
        <nav className={open ? "menu menu-open" : "menu"} aria-label={t("เมนูหลัก", "Main menu")}>
          {navigation.map((item) => <a href={item.href} key={item.id} className={item.id === active ? "is-active" : undefined} aria-current={item.id === active ? "page" : undefined} onClick={() => { setActive(item.id); setOpen(false); }}>{item[lang]}</a>)}
          <a className="nav-line" href={LINE_OA_URL} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} aria-label={t("แอดไลน์ LINE-OA ของเรา", "Add our LINE-OA")}><LineIcon />LINE-OA</a>
        </nav>
        <div className="nav-actions">
          <div className="lang-switch" role="group" aria-label={t("เลือกภาษา", "Language")}>
            {(["th", "en"] as const).map((code) => <button key={code} type="button" lang={code} className={lang === code ? "is-active" : undefined} aria-pressed={lang === code} onClick={() => setLang(code)}>{code.toUpperCase()}</button>)}
          </div>
          <button type="button" className="icon-button" onClick={toggleTheme} aria-pressed={dark} aria-label={dark ? t("เปลี่ยนเป็นโหมดสว่าง", "Switch to light mode") : t("เปลี่ยนเป็นโหมดมืด", "Switch to dark mode")} title={t("สลับโหมดสว่าง/มืด — เปิดโหมดมืดให้อัตโนมัติช่วง 18:00–06:00", "Toggle light/dark — dark mode turns on automatically 18:00–06:00")}>{dark ? <SunIcon /> : <MoonIcon />}</button>
          <a className="service-button" href="#contact">{t("เริ่มต้นโปรเจกต์", "Start a project")} <ArrowIcon /></a>
        </div>
        <button className={open ? "mobile-toggle is-open" : "mobile-toggle"} onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? t("ปิดเมนู", "Close menu") : t("เปิดเมนู", "Open menu")}><span></span><span></span><span></span></button>
      </div>
    </header>
    <CodeZoomExperience />
    <SkillMatrix />
    <ProjectGallery />
    <TeamSection />
    <ContactSection />
    <footer className="site-footer">Copyright © {new Date().getFullYear()} IASROM-DEV {t("สงวนลิขสิทธิ์ทุกประการ", "All rights reserved.")}</footer>
    <ChatAssistant />
    <ScrollReveal />
    <LogoIntro />
  </main>;
}
