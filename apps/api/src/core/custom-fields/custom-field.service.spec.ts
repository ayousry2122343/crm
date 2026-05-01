import { Test } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { CustomFieldService } from './custom-field.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { AuditService } from '../audit/audit.service';

describe('CustomFieldService', () => {
  let service: CustomFieldService;
  let prisma: any;
  let audit: any;
  let tenant: TenantContextService;

  beforeEach(async () => {
    prisma = {
      customFieldDef: {
        create: jest
          .fn()
          .mockResolvedValue({ id: 'cf_1', entityType: 'Person', key: 'industry' }),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      $executeRawUnsafe: jest.fn().mockResolvedValue(0),
    };
    // The transactional client tx mirrors the same shape; create runs inside $transaction(cb)
    prisma.$transaction = jest.fn(async (cb: any) => cb(prisma));
    audit = { log: jest.fn(), logUpdate: jest.fn() };
    tenant = new TenantContextService();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CustomFieldService,
        { provide: PrismaService, useValue: prisma },
        { provide: TenantContextService, useValue: tenant },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = moduleRef.get(CustomFieldService);
  });

  function inWs<T>(fn: () => T) {
    return tenant.run(
      { workspaceId: 'ws_1', userId: 'u_1', profileIds: [], permissionKeys: new Set() },
      fn,
    );
  }

  it('creates a custom field def and audits CREATE', async () => {
    await inWs(async () => {
      await service.create({
        entityType: 'Person',
        key: 'industry',
        label: { ar: 'الصناعة', en: 'Industry' },
        type: 'TEXT',
      });
    });
    expect(prisma.customFieldDef.create).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'CustomFieldDef',
        action: 'CREATE',
      }),
    );
  });

  it('rejects duplicate key on same (workspace, entityType)', async () => {
    prisma.customFieldDef.findFirst.mockResolvedValue({ id: 'existing' });
    await inWs(async () => {
      await expect(
        service.create({
          entityType: 'Person',
          key: 'industry',
          label: { ar: 'a', en: 'b' },
          type: 'TEXT',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  it('runs DDL when indexed=true and type is allowed', async () => {
    await inWs(async () => {
      await service.create({
        entityType: 'Person',
        key: 'industry',
        label: { ar: 'a', en: 'b' },
        type: 'TEXT',
        indexed: true,
      });
    });
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledTimes(2); // ALTER + CREATE INDEX (joined call by call)
  });

  it('rejects indexed=true when type is not in the indexable whitelist', async () => {
    await inWs(async () => {
      await expect(
        service.create({
          entityType: 'Person',
          key: 'industry',
          label: { ar: 'a', en: 'b' },
          type: 'PICKLIST',
          options: { values: ['a', 'b'] },
          indexed: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });
    expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('rejects indexed=true on entityTypes outside the whitelist', async () => {
    await inWs(async () => {
      await expect(
        service.create({
          entityType: 'CustomModule:Project',
          key: 'industry',
          label: { ar: 'a', en: 'b' },
          type: 'TEXT',
          indexed: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it('rejects PICKLIST without options', async () => {
    await inWs(async () => {
      await expect(
        service.create({
          entityType: 'Person',
          key: 'lifecycle',
          label: { ar: 'a', en: 'b' },
          type: 'PICKLIST',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it('rejects FORMULA without formulaExpr', async () => {
    await inWs(async () => {
      await expect(
        service.create({
          entityType: 'Person',
          key: 'derived',
          label: { ar: 'a', en: 'b' },
          type: 'FORMULA',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it('rejects unsafe keys (sql injection)', async () => {
    await inWs(async () => {
      await expect(
        service.create({
          entityType: 'Person',
          key: "a'; DROP TABLE x;--",
          label: { ar: 'a', en: 'b' },
          type: 'TEXT',
        }),
      ).rejects.toThrow();
    });
  });

  it('archive marks archivedAt and (when indexed) drops the column', async () => {
    prisma.customFieldDef.findUnique.mockResolvedValue({
      id: 'cf_1',
      workspaceId: 'ws_1',
      entityType: 'Person',
      key: 'industry',
      type: 'TEXT',
      indexed: true,
      archivedAt: null,
    });
    prisma.customFieldDef.update.mockResolvedValue({ id: 'cf_1', archivedAt: new Date() });
    await inWs(async () => {
      await service.archive('cf_1');
    });
    expect(prisma.customFieldDef.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cf_1' },
        data: expect.objectContaining({ archivedAt: expect.any(Date) }),
      }),
    );
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledTimes(2); // DROP INDEX + DROP COLUMN
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'DELETE' }));
  });
});
