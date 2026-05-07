import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import type { CreatePipelineDto } from './dto/create-pipeline.dto';
import type { UpdatePipelineDto } from './dto/update-pipeline.dto';
import type { CreateStageDto } from './dto/create-stage.dto';
import type { UpdateStageDto } from './dto/update-stage.dto';
import type { QueryPipelineDto } from './dto/query-pipeline.dto';

@Injectable()
export class PipelineService {
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

  async create(dto: CreatePipelineDto) {
    const workspaceId = this.requireWs();
    const row = await this.prisma.pipeline.create({
      data: {
        workspaceId,
        name: dto.name,
        entityType: dto.entityType ?? 'Deal',
        isDefault: dto.isDefault ?? false,
      },
      include: { stages: { orderBy: { order: 'asc' } } },
    });

    await this.audit.log({
      entityType: 'Pipeline',
      entityId: row.id,
      action: 'CREATE',
      newValue: { name: row.name },
    });

    return row;
  }

  async list(q: QueryPipelineDto) {
    const workspaceId = this.requireWs();
    const where: any = { workspaceId };
    if (q.entityType) where.entityType = q.entityType;
    if (!q.includeArchived) where.archivedAt = null;

    return this.prisma.pipeline.findMany({
      where,
      include: { stages: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async get(id: string) {
    const workspaceId = this.requireWs();
    const p = await this.prisma.pipeline.findUnique({
      where: { id },
      include: { stages: { orderBy: { order: 'asc' } } },
    });
    if (!p || p.workspaceId !== workspaceId) throw new NotFoundException();
    return p;
  }

  async update(id: string, dto: UpdatePipelineDto) {
    const workspaceId = this.requireWs();
    const before = await this.prisma.pipeline.findUnique({ where: { id } });
    if (!before || before.workspaceId !== workspaceId) throw new NotFoundException();

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.isDefault !== undefined) data.isDefault = dto.isDefault;

    const after = await this.prisma.pipeline.update({
      where: { id },
      data,
      include: { stages: { orderBy: { order: 'asc' } } },
    });

    await this.audit.logUpdate('Pipeline', id, before as any, after as any);
    return after;
  }

  async archive(id: string) {
    const workspaceId = this.requireWs();
    const p = await this.prisma.pipeline.findUnique({ where: { id } });
    if (!p || p.workspaceId !== workspaceId) throw new NotFoundException();

    const archived = await this.prisma.pipeline.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    await this.audit.log({
      entityType: 'Pipeline',
      entityId: id,
      action: 'DELETE',
    });

    return archived;
  }

  async createStage(pipelineId: string, dto: CreateStageDto) {
    const workspaceId = this.requireWs();
    const pipeline = await this.prisma.pipeline.findUnique({ where: { id: pipelineId } });
    if (!pipeline || pipeline.workspaceId !== workspaceId) throw new NotFoundException();

    const stage = await this.prisma.stage.create({
      data: {
        pipelineId,
        name: dto.name,
        order: dto.order,
        probability: dto.probability ?? 0,
        color: dto.color ?? '#3b82f6',
        isWon: dto.isWon ?? false,
        isLost: dto.isLost ?? false,
        requiredFieldKeys: dto.requiredFieldKeys ?? [],
      },
    });

    await this.audit.log({
      entityType: 'Stage',
      entityId: stage.id,
      action: 'CREATE',
      newValue: { name: stage.name, pipelineId },
    });

    return stage;
  }

  async updateStage(stageId: string, dto: UpdateStageDto) {
    const workspaceId = this.requireWs();
    const stage = await this.prisma.stage.findUnique({
      where: { id: stageId },
      include: { pipeline: true },
    });
    if (!stage || stage.pipeline.workspaceId !== workspaceId) throw new NotFoundException();

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.order !== undefined) data.order = dto.order;
    if (dto.probability !== undefined) data.probability = dto.probability;
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.isWon !== undefined) data.isWon = dto.isWon;
    if (dto.isLost !== undefined) data.isLost = dto.isLost;
    if (dto.requiredFieldKeys !== undefined) data.requiredFieldKeys = dto.requiredFieldKeys;

    return this.prisma.stage.update({ where: { id: stageId }, data });
  }

  async deleteStage(stageId: string) {
    const workspaceId = this.requireWs();
    const stage = await this.prisma.stage.findUnique({
      where: { id: stageId },
      include: { pipeline: true },
    });
    if (!stage || stage.pipeline.workspaceId !== workspaceId) throw new NotFoundException();

    const dealCount = await this.prisma.deal.count({ where: { stageId } });
    if (dealCount > 0) {
      throw new BadRequestException(
        `Cannot delete stage "${stage.name}": ${dealCount} deal(s) are in this stage`,
      );
    }

    await this.prisma.stage.delete({ where: { id: stageId } });

    await this.audit.log({
      entityType: 'Stage',
      entityId: stageId,
      action: 'DELETE',
      newValue: { name: stage.name, pipelineId: stage.pipelineId },
    });
  }

  async seedDefault(workspaceId?: string) {
    const wsId = workspaceId ?? this.requireWs();

    const existing = await this.prisma.pipeline.findFirst({
      where: { workspaceId: wsId, isDefault: true },
    });
    if (existing) return existing;

    const stages = [
      { name: 'Qualified', order: 0, probability: 20 },
      { name: 'Proposal', order: 1, probability: 40 },
      { name: 'Negotiation', order: 2, probability: 60 },
      { name: 'Won', order: 3, probability: 100, isWon: true },
      { name: 'Lost', order: 4, probability: 0, isLost: true },
    ];

    return this.prisma.pipeline.create({
      data: {
        workspaceId: wsId,
        name: 'Sales Pipeline',
        entityType: 'Deal',
        isDefault: true,
        stages: {
          createMany: {
            data: stages.map((s) => ({
              name: s.name,
              order: s.order,
              probability: s.probability,
              isWon: (s as any).isWon ?? false,
              isLost: (s as any).isLost ?? false,
              requiredFieldKeys: [],
            })),
          },
        },
      },
      include: { stages: { orderBy: { order: 'asc' } } },
    });
  }
}
