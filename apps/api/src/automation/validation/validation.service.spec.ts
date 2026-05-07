import { NotFoundException } from '@nestjs/common';
import { ValidationService } from './validation.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    validationRule: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
}

function makeAudit() {
  return {
    log: jest.fn().mockResolvedValue(undefined),
    logUpdate: jest.fn().mockResolvedValue(undefined),
  };
}

function buildSvc() {
  const prisma = makePrisma();
  const tenant = new TenantContextService();
  const audit = makeAudit();
  const svc = new ValidationService(prisma as any, tenant, audit as any);
  return { svc, tenant, prisma, audit };
}

const ctx = (workspaceId = 'ws_1') => ({
  workspaceId,
  userId: 'u_1',
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

describe('ValidationService.create', () => {
  it('creates rule with workspaceId', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.validationRule.create.mockResolvedValue({ id: 'vr_1', entityType: 'Person' });
    await tenant.run(ctx(), async () => {
      await svc.create({
        entityType: 'Person',
        expression: { op: 'AND', items: [{ field: 'email', op: 'isNotNull', value: null }] },
        errorMessage: { en: 'Email is required', ar: 'البريد مطلوب' },
      });
    });
    const data = prisma.validationRule.create.mock.calls[0][0].data;
    expect(data.workspaceId).toBe('ws_1');
    expect(data.entityType).toBe('Person');
  });
});

describe('ValidationService.get', () => {
  it('throws NotFoundException for wrong workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.validationRule.findUnique.mockResolvedValue({ id: 'vr_1', workspaceId: 'ws_other' });
    await tenant.run(ctx(), async () => {
      await expect(svc.get('vr_1')).rejects.toThrow(NotFoundException);
    });
  });
});

describe('ValidationService.delete', () => {
  it('deletes rule and logs audit', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.validationRule.findUnique.mockResolvedValue({ id: 'vr_1', workspaceId: 'ws_1' });
    prisma.validationRule.delete.mockResolvedValue({});
    await tenant.run(ctx(), async () => {
      await svc.delete('vr_1');
    });
    expect(prisma.validationRule.delete).toHaveBeenCalledWith({ where: { id: 'vr_1' } });
    expect(audit.log).toHaveBeenCalled();
  });
});
