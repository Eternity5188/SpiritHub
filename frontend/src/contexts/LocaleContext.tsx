import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Lang = 'zh' | 'en';

interface LocaleContextValue {
  lang: Lang;
  isEnglish: boolean;
  localeCode: string;
  setLang: (lang: Lang) => void;
  t: (zh: string, en: string) => string;
}

const STORAGE_KEY = 'lj_lang';
const MOBILE_MAX_WIDTH = 767;

function isMobileViewport() {
  return window.innerWidth <= MOBILE_MAX_WIDTH;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState<boolean>(() => isMobileViewport());
  const [lang, setLang] = useState<Lang>(() => {
    if (isMobileViewport()) return 'zh';
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'en' ? 'en' : 'zh';
  });

  useEffect(() => {
    const onResize = () => setIsMobile(isMobileViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    if (lang !== 'zh') setLang('zh');
    window.localStorage.setItem(STORAGE_KEY, 'zh');
  }, [isMobile, lang]);

  const setLangSafe = (next: Lang) => {
    if (isMobile) {
      setLang('zh');
      return;
    }
    setLang(next);
  };

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
  }, [lang]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      lang,
      isEnglish: lang === 'en',
      localeCode: lang === 'en' ? 'en-US' : 'zh-CN',
      setLang: setLangSafe,
      t: (zh: string, en: string) => (lang === 'en' ? en : zh),
    }),
    [lang, isMobile],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}