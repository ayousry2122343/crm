import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { ReportQueryEngine } from './report-query-engine';

@Injectable()
export class SavedReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly queryEngine: ReportQueryEngine,
  ) {}

  private requireWs() {
    const store = this.tenant.getStore();
    if (!store?.workspaceId) throw new BadRequestException('no tenant context');
    return store;
  }

  async create(dto: any) {
    const { workspaceId, userId } = this.requireWs();
    return this.prisma.savedReport.create({
      data: { ...dto, workspaceId, createdById: userId },
    });
  }

  async list() {
    const { workspaceId, userId } = this.requireWs();
    return this.prisma.savedReport.findMany({
      where: {
        workspaceId,
        OR: [{ createdById: userId }, { isShared: true }],
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async get(id: string) {
    const { workspaceId } = this.requireWs();
    const report = await this.prisma.savedReport.findUnique({ where: { id } });
    if (!report || report.workspaceId !== workspaceId) {
      throw new BadRequestException('Report not found');
    }
    return report;
  }

  async update(id: string, dto: any) {
    await this.get(id);
    return this.prisma.savedReport.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    await this.get(id);
    return this.prisma.savedReport.delete({ where: { id } });
  }

  async run(id: string, limit = 100, offset = 0) {
    const { workspaceId } = this.requireWs();
    const report = await this.prisma.savedReport.findUnique({ where: { id } });
    if (!report || report.workspaceId !== workspaceId) {
      throw new BadRequestException('Report not found');
    }

    return this.queryEngine.execute({
      workspaceId,
      entityType: report.entityType,
      reportType: report.reportType,
      columns: report.columns as any,
      filters: report.filters as any,
      groupBy: report.groupBy,
      aggregations: report.aggregations as any,
      sortBy: report.sortBy as any,
      limit,
      offset,
    });
  }

  async export(id: string, format: 'csv' | 'xlsx') {
    const data = await this.run(id, 10000, 0);
    const report = await this.prisma.savedReport.findUnique({ where: { id } });
    if (format === 'csv') {
      return this.queryEngine.toCSV(report!.columns as any, data.rows);
    }
    return data;
  }
}
