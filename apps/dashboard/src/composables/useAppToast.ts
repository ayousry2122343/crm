import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';
import type { AxiosError } from 'axios';

const STATUS_MAP: Record<number, string> = {
  400: 'errors.validation',
  401: 'errors.unauthorized',
  403: 'errors.forbidden',
  404: 'errors.notFound',
  409: 'errors.conflict',
  500: 'errors.serverError',
};

export function useAppToast() {
  const toast = useToast();
  const { t } = useI18n();

  function success(messageKey: string) {
    toast.add({
      severity: 'success',
      summary: t('common.success'),
      detail: t(messageKey),
      life: 3000,
    });
  }

  function error(messageKey: string) {
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: t(messageKey),
      life: 5000,
    });
  }

  function warn(messageKey: string) {
    toast.add({
      severity: 'warn',
      summary: t('common.error'),
      detail: t(messageKey),
      life: 4000,
    });
  }

  function apiError(err: AxiosError<{ message?: string }>) {
    const status = err.response?.status;
    const serverMessage = err.response?.data?.message;

    if (!status) {
      toast.add({
        severity: 'error',
        summary: t('common.error'),
        detail: t('errors.network'),
        life: 5000,
      });
      return;
    }

    if (serverMessage && status >= 400 && status < 500) {
      toast.add({
        severity: 'error',
        summary: t('common.error'),
        detail: serverMessage,
        life: 5000,
      });
      return;
    }

    const messageKey = STATUS_MAP[status] ?? 'errors.unexpected';
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: t(messageKey),
      life: 5000,
    });
  }

  return { success, error, warn, apiError };
}
