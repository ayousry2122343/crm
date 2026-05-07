import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import type { CreateWonLostReasonDto } from './dto/create-won-lost-reason.dto';
import type { UpdateWonLostReasonDto } from './dto/update-won-lost-reason.dto';
import type { QueryWonLostReasonDto } from './dto/query-won-lost-reason.dto';

@Injectable()
export class WonLostReasonService {
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

  async create(dto: CreateWonLostReasonDto) {
    const workspaceId = this.requireWs();
    const row = await this.prisma.wonLostReason.create({
      data: {
        workspaceId,
        kind: dto.kind,
        label: dto.label,
        order: dto.order ?? 0,
      },
    });

    await this.audit.log({
      entityType: 'WonLostReason',
      entityId: row.id,
      action: 'CREATE',
      newValue: { kind: row.kind, label: row.label },
    });

    return row;
  }

  async list(q: QueryWonLostReasonDto) {
    const workspaceId = this.requireWs();
    const where: any = { workspaceId };
    if (q.kind) where.kind = q.kind;
    if (!q.includeArchived) where.archivedAt = null;

    return this.prisma.wonLostReason.findMany({
      where,
      orderBy: [{ kind: 'asc' }, { order: 'asc' }],
    });
  }

  async get(id: string) {
    const workspaceId = this.requireWs();
    const r = await this.prisma.wonLostReason.findUnique({ where: { id } });
    if (!r || r.workspaceId !== workspaceId) throw new NotFoundException();
    return r;
  }

  async update(id: string, dto: UpdateWonLostReasonDto) {
    const workspaceId = this.requireWs();
    const before = await this.prisma.wonLostReason.findUnique({ where: { id } });
    if (!before || before.workspaceId !== workspaceId) throw new NotFoundException();

    const data: any = {};
    if (dto.label !== undefined) data.label = dto.label;
    if (dto.order !== undefined) data.order = dto.order;

    const after = await this.prisma.wonLostReason.update({ where: { id }, data });
    await this.audit.logUpdate('WonLostReason', id, before as any, after as any);
    return after;
  }

  async archive(id: string) {
    const workspaceId = this.requireWs();
    const r = await this.prisma.wonLostReason.findUnique({ where: { id } });
    if (!r || r.workspaceId !== workspaceId) throw new NotFoundException();

    const archived = await this.prisma.wonLostReason.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    await this.audit.log({
      entityType: 'WonLostReason',
      entityId: id,
      action: 'DELETE',
    });

    return archived;
  }
}
