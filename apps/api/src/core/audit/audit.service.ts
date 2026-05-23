import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { AuditAction } from '@prisma/client';

export interface AuditLogEntry {
  entityType: string;
  entityId: string;
  action: AuditAction;
  fieldKey?: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface AuditLogOverride {
  workspaceId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
  ) {}

  async log(entry: AuditLogEntry, override?: AuditLogOverride): Promise<void> {
    const ctx = this.tenant.getStore();
    const workspaceId = override?.workspaceId ?? ctx?.workspaceId;
    if (!workspaceId) {
      this.logger.warn('audit log skipped — no workspaceId in tenant context');
      return;
    }
    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        fieldKey: entry.fieldKey,
        oldValue: entry.oldValue == null ? undefined : (entry.oldValue as any),
        newValue: entry.newValue == null ? undefined : (entry.newValue as any),
        userId: override?.userId ?? ctx?.userId,
        ipAddress: override?.ipAddress,
        userAgent: override?.userAgent,
      },
    });
  }

  async logUpdate(
    entityType: string,
    entityId: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    override?: AuditLogOverride,
  ): Promise<void> {
    const changed = Object.keys(after).filter(
      (k) => JSON.stringify(after[k]) !== JSON.stringify(before[k]),
    );
    for (const k of changed) {
      await this.log(
        {
          entityType,
          entityId,
          action: 'UPDATE',
          fieldKey: k,
          oldValue: before[k],
          newValue: after[k],
        },
        override,
      );
    }
  }

  async listForRecord(entityType: string, entityId: string): Promise<unknown[]> {
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async listAll(filters: {
    entityType?: string;
    action?: string;
    userId?: string;
    cursor?: string;
    limit?: number;
  }) {
    const ctx = this.tenant.getStore();
    const workspaceId = ctx?.workspaceId;
    if (!workspaceId) return { items: [], nextCursor: null };

    const take = Math.min(filters.limit ?? 50, 200);
    const where: any = { workspaceId };
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.action) where.action = filters.action;
    if (filters.userId) where.userId = filters.userId;
    if (filters.cursor) where.id = { lt: filters.cursor };

    const items = await this.prisma.auditLog.findMany({
      where,
      take: take + 1,
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = items.length > take;
    const trimmed = hasMore ? items.slice(0, take) : items;
    return {
      items: trimmed,
      nextCursor: hasMore ? trimmed[trimmed.length - 1]?.id ?? null : null,
    };
  }
}
