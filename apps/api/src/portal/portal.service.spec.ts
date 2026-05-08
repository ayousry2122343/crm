import { PortalService } from './portal.service';

jest.mock('../core/auth/password.util', () => ({
  hashPassword: jest.fn().mockResolvedValue('$hashed$'),
  verifyPassword: jest.fn().mockResolvedValue(true),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('jwt-token'),
}));

const { verifyPassword } = require('../core/auth/password.util');

function makePrisma() {
  return {
    portal: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    portalUser: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    person: { findUnique: jest.fn(), findFirst: jest.fn() },
    deal: { findMany: jest.fn() },
    quote: { findMany: jest.fn() },
    activity: { findMany: jest.fn() },
  };
}

function makeTenant(workspaceId = 'ws_1') {
  return { getStore: () => ({ workspaceId, userId: 'u_1' }) };
}

function makeConfig() {
  return { get: jest.fn().mockReturnValue('portal-secret') };
}

function buildSvc() {
  const prisma = makePrisma();
  const tenant = makeTenant();
  const config = makeConfig();
  const svc = new PortalService(prisma as any, tenant as any, config as any);
  return { svc, prisma, tenant, config };
}

describe('PortalService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getPortal', () => {
    it('returns portal for workspace', async () => {
      const { svc, prisma } = buildSvc();
      prisma.portal.findUnique.mockResolvedValue({ id: 'pt_1', workspaceId: 'ws_1', enabled: true });
      const result = await svc.getPortal();
      expect(result?.id).toBe('pt_1');
    });

    it('returns null when no portal exists', async () => {
      const { svc, prisma } = buildSvc();
      prisma.portal.findUnique.mockResolvedValue(null);
      const result = await svc.getPortal();
      expect(result).toBeNull();
    });
  });

  describe('upsertPortal', () => {
    it('creates portal when none exists', async () => {
      const { svc, prisma } = buildSvc();
      prisma.portal.findUnique.mockResolvedValue(null);
      prisma.portal.create.mockResolvedValue({ id: 'pt_1', enabled: true });
      const result = await svc.upsertPortal({ enabled: true });
      expect(result.enabled).toBe(true);
      expect(prisma.portal.create).toHaveBeenCalled();
    });

    it('updates portal when exists', async () => {
      const { svc, prisma } = buildSvc();
      prisma.portal.findUnique.mockResolvedValue({ id: 'pt_1' });
      prisma.portal.update.mockResolvedValue({ id: 'pt_1', enabled: false });
      const result = await svc.upsertPortal({ enabled: false });
      expect(result.enabled).toBe(false);
      expect(prisma.portal.update).toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('registers a new portal user', async () => {
      const { svc, prisma } = buildSvc();
      prisma.portal.findUnique.mockResolvedValue({ enabled: true });
      prisma.person.findFirst.mockResolvedValue({ id: 'p_1' });
      prisma.portalUser.findUnique.mockResolvedValue(null);
      prisma.portalUser.create.mockResolvedValue({ id: 'pu_1', personId: 'p_1', email: 'test@test.com' });
      const result = await svc.register('ws_1', { email: 'test@test.com', password: 'password123' });
      expect(result.personId).toBe('p_1');
    });

    it('rejects if portal not enabled', async () => {
      const { svc, prisma } = buildSvc();
      prisma.portal.findUnique.mockResolvedValue({ enabled: false });
      await expect(svc.register('ws_1', { email: 'test@test.com', password: 'password123' })).rejects.toThrow('Portal not enabled');
    });

    it('rejects if no portal exists', async () => {
      const { svc, prisma } = buildSvc();
      prisma.portal.findUnique.mockResolvedValue(null);
      await expect(svc.register('ws_1', { email: 'test@test.com', password: 'password123' })).rejects.toThrow('Portal not enabled');
    });

    it('rejects if person not found', async () => {
      const { svc, prisma } = buildSvc();
      prisma.portal.findUnique.mockResolvedValue({ enabled: true });
      prisma.person.findFirst.mockResolvedValue(null);
      await expect(svc.register('ws_1', { email: 'test@test.com', password: 'password123' })).rejects.toThrow('Contact not found');
    });

    it('rejects duplicate registration', async () => {
      const { svc, prisma } = buildSvc();
      prisma.portal.findUnique.mockResolvedValue({ enabled: true });
      prisma.person.findFirst.mockResolvedValue({ id: 'p_1' });
      prisma.portalUser.findUnique.mockResolvedValue({ id: 'pu_existing' });
      await expect(svc.register('ws_1', { email: 'test@test.com', password: 'password123' })).rejects.toThrow('Already registered');
    });
  });

  describe('login', () => {
    it('returns token on valid credentials', async () => {
      const { svc, prisma } = buildSvc();
      prisma.portal.findUnique.mockResolvedValue({ enabled: true });
      prisma.portalUser.findUnique.mockResolvedValue({ id: 'pu_1', personId: 'p_1', email: 'test@test.com', passwordHash: '$hashed$' });
      prisma.portalUser.update.mockResolvedValue({});
      const result = await svc.login('ws_1', { email: 'test@test.com', password: 'password123' });
      expect(result.token).toBe('jwt-token');
      expect(result.user.personId).toBe('p_1');
    });

    it('rejects with invalid password', async () => {
      const { svc, prisma } = buildSvc();
      prisma.portal.findUnique.mockResolvedValue({ enabled: true });
      prisma.portalUser.findUnique.mockResolvedValue({ id: 'pu_1', passwordHash: '$hashed$' });
      verifyPassword.mockResolvedValue(false);
      await expect(svc.login('ws_1', { email: 'test@test.com', password: 'wrong' })).rejects.toThrow('Invalid credentials');
    });

    it('rejects if user not found', async () => {
      const { svc, prisma } = buildSvc();
      prisma.portal.findUnique.mockResolvedValue({ enabled: true });
      prisma.portalUser.findUnique.mockResolvedValue(null);
      await expect(svc.login('ws_1', { email: 'nobody@test.com', password: 'pass' })).rejects.toThrow('Invalid credentials');
    });

    it('rejects if portal not enabled', async () => {
      const { svc, prisma } = buildSvc();
      prisma.portal.findUnique.mockResolvedValue({ enabled: false });
      await expect(svc.login('ws_1', { email: 'test@test.com', password: 'pass' })).rejects.toThrow('Portal not enabled');
    });
  });

  describe('portal data access', () => {
    it('getMyDeals returns deals for person', async () => {
      const { svc, prisma } = buildSvc();
      prisma.person.findUnique.mockResolvedValue({ id: 'p_1', workspaceId: 'ws_1' });
      prisma.deal.findMany.mockResolvedValue([{ id: 'd_1', name: 'Deal 1' }]);
      const result = await svc.getMyDeals('ws_1', 'p_1');
      expect(result).toHaveLength(1);
    });

    it('getMyDeals returns empty for wrong workspace person', async () => {
      const { svc, prisma } = buildSvc();
      prisma.person.findUnique.mockResolvedValue({ id: 'p_1', workspaceId: 'ws_other' });
      const result = await svc.getMyDeals('ws_1', 'p_1');
      expect(result).toEqual([]);
    });

    it('getMyQuotes returns quotes for person', async () => {
      const { svc, prisma } = buildSvc();
      prisma.quote.findMany.mockResolvedValue([{ id: 'q_1', lineItems: [] }]);
      const result = await svc.getMyQuotes('ws_1', 'p_1');
      expect(result).toHaveLength(1);
    });

    it('getMyActivities returns activities for person', async () => {
      const { svc, prisma } = buildSvc();
      prisma.activity.findMany.mockResolvedValue([{ id: 'a_1' }]);
      const result = await svc.getMyActivities('ws_1', 'p_1');
      expect(result).toHaveLength(1);
    });

    it('getPortalProfile returns person info', async () => {
      const { svc, prisma } = buildSvc();
      prisma.person.findFirst.mockResolvedValue({ id: 'p_1', fullName: 'Ahmed', email: 'a@b.com' });
      const result = await svc.getPortalProfile('ws_1', 'p_1');
      expect(result?.fullName).toBe('Ahmed');
    });
  });
});
