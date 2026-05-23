import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';
import SLABadge from './SLABadge.vue';

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en, ar } });

function createWrapper(props: any = {}) {
  return mount(SLABadge, {
    props,
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        Tag: { template: '<span data-test="sla-tag">{{ value }}</span>', props: ['value', 'severity'] },
      },
    },
  });
}

describe('SLABadge', () => {
  it('shows "Breached" tag when breached=true', () => {
    const w = createWrapper({ label: 'First Response', breached: true, dueDate: '2026-01-01T10:00:00Z' });
    expect(w.find('[data-test="sla-tag"]').text()).toContain('Breached');
  });

  it('shows "On Track" when dueDate is in the future', () => {
    const future = new Date(Date.now() + 3600000).toISOString();
    const w = createWrapper({ label: 'Resolution', dueDate: future });
    expect(w.find('[data-test="sla-tag"]').text()).toContain('On Track');
  });

  it('shows "At Risk" when less than 30 minutes remaining', () => {
    const soon = new Date(Date.now() + 15 * 60000).toISOString();
    const w = createWrapper({ label: 'First Response', dueDate: soon });
    expect(w.find('[data-test="sla-tag"]').text()).toContain('At Risk');
  });

  it('renders nothing when no dueDate', () => {
    const w = createWrapper({ label: 'First Response' });
    expect(w.find('[data-test="sla-badge"]').exists()).toBe(false);
  });
});
