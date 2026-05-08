import { describe, it, expect, vi, beforeEach } from 'vitest';
import { emitApiError, type ApiErrorEvent } from './errorNotifier';
import type { AxiosError } from 'axios';

function makeAxiosError(
  status?: number,
  message?: string,
  serverMessage?: string,
): AxiosError<{ message?: string }> {
  return {
    message: message ?? 'Request failed',
    response: status
      ? {
          status,
          data: serverMessage ? { message: serverMessage } : {},
          headers: {},
          statusText: '',
          config: {} as any,
        }
      : undefined,
    isAxiosError: true,
    config: {} as any,
    toJSON: () => ({}),
    name: 'AxiosError',
  } as AxiosError<{ message?: string }>;
}

describe('emitApiError', () => {
  let dispatched: ApiErrorEvent | null = null;

  beforeEach(() => {
    dispatched = null;
    vi.spyOn(window, 'dispatchEvent').mockImplementation((event: Event) => {
      if (event instanceof CustomEvent) {
        dispatched = event.detail;
      }
      return true;
    });
  });

  it('dispatches crm:api-error event on window', () => {
    emitApiError(makeAxiosError(500));
    expect(window.dispatchEvent).toHaveBeenCalledWith(
      expect.any(CustomEvent),
    );
  });

  it('maps 400 to errors.validation', () => {
    emitApiError(makeAxiosError(400));
    expect(dispatched).toEqual({
      status: 400,
      messageKey: 'errors.validation',
      serverMessage: undefined,
    });
  });

  it('maps 403 to errors.forbidden', () => {
    emitApiError(makeAxiosError(403));
    expect(dispatched).toEqual({
      status: 403,
      messageKey: 'errors.forbidden',
      serverMessage: undefined,
    });
  });

  it('maps 404 to errors.notFound', () => {
    emitApiError(makeAxiosError(404));
    expect(dispatched).toEqual({
      status: 404,
      messageKey: 'errors.notFound',
      serverMessage: undefined,
    });
  });

  it('maps 409 to errors.conflict', () => {
    emitApiError(makeAxiosError(409));
    expect(dispatched).toEqual({
      status: 409,
      messageKey: 'errors.conflict',
      serverMessage: undefined,
    });
  });

  it('maps 500 to errors.serverError', () => {
    emitApiError(makeAxiosError(500));
    expect(dispatched).toEqual({
      status: 500,
      messageKey: 'errors.serverError',
      serverMessage: undefined,
    });
  });

  it('maps unknown status to errors.unexpected', () => {
    emitApiError(makeAxiosError(418));
    expect(dispatched).toEqual({
      status: 418,
      messageKey: 'errors.unexpected',
      serverMessage: undefined,
    });
  });

  it('skips 401 errors entirely (handled by interceptor)', () => {
    emitApiError(makeAxiosError(401));
    expect(window.dispatchEvent).not.toHaveBeenCalled();
  });

  it('maps network error (no response) to errors.network', () => {
    emitApiError(makeAxiosError(undefined, 'Network Error'));
    expect(dispatched).toEqual({
      status: undefined,
      messageKey: 'errors.network',
      serverMessage: undefined,
    });
  });

  it('includes serverMessage when present in response data', () => {
    emitApiError(makeAxiosError(400, undefined, 'Email is invalid'));
    expect(dispatched).toEqual({
      status: 400,
      messageKey: 'errors.validation',
      serverMessage: 'Email is invalid',
    });
  });
});
