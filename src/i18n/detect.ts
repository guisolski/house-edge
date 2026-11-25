import type { LocaleCode } from './types';

/** Guess locale from navigator.language (or an explicit tag in tests). */
export function detectLocale(navLang?: string): LocaleCode {
  const lang = (navLang ?? '').trim().toLowerCase();
  if (lang.startsWith('pt')) return 'pt-BR';
  return 'en';
}
