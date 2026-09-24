"use client";

import { useEffect, useRef, useState } from "react";
import { LANGUAGES, PROJECTS as RAW_PROJECTS, localizeProject, type LangId, type Project } from "../data/portfolio";
import { useLang } from "../i18n";

const langOf = (id: LangId) => LANGUAGES.find((l) => l.id === id)!;
const INITIAL = 6;

function ProjectCard({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const { t } = useLang();
  const ref = useRef<HTMLButtonElement>(null);

  const tilt = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${-y * 10}deg`);
    el.style.setProperty("--ry", `${x * 12}deg`);
    el.style.setProperty("--gx", `${(x + 0.5) * 100}%`);
    el.style.setProperty("--gy", `${(y + 0.5) * 100}%`);
  };
  const reset = () => {
    ref.current?.style.setProperty("--rx", "0deg");
    ref.current?.style.setProperty("--ry", "0deg");
  };

  return <button ref={ref} className="pj-card" onMouseMove={tilt} onMouseLeave={reset} onClick={onOpen} style={{ "--hue": project.hue } as React.CSSProperties}>
    <span className="pj-cover">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={project.image} alt={`${t("ภาพหน้าจอ", "Screenshot of")} ${project.title}`} loading="lazy" />
      <span className="pj-year">{project.year}</span>
    </span>
    <span className="pj-body">
      <span className="pj-cat">{project.category}</span>
      <b className="pj-title">{project.title}</b>
      <span className="pj-summary">{project.summary}</span>
      <span className="pj-langs">
        {project.langs.map((id) => <span key={id} className="pj-chip" style={{ "--lang": langOf(id).color } as React.CSSProperties}>{langOf(id).name}</span>)}
      </span>
    </span>
    <span className="pj-open" aria-hidden="true">{t("ดูรายละเอียด", "View details")} →</span>
  </button>;
}

export default function ProjectGallery() {
  const { lang, t } = useLang();
  const PROJECTS = RAW_PROJECTS.map((p) => localizeProject(p, lang));
  const [filter, setFilter] = useState<LangId | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const open = PROJECTS.find((p) => p.id === openId) ?? null;
  const matched = filter === "all" ? PROJECTS : PROJECTS.filter((p) => p.langs.includes(filter));
  const shown = showAll || filter !== "all" ? matched : matched.slice(0, INITIAL);

  useEffect(() => {
    const onFilter = (e: Event) => setFilter((e as CustomEvent<LangId>).detail);
    // เปิดหน้าต่างรายละเอียดจากที่อื่น เช่น การ์ดผลงานในแชต AI
    const onOpen = (e: Event) => { const id = (e as CustomEvent<string>).detail; if (RAW_PROJECTS.some((p) => p.id === id)) setOpenId(id); };
    window.addEventListener("pf-filter", onFilter);
    window.addEventListener("pf-open", onOpen);
    return () => { window.removeEventListener("pf-filter", onFilter); window.removeEventListener("pf-open", onOpen); };
  }, []);

  // หน้าต่างรายละเอียด: Esc ปิด, วนโฟกัส Tab อยู่ในหน้าต่าง, ปิดแล้วคืนโฟกัสให้การ์ดที่กดเปิด
  const modalRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpenId(null); return; }
      if (e.key !== "Tab" || !modalRef.current) return;
      const items = modalRef.current.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])');
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      openerRef.current?.focus?.();
    };
  }, [open]);

  const count = (id: LangId) => PROJECTS.filter((p) => p.langs.includes(id)).length;

  return <section className="pf-section" id="projects">
    <header className="pf-head" data-reveal>
      <p className="pf-kicker">02 · SELECTED WORK</p>
      <h2>{t("ผลงานที่", "Work we're")} <em>{t("ภูมิใจ", "proud of")}</em></h2>
      <p>{t("ตัวอย่างระบบและเว็บไซต์ที่ทีมเราพัฒนา กรองตามภาษาที่ใช้ แล้วกดการ์ดเพื่อดูรายละเอียด", "Systems and websites our team has built. Filter by language, then tap a card for details.")}</p>
    </header>

    <div className="pj-filters" data-reveal role="group" aria-label={t("กรองตามภาษา", "Filter by language")}>
      <button className={filter === "all" ? "pj-filter is-active" : "pj-filter"} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>{t("ทั้งหมด", "All")} <span>{PROJECTS.length}</span></button>
      {LANGUAGES.filter((l) => count(l.id) > 0).map((l) => <button
        key={l.id}
        className={filter === l.id ? "pj-filter is-active" : "pj-filter"}
        aria-pressed={filter === l.id}
        style={{ "--lang": l.color } as React.CSSProperties}
        onClick={() => setFilter(l.id)}
      ><i />{l.name} <span>{count(l.id)}</span></button>)}
    </div>

    <div className="pj-grid" key={filter}>
      {shown.map((p, i) => <div className="pj-cell" key={p.id} data-reveal style={{ "--d": i % 3 } as React.CSSProperties}><ProjectCard project={p} onOpen={() => setOpenId(p.id)} /></div>)}
    </div>

    {filter === "all" && !showAll && PROJECTS.length > INITIAL && <div className="pj-more" data-reveal>
      <button onClick={() => setShowAll(true)}>{t("ดูผลงานทั้งหมด", "See all work")} ({PROJECTS.length}) ↓</button>
    </div>}

    {open && <div className="pj-modal-backdrop" onClick={() => setOpenId(null)}>
      <div ref={modalRef} className="pj-modal" role="dialog" aria-modal="true" aria-labelledby="pj-modal-title" onClick={(e) => e.stopPropagation()} style={{ "--hue": open.hue } as React.CSSProperties}>
        <button className="pj-close" onClick={() => setOpenId(null)} aria-label={t("ปิด", "Close")} autoFocus>✕</button>
        <div className="pj-modal-cover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={open.image} alt={`${t("ภาพหน้าจอ", "Screenshot of")} ${open.title}`} />
        </div>
        <div className="pj-modal-body">
          <span className="pj-cat">{open.category} · {open.year}</span>
          <h3 id="pj-modal-title">{open.title}</h3>
          <p>{open.details}</p>
          <h4>{t("ไฮไลต์", "Highlights")}</h4>
          <ul>{open.highlights.map((h) => <li key={h}>{h}</li>)}</ul>
          <h4>Tech Stack</h4>
          <div className="pj-langs">
            {open.langs.map((id) => <span key={id} className="pj-chip" style={{ "--lang": langOf(id).color } as React.CSSProperties}>{langOf(id).name}</span>)}
            {open.stack.map((s) => <span key={s} className="pj-chip pj-chip-plain">{s}</span>)}
          </div>
        </div>
      </div>
    </div>}
  </section>;
}
