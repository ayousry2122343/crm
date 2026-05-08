import { EmailComposerService } from './email-composer.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makeAI() {
  return {
    providerName: 'mock',
    chat: jest.fn().mockResolvedValue(JSON.stringify({ subject: 'Hello', body: 'Dear friend...' })),
    embed: jest.fn(),
  };
}

function makePrisma() {
  return {
    person: { findUnique: jest.fn() },
    deal: { findUnique: jest.fn() },
    aIUsage: { create: jest.fn().mockResolvedValue({ id: 'u1' }) },
  };
}

function buildSvc() {
  const ai = makeAI();
  const prisma = makePrisma();
  const tenant = new TenantContextService();
  const svc = new EmailComposerService(ai as any, prisma as any, tenant);
  return { svc, tenant, ai, prisma };
}

const ctx = (workspaceId = 'ws_1') => ({
  workspaceId,
  userId: 'u_1',
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

describe('EmailComposerService.compose', () => {
  it('calls AI and returns parsed subject+body', async () => {
    const { svc, tenant, ai } = buildSvc();
    await tenant.run(ctx(), async () => {
      const result = await svc.compose({ intent: 'Follow up on meeting', language: 'en' });
      expect(result).toEqual({ subject: 'Hello', body: 'Dear friend...' });
      expect(ai.chat).toHaveBeenCalledTimes(1);
    });
  });

  it('passes language and tone to prompt', async () => {
    const { svc, tenant, ai } = buildSvc();
    await tenant.run(ctx(), async () => {
      await svc.compose({ intent: 'Intro', language: 'ar', tone: 'casual' });
      const prompt = ai.chat.mock.calls[0][0][0].content;
      expect(prompt).toContain('Arabic');
      expect(prompt).toContain('casual');
    });
  });

  it('loads person context when recordRef provided', async () => {
    const { svc, tenant, prisma, ai } = buildSvc();
    prisma.person.findUnique.mockResolvedValue({
      fullName: 'Ahmed',
      email: 'a@b.com',
      phone: '0123',
      lifecycleStage: 'LEAD',
      title: 'Manager',
      companyName: 'ACME',
    });
    await tenant.run(ctx(), async () => {
      await svc.compose({
        intent: 'Welcome email',
        language: 'en',
        recordRef: { entityType: 'Person', entityId: 'p1' },
      });
      const prompt = ai.chat.mock.calls[0][0][0].content;
      expect(prompt).toContain('Ahmed');
      expect(prompt).toContain('LEAD');
    });
  });

  it('loads deal context when recordRef is Deal', async () => {
    const { svc, tenant, prisma, ai } = buildSvc();
    prisma.deal.findUnique.mockResolvedValue({
      name: 'Big Deal',
      amount: 50000,
      status: 'OPEN',
      probability: 75,
    });
    await tenant.run(ctx(), async () => {
      await svc.compose({
        intent: 'Follow up',
        language: 'en',
        recordRef: { entityType: 'Deal', entityId: 'd1' },
      });
      const prompt = ai.chat.mock.calls[0][0][0].content;
      expect(prompt).toContain('Big Deal');
      expect(prompt).toContain('50000');
    });
  });

  it('logs AI usage to AIUsage table', async () => {
    const { svc, tenant, prisma } = buildSvc();
    await tenant.run(ctx(), async () => {
      await svc.compose({ intent: 'test', language: 'en' });
      expect(prisma.aIUsage.create).toHaveBeenCalledTimes(1);
      const data = prisma.aIUsage.create.mock.calls[0][0].data;
      expect(data.workspaceId).toBe('ws_1');
      expect(data.userId).toBe('u_1');
      expect(data.feature).toBe('email-composer');
    });
  });

  it('handles unparseable AI response gracefully', async () => {
    const { svc, tenant, ai } = buildSvc();
    ai.chat.mockResolvedValue('This is not JSON');
    await tenant.run(ctx(), async () => {
      const result = await svc.compose({ intent: 'test', language: 'en' });
      expect(result.subject).toBe('');
      expect(result.body).toBe('This is not JSON');
    });
  });

  it('throws without tenant context', async () => {
    const { svc } = buildSvc();
    await expect(svc.compose({ intent: 'test', language: 'en' })).rejects.toThrow('no tenant context');
  });

  it('passes formal tone to AI prompt', async () => {
    const { svc, tenant, ai } = buildSvc();
    await tenant.run(ctx(), async () => {
      await svc.compose({ intent: 'Meeting request', language: 'en', tone: 'formal' });
      const prompt = ai.chat.mock.calls[0][0][0].content;
      expect(prompt).toContain('formal');
    });
  });

  it('handles Arabic language request', async () => {
    const { svc, tenant, ai } = buildSvc();
    await tenant.run(ctx(), async () => {
      await svc.compose({ intent: 'ترحيب', language: 'ar' });
      const prompt = ai.chat.mock.calls[0][0][0].content;
      expect(prompt).toContain('Arabic');
    });
  });

  it('defaults tone to formal when omitted', async () => {
    const { svc, tenant, ai } = buildSvc();
    await tenant.run(ctx(), async () => {
      await svc.compose({ intent: 'Welcome email', language: 'en' });
      const prompt = ai.chat.mock.calls[0][0][0].content;
      expect(prompt).toContain('formal');
    });
  });

  it('ignores unknown entity type in recordRef', async () => {
    const { svc, tenant, ai } = buildSvc();
    await tenant.run(ctx(), async () => {
      const result = await svc.compose({
        intent: 'Test',
        language: 'en',
        recordRef: { entityType: 'Widget', entityId: 'w_1' },
      });
      expect(result.subject).toBe('Hello');
      expect(ai.chat).toHaveBeenCalled();
    });
  });

  it('handles entity context when record not found', async () => {
    const { svc, tenant, prisma, ai } = buildSvc();
    prisma.person.findUnique.mockResolvedValue(null);
    await tenant.run(ctx(), async () => {
      const result = await svc.compose({
        intent: 'Follow up',
        language: 'en',
        recordRef: { entityType: 'Person', entityId: 'p_missing' },
      });
      expect(result.subject).toBe('Hello');
      expect(ai.chat).toHaveBeenCalled();
    });
  });
});
