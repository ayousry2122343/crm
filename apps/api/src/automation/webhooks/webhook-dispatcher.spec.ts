import { WebhookDispatcher } from './webhook-dispatcher';

function makePrisma() {
  return {
    webhook: { findUnique: jest.fn() },
    webhookDelivery: { create: jest.fn(), update: jest.fn() },
  };
}

function buildDispatcher() {
  const prisma = makePrisma();
  const dispatcher = new WebhookDispatcher(prisma as any);
  return { dispatcher, prisma };
}

describe('WebhookDispatcher.sign', () => {
  it('produces HMAC-SHA256 hex signature', () => {
    const { dispatcher } = buildDispatcher();
    const sig = dispatcher.sign('{"test":true}', 'secret');
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces different signatures for different secrets', () => {
    const { dispatcher } = buildDispatcher();
    const sig1 = dispatcher.sign('payload', 'secret1');
    const sig2 = dispatcher.sign('payload', 'secret2');
    expect(sig1).not.toBe(sig2);
  });
});

describe('WebhookDispatcher.dispatch', () => {
  it('skips disabled webhook', async () => {
    const { dispatcher, prisma } = buildDispatcher();
    prisma.webhook.findUnique.mockResolvedValue({ id: 'wh_1', enabled: false });
    await dispatcher.dispatch({
      webhookId: 'wh_1',
      workspaceId: 'ws_1',
      eventName: 'person.created',
      payload: { id: 'p_1' },
    });
    expect(prisma.webhookDelivery.create).not.toHaveBeenCalled();
  });

  it('creates delivery and calls fetch on enabled webhook', async () => {
    const { dispatcher, prisma } = buildDispatcher();
    prisma.webhook.findUnique.mockResolvedValue({
      id: 'wh_1',
      enabled: true,
      url: 'https://hook.example.com',
      secret: 's3cret',
    });
    prisma.webhookDelivery.create.mockResolvedValue({ id: 'del_1' });
    prisma.webhookDelivery.update.mockResolvedValue({});

    const originalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('OK'),
    }) as any;

    try {
      await dispatcher.dispatch({
        webhookId: 'wh_1',
        workspaceId: 'ws_1',
        eventName: 'person.created',
        payload: { id: 'p_1' },
      });
      expect(globalThis.fetch).toHaveBeenCalled();
      const updateCall = prisma.webhookDelivery.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe('SUCCESS');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
