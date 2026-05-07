import { NotFoundException } from '@nestjs/common';
import { FormService } from './form.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    form: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
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
  const svc = new FormService(prisma as any, tenant, audit as any);
  return { svc, tenant, prisma, audit };
}

const ctx = (workspaceId = 'ws_1') => ({
  workspaceId,
  userId: 'u_1',
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

describe('FormService.create', () => {
  it('creates form with workspaceId and slug', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.form.create.mockResolvedValue({ id: 'f_1', name: 'Contact', slug: 'contact' });
    await tenant.run(ctx(), async () => {
      await svc.create({ name: 'Contact', slug: 'contact', fields: [] });
    });
    const data = prisma.form.create.mock.calls[0][0].data;
    expect(data.workspaceId).toBe('ws_1');
    expect(data.slug).toBe('contact');
    expect(data.useHoneypot).toBe(true);
  });
});

describe('FormService.getBySlug', () => {
  it('returns form when public and not archived', async () => {
    const { svc, prisma } = buildSvc();
    prisma.form.findUnique.mockResolvedValue({
      id: 'f_1',
      isPublic: true,
      archivedAt: null,
      slug: 'contact',
    });
    const result = await svc.getBySlug('contact', 'ws_1');
    expect(result.id).toBe('f_1');
  });

  it('throws NotFoundException for non-public form', async () => {
    const { svc, prisma } = buildSvc();
    prisma.form.findUnique.mockResolvedValue({
      id: 'f_1',
      isPublic: false,
      archivedAt: null,
    });
    await expect(svc.getBySlug('private', 'ws_1')).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException for archived form', async () => {
    const { svc, prisma } = buildSvc();
    prisma.form.findUnique.mockResolvedValue({
      id: 'f_1',
      isPublic: true,
      archivedAt: new Date(),
    });
    await expect(svc.getBySlug('old', 'ws_1')).rejects.toThrow(NotFoundException);
  });
});

describe('FormService.archive', () => {
  it('sets archivedAt and logs audit', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.form.findUnique.mockResolvedValue({ id: 'f_1', workspaceId: 'ws_1' });
    prisma.form.update.mockResolvedValue({});
    await tenant.run(ctx(), async () => {
      await svc.archive('f_1');
    });
    const updateData = prisma.form.update.mock.calls[0][0].data;
    expect(updateData.archivedAt).toBeInstanceOf(Date);
    expect(audit.log).toHaveBeenCalled();
  });
});
