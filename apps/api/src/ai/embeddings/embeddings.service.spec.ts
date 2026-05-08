import { EmbeddingsService } from './embeddings.service';

function makeAI() {
  return {
    embed: jest.fn().mockResolvedValue(Array.from({ length: 1536 }, () => 0.1)),
  };
}

function makePrisma() {
  return {
    person: { findUnique: jest.fn() },
    deal: { findUnique: jest.fn() },
    activity: { findUnique: jest.fn() },
    $executeRawUnsafe: jest.fn().mockResolvedValue(1),
  };
}

function buildSvc() {
  const ai = makeAI();
  const prisma = makePrisma();
  const svc = new EmbeddingsService(prisma as any, ai as any);
  return { svc, ai, prisma };
}

describe('EmbeddingsService.embedEntity', () => {
  it('embeds a Person record', async () => {
    const { svc, ai, prisma } = buildSvc();
    prisma.person.findUnique.mockResolvedValue({
      fullName: 'Ahmed Yousry',
      email: 'a@b.com',
      phone: '012',
      title: 'CTO',
      companyName: 'ACME',
      industry: 'Tech',
    });
    await svc.embedEntity('ws_1', 'Person', 'p1');
    expect(ai.embed).toHaveBeenCalledTimes(1);
    const text = ai.embed.mock.calls[0][0];
    expect(text).toContain('Ahmed Yousry');
    expect(text).toContain('CTO');
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledTimes(1);
  });

  it('embeds a Deal record', async () => {
    const { svc, ai, prisma } = buildSvc();
    prisma.deal.findUnique.mockResolvedValue({ name: 'Big Deal', amount: 50000, status: 'OPEN' });
    await svc.embedEntity('ws_1', 'Deal', 'd1');
    const text = ai.embed.mock.calls[0][0];
    expect(text).toContain('Big Deal');
    expect(text).toContain('50000');
  });

  it('embeds an Activity record', async () => {
    const { svc, ai, prisma } = buildSvc();
    prisma.activity.findUnique.mockResolvedValue({ subject: 'Meeting', body: 'Discussed plans' });
    await svc.embedEntity('ws_1', 'Activity', 'a1');
    const text = ai.embed.mock.calls[0][0];
    expect(text).toContain('Meeting');
    expect(text).toContain('Discussed plans');
  });

  it('skips embedding for unknown entity type', async () => {
    const { svc, ai, prisma } = buildSvc();
    await svc.embedEntity('ws_1', 'Unknown', 'x1');
    expect(ai.embed).not.toHaveBeenCalled();
    expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('skips embedding when entity not found', async () => {
    const { svc, ai, prisma } = buildSvc();
    prisma.person.findUnique.mockResolvedValue(null);
    await svc.embedEntity('ws_1', 'Person', 'missing');
    expect(ai.embed).not.toHaveBeenCalled();
  });

  it('passes vector as SQL string to $executeRawUnsafe', async () => {
    const { svc, prisma } = buildSvc();
    prisma.person.findUnique.mockResolvedValue({ fullName: 'Test', email: null, phone: null, title: null, companyName: null, industry: null });
    await svc.embedEntity('ws_1', 'Person', 'p1');
    const vectorArg = prisma.$executeRawUnsafe.mock.calls[0][4];
    expect(vectorArg).toMatch(/^\[[\d.,\-e]+\]$/);
  });
});
