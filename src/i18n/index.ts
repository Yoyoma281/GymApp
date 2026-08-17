// Lightweight i18n: UI strings in the 14 languages MuscleWiki supports,
// picked from the device locale with English as the fallback.
//
// Drill and exercise content stays in its source language for now; this
// covers the app's own chrome (headings, labels, section titles).

import { NativeModules, Platform } from 'react-native';
import { strings, UIStrings } from './strings';

export const LANGUAGES: { code: string; name: string; native: string }[] = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'ar', name: 'Arabic', native: 'العربية' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'fa', name: 'Persian', native: 'فارسی' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'it', name: 'Italian', native: 'Italiano' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'pl', name: 'Polish', native: 'Polski' },
  { code: 'pt', name: 'Portuguese', native: 'Português' },
  { code: 'ru', name: 'Russian', native: 'Русский' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe' },
  { code: 'zh', name: 'Chinese', native: '中文' },
];

/** MuscleWiki's locale codes, for content requests. */
export const MUSCLEWIKI_LOCALE: Record<string, string> = {
  en: 'en-us',
  ar: 'ar-sa',
  de: 'de-de',
  es: 'es-es',
  fa: 'fa-ir',
  fr: 'fr-fr',
  hi: 'hi-in',
  it: 'it-it',
  ja: 'ja-jp',
  pl: 'pl-pl',
  pt: 'pt-br',
  ru: 'ru-ru',
  tr: 'tr-tr',
  zh: 'zh-cn',
};

export const RTL_LANGUAGES = new Set(['ar', 'fa']);

function deviceLanguage(): string {
  try {
    const tag =
      Platform.OS === 'ios'
        ? (NativeModules.SettingsManager?.settings?.AppleLocale as string) ??
          (NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] as string)
        : Platform.OS === 'android'
          ? (NativeModules.I18nManager?.localeIdentifier as string)
          : typeof navigator !== 'undefined'
            ? navigator.language
            : 'en';
    return String(tag ?? 'en').replace('_', '-').split('-')[0].toLowerCase();
  } catch {
    return 'en';
  }
}

let current = LANGUAGES.some((l) => l.code === deviceLanguage()) ? deviceLanguage() : 'en';

// Screens read translations through plain t() calls rather than context,
// so a language change has to tell React something happened. Subscribers
// (App) re-key the navigator, which re-renders every mounted screen.
const listeners = new Set<() => void>();

export function subscribeLanguage(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getLanguage() {
  return current;
}

export function setLanguage(code: string) {
  const next = LANGUAGES.some((l) => l.code === code) ? code : 'en';
  if (next === current) return;
  current = next;
  for (const listener of listeners) listener();
}

export function isRTL() {
  return RTL_LANGUAGES.has(current);
}

/** Translate a UI key, falling back to English then to the key itself. */
export function t(key: keyof UIStrings): string {
  return strings[current]?.[key] ?? strings.en[key] ?? String(key);
}
