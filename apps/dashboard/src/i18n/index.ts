import { createI18n } from 'vue-i18n';
import ar from './ar.json';
import en from './en.json';

export const i18n = createI18n({
  legacy: false,
  locale: 'ar',
  fallbackLocale: 'en',
  messages: { ar, en },
});

export type AppLocale = 'ar' | 'en';
