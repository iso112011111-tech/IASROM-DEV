"use client";

import { useEffect, useRef, useState } from "react";
import { SKILL_GROUPS, type SkillIcon } from "../data/portfolio";
import CountUp from "./CountUp";
import TechOrbit from "./TechOrbit";
import { useLang } from "../i18n";

const ICONS: Record<SkillIcon, React.ReactNode> = {
  code: <path d="m8 7-5 5 5 5M16 7l5 5-5 5" />,
  braces: <path d="M8 3H7a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1M16 3h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-1" />,
  file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M10 13l-2 2 2 2M14 13l2 2-2 2" /></>,
  grid: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
  atom: <><circle cx="12" cy="12" r="1.5" /><ellipse cx="12" cy="12" rx="9" ry="3.8" /><ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(60 12 12)" /><ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(120 12 12)" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  phone: <><rect x="6" y="2.5" width="12" height="19" rx="2.5" /><path d="M11 18h2" /></>,
  server: <><rect x="3" y="4" width="18" height="7" rx="2" /><rect x="3" y="13" width="18" height="7" rx="2" /><path d="M7 7.5h.01M7 16.5h.01" /></>,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  db: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>,
  window: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11" /></>,
  monitor: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>,
  branch: <><circle cx="6" cy="5" r="2" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="7" r="2" /><path d="M6 7v10M18 9a6 6 0 0 1-6 6H6" /></>,
  github: <path d="M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />,
  send: <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />,
  chart: <path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6" />,
  image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></>,
  pen: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />,
  terminal: <path d="m4 17 6-5-6-5M12 19h8" />,
  wrench: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z" />,
};

const tier = (level: number, t: (th: string, en: string) => string) => level >= 85 ? t("เชี่ยวชาญ", "Expert") : level >= 75 ? t("คล่อง", "Proficient") : t("ใช้งานได้ดี", "Capable");

export default function SkillMatrix() {
  const { t } = useLang();
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [sorted, setSorted] = useState(false);
  const [minLevel, setMinLevel] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const all = SKILL_GROUPS.flatMap((g) => g.skills);
  const avg = Math.round(all.reduce((s, k) => s + k.level, 0) / all.length);
  const expert = all.filter((k) => k.level >= 85).length;

  return <section ref={ref} className={visible ? "pf-section sk-section is-visible" : "pf-section sk-section"} id="skills">
    <header className="pf-head" data-reveal>
      <p className="pf-kicker">01 · TECH STACK</p>
      <h2>{t("ทักษะและ", "Skills &")} <em>{t("เครื่องมือ", "Tools")}</em></h2>
      <p>{t("ภาษา เฟรมเวิร์ก และเครื่องมือที่ใช้ทำงานจริง", "The languages, frameworks and tools we use in real work")}</p>
    </header>

    <TechOrbit />

    <div className="sk-toolbar" data-reveal>
      <div className="sk-summary">
        <span><b><CountUp value={all.length} /></b> {t("ทักษะ", "skills")}</span>
        <span><b><CountUp value={avg} suffix="%" /></b> {t("เฉลี่ย", "average")}</span>
        <span><b><CountUp value={expert} /></b> {t("ระดับเชี่ยวชาญ", "expert level")}</span>
      </div>
      <div className="sk-controls">
        <div className="sk-seg" role="group" aria-label={t("กรองระดับ", "Filter by level")}>
          {[[0, t("ทั้งหมด", "All")], [75, "75%+"], [85, "85%+"]].map(([v, label]) => <button key={v} aria-pressed={minLevel === v} className={minLevel === v ? "is-active" : undefined} onClick={() => setMinLevel(v as number)}>{label}</button>)}
        </div>
        <button className={sorted ? "sk-sort is-active" : "sk-sort"} aria-pressed={sorted} onClick={() => setSorted(!sorted)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4" /></svg>
          {t("เรียงตาม %", "Sort by %")}
        </button>
      </div>
    </div>

    <div className="sk-grid">
      {SKILL_GROUPS.map((group, gi) => {
        const skills = sorted ? [...group.skills].sort((a, b) => b.level - a.level) : group.skills;
        const groupAvg = Math.round(group.skills.reduce((s, k) => s + k.level, 0) / group.skills.length);
        return <article className="sk-card" key={group.id} data-reveal style={{ "--d": gi } as React.CSSProperties}>
          <header className="sk-card-head">
            <span className="sk-tag">{group.tag}</span>
            <h3>{group.title}</h3>
          </header>
          <ul className="sk-list">
            {skills.map((skill, i) => {
              const dim = skill.level < minLevel;
              return <li key={skill.name} className={dim ? "sk-row is-dim" : "sk-row"} style={{ "--lv": skill.level, "--i": i } as React.CSSProperties}>
                <div className="sk-item">
                  <span className="sk-icon"><svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[skill.icon]}</svg></span>
                  <span className="sk-name">{skill.name}</span>
                  <span className="sk-tier">{tier(skill.level, t)}</span>
                  <span className="sk-pct"><CountUp value={skill.level} suffix="%" duration={1000 + i * 60} /></span>
                </div>
                <span className="sk-track"><span className="sk-fill" /></span>
              </li>;
            })}
          </ul>
          <footer className="sk-foot"><span>{t("ค่าเฉลี่ย", "Average")}</span><b><CountUp value={groupAvg} suffix="%" /></b></footer>
        </article>;
      })}
    </div>
  </section>;
}
