import { ref } from 'vue';
import { brandingApi, type WorkspaceBranding } from '@/api/branding';

const branding = ref<WorkspaceBranding>({
  primaryColor: '#3B82F6',
  secondaryColor: '#1E293B',
});

let loaded = false;

function applyCSS(b: WorkspaceBranding) {
  document.documentElement.style.setProperty('--brand-primary', b.primaryColor);
  document.documentElement.style.setProperty('--brand-secondary', b.secondaryColor);

  if (b.favicon) {
    const link =
      (document.querySelector("link[rel~='icon']") as HTMLLinkElement) ||
      document.createElement('link');
    link.rel = 'icon';
    link.href = b.favicon;
    document.head.appendChild(link);
  }
}

export function useBranding() {
  async function load() {
    try {
      const data = await brandingApi.get();
      branding.value = data;
      applyCSS(data);
      loaded = true;
    } catch {
      // keep defaults on error
    }
  }

  async function save(partial: Partial<WorkspaceBranding>) {
    const updated = await brandingApi.update(partial);
    branding.value = updated;
    applyCSS(updated);
    return updated;
  }

  return { branding, load, save, applyCSS, loaded: () => loaded };
}
