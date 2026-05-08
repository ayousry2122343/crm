import { EmailSyncService } from './email-sync.service';

function makePrisma() {
  return {
    emailAccount: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    emailThread: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    emailMessage: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    person: {
      findFirst: jest.fn(),
    },
  };
}

function makeTenant(workspaceId = 'ws_1', userId = 'u_1') {
  return { getStore: () => ({ workspaceId, userId }) };
}

function makeAudit() {
  return { log: jest.fn().mockResolvedValue(undefined), logUpdate: jest.fn().mockResolvedValue(undefined) };
}

function buildSvc(tenantOverrides?: { workspaceId?: string; userId?: string }) {
  const prisma = makePrisma();
  const tenant = makeTenant(tenantOverrides?.workspaceId, tenantOverrides?.userId);
  const audit = makeAudit();
  const svc = new EmailSyncService(prisma as any, tenant as any, audit as any);
  return { svc, prisma, tenant, audit };
}

describe('EmailSyncService', () => {
  describe('connectAccount', () => {
    it('creates a new email account', async () => {
      const { svc, prisma, audit } = buildSvc();
      prisma.emailAccount.findUnique.mockResolvedValue(null);
      prisma.emailAccount.create.mockResolvedValue({ id: 'ea_1', provider: 'GMAIL', emailAddress: 'a@b.com' });
      const result = await svc.connectAccount({ provider: 'GMAIL' as any, emailAddress: 'a@b.com', accessToken: 'tok' });
      expect(result.id).toBe('ea_1');
      expect(prisma.emailAccount.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ workspaceId: 'ws_1', userId: 'u_1', provider: 'GMAIL' }),
      }));
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ entityType: 'EmailAccount', action: 'CREATE' }));
    });

    it('rejects duplicate account', async () => {
      const { svc, prisma } = buildSvc();
      prisma.emailAccount.findUnique.mockResolvedValue({ id: 'ea_1' });
      await expect(svc.connectAccount({ provider: 'GMAIL' as any, emailAddress: 'a@b.com', accessToken: 'tok' }))
        .rejects.toThrow('Account already connected');
    });
  });

  describe('listAccounts', () => {
    it('returns accounts for current user', async () => {
      const { svc, prisma } = buildSvc();
      prisma.emailAccount.findMany.mockResolvedValue([{ id: 'ea_1' }, { id: 'ea_2' }]);
      const result = await svc.listAccounts();
      expect(result).toHaveLength(2);
      expect(prisma.emailAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { workspaceId: 'ws_1', userId: 'u_1' } }),
      );
    });
  });

  describe('getAccount', () => {
    it('returns account if owned by user', async () => {
      const { svc, prisma } = buildSvc();
      prisma.emailAccount.findUnique.mockResolvedValue({ id: 'ea_1', workspaceId: 'ws_1', userId: 'u_1' });
      const result = await svc.getAccount('ea_1');
      expect(result.id).toBe('ea_1');
    });

    it('throws if account belongs to different user', async () => {
      const { svc, prisma } = buildSvc();
      prisma.emailAccount.findUnique.mockResolvedValue({ id: 'ea_1', workspaceId: 'ws_1', userId: 'u_other' });
      await expect(svc.getAccount('ea_1')).rejects.toThrow();
    });

    it('throws for non-existent account', async () => {
      const { svc, prisma } = buildSvc();
      prisma.emailAccount.findUnique.mockResolvedValue(null);
      await expect(svc.getAccount('ea_none')).rejects.toThrow();
    });
  });

  describe('disconnectAccount', () => {
    it('deletes account and logs audit', async () => {
      const { svc, prisma, audit } = buildSvc();
      prisma.emailAccount.findUnique.mockResolvedValue({ id: 'ea_1', workspaceId: 'ws_1', userId: 'u_1' });
      await svc.disconnectAccount('ea_1');
      expect(prisma.emailAccount.delete).toHaveBeenCalledWith({ where: { id: 'ea_1' } });
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ entityType: 'EmailAccount', action: 'DELETE' }));
    });

    it('throws for wrong workspace', async () => {
      const { svc, prisma } = buildSvc();
      prisma.emailAccount.findUnique.mockResolvedValue({ id: 'ea_1', workspaceId: 'ws_other', userId: 'u_1' });
      await expect(svc.disconnectAccount('ea_1')).rejects.toThrow();
    });
  });

  describe('listThreads', () => {
    it('returns paginated threads', async () => {
      const { svc, prisma } = buildSvc();
      const threads = Array.from({ length: 3 }, (_, i) => ({ id: `t_${i}`, subject: `Thread ${i}` }));
      prisma.emailThread.findMany.mockResolvedValue(threads);
      const result = await svc.listThreads({ limit: 25 });
      expect(result.data).toHaveLength(3);
      expect(result.hasMore).toBe(false);
    });

    it('detects hasMore when exceeding limit', async () => {
      const { svc, prisma } = buildSvc();
      const threads = Array.from({ length: 4 }, (_, i) => ({ id: `t_${i}` }));
      prisma.emailThread.findMany.mockResolvedValue(threads);
      const result = await svc.listThreads({ limit: 3 });
      expect(result.data).toHaveLength(3);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('t_2');
    });

    it('filters by personId', async () => {
      const { svc, prisma } = buildSvc();
      prisma.emailThread.findMany.mockResolvedValue([]);
      await svc.listThreads({ personId: 'p_1' });
      const where = prisma.emailThread.findMany.mock.calls[0][0].where;
      expect(where.personId).toBe('p_1');
    });
  });

  describe('getThread', () => {
    it('returns thread with messages', async () => {
      const { svc, prisma } = buildSvc();
      prisma.emailThread.findUnique.mockResolvedValue({
        id: 't_1', workspaceId: 'ws_1', accountId: 'ea_1',
        messages: [{ id: 'm_1' }], person: null, account: {},
      });
      prisma.emailAccount.findUnique.mockResolvedValue({ id: 'ea_1', userId: 'u_1' });
      const result = await svc.getThread('t_1');
      expect(result.id).toBe('t_1');
      expect(result.messages).toHaveLength(1);
    });

    it('throws for wrong workspace thread', async () => {
      const { svc, prisma } = buildSvc();
      prisma.emailThread.findUnique.mockResolvedValue({ id: 't_1', workspaceId: 'ws_other', accountId: 'ea_1' });
      await expect(svc.getThread('t_1')).rejects.toThrow();
    });
  });

  describe('syncMessages', () => {
    it('creates thread and message on first sync', async () => {
      const { svc, prisma } = buildSvc();
      prisma.emailAccount.findUnique.mockResolvedValue({ id: 'ea_1', workspaceId: 'ws_1' });
      prisma.emailThread.findUnique.mockResolvedValue(null);
      prisma.person.findFirst.mockResolvedValue({ id: 'p_1' });
      const now = new Date();
      prisma.emailThread.create.mockResolvedValue({ id: 't_new', lastMessageAt: now });
      prisma.emailMessage.findUnique.mockResolvedValue(null);
      prisma.emailMessage.create.mockResolvedValue({ id: 'm_new' });
      prisma.emailAccount.update.mockResolvedValue({});

      const result = await svc.syncMessages('ea_1', [{
        threadExternalId: 'ext_t1',
        subject: 'Hello',
        externalId: 'ext_m1',
        fromAddress: 'sender@test.com',
        toAddresses: ['me@test.com'],
        direction: 'IN',
        receivedAt: now,
      }]);
      expect(result.synced).toBe(1);
      expect(prisma.emailThread.create).toHaveBeenCalled();
      expect(prisma.emailMessage.create).toHaveBeenCalled();
      expect(prisma.person.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { workspaceId: 'ws_1', emailNormalized: 'sender@test.com' } }),
      );
    });

    it('skips existing messages', async () => {
      const { svc, prisma } = buildSvc();
      const now = new Date();
      prisma.emailAccount.findUnique.mockResolvedValue({ id: 'ea_1', workspaceId: 'ws_1' });
      prisma.emailThread.findUnique.mockResolvedValue({ id: 't_1', lastMessageAt: now });
      prisma.emailMessage.findUnique.mockResolvedValue({ id: 'm_existing' });
      prisma.emailAccount.update.mockResolvedValue({});

      const result = await svc.syncMessages('ea_1', [{
        threadExternalId: 'ext_t1',
        subject: 'Hello',
        externalId: 'ext_m1',
        fromAddress: 'sender@test.com',
        toAddresses: ['me@test.com'],
        direction: 'IN',
        receivedAt: now,
      }]);
      expect(result.synced).toBe(0);
      expect(prisma.emailMessage.create).not.toHaveBeenCalled();
    });

    it('updates thread lastMessageAt for newer messages', async () => {
      const { svc, prisma } = buildSvc();
      const old = new Date('2025-01-01');
      const newer = new Date('2025-06-01');
      prisma.emailAccount.findUnique.mockResolvedValue({ id: 'ea_1', workspaceId: 'ws_1' });
      prisma.emailThread.findUnique.mockResolvedValue({ id: 't_1', lastMessageAt: old });
      prisma.emailMessage.findUnique.mockResolvedValue(null);
      prisma.emailMessage.create.mockResolvedValue({ id: 'm_1' });
      prisma.emailAccount.update.mockResolvedValue({});

      await svc.syncMessages('ea_1', [{
        threadExternalId: 'ext_t1',
        subject: 'Hello',
        externalId: 'ext_m2',
        fromAddress: 'sender@test.com',
        toAddresses: ['me@test.com'],
        direction: 'IN',
        receivedAt: newer,
      }]);
      expect(prisma.emailThread.update).toHaveBeenCalledWith({
        where: { id: 't_1' },
        data: { lastMessageAt: newer },
      });
    });

    it('matches person by toAddress for outbound direction', async () => {
      const { svc, prisma } = buildSvc();
      const now = new Date();
      prisma.emailAccount.findUnique.mockResolvedValue({ id: 'ea_1', workspaceId: 'ws_1' });
      prisma.emailThread.findUnique.mockResolvedValue(null);
      prisma.person.findFirst.mockResolvedValue({ id: 'p_1' });
      prisma.emailThread.create.mockResolvedValue({ id: 't_1', lastMessageAt: now });
      prisma.emailMessage.findUnique.mockResolvedValue(null);
      prisma.emailMessage.create.mockResolvedValue({ id: 'm_1' });
      prisma.emailAccount.update.mockResolvedValue({});

      await svc.syncMessages('ea_1', [{
        threadExternalId: 'ext_t1',
        subject: 'Outbound',
        externalId: 'ext_m1',
        fromAddress: 'me@test.com',
        toAddresses: ['client@example.com'],
        direction: 'OUT',
        receivedAt: now,
      }]);
      expect(prisma.person.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { workspaceId: 'ws_1', emailNormalized: 'client@example.com' } }),
      );
    });

    it('throws for non-existent account', async () => {
      const { svc, prisma } = buildSvc();
      prisma.emailAccount.findUnique.mockResolvedValue(null);
      await expect(svc.syncMessages('ea_none', [])).rejects.toThrow('Account not found');
    });

    it('marks account lastSyncAt after sync', async () => {
      const { svc, prisma } = buildSvc();
      prisma.emailAccount.findUnique.mockResolvedValue({ id: 'ea_1', workspaceId: 'ws_1' });
      prisma.emailAccount.update.mockResolvedValue({});
      await svc.syncMessages('ea_1', []);
      expect(prisma.emailAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'ea_1' }, data: expect.objectContaining({ syncState: 'IDLE' }) }),
      );
    });
  });

  describe('threadsForPerson', () => {
    it('returns threads for a person', async () => {
      const { svc, prisma } = buildSvc();
      prisma.emailThread.findMany.mockResolvedValue([{ id: 't_1', personId: 'p_1' }]);
      const result = await svc.threadsForPerson('p_1');
      expect(result).toHaveLength(1);
      expect(prisma.emailThread.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { workspaceId: 'ws_1', personId: 'p_1' } }),
      );
    });
  });
});
