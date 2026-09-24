// ที่เก็บข้อมูลของบอท LINE (สถานะลูกค้า, เรื่องที่ส่งต่อทีม, รายชื่อทีม)
// ใช้ Firestore ผ่าน REST + Service Account (env FIREBASE_SERVICE_ACCOUNT = JSON หรือ base64 ของ JSON)
// ถ้าไม่ได้ตั้งค่า จะเก็บในหน่วยความจำแทน (ใช้ได้ แต่หายเมื่อเซิร์ฟเวอร์รีสตาร์ท)
import { createSign } from "node:crypto";
import { env } from "./ai";

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

function loadAccount(): ServiceAccount | null {
  const raw = env("FIREBASE_SERVICE_ACCOUNT");
  if (!raw) return null;
  try {
    const json = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const sa = JSON.parse(json);
    return sa.project_id && sa.client_email && sa.private_key ? sa : null;
  } catch {
    console.error("FIREBASE_SERVICE_ACCOUNT is not valid JSON/base64");
    return null;
  }
}

const SA = loadAccount();
export const storeKind = SA ? "firestore" : "memory";

// ---------- Google OAuth (JWT ของ Service Account → access token) ----------
let gToken: { value: string; until: number } | null = null;
async function googleToken() {
  if (gToken && gToken.until > Date.now()) return gToken.value;
  const now = Math.floor(Date.now() / 1000);
  const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${enc({ alg: "RS256", typ: "JWT" })}.${enc({
    iss: SA!.client_email, scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
  })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(SA!.private_key).toString("base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Google token error: ${JSON.stringify(data).slice(0, 200)}`);
  gToken = { value: data.access_token, until: Date.now() + 50 * 60_000 };
  return gToken.value;
}

const docsUrl = () => `https://firestore.googleapis.com/v1/projects/${SA!.project_id}/databases/(default)/documents`;

// เก็บทั้งเอกสารเป็น JSON ในฟิลด์ data (ไม่ต้องแปลงชนิดข้อมูลของ Firestore ทีละฟิลด์)
async function fsGet<T>(col: string, id: string): Promise<T | null> {
  const res = await fetch(`${docsUrl()}/${col}/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${await googleToken()}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore get ${col}/${id} → ${res.status} ${(await res.text()).slice(0, 200)}`);
  const doc = await res.json();
  return JSON.parse(doc.fields?.data?.stringValue ?? "null");
}

async function fsSet(col: string, id: string, value: unknown) {
  const res = await fetch(`${docsUrl()}/${col}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${await googleToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { data: { stringValue: JSON.stringify(value) }, updatedAt: { timestampValue: new Date().toISOString() } } }),
  });
  if (!res.ok) throw new Error(`Firestore set ${col}/${id} → ${res.status} ${(await res.text()).slice(0, 200)}`);
}

/** สร้างเอกสารเฉพาะเมื่อยังไม่มี — คืน false ถ้ามีอยู่แล้ว (ใช้กันงานซ้ำ เช่น แจ้ง "ชำระแล้ว" สองรอบ) */
async function fsCreate(col: string, id: string, value: unknown) {
  const res = await fetch(`${docsUrl()}/${col}/${encodeURIComponent(id)}?currentDocument.exists=false`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${await googleToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { data: { stringValue: JSON.stringify(value) }, updatedAt: { timestampValue: new Date().toISOString() } } }),
  });
  if (res.ok) return true;
  if (res.status === 409 || res.status === 400 || res.status === 412) return false;
  throw new Error(`Firestore create ${col}/${id} → ${res.status} ${(await res.text()).slice(0, 200)}`);
}

async function fsList<T>(col: string): Promise<T[]> {
  const out: T[] = [];
  let pageToken = "";
  for (let page = 0; page < 10; page++) { // สูงสุด 3,000 เอกสารต่อคอลเลกชัน
    const res = await fetch(`${docsUrl()}/${col}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`, { headers: { Authorization: `Bearer ${await googleToken()}` } });
    if (!res.ok) throw new Error(`Firestore list ${col} → ${res.status}`);
    const data = await res.json();
    for (const d of (data.documents ?? []) as { fields?: { data?: { stringValue?: string } } }[]) {
      const v = JSON.parse(d.fields?.data?.stringValue ?? "null");
      if (v) out.push(v);
    }
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return out;
}

async function fsDelete(col: string, id: string) {
  await fetch(`${docsUrl()}/${col}/${encodeURIComponent(id)}`, { method: "DELETE", headers: { Authorization: `Bearer ${await googleToken()}` } });
}

// ---------- หน่วยความจำ (สำรอง) ----------
const mem = new Map<string, Map<string, string>>();
const col = (name: string) => mem.get(name) ?? mem.set(name, new Map()).get(name)!;

export const store = {
  get: <T>(c: string, id: string): Promise<T | null> =>
    SA ? fsGet<T>(c, id) : Promise.resolve(col(c).has(id) ? JSON.parse(col(c).get(id)!) : null),
  set: (c: string, id: string, value: unknown): Promise<void> =>
    SA ? fsSet(c, id, value) : Promise.resolve(void col(c).set(id, JSON.stringify(value))),
  create: (c: string, id: string, value: unknown): Promise<boolean> =>
    SA ? fsCreate(c, id, value) : Promise.resolve(col(c).has(id) ? false : (col(c).set(id, JSON.stringify(value)), true)),
  list: <T>(c: string): Promise<T[]> =>
    SA ? fsList<T>(c) : Promise.resolve([...col(c).values()].map((v) => JSON.parse(v))),
  delete: (c: string, id: string): Promise<void> =>
    SA ? fsDelete(c, id) : Promise.resolve(void col(c).delete(id)),
};
