import type { LocaleCode } from './types';
import { detectLocale } from './detect';
import { en } from './en';
import { ptBR } from './pt-BR';

const STORAGE_KEY = 'house-edge-locale';

const CATALOGS: Record<LocaleCode, Record<string, string>> = {
  en,
  'pt-BR': ptBR,
};

let currentLocale: LocaleCode = 'en';

function readStoredLocale(): LocaleCode | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'en' || raw === 'pt-BR') return raw;
  } catch {
    /* ignore quota / privacy mode */
  }
  return null;
}

function writeStoredLocale(code: LocaleCode): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* ignore */
  }
}

export function getLocale(): LocaleCode {
  return currentLocale;
}

export function setLocale(code: LocaleCode): void {
  currentLocale = code;
  writeStoredLocale(code);
}

/** localStorage → navigator.language → en. Call once at boot. */
export function hydrateLocaleFromStorage(): void {
  const stored = readStoredLocale();
  if (stored) {
    currentLocale = stored;
    return;
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language : undefined;
  currentLocale = detectLocale(nav);
}

export function t(key: string): string {
  const cur = CATALOGS[currentLocale]?.[key];
  if (cur !== undefined) return cur;
  const fallback = CATALOGS.en[key];
  if (fallback !== undefined) return fallback;
  return key;
}

/** Interpolate `{name}` placeholders in a translated string. */
export function tf(key: string, vars: Record<string, string>): string {
  return t(key).replace(/\{(\w+)\}/g, (_, name: string) => vars[name] ?? '');
}

export type { LocaleCode } from './types';
export { detectLocale } from './detect';

export function allKeys(): string[] {
  const keys = new Set<string>([...Object.keys(en), ...Object.keys(ptBR)]);
  return [...keys].sort();
}
