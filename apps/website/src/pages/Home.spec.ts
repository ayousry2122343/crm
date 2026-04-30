import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import Home from './Home.vue';
import ar from '../i18n/ar.json';

describe('Home', () => {
  it('renders the tagline in Arabic', () => {
    const i18n = createI18n({ legacy: false, locale: 'ar', messages: { ar } });
    const wrapper = mount(Home, { global: { plugins: [i18n] } });
    expect(wrapper.text()).toContain(ar.site.tagline);
  });
});
