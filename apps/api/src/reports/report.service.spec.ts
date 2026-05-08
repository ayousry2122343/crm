import { NotFoundException } from '@nestjs/common';
import { ReportService } from './report.service';
import { TenantContextService } from '../core/tenant/tenant-context.service';
import type { IStandardReport, ReportResult } from './report.interface';

function makeReport(id: string): IStandardReport {
  return {
    id,
    labelAr: `${id} عربي`,
    labelEn: `${id} English`,
    acceptedFilters: [],
    run: jest.fn().mockResolvedValue({ rows: [{ x: 1 }], summary: { total: 1 } }),
  };
}

function buildSvc() {
  const tenant = new TenantContextService();
  const reports = ['pipeline-funnel', 'activities-by-owner', 'conversion-rates', 'forecast', 'won-lost-reasons'].map(
    makeReport,
  );
  const svc = new ReportService(tenant, ...reports as any);
  return { svc, tenant, reports };
}

const ctx = (workspaceId = 'ws_1') => ({
  workspaceId,
  userId: 'u_1',
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

describe('ReportService.listReports', () => {
  it('returns all 5 registered reports', () => {
    const { svc } = buildSvc();
    const list = svc.listReports();
    expect(list).toHaveLength(5);
    expect(list.map((r) => r.id)).toEqual([
      'pipeline-funnel',
      'activities-by-owner',
      'conversion-rates',
      'forecast',
      'won-lost-reasons',
    ]);
  });

  it('includes labels and filters for each report', () => {
    const { svc } = buildSvc();
    const list = svc.listReports();
    for (const r of list) {
      expect(r).toHaveProperty('labelAr');
      expect(r).toHaveProperty('labelEn');
      expect(r).toHaveProperty('acceptedFilters');
    }
  });
});

describe('ReportService.runReport', () => {
  it('runs a report and returns rows + summary', async () => {
    const { svc, tenant, reports } = buildSvc();
    await tenant.run(ctx(), async () => {
      const result = await svc.runReport('pipeline-funnel', { pipelineId: 'p1' });
      expect(result.rows).toEqual([{ x: 1 }]);
      expect(result.summary).toEqual({ total: 1 });
      expect(reports[0].run).toHaveBeenCalledWith('ws_1', { pipelineId: 'p1' });
    });
  });

  it('throws NotFoundException for unknown report', async () => {
    const { svc, tenant } = buildSvc();
    await tenant.run(ctx(), async () => {
      await expect(svc.runReport('nonexistent', {})).rejects.toThrow(NotFoundException);
    });
  });

  it('throws BadRequestException without tenant context', async () => {
    const { svc } = buildSvc();
    await expect(svc.runReport('pipeline-funnel', {})).rejects.toThrow('no tenant context');
  });
});
