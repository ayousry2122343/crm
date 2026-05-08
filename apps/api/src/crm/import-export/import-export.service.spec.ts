import { BadRequestException } from '@nestjs/common';
import { ImportExportService } from './import-export.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    person: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    deal: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    importJob: {
      create: jest.fn(),
      update: jest.fn(),
    },
  };
}

function makeAudit() {
  return {
    log: jest.fn().mockResolvedValue(undefined),
  };
}

function buildSvc() {
  const prisma = makePrisma();
  const tenant = new TenantContextService();
  const audit = makeAudit();
  const svc = new ImportExportService(prisma as any, tenant, audit as any);
  return { svc, tenant, prisma, audit };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

// ─── parsePreview ───

describe('ImportExportService.parsePreview', () => {
  it('parses CSV buffer and returns headers + preview rows', async () => {
    const { svc } = buildSvc();
    const csv = Buffer.from(
      'firstName,lastName,email\nAhmed,Yousry,ahmed@test.com\nJohn,Doe,john@test.com',
    );
    const result = await svc.parsePreview(csv, 'text/csv');
    expect(result.headers).toEqual(['firstName', 'lastName', 'email']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      firstName: 'Ahmed',
      lastName: 'Yousry',
      email: 'ahmed@test.com',
    });
  });

  it('parses Excel buffer and returns headers + preview rows', async () => {
    const { svc } = buildSvc();
    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Sheet1');
    ws.addRow(['firstName', 'lastName', 'email']);
    ws.addRow(['Ahmed', 'Yousry', 'ahmed@test.com']);
    const xlsxBuf = await wb.xlsx.writeBuffer();

    const result = await svc.parsePreview(
      Buffer.from(xlsxBuf),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(result.headers).toEqual(['firstName', 'lastName', 'email']);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].firstName).toBe('Ahmed');
  });

  it('throws on unsupported mime type', async () => {
    const { svc } = buildSvc();
    await expect(
      svc.parsePreview(Buffer.from('test'), 'application/pdf'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

// ─── importPeople ───

describe('ImportExportService.importPeople', () => {
  it('creates people from rows with column mapping and records ImportJob', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.importJob.create.mockResolvedValue({ id: 'ij_1' });
    prisma.importJob.update.mockResolvedValue({ id: 'ij_1' });
    prisma.person.create.mockResolvedValue({ id: 'p_1', fullName: 'Ahmed Yousry' });

    const rows = [
      { first: 'Ahmed', last: 'Yousry', mail: 'ahmed@test.com' },
      { first: 'John', last: 'Doe', mail: 'john@test.com' },
    ];
    const mapping = { firstName: 'first', lastName: 'last', email: 'mail' };

    const result = await tenant.run(ctx(), async () =>
      svc.importPeople(rows, mapping, 'contacts.csv'),
    );

    expect(result.totalRows).toBe(2);
    expect(result.successCount).toBe(2);
    expect(prisma.person.create).toHaveBeenCalledTimes(2);
    const firstCall = prisma.person.create.mock.calls[0][0];
    expect(firstCall.data.workspaceId).toBe('ws_1');
    expect(firstCall.data.firstName).toBe('Ahmed');
    expect(firstCall.data.email).toBe('ahmed@test.com');
    expect(audit.log).toHaveBeenCalled();
  });

  it('captures errors for invalid rows and continues', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.importJob.create.mockResolvedValue({ id: 'ij_1' });
    prisma.importJob.update.mockResolvedValue({ id: 'ij_1' });
    prisma.person.create
      .mockRejectedValueOnce(new Error('validation failed'))
      .mockResolvedValueOnce({ id: 'p_2', fullName: 'John Doe' });

    const rows = [
      { first: '', last: '', mail: '' },
      { first: 'John', last: 'Doe', mail: 'john@test.com' },
    ];
    const mapping = { firstName: 'first', lastName: 'last', email: 'mail' };

    const result = await tenant.run(ctx(), async () =>
      svc.importPeople(rows, mapping, 'contacts.csv'),
    );

    expect(result.totalRows).toBe(2);
    expect(result.errorCount).toBe(1);
    expect(result.successCount).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].row).toBe(1);
  });

  it('throws BadRequestException without tenant context', async () => {
    const { svc } = buildSvc();
    await expect(
      svc.importPeople([], {}, 'test.csv'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

// ─── exportPeople ───

describe('ImportExportService.exportPeople', () => {
  it('exports people as CSV buffer', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.person.findMany.mockResolvedValue([
      {
        id: 'p_1',
        firstName: 'Ahmed',
        lastName: 'Yousry',
        email: 'ahmed@test.com',
        phone: '+201234567890',
        companyName: null,
        lifecycleStage: 'LEAD',
        isCompany: false,
        createdAt: new Date('2026-01-01'),
      },
    ]);

    const result = await tenant.run(ctx(), async () =>
      svc.exportPeople({}, 'csv'),
    );

    expect(result.mimeType).toBe('text/csv');
    expect(result.buffer).toBeInstanceOf(Buffer);
    const content = result.buffer.toString('utf-8');
    expect(content).toContain('firstName');
    expect(content).toContain('Ahmed');
    expect(content).toContain('ahmed@test.com');
  });

  it('exports people as Excel buffer', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.person.findMany.mockResolvedValue([
      {
        id: 'p_1',
        firstName: 'Ahmed',
        lastName: 'Yousry',
        email: 'ahmed@test.com',
        phone: null,
        companyName: null,
        lifecycleStage: 'LEAD',
        isCompany: false,
        createdAt: new Date('2026-01-01'),
      },
    ]);

    const result = await tenant.run(ctx(), async () =>
      svc.exportPeople({}, 'excel'),
    );

    expect(result.mimeType).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it('scopes export to workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.person.findMany.mockResolvedValue([]);

    await tenant.run(ctx(), async () => svc.exportPeople({}, 'csv'));

    const args = prisma.person.findMany.mock.calls[0][0];
    expect(args.where.workspaceId).toBe('ws_1');
    expect(args.where.archivedAt).toBeNull();
  });
});

// ─── exportDeals ───

describe('ImportExportService.exportDeals', () => {
  it('exports deals as CSV buffer', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.deal.findMany.mockResolvedValue([
      {
        id: 'd_1',
        name: 'Acme deal',
        amount: 5000,
        currency: 'EGP',
        status: 'OPEN',
        probability: 50,
        expectedCloseDate: null,
        source: null,
        createdAt: new Date('2026-01-01'),
        stage: { name: 'Lead' },
        pipeline: { name: 'Sales' },
        primaryContact: { fullName: 'Ahmed' },
      },
    ]);

    const result = await tenant.run(ctx(), async () =>
      svc.exportDeals({}, 'csv'),
    );

    expect(result.mimeType).toBe('text/csv');
    const content = result.buffer.toString('utf-8');
    expect(content).toContain('name');
    expect(content).toContain('Acme deal');
    expect(content).toContain('5000');
  });
});
