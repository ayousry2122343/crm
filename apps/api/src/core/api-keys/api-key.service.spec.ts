import { ApiKeyService } from './api-key.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';

function makePrisma() {
  return {
    apiKey: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
}

function makeAudit() {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

function ctx(workspaceId = 'ws1', userId = 'u1') {
  return {
    workspaceId,
    userId,
    profileIds: [] as string[],
    permissionKeys: new Set<string>(),
  };
}

function buildSvc() {
  const prisma = makePrisma();
  const tenant = new TenantContextService();
  const audit = makeAudit();
  const svc = new ApiKeyService(prisma as any, tenant, audit as any);
  return { svc, tenant, prisma, audit };
}

describe('ApiKeyService', () => {
  describe('create', () => {
    it('creates key and returns the raw key only once', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.apiKey.create.mockResolvedValue({
        id: 'ak1',
        name: 'Zapier',
        prefix: 'crm_live_abcdef12',
        scopes: ['ticket:read'],
        createdAt: new Date(),
      });

      const result = await tenant.run(ctx(), () =>
        svc.create({ name: 'Zapier', scopes: ['ticket:read'] }),
      );

      expect(result.rawKey).toBeDefined();
      expect(result.rawKey).toMatch(/^crm_live_/);
      expect(result.rawKey.length).toBeGreaterThan(20);
      expect(prisma.apiKey.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Zapier',
            scopes: ['ticket:read'],
            keyHash: expect.any(String),
            prefix: expect.any(String),
          }),
        }),
      );
    });
  });

  describe('list', () => {
    it('returns keys without keyHash', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.apiKey.findMany.mockResolvedValue([
        { id: 'ak1', name: 'Zapier', prefix: 'crm_live_abcdef12', scopes: ['ticket:read'], lastUsedAt: null },
      ]);

      const result = await tenant.run(ctx(), () => svc.list());
      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('keyHash');
    });
  });

  describe('authenticate', () => {
    it('returns workspace context for valid key', async () => {
      const { svc, prisma } = buildSvc();
      const rawKey = 'crm_live_' + 'a'.repeat(32);
      const hash = await argon2.hash(rawKey);

      prisma.apiKey.findFirst.mockResolvedValue({
        id: 'ak1',
        workspaceId: 'ws1',
        keyHash: hash,
        scopes: ['ticket:read'],
        revokedAt: null,
        expiresAt: null,
      });
      prisma.apiKey.update.mockResolvedValue({});

      const result = await svc.authenticate(rawKey);
      expect(result.workspaceId).toBe('ws1');
      expect(result.scopes).toEqual(['ticket:read']);
    });

    it('throws for revoked key', async () => {
      const { svc, prisma } = buildSvc();
      prisma.apiKey.findFirst.mockResolvedValue({
        id: 'ak1',
        keyHash: 'hash',
        revokedAt: new Date(),
      });

      await expect(svc.authenticate('crm_live_xxx')).rejects.toThrow(UnauthorizedException);
    });

    it('throws for expired key', async () => {
      const { svc, prisma } = buildSvc();
      const rawKey = 'crm_live_' + 'b'.repeat(32);
      const hash = await argon2.hash(rawKey);

      prisma.apiKey.findFirst.mockResolvedValue({
        id: 'ak1',
        keyHash: hash,
        revokedAt: null,
        expiresAt: new Date('2020-01-01'),
      });

      await expect(svc.authenticate(rawKey)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('revoke', () => {
    it('sets revokedAt timestamp', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.apiKey.findUnique.mockResolvedValue({ id: 'ak1', workspaceId: 'ws1' });
      prisma.apiKey.update.mockResolvedValue({ id: 'ak1', revokedAt: new Date() });

      await tenant.run(ctx(), () => svc.revoke('ak1'));
      expect(prisma.apiKey.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ak1' },
          data: { revokedAt: expect.any(Date) },
        }),
      );
    });
  });
});
