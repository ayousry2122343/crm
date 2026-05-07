import { NotFoundException } from '@nestjs/common';
import { EmailTemplateService } from './email-template.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    emailTemplate: {
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
  const svc = new EmailTemplateService(prisma as any, tenant, audit as any);
  return { svc, tenant, prisma, audit };
}

const ctx = (workspaceId = 'ws_1') => ({
  workspaceId,
  userId: 'u_1',
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

describe('EmailTemplateService.renderTemplate', () => {
  it('replaces simple merge tags', () => {
    const { svc } = buildSvc();
    const result = svc.renderTemplate('Hello {{ name }}!', { name: 'Ahmed' });
    expect(result).toBe('Hello Ahmed!');
  });

  it('replaces dot-path merge tags', () => {
    const { svc } = buildSvc();
    const result = svc.renderTemplate('Hi {{ person.fullName }}', {
      person: { fullName: 'Jane Doe' },
    });
    expect(result).toBe('Hi Jane Doe');
  });

  it('replaces missing tags with empty string', () => {
    const { svc } = buildSvc();
    const result = svc.renderTemplate('Hi {{ missing }}', {});
    expect(result).toBe('Hi ');
  });

  it('handles null in nested path gracefully', () => {
    const { svc } = buildSvc();
    const result = svc.renderTemplate('{{ a.b.c }}', { a: null });
    expect(result).toBe('');
  });
});

describe('EmailTemplateService.create', () => {
  it('creates template with workspaceId', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.emailTemplate.create.mockResolvedValue({ id: 'tpl_1', name: 'Welcome' });
    await tenant.run(ctx(), async () => {
      await svc.create({ name: 'Welcome', subject: 'Hi', body: '<p>Hello</p>' });
    });
    expect(prisma.emailTemplate.create).toHaveBeenCalled();
    const data = prisma.emailTemplate.create.mock.calls[0][0].data;
    expect(data.workspaceId).toBe('ws_1');
    expect(data.name).toBe('Welcome');
    expect(audit.log).toHaveBeenCalled();
  });
});

describe('EmailTemplateService.get', () => {
  it('throws NotFoundException for wrong workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.emailTemplate.findUnique.mockResolvedValue({ id: 'tpl_1', workspaceId: 'ws_other' });
    await tenant.run(ctx(), async () => {
      await expect(svc.get('tpl_1')).rejects.toThrow(NotFoundException);
    });
  });
});

describe('EmailTemplateService.list', () => {
  it('filters by workspaceId and excludes archived', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.emailTemplate.findMany.mockResolvedValue([]);
    await tenant.run(ctx(), async () => {
      await svc.list();
    });
    const where = prisma.emailTemplate.findMany.mock.calls[0][0].where;
    expect(where.workspaceId).toBe('ws_1');
    expect(where.archivedAt).toBeNull();
  });
});
