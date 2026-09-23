// ธีมอัตโนมัติ: กลางคืน (18:00–06:00 ตามเวลาเครื่องผู้ใช้) หรือเครื่องตั้งโหมดมืดไว้ → Night Mode
// ถ้าผู้ใช้กดเลือกธีมเอง จะใช้ค่านั้นจนถึงรอบเปลี่ยนเวลาถัดไป (06:00 หรือ 18:00) แล้วกลับมาอัตโนมัติ

export type Theme = "light" | "dark";

export const NIGHT_START = 18;
export const NIGHT_END = 6;
const MANUAL_KEY = "theme-manual";

export const isNight = (d = new Date()) => d.getHours() >= NIGHT_START || d.getHours() < NIGHT_END;

export function autoTheme(d = new Date()): Theme {
  const prefersDark = typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches;
  return isNight(d) || prefersDark ? "dark" : "light";
}

/** เวลาที่จะเปลี่ยนช่วงถัดไป (06:00 หรือ 18:00) */
export function nextBoundary(d = new Date()): number {
  const b = new Date(d);
  b.setMinutes(0, 0, 0);
  if (d.getHours() < NIGHT_END) b.setHours(NIGHT_END);
  else if (d.getHours() < NIGHT_START) b.setHours(NIGHT_START);
  else { b.setDate(b.getDate() + 1); b.setHours(NIGHT_END); }
  return b.getTime();
}

export function manualTheme(): Theme | null {
  try {
    const m = JSON.parse(localStorage.getItem(MANUAL_KEY) || "null");
    return m && m.until > Date.now() && (m.theme === "dark" || m.theme === "light") ? m.theme : null;
  } catch { return null; }
}

export function saveManualTheme(theme: Theme) {
  try { localStorage.setItem(MANUAL_KEY, JSON.stringify({ theme, until: nextBoundary() })); } catch {}
}

export const currentTheme = (): Theme => manualTheme() ?? autoTheme();

// ใช้ใน <head> ก่อน paint (ต้องเป็นสตริงเพราะรันก่อน React) — logic เดียวกับด้านบน
export const themeBootScript = `try{var d=new Date(),h=d.getHours(),n=h>=${NIGHT_START}||h<${NIGHT_END},t=(n||matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light",m=null;try{m=JSON.parse(localStorage.getItem("${MANUAL_KEY}")||"null")}catch(e){}if(m&&m.until>Date.now()&&(m.theme==="dark"||m.theme==="light"))t=m.theme;localStorage.removeItem("theme");document.documentElement.dataset.theme=t}catch(e){}`;
