import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApp } from 'vue';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import { useAppToast } from './useAppToast';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockAdd = vi.fn();

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: mockAdd }),
}));

function withSetup(fn: () => void) {
  const i18n = createI18n({ locale: 'en', messages: { en, ar }, legacy: false });
  const app = createApp({ setup: fn, template: '<div />' });
  app.use(i18n);
  app.use(PrimeVue);
  app.use(ToastService);
  app.mount(document.createElement('div'));
}

describe('useAppToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows success toast with translated message', () => {
    withSetup(() => {
      const { success } = useAppToast();
      success('common.created');
    });
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        summary: 'Success',
        detail: 'Created successfully',
        life: 3000,
      }),
    );
  });

  it('shows error toast with translated message', () => {
    withSetup(() => {
      const { error } = useAppToast();
      error('errors.forbidden');
    });
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'Error',
        detail: "You don't have permission to perform this action.",
        life: 5000,
      }),
    );
  });

  it('shows warn toast', () => {
    withSetup(() => {
      const { warn } = useAppToast();
      warn('errors.conflict');
    });
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        detail: 'A conflict occurred. The item may already exist.',
      }),
    );
  });

  it('maps API error status to translated message', () => {
    withSetup(() => {
      const { apiError } = useAppToast();
      apiError({ response: { status: 403 } } as any);
    });
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        detail: "You don't have permission to perform this action.",
      }),
    );
  });

  it('handles network errors without response', () => {
    withSetup(() => {
      const { apiError } = useAppToast();
      apiError({ message: 'Network Error' } as any);
    });
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        detail: 'Network error. Check your connection.',
      }),
    );
  });

  it('uses server message when available in response', () => {
    withSetup(() => {
      const { apiError } = useAppToast();
      apiError({
        response: { status: 400, data: { message: 'Slug already exists' } },
      } as any);
    });
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        detail: 'Slug already exists',
      }),
    );
  });
});
