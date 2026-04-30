import { ref, computed, type Ref } from 'vue';

export type AppLocale = 'ar' | 'en';

const localeRef: Ref<AppLocale> = ref('ar');

function applyToDocument(loc: AppLocale) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = loc;
    document.documentElement.dir = loc === 'ar' ? 'rtl' : 'ltr';
  }
}

applyToDocument(localeRef.value);

export function useLocale() {
  const dir = computed(() => (localeRef.value === 'ar' ? 'rtl' : 'ltr'));

  function setLocale(next: AppLocale) {
    localeRef.value = next;
    applyToDocument(next);
  }

  return { locale: localeRef, dir, setLocale };
}
