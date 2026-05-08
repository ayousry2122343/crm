import { BadRequestException, Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';

const CSV_TYPES = ['text/csv', 'application/csv'];
const EXCEL_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

interface ParseResult {
  headers: string[];
  rows: Record<string, string>[];
}

interface ImportResult {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ row: number; message: string }>;
}

interface ExportResult {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}

type ColumnMapping = Record<string, string>;

const PERSON_EXPORT_COLS = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'companyName',
  'lifecycleStage',
  'title',
  'industry',
  'website',
  'source',
] as const;

const DEAL_EXPORT_COLS = [
  'name',
  'amount',
  'currency',
  'status',
  'probability',
  'expectedCloseDate',
  'source',
  'pipeline',
  'stage',
  'primaryContact',
] as const;

@Injectable()
export class ImportExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly audit: AuditService,
  ) {}

  private requireWs(): string {
    const ws = this.tenant.getStore()?.workspaceId;
    if (!ws) throw new BadRequestException('no tenant context');
    return ws;
  }

  private currentUser(): string | undefined {
    return this.tenant.getStore()?.userId;
  }

  // ─── Parse Preview ───

  async parsePreview(
    buffer: Buffer,
    mimeType: string,
    maxRows = 10,
  ): Promise<ParseResult> {
    if (CSV_TYPES.includes(mimeType)) {
      return this.parseCsv(buffer, maxRows);
    }
    if (EXCEL_TYPES.includes(mimeType)) {
      return this.parseExcel(buffer, maxRows);
    }
    throw new BadRequestException(
      `Unsupported file type: ${mimeType}. Use CSV or Excel.`,
    );
  }

  private parseCsv(buffer: Buffer, maxRows: number): ParseResult {
    const records: string[][] = parse(buffer, {
      relax_quotes: true,
      skip_empty_lines: true,
    });
    if (records.length === 0) return { headers: [], rows: [] };

    const headers = records[0].map((h) => h.trim());
    const rows = records
      .slice(1, maxRows + 1)
      .map((row) => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
          obj[h] = row[i]?.trim() ?? '';
        });
        return obj;
      });

    return { headers, rows };
  }

  private async parseExcel(buffer: Buffer, maxRows: number): Promise<ParseResult> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const ws = wb.worksheets[0];
    if (!ws || ws.rowCount === 0) return { headers: [], rows: [] };

    const headerRow = ws.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = String(cell.value ?? '').trim();
    });

    const rows: Record<string, string>[] = [];
    for (let r = 2; r <= Math.min(ws.rowCount, maxRows + 1); r++) {
      const row = ws.getRow(r);
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        const cell = row.getCell(i + 1);
        obj[h] = cell.value != null ? String(cell.value).trim() : '';
      });
      rows.push(obj);
    }

    return { headers, rows };
  }

  // ─── Import People ───

  async importPeople(
    rows: Record<string, string>[],
    mapping: ColumnMapping,
    fileName: string,
  ): Promise<ImportResult> {
    const workspaceId = this.requireWs();
    const userId = this.currentUser()!;

    const job = await this.prisma.importJob.create({
      data: {
        workspaceId,
        entityType: 'Person',
        fileName,
        totalRows: rows.length,
        status: 'PROCESSING',
        startedById: userId,
      },
    });

    let successCount = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        const firstName = row[mapping.firstName] ?? '';
        const lastName = row[mapping.lastName] ?? '';
        const email = row[mapping.email] ?? '';
        const phone = row[mapping.phone] ?? '';
        const companyName = row[mapping.companyName] ?? '';

        const fullName = [firstName, lastName].filter(Boolean).join(' ') ||
          companyName || email || 'Unknown';

        await this.prisma.person.create({
          data: {
            workspaceId,
            isCompany: false,
            firstName: firstName || undefined,
            lastName: lastName || undefined,
            fullName,
            email: email || undefined,
            emailNormalized: email ? email.toLowerCase().trim() : undefined,
            phone: phone || undefined,
            companyName: companyName || undefined,
            lifecycleStage: row[mapping.lifecycleStage] as any || 'LEAD',
            title: row[mapping.title] || undefined,
            industry: row[mapping.industry] || undefined,
            website: row[mapping.website] || undefined,
            source: row[mapping.source] || 'Import',
            customFields: {},
            createdById: userId,
          },
        });

        successCount++;
      } catch (err: any) {
        errors.push({ row: i + 1, message: err.message ?? 'Unknown error' });
      }
    }

    await this.prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETED',
        successCount,
        errorCount: errors.length,
        errors: errors as any,
        completedAt: new Date(),
      },
    });

    await this.audit.log({
      entityType: 'ImportJob',
      entityId: job.id,
      action: 'CREATE',
      newValue: {
        entityType: 'Person',
        fileName,
        totalRows: rows.length,
        successCount,
        errorCount: errors.length,
      },
    });

    return {
      totalRows: rows.length,
      successCount,
      errorCount: errors.length,
      errors,
    };
  }

  // ─── Export People ───

  async exportPeople(
    filters: { search?: string; lifecycleStage?: string; isCompany?: boolean },
    format: 'csv' | 'excel',
  ): Promise<ExportResult> {
    const workspaceId = this.requireWs();
    const where: any = { workspaceId, archivedAt: null };
    if (filters.isCompany !== undefined) where.isCompany = filters.isCompany;
    if (filters.lifecycleStage) where.lifecycleStage = filters.lifecycleStage;
    if (filters.search) {
      where.OR = [
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const people = await this.prisma.person.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    const data = people.map((p: any) => ({
      firstName: p.firstName ?? '',
      lastName: p.lastName ?? '',
      email: p.email ?? '',
      phone: p.phone ?? '',
      companyName: p.companyName ?? '',
      lifecycleStage: p.lifecycleStage ?? '',
      title: p.title ?? '',
      industry: p.industry ?? '',
      website: p.website ?? '',
      source: p.source ?? '',
    }));

    if (format === 'excel') {
      return this.toExcel(data, [...PERSON_EXPORT_COLS], 'people');
    }
    return this.toCsv(data, [...PERSON_EXPORT_COLS], 'people');
  }

  // ─── Export Deals ───

  async exportDeals(
    filters: { search?: string; status?: string },
    format: 'csv' | 'excel',
  ): Promise<ExportResult> {
    const workspaceId = this.requireWs();
    const where: any = { workspaceId, archivedAt: null };
    if (filters.status) where.status = filters.status;

    const deals = await this.prisma.deal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10000,
      include: { stage: true, pipeline: true, primaryContact: true },
    });

    const data = deals.map((d: any) => ({
      name: d.name ?? '',
      amount: d.amount != null ? String(d.amount) : '',
      currency: d.currency ?? '',
      status: d.status ?? '',
      probability: d.probability != null ? String(d.probability) : '',
      expectedCloseDate: d.expectedCloseDate
        ? new Date(d.expectedCloseDate).toISOString().slice(0, 10)
        : '',
      source: d.source ?? '',
      pipeline: d.pipeline?.name ?? '',
      stage: d.stage?.name ?? '',
      primaryContact: d.primaryContact?.fullName ?? '',
    }));

    if (format === 'excel') {
      return this.toExcel(data, [...DEAL_EXPORT_COLS], 'deals');
    }
    return this.toCsv(data, [...DEAL_EXPORT_COLS], 'deals');
  }

  // ─── Helpers ───

  private toCsv(
    data: Record<string, string>[],
    columns: string[],
    prefix: string,
  ): ExportResult {
    const output = stringify(data, { header: true, columns });
    return {
      buffer: Buffer.from(output, 'utf-8'),
      mimeType: 'text/csv',
      filename: `${prefix}-export.csv`,
    };
  }

  private async toExcel(
    data: Record<string, string>[],
    columns: string[],
    prefix: string,
  ): Promise<ExportResult> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Export');

    ws.addRow(columns);
    for (const row of data) {
      ws.addRow(columns.map((c) => row[c] ?? ''));
    }

    ws.getRow(1).font = { bold: true };
    ws.columns.forEach((col) => {
      col.width = 18;
    });

    const buf = await wb.xlsx.writeBuffer();
    return {
      buffer: Buffer.from(buf),
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `${prefix}-export.xlsx`,
    };
  }
}
