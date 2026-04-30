import { describe, it, expect, beforeEach } from 'vitest';
import { useLocale } from './useLocale';

describe('useLocale', () => {
  beforeEach(() => {
    document.documentElement.dir = '';
    document.documentElement.lang = '';
  });

  it('initializes to ar/rtl by default', () => {
    const { locale, dir } = useLocale();
    expect(locale.value).toBe('ar');
    expect(dir.value).toBe('rtl');
  });

  it('switches to en/ltr when setLocale("en") is called', () => {
    const { setLocale, locale, dir } = useLocale();
    setLocale('en');
    expect(locale.value).toBe('en');
    expect(dir.value).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });
});
