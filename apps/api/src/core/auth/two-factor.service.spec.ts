import { TwoFactorService } from './two-factor.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { generateSync } from 'otplib';
import * as argon2 from 'argon2';

function makePrisma() {
  return {
    twoFactorSecret: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };
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
  const svc = new TwoFactorService(prisma as any, tenant);
  return { svc, tenant, prisma };
}

describe('TwoFactorService', () => {
  describe('setup', () => {
    it('generates secret and returns otpauth URI', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.twoFactorSecret.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ email: 'test@test.com' });
      prisma.twoFactorSecret.create.mockResolvedValue({ id: 'tfs1', secret: 'ABCD' });

      const result = await tenant.run(ctx(), () => svc.setup());
      expect(result).toHaveProperty('qrCodeUri');
      expect(result).toHaveProperty('secret');
      expect(result.qrCodeUri).toContain('otpauth://totp/');
    });

    it('throws if 2FA already enabled', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.twoFactorSecret.findUnique.mockResolvedValue({ enabledAt: new Date() });

      await expect(
        tenant.run(ctx(), () => svc.setup()),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirm', () => {
    it('enables 2FA and returns backup codes on valid TOTP', async () => {
      const { svc, tenant, prisma } = buildSvc();
      const secret = 'QLKV3JTO3LSWIGTWPXNWTPYMDYQDYSUC';
      prisma.twoFactorSecret.findUnique.mockResolvedValue({
        id: 'tfs1',
        secret,
        enabledAt: null,
      });
      prisma.twoFactorSecret.update.mockResolvedValue({ id: 'tfs1', enabledAt: new Date() });

      const validCode = generateSync({ secret });

      const result = await tenant.run(ctx(), () => svc.confirm(validCode));
      expect(result.backupCodes).toHaveLength(10);
      expect(prisma.twoFactorSecret.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ enabledAt: expect.any(Date) }),
        }),
      );
    });

    it('throws on invalid TOTP code', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.twoFactorSecret.findUnique.mockResolvedValue({
        id: 'tfs1',
        secret: 'QLKV3JTO3LSWIGTWPXNWTPYMDYQDYSUC',
        enabledAt: null,
      });

      await expect(
        tenant.run(ctx(), () => svc.confirm('000000')),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verify', () => {
    it('returns true for valid TOTP code', async () => {
      const { svc, prisma } = buildSvc();
      const secret = 'QLKV3JTO3LSWIGTWPXNWTPYMDYQDYSUC';
      prisma.twoFactorSecret.findUnique.mockResolvedValue({
        secret,
        enabledAt: new Date(),
        backupCodes: [],
      });

      const validCode = generateSync({ secret });

      const result = await svc.verifyCode('u1', validCode);
      expect(result).toBe(true);
    });

    it('returns true and consumes backup code', async () => {
      const { svc, prisma } = buildSvc();
      const hashedCode = await argon2.hash('ABCD1234');
      prisma.twoFactorSecret.findUnique.mockResolvedValue({
        id: 'tfs1',
        secret: 'QLKV3JTO3LSWIGTWPXNWTPYMDYQDYSUC',
        enabledAt: new Date(),
        backupCodes: [hashedCode],
      });
      prisma.twoFactorSecret.update.mockResolvedValue({});

      const result = await svc.verifyCode('u1', 'ABCD1234');
      expect(result).toBe(true);
      expect(prisma.twoFactorSecret.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { backupCodes: [] },
        }),
      );
    });

    it('returns false for invalid code', async () => {
      const { svc, prisma } = buildSvc();
      prisma.twoFactorSecret.findUnique.mockResolvedValue({
        secret: 'QLKV3JTO3LSWIGTWPXNWTPYMDYQDYSUC',
        enabledAt: new Date(),
        backupCodes: [],
      });

      const result = await svc.verifyCode('u1', '999999');
      expect(result).toBe(false);
    });
  });

  describe('disable', () => {
    it('removes 2FA record on valid code', async () => {
      const { svc, tenant, prisma } = buildSvc();
      const secret = 'QLKV3JTO3LSWIGTWPXNWTPYMDYQDYSUC';
      prisma.twoFactorSecret.findUnique.mockResolvedValue({
        id: 'tfs1',
        secret,
        enabledAt: new Date(),
        backupCodes: [],
      });
      prisma.twoFactorSecret.delete.mockResolvedValue({});

      const validCode = generateSync({ secret });

      await tenant.run(ctx(), () => svc.disable(validCode));
      expect(prisma.twoFactorSecret.delete).toHaveBeenCalledWith({
        where: { id: 'tfs1' },
      });
    });
  });

  describe('checkEnforcement', () => {
    it('returns { enforced: true, userHas2FA: false } when workspace requires 2FA and user lacks it', async () => {
      const { svc, prisma } = buildSvc();
      prisma.twoFactorSecret.findUnique.mockResolvedValue(null);

      const result = await svc.checkEnforcement('u1', true);
      expect(result).toEqual({ enforced: true, userHas2FA: false });
    });

    it('returns { enforced: false } when workspace does not require 2FA', async () => {
      const { svc } = buildSvc();

      const result = await svc.checkEnforcement('u1', false);
      expect(result).toEqual({ enforced: false, userHas2FA: false });
    });
  });
});
