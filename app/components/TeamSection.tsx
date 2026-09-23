"use client";

import Image from "next/image";
import { TEAM, localizeMember } from "../data/portfolio";
import { useLang } from "../i18n";

function FacebookIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M15 8h-1.5A2.5 2.5 0 0 0 11 10.5V21M9 13h5" /></svg>; }
function InstagramIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5h.01" /></svg>; }

export default function TeamSection() {
  const { lang, t } = useLang();
  return <section className="pf-section tm-section" id="team">
      <header className="pf-head" data-reveal>
        <p className="pf-kicker">03 · OUR TEAM</p>
        <h2>{t("ทีม", "Our")}<em>{t("ของเรา", " team")}</em></h2>
        <p>{t("คนที่อยู่เบื้องหลังทุกโปรเจกต์ของ IASROM-DEV", "The people behind every IASROM-DEV project")}</p>
      </header>

      <div className="tm-grid">
        {TEAM.map((raw) => localizeMember(raw, lang)).map((m, i) => <article className="tm-card" key={TEAM[i].nickname} data-reveal style={{ "--d": i } as React.CSSProperties}>
          <div className="tm-photo">
            {m.photo
              ? <Image src={m.photo} alt={`${m.name} (${m.nickname})`} fill sizes="300px" />
              : <span className="tm-initial" aria-hidden="true">{m.nickname}</span>}
          </div>
          <div className="tm-info">
            <h3>{m.name} <span>({m.nickname})</span></h3>
            <p>{m.role}</p>
            {(m.facebook || m.instagram) && <div className="tm-links">
              {m.facebook && <a href={m.facebook} target="_blank" rel="noopener noreferrer"><FacebookIcon />Facebook</a>}
              {m.instagram && <a href={m.instagram} target="_blank" rel="noopener noreferrer"><InstagramIcon />Instagram</a>}
            </div>}
          </div>
        </article>)}
      </div>
  </section>;
}
