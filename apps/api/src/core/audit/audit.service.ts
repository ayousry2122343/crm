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
}
