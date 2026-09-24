// ติดตามงานแบบเรียลไทม์ (งานเว็บ/ระบบ + งานซ่อม) และใบรับประกันดิจิทัล
// ลูกค้าได้ลิงก์ส่วนตัว (หรือสแกนสติกเกอร์ QR บนเครื่อง) ดูสถานะได้ตลอด — ทุกครั้งที่ทีมขยับสถานะ ไลน์ลูกค้าเด้งแจ้ง
import { docNo, token, validToken } from "./ids";
import { bubble, C, flex, push, SITE, text, uriButton, type LineMessage } from "./line";
import { inviteReview } from "./reviews";
import { store } from "./store";

export type JobKind = "project" | "repair";
export type Job = {
  id: string;             // ลิงก์สาธารณะ (สุ่ม เดาไม่ได้)
  code: string;           // เลขงานอ่านง่าย เช่น JOB-260924-7K2P
  kind: JobKind;
  userId?: string;        // ลูกค้าใน LINE (ไม่มีก็ได้ เช่น ลูกค้า walk-in)
  name: string;
  title: string;          // ชื่องาน เช่น "เว็บไซต์ร้านกาแฟ" / "ซ่อมโน้ตบุ๊ก ASUS"
  device?: string;        // งานซ่อม: รุ่น / S/N
  stages: string[];
  current: number;        // ขั้นปัจจุบัน (index)
  stageAt: number[];      // เวลาที่ถึงแต่ละขั้น
  updates: { at: number; text: string; by: string }[];
  previewUrl?: string;
  warrantyMonths?: number;
  deliveredAt?: number;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
};

const COL = "jobs";
export const STAGES: Record<JobKind, string[]> = {
  project: ["รับบรีฟ", "ออกแบบ", "พัฒนา", "ทดสอบ", "ส่งมอบ"],
  repair: ["รับเครื่อง", "ตรวจเช็ก", "กำลังซ่อม", "ซ่อมเสร็จ", "ส่งคืนแล้ว"],
};

export const getJob = (id: string) => (validToken(id) ? store.get<Job>(COL, id) : Promise.resolve(null));
export const listJobs = async () => (await store.list<Job>(COL)).sort((a, b) => b.updatedAt - a.updatedAt);
export const saveJob = (j: Job) => store.set(COL, j.id, { ...j, updatedAt: Date.now() });
export const jobUrl = (j: Pick<Job, "id">) => `${SITE}/t/${j.id}`;
export const jobDone = (j: Job) => j.current >= j.stages.length - 1;
export const warrantyUntil = (j: Job) => (j.deliveredAt && j.warrantyMonths ? j.deliveredAt + j.warrantyMonths * 30.44 * 86_400_000 : null);

const notify = (userId: string, card: LineMessage) => push(userId, [card]).catch((err) => console.error("job push failed", err));
const str = (v: unknown, max: number) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, max);

export async function createJob(input: { kind: JobKind; userId?: string; name: string; title: string; device?: string; createdBy: string }) {
  const kind: JobKind = input.kind === "repair" ? "repair" : "project";
  const title = str(input.title, 100), name = str(input.name, 60);
  if (!title || !name) throw new Error("ใส่ชื่องานและชื่อลูกค้าด้วย");
  const now = Date.now();
  const job: Job = {
    id: token(), code: docNo(kind === "repair" ? "FIX" : "JOB"), kind,
    ...(input.userId && /^U[0-9a-f]{32}$/.test(input.userId) ? { userId: input.userId } : {}),
    name, title, ...(input.device ? { device: str(input.device, 100) } : {}),
    stages: STAGES[kind], current: 0, stageAt: [now], updates: [], createdBy: input.createdBy, createdAt: now, updatedAt: now,
  };
  await saveJob(job);
  // บันทึกงานแล้ว — ส่งไลน์ไม่สำเร็จก็ไม่ถือว่าพัง (ทีมคัดลอกลิงก์ส่งเองได้) กันทีมกดซ้ำจนงานซ้ำ
  if (job.userId) await notify(job.userId, jobCard(job, `📋 เปิดงานใหม่ให้แล้ว — ติดตามสถานะได้ตลอดจากลิงก์นี้`));
  return job;
}

/** ขยับไปขั้นที่กำหนด (แจ้งลูกค้าในไลน์) — ขั้นสุดท้าย = ส่งมอบ เริ่มนับประกัน + ชวนรีวิว */
export async function moveJob(j: Job, to: number, by: string, note?: string) {
  const idx = Math.min(Math.max(Math.round(to), 0), j.stages.length - 1);
  const stageAt = j.stageAt.slice(0, idx + 1);
  while (stageAt.length <= idx) stageAt.push(Date.now()); // ขั้นที่เพิ่งไปถึงได้เวลาปัจจุบัน / ย้อนขั้นก็ตัดเวลาที่เกินออก
  const updates = note ? [...j.updates, { at: Date.now(), text: str(note, 500), by }] : j.updates;
  const done = idx === j.stages.length - 1;
  const next: Job = { ...j, current: idx, stageAt, updates: updates.slice(-50), ...(done && !j.deliveredAt ? { deliveredAt: Date.now() } : {}) };
  await saveJob(next);
  if (next.userId && idx !== j.current) {
    await notify(next.userId, jobCard(next, done ? "✅ งานเสร็จเรียบร้อย ขอบคุณที่ไว้ใจ IASROM-DEV ครับ" : `🔔 อัปเดตงาน: ตอนนี้อยู่ขั้น "${next.stages[idx]}"${note ? `\n${str(note, 200)}` : ""}`));
    if (done) await inviteReview(next.userId, `job:${next.id}`, next.title, next.name).catch(() => null);
  }
  return next;
}

export async function addJobUpdate(j: Job, note: string, by: string, sendLine = true) {
  const t = str(note, 500);
  if (!t) throw new Error("ใส่ข้อความอัปเดตก่อน");
  const next: Job = { ...j, updates: [...j.updates, { at: Date.now(), text: t, by }].slice(-50) };
  await saveJob(next);
  if (sendLine && next.userId) await notify(next.userId, jobCard(next, `💬 ${t}`));
  return next;
}

export async function setJobInfo(j: Job, info: { previewUrl?: string; warrantyMonths?: number; title?: string; device?: string }) {
  let previewUrl = info.previewUrl === undefined ? j.previewUrl : str(info.previewUrl, 300);
  if (previewUrl && !/^https:\/\/[^\s]+$/i.test(previewUrl)) throw new Error("ลิงก์พรีวิวต้องขึ้นต้นด้วย https://");
  if (!previewUrl) previewUrl = undefined;
  const warrantyMonths = info.warrantyMonths === undefined ? j.warrantyMonths : Math.min(Math.max(Math.round(Number(info.warrantyMonths) || 0), 0), 60) || undefined;
  const next: Job = {
    ...j, previewUrl, warrantyMonths,
    ...(info.title ? { title: str(info.title, 100) } : {}), ...(info.device !== undefined ? { device: str(info.device, 100) || undefined } : {}),
  };
  await saveJob(next);
  return next;
}

export function jobCard(j: Job, headline: string): LineMessage {
  const pct = Math.round((j.current / (j.stages.length - 1)) * 100);
  return flex(`${j.code}: ${j.stages[j.current]}`, bubble({
    body: {
      type: "box", layout: "vertical", spacing: "md", paddingAll: "20px", contents: [
        text(headline, { weight: "bold", size: "sm" }),
        { type: "separator", color: C.line },
        text(`${j.kind === "repair" ? "🛠" : "🚀"} ${j.title}`, { size: "sm" }),
        text(`${j.code} · ขั้น ${j.current + 1}/${j.stages.length}: ${j.stages[j.current]}`, { size: "xs", color: C.sub }),
        {
          type: "box", layout: "vertical", height: "8px", backgroundColor: C.line, cornerRadius: "4px", contents: [
            { type: "box", layout: "vertical", height: "8px", width: `${Math.max(pct, 4)}%`, backgroundColor: C.mint, cornerRadius: "4px", contents: [{ type: "filler" }] },
          ],
        },
      ],
    },
    footer: { type: "box", layout: "vertical", paddingAll: "16px", contents: [uriButton("ดูสถานะงาน", jobUrl(j), true)] },
  }));
}

/** การ์ดรายการงานของลูกค้า (ตอบคำว่า "ติดตามงาน" ในไลน์) */
export async function customerJobsCard(userId: string): Promise<LineMessage> {
  const mine = (await listJobs()).filter((j) => j.userId === userId).slice(0, 10);
  if (!mine.length) return { type: "text", text: "ยังไม่มีงานที่เปิดไว้ในชื่อคุณครับ 🙂 ถ้าเพิ่งส่งงาน/ส่งเครื่อง ทีมจะส่งลิงก์ติดตามให้ในแชตนี้" };
  return flex("งานของคุณ", {
    type: "carousel",
    contents: mine.map((j) => (jobCard(j, jobDone(j) ? "✅ เสร็จแล้ว" : "⏳ กำลังดำเนินการ") as { contents: unknown }).contents),
  });
}
