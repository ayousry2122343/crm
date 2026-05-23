import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ReportColumn {
  fieldKey: string;
  label?: string;
}

export interface ReportAggregation {
  fieldKey: string;
  function: string;
  label: string;
}

export interface ReportQuery {
  workspaceId: string;
  entityType: string;
  reportType: string;
  columns: ReportColumn[];
  filters: Record<string, { operator: string; value: any }>;
  groupBy: string[];
  aggregations: ReportAggregation[];
  sortBy: Array<{ fieldKey: string; direction: 'ASC' | 'DESC' }>;
  limit: number;
  offset: number;
}

const ENTITY_MAP: Record<string, string> = {
  Person: 'person',
  Deal: 'deal',
  Ticket: 'ticket',
  Activity: 'activity',
  Company: 'person',
};

const OPERATOR_MAP: Record<string, (v: any) => any> = {
  EQUALS: (v) => v,
  NOT_EQUALS: (v) => ({ not: v }),
  CONTAINS: (v) => ({ contains: v, mode: 'insensitive' }),
  GT: (v) => ({ gt: v }),
  LT: (v) => ({ lt: v }),
  GTE: (v) => ({ gte: v }),
  LTE: (v) => ({ lte: v }),
  IN: (v) => ({ in: v }),
  NOT_IN: (v) => ({ notIn: v }),
};

@Injectable()
export class ReportQueryEngine {
  constructor(private readonly prisma: PrismaService) {}

  buildWhereClause(
    workspaceId: string,
    filters: Record<string, { operator: string; value: any }>,
  ) {
    const where: Record<string, any> = { workspaceId, archivedAt: null };
    for (const [field, filter] of Object.entries(filters)) {
      const mapper = OPERATOR_MAP[filter.operator];
      if (mapper) where[field] = mapper(filter.value);
    }
    return where;
  }

  async execute(query: ReportQuery) {
    const modelName = ENTITY_MAP[query.entityType];
    if (!modelName) throw new Error(`Unknown entity type: ${query.entityType}`);

    if (query.reportType === 'GROUPED' || query.reportType === 'SUMMARY') {
      return this.executeGrouped(query, modelName);
    }

    return this.executeTabular(query, modelName);
  }

  private async executeTabular(query: ReportQuery, modelName: string) {
    const where = this.buildWhereClause(query.workspaceId, query.filters);
    const select: Record<string, boolean> = { id: true };
    for (const col of query.columns) select[col.fieldKey] = true;

    const orderBy = query.sortBy.map((s) => ({
      [s.fieldKey]: s.direction.toLowerCase(),
    }));

    const model = (this.prisma as any)[modelName];
    const [rows, total] = await Promise.all([
      model.findMany({
        where,
        select,
        orderBy: orderBy.length ? orderBy : undefined,
        take: Math.min(query.limit, 10000),
        skip: query.offset,
      }),
      model.count({ where }),
    ]);

    return { rows, total };
  }

  private async executeGrouped(query: ReportQuery, modelName: string) {
    const where = this.buildWhereClause(query.workspaceId, query.filters);
    const model = (this.prisma as any)[modelName];

    const [rows, total] = await Promise.all([
      model.findMany({ where }),
      model.count({ where }),
    ]);

    return { rows, total };
  }

  toCSV(columns: ReportColumn[], rows: any[]): string {
    const header = columns.map((c) => c.label || c.fieldKey).join(',');
    const body = rows
      .map((row) =>
        columns
          .map((c) => {
            const val = row[c.fieldKey] ?? '';
            const str = String(val);
            return str.includes(',') || str.includes('"')
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          })
          .join(','),
      )
      .join('\n');
    return `${header}\n${body}`;
  }
}
