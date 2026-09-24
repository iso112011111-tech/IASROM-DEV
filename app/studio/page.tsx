import type { Metadata } from "next";
import StudioForm from "./StudioForm";
import "../pro.css";
import "./studio.css";

export const metadata: Metadata = {
  title: "AI Studio — ออกแบบเว็บไซต์ของคุณใน 15 วินาที · IASROM-DEV",
  description: "เล่าธุรกิจของคุณสั้นๆ แล้วให้ AI ของ IASROM-DEV ออกแบบหน้าเว็บตัวอย่างให้ดูทันที ฟรี",
};

export default function StudioPage() {
  return <main className="pro-page studio-page">
    <section className="studio-hero">
      <a href="/" className="pro-back">← IASROM-DEV</a>
      <span className="pro-chip">✨ AI STUDIO · ฟรี</span>
      <h1>เห็นเว็บของคุณ<br /><em>ก่อนจ่ายสักบาท</em></h1>
      <p className="pro-sub">เล่าธุรกิจสั้นๆ แล้ว AI ของเราจะออกแบบหน้าแรกเว็บไซต์ให้ดูใน ~15 วินาที ชอบแบบไหน ส่งให้ทีมทำจริงได้ทันที</p>
      <StudioForm />
    </section>
  </main>;
}
