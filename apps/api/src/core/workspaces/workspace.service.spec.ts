import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { AuditService } from '../audit/audit.service';

describe('WorkspaceService', () => {
  let service: WorkspaceService;
  let prisma: any;
  let audit: any;
  let tenant: TenantContextService;

  beforeEach(async () => {
    prisma = {
      workspace: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    audit = { log: jest.fn(), logUpdate: jest.fn() };
    tenant = new TenantContextService();
    const moduleRef = await Test.createTestingModule({
      providers: [
        WorkspaceService,
        { provide: PrismaService, useValue: prisma },
        { provide: TenantContextService, useValue: tenant },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = moduleRef.get(WorkspaceService);
  });

  function inWs<T>(fn: () => T) {
    return tenant.run(
      { workspaceId: 'ws_1', userId: 'u_1', profileIds: [], permissionKeys: new Set() },
      fn,
    );
  }

  it('getCurrent returns the workspace from tenant context', async () => {
    prisma.workspace.findUnique.mockResolvedValue({ id: 'ws_1', name: 'Acme', slug: 'acme' });
    const result = await inWs(() => service.getCurrent());
    expect(result.id).toBe('ws_1');
    expect(prisma.workspace.findUnique).toHaveBeenCalledWith({ where: { id: 'ws_1' } });
  });

  it('getCurrent throws NotFound when there is no tenant context', async () => {
    await expect(service.getCurrent()).rejects.toThrow(NotFoundException);
  });

  it('getCurrent throws NotFound when workspace not in DB', async () => {
    prisma.workspace.findUnique.mockResolvedValue(null);
    await expect(inWs(() => service.getCurrent())).rejects.toThrow(NotFoundException);
  });

  it('update writes the new fields and audits the diff', async () => {
    prisma.workspace.findUnique.mockResolvedValue({
      id: 'ws_1',
      name: 'Old',
      slug: 'acme',
      primaryLocale: 'ar',
      primaryCurrency: 'EGP',
    });
    prisma.workspace.update.mockResolvedValue({
      id: 'ws_1',
      name: 'New',
      slug: 'acme',
      primaryLocale: 'en',
      primaryCurrency: 'EGP',
    });
    const result = await inWs(() => service.update({ name: 'New', primaryLocale: 'en' }));
    expect(result.name).toBe('New');
    expect(prisma.workspace.update).toHaveBeenCalledWith({
      where: { id: 'ws_1' },
      data: { name: 'New', primaryLocale: 'en' },
    });
    expect(audit.logUpdate).toHaveBeenCalledWith(
      'Workspace',
      'ws_1',
      expect.any(Object),
      expect.any(Object),
    );
  });

  it('update throws NotFound when there is no tenant context', async () => {
    await expect(service.update({ name: 'X' })).rejects.toThrow(NotFoundException);
  });
});
