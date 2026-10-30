"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "es" | "en" | "pt";
type LanguageContextValue = { locale: Locale; setLocale: (locale: Locale) => void };
const LanguageContext = createContext<LanguageContextValue>({ locale: "es", setLocale: () => {} });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("es");
  useEffect(() => {
    const saved = window.localStorage.getItem("juegue-locale");
    if (saved === "es" || saved === "en" || saved === "pt") setLocale(saved);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem("juegue-locale", locale);
  }, [locale]);
  const value = useMemo(() => ({ locale, setLocale }), [locale]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() { return useContext(LanguageContext); }
