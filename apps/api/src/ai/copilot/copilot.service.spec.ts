import { CopilotService } from './copilot.service';

function makePrisma() {
  return {
    person: { findUnique: jest.fn() },
    deal: { findUnique: jest.fn() },
    activity: { findUnique: jest.fn() },
    $queryRawUnsafe: jest.fn(),
  };
}

function makeAI() {
  return {
    chat: jest.fn().mockResolvedValue('AI response here'),
    embed: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  };
}

function makeEmbeddings() {
  return { embedEntity: jest.fn().mockResolvedValue(undefined) };
}

function makeTenant(workspaceId = 'ws_1') {
  return { getStore: () => ({ workspaceId, userId: 'u_1' }) };
}

function buildSvc() {
  const prisma = makePrisma();
  const ai = makeAI();
  const embeddings = makeEmbeddings();
  const tenant = makeTenant();
  const svc = new CopilotService(prisma as any, ai as any, embeddings as any, tenant as any);
  return { svc, prisma, ai, embeddings, tenant };
}

describe('CopilotService', () => {
  describe('chat', () => {
    it('returns a reply and suggested prompts', async () => {
      const { svc, prisma, ai } = buildSvc();
      prisma.$queryRawUnsafe.mockResolvedValue([]);
      const result = await svc.chat({ message: 'Hello' });
      expect(result.reply).toBe('AI response here');
      expect(result.suggestedPrompts).toBeDefined();
      expect(result.suggestedPrompts.length).toBeGreaterThan(0);
      expect(ai.chat).toHaveBeenCalled();
    });

    it('includes entity context for Person', async () => {
      const { svc, prisma, ai } = buildSvc();
      prisma.person.findUnique.mockResolvedValue({
        fullName: 'Ahmed', email: 'a@b.com', lifecycleStage: 'LEAD', title: 'CEO', companyName: 'Acme',
      });
      prisma.$queryRawUnsafe.mockResolvedValue([]);
      await svc.chat({ message: 'Tell me about this contact', context: { entityType: 'Person', entityId: 'p_1' } });
      const systemMsg = ai.chat.mock.calls[0][0][0];
      expect(systemMsg.content).toContain('Ahmed');
      expect(systemMsg.content).toContain('LEAD');
    });

    it('includes entity context for Deal', async () => {
      const { svc, prisma, ai } = buildSvc();
      prisma.deal.findUnique.mockResolvedValue({ name: 'Big Deal', amount: 50000, status: 'OPEN', expectedCloseAt: null });
      prisma.$queryRawUnsafe.mockResolvedValue([]);
      await svc.chat({ message: 'Summarize this deal', context: { entityType: 'Deal', entityId: 'd_1' } });
      const systemMsg = ai.chat.mock.calls[0][0][0];
      expect(systemMsg.content).toContain('Big Deal');
      expect(systemMsg.content).toContain('50000');
    });

    it('includes entity context for Activity', async () => {
      const { svc, prisma, ai } = buildSvc();
      prisma.activity.findUnique.mockResolvedValue({ subject: 'Call client', type: 'CALL', body: 'notes', dueAt: null });
      prisma.$queryRawUnsafe.mockResolvedValue([]);
      await svc.chat({ message: 'Summarize', context: { entityType: 'Activity', entityId: 'a_1' } });
      const systemMsg = ai.chat.mock.calls[0][0][0];
      expect(systemMsg.content).toContain('Call client');
    });

    it('includes conversation history', async () => {
      const { svc, prisma, ai } = buildSvc();
      prisma.$queryRawUnsafe.mockResolvedValue([]);
      await svc.chat({
        message: 'And then?',
        history: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' },
        ],
      });
      const msgs = ai.chat.mock.calls[0][0];
      expect(msgs).toHaveLength(4);
      expect(msgs[1].content).toBe('Hello');
      expect(msgs[2].content).toBe('Hi there');
      expect(msgs[3].content).toBe('And then?');
    });

    it('generates Person-specific suggestions', async () => {
      const { svc, prisma } = buildSvc();
      prisma.$queryRawUnsafe.mockResolvedValue([]);
      const result = await svc.chat({ message: 'Hi', context: { entityType: 'Person', entityId: 'p_1' } });
      expect(result.suggestedPrompts).toContain('Summarize this contact');
      expect(result.suggestedPrompts).toContain('Draft a follow-up email');
    });

    it('generates Deal-specific suggestions', async () => {
      const { svc, prisma } = buildSvc();
      prisma.$queryRawUnsafe.mockResolvedValue([]);
      const result = await svc.chat({ message: 'Hi', context: { entityType: 'Deal', entityId: 'd_1' } });
      expect(result.suggestedPrompts).toContain('Summarize this deal');
      expect(result.suggestedPrompts).toContain('Assess deal risk');
    });

    it('generates default suggestions with no context', async () => {
      const { svc, prisma } = buildSvc();
      prisma.$queryRawUnsafe.mockResolvedValue([]);
      const result = await svc.chat({ message: 'Hi' });
      expect(result.suggestedPrompts).toContain('Summarize pipeline');
    });
  });

  describe('queryRelevantEmbeddings', () => {
    it('queries pgvector and returns entity summaries', async () => {
      const { svc, prisma, ai } = buildSvc();
      prisma.$queryRawUnsafe.mockResolvedValue([
        { entityType: 'Person', entityId: 'p_1', distance: 0.1 },
      ]);
      prisma.person.findUnique.mockResolvedValue({ fullName: 'Sara', email: 'sara@test.com' });
      const chunks = await svc.queryRelevantEmbeddings('ws_1', 'test query');
      expect(ai.embed).toHaveBeenCalledWith('test query');
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toContain('Sara');
    });

    it('handles RAG query failure gracefully', async () => {
      const { svc, prisma, ai } = buildSvc();
      prisma.$queryRawUnsafe.mockRejectedValue(new Error('pgvector not available'));
      const chunks = await svc.queryRelevantEmbeddings('ws_1', 'test');
      expect(chunks).toEqual([]);
    });
  });

  describe('buildEntityContext', () => {
    it('returns empty for unknown entity type', async () => {
      const { svc } = buildSvc();
      const result = await svc.buildEntityContext('FooBar', 'x_1');
      expect(result).toBe('');
    });

    it('returns empty for non-existent entity', async () => {
      const { svc, prisma } = buildSvc();
      prisma.person.findUnique.mockResolvedValue(null);
      const result = await svc.buildEntityContext('Person', 'p_none');
      expect(result).toBe('');
    });
  });

  describe('chat edge-cases', () => {
    it('handles RAG with empty embeddings gracefully', async () => {
      const { svc, prisma, ai } = buildSvc();
      prisma.$queryRawUnsafe.mockResolvedValue([]);
      const result = await svc.chat({ message: 'Query with no relevant docs' });
      expect(result.reply).toBeDefined();
      expect(ai.chat).toHaveBeenCalled();
    });

    it('chat without context or history works', async () => {
      const { svc, prisma, ai } = buildSvc();
      prisma.$queryRawUnsafe.mockResolvedValue([]);
      const result = await svc.chat({ message: 'Hello' });
      expect(result.reply).toBe('AI response here');
      const msgs = ai.chat.mock.calls[0][0];
      expect(msgs[msgs.length - 1].content).toBe('Hello');
    });

    it('throws without tenant context', async () => {
      const prisma = makePrisma();
      const ai = makeAI();
      const embeddings = makeEmbeddings();
      const tenant = { getStore: () => null };
      const svc = new CopilotService(prisma as any, ai as any, embeddings as any, tenant as any);
      await expect(svc.chat({ message: 'Hi' })).rejects.toThrow('no tenant context');
    });

    it('generates Activity-specific suggestions', async () => {
      const { svc, prisma } = buildSvc();
      prisma.$queryRawUnsafe.mockResolvedValue([]);
      const result = await svc.chat({ message: 'Hi', context: { entityType: 'Activity', entityId: 'a_1' } });
      expect(result.suggestedPrompts).toContain('Summarize this activity');
      expect(result.suggestedPrompts).toContain('Suggest follow-up actions');
    });

    it('includes RAG chunks in context when embeddings found', async () => {
      const { svc, prisma, ai } = buildSvc();
      prisma.$queryRawUnsafe.mockResolvedValue([
        { entityType: 'Person', entityId: 'p_1', distance: 0.1 },
        { entityType: 'Deal', entityId: 'd_1', distance: 0.2 },
      ]);
      prisma.person.findUnique.mockResolvedValue({ fullName: 'Ahmed', email: 'a@b.com' });
      prisma.deal.findUnique.mockResolvedValue({ name: 'Big Deal', amount: 50000, status: 'OPEN' });

      await svc.chat({ message: 'What do you know?' });
      const systemMsg = ai.chat.mock.calls[0][0][0];
      expect(systemMsg.content).toContain('Ahmed');
      expect(systemMsg.content).toContain('Big Deal');
    });
  });
});
