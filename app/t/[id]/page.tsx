import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getJob, jobDone, warrantyUntil } from "../../lib/jobs";
import AutoRefresh from "./AutoRefresh";
import "../../pro.css";

export const dynamic = "force-dynamic";
export const preferredRegion = ["sin1"];
export const metadata: Metadata = { title: "ติดตามงาน · IASROM-DEV", robots: { index: false, follow: false } };

const when = (t: number) => new Date(t).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
const day = (t: number) => new Date(t).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" });

export default async function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const j = await getJob(id);
  if (!j) notFound();
  const pct = Math.round((j.current / (j.stages.length - 1)) * 100);
  const done = jobDone(j);
  const until = warrantyUntil(j);
  const covered = until ? until > Date.now() : false;

  return <main className="pro-page">
    <AutoRefresh seconds={done ? 0 : 30} />
    <section className="pro-card trk">
      <header className="trk-head">
        <span className="pro-chip">{j.kind === "repair" ? "🛠 งานซ่อม" : "🚀 โปรเจกต์"}</span>
        <span className="trk-code">{j.code}</span>
      </header>
      <h1>{j.title}</h1>
      {j.device && <p className="pro-sub">{j.device}</p>}

      <div className="trk-ring" style={{ "--p": pct } as React.CSSProperties}>
        <div><b>{pct}%</b><small>{done ? "เสร็จสมบูรณ์" : j.stages[j.current]}</small></div>
      </div>

      <ol className="trk-steps">
        {j.stages.map((s, i) => <li key={s} className={i < j.current ? "done" : i === j.current ? (done ? "done" : "now") : ""}>
          <i aria-hidden="true">{i < j.current || (done && i === j.current) ? "✓" : i + 1}</i>
          <span><b>{s}</b>{j.stageAt[i] && i <= j.current && <small>{when(j.stageAt[i])}</small>}</span>
        </li>)}
      </ol>

      {j.previewUrl && <a className="pro-btn" href={j.previewUrl} target="_blank" rel="noopener noreferrer">👀 ดูพรีวิวงานล่าสุด ↗</a>}

      {j.updates.length > 0 && <section className="trk-updates">
        <h2>อัปเดตจากทีม</h2>
        <ul>{[...j.updates].reverse().slice(0, 15).map((u, i) => <li key={i}><p>{u.text}</p><small>{u.by} · {when(u.at)}</small></li>)}</ul>
      </section>}

      {until && <section className={`trk-warranty ${covered ? "ok" : "off"}`}>
        <div className="seal" aria-hidden="true">{covered ? "🛡️" : "⌛"}</div>
        <div>
          <b>{covered ? "อยู่ในประกัน" : "หมดระยะประกันแล้ว"}</b>
          <span>รับประกัน {j.warrantyMonths} เดือน · ส่งมอบ {day(j.deliveredAt!)} · ถึง {day(until)}</span>
          <small>✓ ตรวจสอบแล้วจากระบบของ IASROM-DEV (iasrom-dev.vercel.app)</small>
        </div>
      </section>}

      <footer className="trk-foot">
        <span>อัปเดตล่าสุด {when(j.updatedAt)}{!done && " · หน้านี้รีเฟรชเองทุก 30 วินาที"}</span>
        <a href="https://line.me/R/ti/p/@891dpcst" target="_blank" rel="noopener noreferrer">มีคำถาม? ทักไลน์ทีม →</a>
      </footer>
    </section>
  </main>;
}
