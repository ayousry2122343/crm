import type { AxiosError } from 'axios';

const STATUS_MESSAGES: Record<number, string> = {
  400: 'errors.validation',
  403: 'errors.forbidden',
  404: 'errors.notFound',
  409: 'errors.conflict',
  500: 'errors.serverError',
};

export interface ApiErrorEvent {
  status?: number;
  messageKey: string;
  serverMessage?: string;
}

export function emitApiError(err: AxiosError<{ message?: string }>) {
  const status = err.response?.status;

  if (status === 401) return;

  const serverMessage = err.response?.data?.message;
  const messageKey = status
    ? STATUS_MESSAGES[status] ?? 'errors.unexpected'
    : 'errors.network';

  window.dispatchEvent(
    new CustomEvent<ApiErrorEvent>('crm:api-error', {
      detail: { status, messageKey, serverMessage },
    }),
  );
}
