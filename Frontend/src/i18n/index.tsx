import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import en from './locales/en.json';
import es from './locales/es.json';

export type LocaleKey = keyof typeof en; // autosave keys included

interface I18nContextValue {
  locale: string;
  t: (key: LocaleKey, vars?: Record<string, React.ReactNode | string | number>) => string | React.ReactNode;
  setLocale: (l: string) => void;
  messages: Record<string, any>;
}

const messages: Record<string, any> = { en, es };

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode; initialLocale?: string; }> = ({ children, initialLocale = 'en' }) => {
  const [locale, setLocale] = useState(initialLocale);

  const t = useCallback((key: LocaleKey, vars?: Record<string, React.ReactNode | string | number>) => {
    const table = messages[locale] || messages.en;
    let template = (table as any)[key] as string | undefined;
    if (!template) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn(`[i18n] Missing key "${key}" for locale ${locale}`);
      }
      template = (messages.en as any)[key] || key;
    }
    if (vars && typeof template === 'string') {
      return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
    }
    return template;
  }, [locale]);

  const value = useMemo(() => ({ locale, t, setLocale, messages }), [locale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
