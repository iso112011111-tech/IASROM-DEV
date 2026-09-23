"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Lang = "th" | "en";

interface LangContext {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** เลือกข้อความตามภาษาปัจจุบัน: t("ไทย", "English") */
  t: (th: string, en: string) => string;
}

const Ctx = createContext<LangContext>({ lang: "th", setLang: () => {}, t: (th) => th });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("th");

  // จำภาษาที่เลือกไว้ในเครื่องผู้ใช้
  useEffect(() => {
    try {
      const saved = localStorage.getItem("lang");
      if (saved === "en" || saved === "th") setLangState(saved);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    // แสดงเนื้อหาเมื่อภาษาตรงกับที่ผู้ใช้เลือกแล้ว (ดู lang-pending ใน layout)
    const root = document.documentElement;
    if (root.classList.contains("lang-pending")) {
      let saved: string | null = null;
      try { saved = localStorage.getItem("lang"); } catch {}
      if (saved !== "en" || lang === "en") root.classList.remove("lang-pending");
    }
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("lang", l); } catch {}
  }, []);

  const t = useCallback((th: string, en: string) => (lang === "en" ? en : th), [lang]);

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);
