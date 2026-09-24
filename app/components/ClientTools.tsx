"use client";

import { LINE_OA_URL } from "../data/portfolio";
import { useLang } from "../i18n";

const DEMO = "/studio/U4XvTTJ0wS57u-gtxO4rBg"; // ตัวอย่างที่ AI ออกแบบไว้ (ร้านกาแฟ)
const lineText = (text: string) => `https://line.me/R/oaMessage/%40891dpcst/?${encodeURIComponent(text)}`;

export default function ClientTools() {
  const { t } = useLang();
  return <section className="pf-section ctool-section" id="tools">
    <header className="pf-head" data-reveal>
      <p className="pf-kicker">✦ FOR CLIENTS</p>
      <h2>{t("ระบบที่", "Tools that")}<em>{t("ทำให้คุณสบายใจ", " keep you in the loop")}</em></h2>
      <p>{t("ตั้งแต่เห็นแบบก่อนจ้าง ใบเสนอราคาในไม่กี่นาที จนถึงติดตามงานได้ทุกขั้น — ทุกอย่างอยู่ในเว็บและไลน์", "From seeing a design before you hire, to quotes in minutes and live progress tracking — all on the web and LINE.")}</p>
    </header>

    <div className="ctool-grid">
      <a className="ctool-card ctool-ai" href="/studio" data-reveal>
        <div className="ctool-copy">
          <span className="ctool-badge">✨ AI STUDIO · {t("ฟรี", "FREE")}</span>
          <h3>{t("เห็นเว็บของคุณ ก่อนจ่ายสักบาท", "See your website before you pay a baht")}</h3>
          <p>{t("เล่าธุรกิจสั้นๆ แล้ว AI ออกแบบหน้าแรกให้ดูทันทีใน ~15 วินาที แชร์ให้หุ้นส่วนดูได้", "Describe your business and our AI designs a homepage in ~15 seconds. Share it with your partners.")}</p>
          <span className="ctool-cta">{t("ลองออกแบบเลย →", "Try it now →")}</span>
        </div>
        <div className="ctool-mini" aria-hidden="true">
          <div className="ctool-mini-bar"><i /><i /><i /></div>
          <div className="ctool-mini-hero"><b /><b /><span /><em>☕</em></div>
          <div className="ctool-mini-cards"><i /><i /><i /></div>
          <div className="ctool-mini-scan" />
        </div>
      </a>

      <a className="ctool-card" href="/book" data-reveal style={{ "--d": 1 } as React.CSSProperties}>
        <span className="ctool-icon">📅</span>
        <h3>{t("จองคิวออนไลน์", "Book online")}</h3>
        <p>{t("ปรึกษาโปรเจกต์ · ส่งซ่อม · นัดสำรวจ CCTV เลือกวันเวลาเอง เตือนก่อนนัด 1 วัน", "Consultation, repairs or CCTV site survey — pick your slot, get reminded a day before.")}</p>
        <span className="ctool-cta">{t("เลือกวันเวลา →", "Pick a time →")}</span>
      </a>

      <a className="ctool-card" href={lineText("ติดตามงาน")} target="_blank" rel="noopener noreferrer" data-reveal style={{ "--d": 2 } as React.CSSProperties}>
        <span className="ctool-icon">📦</span>
        <h3>{t("ติดตามงานเรียลไทม์", "Live job tracking")}</h3>
        <p>{t("ทุกงานมีลิงก์ส่วนตัว เห็นความคืบหน้าทุกขั้น งานซ่อมมีสติกเกอร์ QR พร้อมใบรับประกันดิจิทัล", "Every job gets a private link with live progress. Repairs come with a QR sticker and digital warranty.")}</p>
        <span className="ctool-cta">{t("ดูงานของฉันในไลน์ →", "See my jobs on LINE →")}</span>
      </a>

      <a className="ctool-card" href={lineText("เริ่มโปรเจกต์")} target="_blank" rel="noopener noreferrer" data-reveal style={{ "--d": 3 } as React.CSSProperties}>
        <span className="ctool-icon">🧾</span>
        <h3>{t("ใบเสนอราคาในไม่กี่นาที", "Quotes in minutes")}</h3>
        <p>{t("คุยกับ AI ในไลน์ ทีมตรวจแล้วส่งใบเสนอราคา PDF ให้ กดตอบรับแล้วจ่ายมัดจำผ่าน QR ได้ทันที", "Chat with our AI on LINE, get a reviewed PDF quote, accept it and pay the deposit by QR.")}</p>
        <span className="ctool-cta">{t("เริ่มคุยในไลน์ →", "Start on LINE →")}</span>
      </a>
    </div>
    <p className="ctool-demo" data-reveal>{t("อยากดูตัวอย่างก่อน?", "Want an example first?")} <a href={DEMO}>{t("ดูเว็บที่ AI ออกแบบให้ร้านกาแฟ →", "See a café site designed by our AI →")}</a> · <a href={LINE_OA_URL} target="_blank" rel="noopener noreferrer">LINE-OA</a></p>
  </section>;
}
