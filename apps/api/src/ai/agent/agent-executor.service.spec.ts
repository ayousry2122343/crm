import { AgentExecutorService } from './agent-executor.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    agentConfig: { findFirst: jest.fn() },
    agentSession: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    kBArticle: { findMany: jest.fn() },
    ticket: { findUnique: jest.fn(), update: jest.fn() },
    person: { findUnique: jest.fn() },
    aiUsage: { create: jest.fn() },
  };
}

function makeAIService() {
  return {
    chat: jest.fn().mockResolvedValue('I can help with that. Let me search our knowledge base.'),
  };
}

function makeEmbeddingsService() {
  return {
    search: jest.fn().mockResolvedValue([
      { id: 'art_1', title: 'Password Reset Guide', score: 0.85 },
    ]),
  };
}

function makeAudit() {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

function buildSvc() {
  const prisma = makePrisma();
  const tenant = new TenantContextService();
  const aiService = makeAIService();
  const embeddings = makeEmbeddingsService();
  const audit = makeAudit();
  const svc = new AgentExecutorService(
    prisma as any,
    tenant,
    aiService as any,
    embeddings as any,
    audit as any,
  );
  return { svc, tenant, prisma, aiService, embeddings, audit };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

describe('AgentExecutorService', () => {
  describe('processMessage', () => {
    it('creates new session for first message', async () => {
      const { svc, tenant, prisma, aiService } = buildSvc();
      prisma.agentConfig.findFirst.mockResolvedValue({
        id: 'ac_1',
        workspaceId: 'ws_1',
        enabled: true,
        provider: 'mock',
        model: 'test',
        systemPrompt: 'You are a helpful agent',
        tools: ['searchKB', 'escalateToHuman'],
        maxTurnsBeforeEscalation: 5,
        confidenceThreshold: 0.7,
        queueIds: ['q_1'],
      });
      prisma.agentSession.findFirst.mockResolvedValue(null);
      prisma.agentSession.create.mockResolvedValue({
        id: 'as_1',
        status: 'ACTIVE',
        turns: [],
        tokensUsed: 0,
      });
      prisma.agentSession.update.mockResolvedValue({
        id: 'as_1',
        status: 'ACTIVE',
        turns: [
          { role: 'user', content: 'How do I reset my password?' },
          { role: 'assistant', content: 'I can help with that.' },
        ],
      });

      await tenant.run(ctx(), async () => {
        const result = await svc.processMessage(
          'conv_1',
          'How do I reset my password?',
          'q_1',
        );
        expect(result!.response).toBeDefined();
        expect(result!.sessionId).toBe('as_1');
      });

      expect(prisma.agentSession.create).toHaveBeenCalled();
      expect(aiService.chat).toHaveBeenCalled();
    });

    it('reuses existing active session', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.agentConfig.findFirst.mockResolvedValue({
        id: 'ac_1',
        workspaceId: 'ws_1',
        enabled: true,
        provider: 'mock',
        model: 'test',
        systemPrompt: 'You are helpful',
        tools: [],
        maxTurnsBeforeEscalation: 5,
        confidenceThreshold: 0.7,
        queueIds: ['q_1'],
      });
      prisma.agentSession.findFirst.mockResolvedValue({
        id: 'as_existing',
        status: 'ACTIVE',
        turns: [{ role: 'user', content: 'Hello' }],
        tokensUsed: 100,
        agentConfigId: 'ac_1',
      });
      prisma.agentSession.update.mockResolvedValue({
        id: 'as_existing',
        status: 'ACTIVE',
      });

      await tenant.run(ctx(), async () => {
        const result = await svc.processMessage('conv_1', 'Follow-up question', 'q_1');
        expect(result!.sessionId).toBe('as_existing');
      });

      expect(prisma.agentSession.create).not.toHaveBeenCalled();
    });

    it('auto-escalates when max turns reached', async () => {
      const { svc, tenant, prisma } = buildSvc();
      const maxTurns = 3;
      prisma.agentConfig.findFirst.mockResolvedValue({
        id: 'ac_1',
        workspaceId: 'ws_1',
        enabled: true,
        provider: 'mock',
        model: 'test',
        systemPrompt: 'helpful',
        tools: [],
        maxTurnsBeforeEscalation: maxTurns,
        confidenceThreshold: 0.7,
        queueIds: ['q_1'],
      });
      const existingTurns = Array.from({ length: maxTurns * 2 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `message ${i}`,
      }));
      prisma.agentSession.findFirst.mockResolvedValue({
        id: 'as_max',
        status: 'ACTIVE',
        turns: existingTurns,
        tokensUsed: 500,
        agentConfigId: 'ac_1',
      });
      prisma.agentSession.update.mockResolvedValue({
        id: 'as_max',
        status: 'ESCALATED',
      });

      await tenant.run(ctx(), async () => {
        const result = await svc.processMessage('conv_1', 'Another question', 'q_1');
        expect(result!.escalated).toBe(true);
      });

      const updateCall = prisma.agentSession.update.mock.calls[0]![0];
      expect(updateCall.data.status).toBe('ESCALATED');
    });

    it('returns null when no agent config for queue', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.agentConfig.findFirst.mockResolvedValue(null);

      await tenant.run(ctx(), async () => {
        const result = await svc.processMessage('conv_1', 'Hello', 'q_no_agent');
        expect(result).toBeNull();
      });
    });
  });

  describe('executeToolCall', () => {
    it('executes searchKB tool and returns results', async () => {
      const { svc, tenant, embeddings } = buildSvc();

      await tenant.run(ctx(), async () => {
        const result = await svc.executeToolCall('searchKB', { query: 'password reset' });
        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('Password Reset Guide');
      });

      expect(embeddings.search).toHaveBeenCalledWith('password reset', expect.anything());
    });

    it('executes getTicketDetails tool', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.ticket.findUnique.mockResolvedValue({
        id: 'tkt_1',
        subject: 'Bug report',
        status: 'OPEN',
      });

      await tenant.run(ctx(), async () => {
        const result = await svc.executeToolCall('getTicketDetails', { ticketId: 'tkt_1' });
        expect(result.subject).toBe('Bug report');
      });
    });

    it('executes getPersonProfile tool', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.person.findUnique.mockResolvedValue({
        id: 'p_1',
        fullName: 'Ahmed Yousry',
        email: 'ahmed@test.com',
      });

      await tenant.run(ctx(), async () => {
        const result = await svc.executeToolCall('getPersonProfile', { personId: 'p_1' });
        expect(result.fullName).toBe('Ahmed Yousry');
      });
    });
  });
});
