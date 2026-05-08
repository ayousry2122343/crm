import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import ScoreBadge from './ScoreBadge.vue';

function createWrapper(score: number) {
  return mount(ScoreBadge, {
    props: { score },
    global: { plugins: [PrimeVue] },
  });
}

describe('ScoreBadge.vue', () => {
  it('renders score number', () => {
    const w = createWrapper(75);
    expect(w.find('[data-test="score-badge"]').exists()).toBe(true);
    expect(w.text()).toContain('75');
  });

  it('applies danger severity for score 0-30', () => {
    const w = createWrapper(20);
    expect(w.html()).toContain('danger');
  });

  it('applies warn severity for score 31-60', () => {
    const w = createWrapper(45);
    expect(w.html()).toContain('warn');
  });

  it('applies info severity for score 61-80', () => {
    const w = createWrapper(70);
    expect(w.html()).toContain('info');
  });

  it('applies success severity for score 81-100', () => {
    const w = createWrapper(90);
    expect(w.html()).toContain('success');
  });
});
