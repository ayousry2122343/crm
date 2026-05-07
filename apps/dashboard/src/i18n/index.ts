import { createI18n } from 'vue-i18n';
import ar from './ar.json';
import en from './en.json';

export const i18n = createI18n({
  legacy: false,
  locale: 'ar',
  fallbackLocale: 'en',
  messages: { ar, en },
  datetimeFormats: {
    en: {
      short: { year: 'numeric', month: 'short', day: 'numeric' },
      long: { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' },
    },
    ar: {
      short: { year: 'numeric', month: 'short', day: 'numeric' },
      long: { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' },
    },
  },
});

export type AppLocale = 'ar' | 'en';
