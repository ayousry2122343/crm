import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import Home from './Home.vue';
import en from '../i18n/en.json';
import ar from '../i18n/ar.json';

function createWrapper(locale = 'en') {
  const i18n = createI18n({ legacy: false, locale, messages: { en, ar } });
  return mount(Home, { global: { plugins: [i18n] } });
}

describe('Home', () => {
  it('renders the hero section', () => {
    const wrapper = createWrapper();
    expect(wrapper.find('[data-test="hero"]').exists()).toBe(true);
  });

  it('renders the headline', () => {
    const wrapper = createWrapper();
    expect(wrapper.text()).toContain('The CRM Built for MENA');
  });

  it('renders the tagline in Arabic', () => {
    const wrapper = createWrapper('ar');
    expect(wrapper.text()).toContain(ar.site.tagline);
  });

  it('contains the CTA', () => {
    const wrapper = createWrapper();
    expect(wrapper.text()).toContain('Start Free');
  });
});
