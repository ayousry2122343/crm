import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import type { CreateWorkflowDto } from './dto/create-workflow.dto';
import type { UpdateWorkflowDto } from './dto/update-workflow.dto';

@Injectable()
export class WorkflowService {
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

  async create(dto: CreateWorkflowDto) {
    const workspaceId = this.requireWs();
    const row = await this.prisma.workflow.create({
      data: {
        workspaceId,
        name: dto.name,
        entityType: dto.entityType,
        enabled: dto.enabled ?? true,
        trigger: dto.trigger as any,
        conditions: dto.conditions as any,
        actions: dto.actions as any,
        cronExpression: dto.cronExpression,
      },
    });
    await this.audit.log({
      entityType: 'Workflow',
      entityId: row.id,
      action: 'CREATE',
      newValue: { name: row.name },
    });
    return row;
  }

  async list() {
    const workspaceId = this.requireWs();
    return this.prisma.workflow.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const workspaceId = this.requireWs();
    const w = await this.prisma.workflow.findUnique({ where: { id } });
    if (!w || w.workspaceId !== workspaceId) throw new NotFoundException();
    return w;
  }

  async update(id: string, dto: UpdateWorkflowDto) {
    const workspaceId = this.requireWs();
    const before = await this.prisma.workflow.findUnique({ where: { id } });
    if (!before || before.workspaceId !== workspaceId) throw new NotFoundException();

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.enabled !== undefined) data.enabled = dto.enabled;
    if (dto.trigger !== undefined) data.trigger = dto.trigger;
    if (dto.conditions !== undefined) data.conditions = dto.conditions;
    if (dto.actions !== undefined) data.actions = dto.actions;
    if (dto.cronExpression !== undefined) data.cronExpression = dto.cronExpression;

    const after = await this.prisma.workflow.update({ where: { id }, data });
    await this.audit.logUpdate('Workflow', id, before as any, after as any);
    return after;
  }

  async delete(id: string) {
    const workspaceId = this.requireWs();
    const w = await this.prisma.workflow.findUnique({ where: { id } });
    if (!w || w.workspaceId !== workspaceId) throw new NotFoundException();
    await this.prisma.workflow.delete({ where: { id } });
    await this.audit.log({ entityType: 'Workflow', entityId: id, action: 'DELETE' });
  }

  async listRuns(workflowId: string) {
    const workspaceId = this.requireWs();
    const w = await this.prisma.workflow.findUnique({ where: { id: workflowId } });
    if (!w || w.workspaceId !== workspaceId) throw new NotFoundException();
    return this.prisma.workflowRun.findMany({
      where: { workflowId },
      orderBy: { triggeredAt: 'desc' },
      take: 50,
    });
  }

  async findScheduledWorkflows() {
    return this.prisma.workflow.findMany({
      where: {
        enabled: true,
        cronExpression: { not: null },
      },
    });
  }

  async markRun(id: string) {
    return this.prisma.workflow.update({
      where: { id },
      data: { lastRunAt: new Date() },
    });
  }

  async findMatchingWorkflows(entityType: string, event: string, workspaceId: string) {
    const workflows = await this.prisma.workflow.findMany({
      where: { workspaceId, entityType, enabled: true },
    });
    return workflows.filter((w) => {
      const trigger = w.trigger as Record<string, unknown>;
      return trigger.event === event;
    });
  }
}
