"use client";

import { useState } from "react";
import { LANGUAGES, SKILL_GROUPS } from "../data/portfolio";
import { useLang } from "../i18n";

// วงใน = ภาษาหลัก, วงนอก = เฟรมเวิร์กและเครื่องมือ (ดึงระดับจาก SKILL_GROUPS)
const INNER = ["TypeScript", "JavaScript", "Python", "PHP", "Go", "SQL"];
const OUTER = ["ReactJS", "NextJS", "NodeJS", "MySQL", "Flutter", "GitHub", "Figma", "Power BI", "Photoshop", "VS Code"];

const SHORT: Record<string, string> = {
  TypeScript: "TS", JavaScript: "JS", Python: "Py", PHP: "PHP", Go: "Go", SQL: "SQL",
  ReactJS: "React", NextJS: "Next", NodeJS: "Node", MySQL: "MySQL", Flutter: "Flutter",
  GitHub: "GitHub", Figma: "Figma", "Power BI": "BI", Photoshop: "Ps", "VS Code": "VS Code",
};

const skills = SKILL_GROUPS.flatMap((g) => g.skills);
const levelOf = (name: string) => skills.find((s) => s.name === name)?.level ?? 0;
const colorOf = (name: string) => LANGUAGES.find((l) => l.name === name)?.color;

type Hover = { name: string; level: number } | null;

function Ring({ names, radius, duration, reverse, onHover }: { names: string[]; radius: number; duration: number; reverse?: boolean; onHover: (h: Hover) => void }) {
  return <div className={reverse ? "to-ring is-reverse" : "to-ring"} style={{ "--r": `${radius}px`, "--dur": `${duration}s` } as React.CSSProperties}>
    {names.map((name, i) => {
      const angle = (360 / names.length) * i;
      const level = levelOf(name);
      const color = colorOf(name);
      return <div key={name} className="to-slot" style={{ "--a": `${angle}deg` } as React.CSSProperties}>
        <button
          type="button"
          className="to-planet"
          style={color ? { "--c": color } as React.CSSProperties : undefined}
          aria-label={`${name} ${level}%`}
          onMouseEnter={() => onHover({ name, level })}
          onMouseLeave={() => onHover(null)}
          onFocus={() => onHover({ name, level })}
          onBlur={() => onHover(null)}
          onClick={() => onHover({ name, level })}
        >{SHORT[name] ?? name}</button>
      </div>;
    })}
  </div>;
}

export default function TechOrbit() {
  const { t } = useLang();
  const [hover, setHover] = useState<Hover>(null);

  return <div className="to-wrap" data-reveal>
    <div className={hover ? "to-orbit is-paused" : "to-orbit"}>
      <div className="to-track to-track-outer" />
      <div className="to-track to-track-inner" />
      <Ring names={OUTER} radius={190} duration={60} onHover={setHover} />
      <Ring names={INNER} radius={112} duration={40} reverse onHover={setHover} />
      <div className="to-core" aria-live="polite" onClick={() => setHover(null)}>
        {hover
          ? <div className="to-info"><b>{hover.name}</b><span>{hover.level}%</span><i style={{ "--p": hover.level } as React.CSSProperties} /></div>
          // eslint-disable-next-line @next/next/no-img-element
          : <img src="/logo-mark.png" alt="IASROM-DEV" width={96} height={96} />}
      </div>
    </div>
    <p className="to-hint">
      <span className="on-mouse">{t("เอาเมาส์ชี้ที่ดาวแต่ละดวงเพื่อดูระดับความถนัด", "Hover a planet to see our proficiency")}</span>
      <span className="on-touch">{t("แตะที่ดาวแต่ละดวงเพื่อดูระดับความถนัด", "Tap a planet to see our proficiency")}</span>
    </p>
  </div>;
}
