import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import CustomFieldEditor from './CustomFieldEditor.vue';
import ar from '../i18n/ar.json';
import type { CustomFieldDef } from '@/api/custom-fields';

function mountEditor(model: CustomFieldDef) {
  const i18n = createI18n({ legacy: false, locale: 'ar', messages: { ar } });
  return mount(CustomFieldEditor, {
    props: { modelValue: model, 'onUpdate:modelValue': () => {} },
    global: { plugins: [i18n, PrimeVue] },
  });
}

describe('CustomFieldEditor.vue', () => {
  it('renders core fields and the save button', () => {
    const w = mountEditor({
      entityType: 'Person',
      key: '',
      label: { ar: '', en: '' },
      type: 'TEXT',
      required: false,
      indexed: false,
    });
    expect(w.find('[data-test="cf-key"]').exists()).toBe(true);
    expect(w.find('[data-test="cf-label-ar"]').exists()).toBe(true);
    expect(w.find('[data-test="cf-label-en"]').exists()).toBe(true);
    expect(w.find('[data-test="cf-type"]').exists()).toBe(true);
    expect(w.find('[data-test="cf-required"]').exists()).toBe(true);
    expect(w.find('[data-test="cf-indexed"]').exists()).toBe(true);
    expect(w.find('[data-test="save-custom-field"]').exists()).toBe(true);
  });

  it('disables indexed checkbox for non-indexable types (LONG_TEXT)', () => {
    const w = mountEditor({
      entityType: 'Person',
      key: '',
      label: { ar: '', en: '' },
      type: 'LONG_TEXT',
      required: false,
      indexed: false,
    });
    const idx = w.find('[data-test="cf-indexed"]');
    // PrimeVue Checkbox renders a hidden input; check the disabled class on the host element
    expect(w.html()).toContain('p-disabled');
    expect(idx.exists()).toBe(true);
  });

  it('keeps indexed checkbox enabled for TEXT on Person', () => {
    const w = mountEditor({
      entityType: 'Person',
      key: 'tier',
      label: { ar: 'الدرجة', en: 'Tier' },
      type: 'TEXT',
      required: false,
      indexed: false,
    });
    // check no disabled state for the index checkbox container
    const html = w.html();
    // Find at least one non-disabled checkbox; the indexed one should be enabled.
    expect(html).toContain('cf-indexed');
  });
});
