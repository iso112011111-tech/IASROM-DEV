// รีวิวจากลูกค้าจริง: ส่งลิงก์ให้คะแนนหลังจ่ายเงิน / ส่งมอบงาน → ทีมอนุมัติ → ขึ้นหน้าเว็บพร้อมป้าย "ลูกค้าจริง"
import { createHash } from "node:crypto";
import { bubble, C, flex, push, SITE, text, uriButton, type LineMessage } from "./line";
import { signLink } from "./ids";
import { store } from "./store";

export type Review = {
  id: string;           // = hash ของงานอ้างอิง → 1 งาน รีวิวได้ครั้งเดียว
  ref: string;          // เช่น inv:xxxx / job:xxxx
  userId?: string;
  name: string;         // ชื่อที่ลูกค้าเลือกให้แสดง
  rating: number;       // 1–5
  text: string;
  topic: string;        // งานที่รีวิว (แสดงบนเว็บ)
  approved: boolean;
  createdAt: number;
};

const COL = "reviews";
export const reviewId = (ref: string) => createHash("sha256").update(`review:${ref}`).digest("base64url").slice(0, 22);
export const listReviews = async () => (await store.list<Review>(COL)).sort((a, b) => b.createdAt - a.createdAt);
export const getReview = (id: string) => store.get<Review>(COL, id);
export const saveReview = (r: Review) => store.set(COL, r.id, r);
export const deleteReview = (id: string) => store.delete(COL, id);

/** บันทึกรีวิวใหม่ — คืน false ถ้างานนี้เคยรีวิวแล้ว */
export const createReview = (r: Review) => store.create(COL, r.id, r);

/** ลิงก์ให้คะแนน (ผูกกับงานและลูกค้า เซ็นกันปลอม อายุ 30 วัน) */
export const reviewUrl = (ref: string, topic: string, name: string, userId?: string) =>
  `${SITE}/review?t=${signLink({ ref, topic: topic.slice(0, 80), name: name.slice(0, 40), ...(userId ? { u: userId } : {}) }, 30)}`;

export function reviewInviteCard(url: string, topic: string): LineMessage {
  return flex("ให้คะแนนงานของเรา ⭐", bubble({
    body: {
      type: "box", layout: "vertical", spacing: "md", paddingAll: "22px", contents: [
        { type: "text", text: "⭐⭐⭐⭐⭐", size: "xl", align: "center" },
        { type: "text", text: "ช่วยให้คะแนนงานนี้หน่อยนะครับ", weight: "bold", size: "md", align: "center", color: C.ink, wrap: true },
        text(topic, { align: "center", color: C.sub, size: "xs" }),
        text("ใช้เวลาไม่ถึง 30 วินาที รีวิวของคุณช่วยให้ทีมเล็กๆ ของเราเติบโต 🙏", { align: "center", size: "xs", color: C.sub }),
      ],
    },
    footer: { type: "box", layout: "vertical", paddingAll: "16px", contents: [uriButton("ให้คะแนนเลย", url, true)] },
  }));
}

/** ชวนลูกค้ารีวิว (ถ้างานนี้ยังไม่เคยรีวิว) */
export async function inviteReview(userId: string, ref: string, topic: string, name: string) {
  if (await getReview(reviewId(ref))) return;
  await push(userId, [reviewInviteCard(reviewUrl(ref, topic, name, userId), topic)]);
}

/** สรุปสำหรับหน้าเว็บ (เฉพาะที่ทีมอนุมัติแล้ว) */
export async function publicReviews() {
  const list = (await listReviews()).filter((r) => r.approved);
  const avg = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;
  return {
    count: list.length,
    average: Math.round(avg * 10) / 10,
    items: list.slice(0, 12).map((r) => ({ name: r.name, rating: r.rating, text: r.text, topic: r.topic, at: r.createdAt })),
  };
}
