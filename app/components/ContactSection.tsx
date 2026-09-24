"use client";

import Image from "next/image";
import { CONTACT, LINE_OA_URL, TEAM, localizeMember } from "../data/portfolio";
import { useLang } from "../i18n";

function Icon({ d }: { d: string }) { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>; }
const ICON = {
  facebook: "M15 8h-1.5A2.5 2.5 0 0 0 11 10.5V21M9 13h5M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
  mail: "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm-1 1 9 7 9-7",
  chat: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z",
  clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  arrow: "M5 12h13M13 6l6 6-6 6",
};

// LINE: บัญชีทางการ (OA) ขึ้นต้นด้วย @ → line.me/R/ti/p/@id, บัญชีส่วนตัว → line.me/ti/p/~id
function lineUrl(id: string) {
  const clean = id.trim().replace(/^~/, "");
  return clean.startsWith("@")
    ? `https://line.me/R/ti/p/@${encodeURIComponent(clean.slice(1))}`
    : `https://line.me/ti/p/~${encodeURIComponent(clean)}`;
}

export default function ContactSection() {
  const { lang, t } = useLang();
  const channels = [
    CONTACT.phone && { icon: ICON.phone, label: t("โทร", "Phone"), value: CONTACT.phone, href: `tel:${CONTACT.phone.replace(/[^\d+]/g, "")}` },
    CONTACT.email && { icon: ICON.mail, label: t("อีเมล", "Email"), value: CONTACT.email, href: `mailto:${CONTACT.email}` },
    CONTACT.line && { icon: ICON.chat, label: "LINE", value: CONTACT.line, href: lineUrl(CONTACT.line) },
    CONTACT.hours && { icon: ICON.clock, label: t("เวลาทำการ", "Hours"), value: CONTACT.hours },
  ].filter(Boolean) as { icon: string; label: string; value: string; href?: string }[];

  return <section className="pf-section ct-section" id="contact">
    <header className="pf-head" data-reveal>
      <p className="pf-kicker">04 · CONTACT</p>
      <h2>{t("ติดต่อ", "Contact")}<em>{t("เรา", " us")}</em></h2>
      <p>{t("มีโปรเจกต์ในใจ หรืออุปกรณ์ไอทีมีปัญหา ทักมาคุยกับคนที่ดูแลงานนั้นได้โดยตรง", "Got a project in mind, or IT gear acting up? Message the person who handles that work directly.")}</p>
    </header>

    <div className="ct-grid">
      {TEAM.map((raw) => localizeMember(raw, lang)).map((m, i) => <article className="ct-card" key={TEAM[i].nickname} data-reveal style={{ "--d": i } as React.CSSProperties}>
        <div className="ct-person">
          <div className="ct-avatar">
            {m.photo ? <Image src={m.photo} alt="" fill sizes="128px" /> : <span>{m.nickname}</span>}
          </div>
          <div>
            <p className="ct-for">{m.role}</p>
            <h3>{t(`คุยกับ${m.nickname}`, `Talk to ${m.nickname}`)}</h3>
          </div>
        </div>
        {m.handles && <ul className="ct-tags">{m.handles.map((h) => <li key={h}>{h}</li>)}</ul>}
        {m.facebook
          ? <a className="ct-button" href={m.facebook} target="_blank" rel="noopener noreferrer">
              <Icon d={ICON.facebook} />{t(`ทักแชทหา${m.nickname}ทาง Facebook`, `Message ${m.nickname} on Facebook`)}<Icon d={ICON.arrow} />
            </a>
          : null}
        <a className="ct-button ct-line" href={LINE_OA_URL} target="_blank" rel="noopener noreferrer">
          <Icon d={ICON.chat} />{t("ทักแชทผ่าน LINE-OA", "Chat with us on LINE-OA")}<Icon d={ICON.arrow} />
        </a>
      </article>)}
    </div>

    {channels.length > 0 && <div className="ct-channels" data-reveal>
      {channels.map((c) => {
        const body = <><span className="ct-ch-icon"><Icon d={c.icon} /></span><span><small>{c.label}</small><b>{c.value}</b></span></>;
        return c.href
          ? <a key={c.label} className="ct-channel" href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">{body}</a>
          : <div key={c.label} className="ct-channel">{body}</div>;
      })}
    </div>}
  </section>;
}
