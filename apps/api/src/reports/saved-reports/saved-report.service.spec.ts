import { SavedReportService } from './saved-report.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    savedReport: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
}

function makeQueryEngine() {
  return { execute: jest.fn(), toCSV: jest.fn() };
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
  const engine = makeQueryEngine();
  const svc = new SavedReportService(prisma as any, tenant, engine as any);
  return { svc, tenant, prisma, engine };
}

describe('SavedReportService', () => {
  describe('create', () => {
    it('creates report with workspace and user context', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.savedReport.create.mockResolvedValue({
        id: 'r1',
        name: 'Active Deals',
      });

      const result = await tenant.run(ctx(), () =>
        svc.create({
          name: 'Active Deals',
          entityType: 'Deal',
          reportType: 'TABULAR',
          columns: [{ fieldKey: 'name' }],
        }),
      );

      expect(result.name).toBe('Active Deals');
      expect(prisma.savedReport.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workspaceId: 'ws1',
            createdById: 'u1',
            name: 'Active Deals',
          }),
        }),
      );
    });
  });

  describe('list', () => {
    it('returns own + shared reports', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.savedReport.findMany.mockResolvedValue([
        { id: 'r1', name: 'My Report', isShared: false },
        { id: 'r2', name: 'Team Report', isShared: true },
      ]);

      const result = await tenant.run(ctx(), () => svc.list());
      expect(result).toHaveLength(2);
      expect(prisma.savedReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: 'ws1',
            OR: [{ createdById: 'u1' }, { isShared: true }],
          }),
        }),
      );
    });
  });

  describe('run', () => {
    it('executes report via query engine', async () => {
      const { svc, tenant, prisma, engine } = buildSvc();
      prisma.savedReport.findUnique.mockResolvedValue({
        id: 'r1',
        workspaceId: 'ws1',
        entityType: 'Deal',
        reportType: 'TABULAR',
        columns: [{ fieldKey: 'name' }],
        filters: {},
        groupBy: [],
        aggregations: [],
        sortBy: [],
      });
      engine.execute.mockResolvedValue({
        rows: [{ name: 'Deal A' }],
        total: 1,
      });

      const result = await tenant.run(ctx(), () => svc.run('r1'));
      expect(result.rows).toHaveLength(1);
      expect(engine.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'ws1',
          entityType: 'Deal',
        }),
      );
    });

    it('throws when report not found', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.savedReport.findUnique.mockResolvedValue(null);

      await expect(
        tenant.run(ctx(), () => svc.run('nonexistent')),
      ).rejects.toThrow('Report not found');
    });

    it('throws when report belongs to different workspace', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.savedReport.findUnique.mockResolvedValue({
        id: 'r1',
        workspaceId: 'ws-other',
      });

      await expect(
        tenant.run(ctx(), () => svc.run('r1')),
      ).rejects.toThrow('Report not found');
    });
  });

  describe('export', () => {
    it('exports as CSV', async () => {
      const { svc, tenant, prisma, engine } = buildSvc();
      prisma.savedReport.findUnique.mockResolvedValue({
        id: 'r1',
        workspaceId: 'ws1',
        entityType: 'Person',
        reportType: 'TABULAR',
        columns: [{ fieldKey: 'name', label: 'Name' }],
        filters: {},
        groupBy: [],
        aggregations: [],
        sortBy: [],
      });
      engine.execute.mockResolvedValue({
        rows: [{ name: 'Ahmed' }],
        total: 1,
      });
      engine.toCSV.mockReturnValue('Name\nAhmed');

      const result = await tenant.run(ctx(), () => svc.export('r1', 'csv'));
      expect(result).toBe('Name\nAhmed');
    });
  });

  describe('delete', () => {
    it('deletes report', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.savedReport.findUnique.mockResolvedValue({
        id: 'r1',
        workspaceId: 'ws1',
      });
      prisma.savedReport.delete.mockResolvedValue({ id: 'r1' });

      await tenant.run(ctx(), () => svc.delete('r1'));
      expect(prisma.savedReport.delete).toHaveBeenCalledWith({
        where: { id: 'r1' },
      });
    });
  });
});
