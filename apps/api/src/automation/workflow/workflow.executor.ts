import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { evaluateConditions, type ConditionTree } from './condition-evaluator';
import { NotificationService } from '../../notifications/notification.service';

export interface WorkflowAction {
  type: string;
  params: Record<string, unknown>;
}

export interface WorkflowJob {
  workflowId: string;
  workspaceId: string;
  entityType: string;
  entityId: string;
  record: Record<string, unknown>;
}

@Injectable()
export class WorkflowExecutor {
  private readonly logger = new Logger(WorkflowExecutor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async execute(job: WorkflowJob): Promise<void> {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: job.workflowId },
    });
    if (!workflow || !workflow.enabled) return;

    const run = await this.prisma.workflowRun.create({
      data: {
        workflowId: job.workflowId,
        workspaceId: job.workspaceId,
        triggeredByEntity: job.entityType,
        triggeredById: job.entityId,
        status: 'RUNNING',
      },
    });

    try {
      const conditions = workflow.conditions as unknown as ConditionTree;
      if (!evaluateConditions(job.record, conditions)) {
        await this.prisma.workflowRun.update({
          where: { id: run.id },
          data: { status: 'SUCCESS', log: { skipped: 'conditions not met' }, completedAt: new Date() },
        });
        return;
      }

      const actions = workflow.actions as unknown as WorkflowAction[];
      const log: Record<string, unknown>[] = [];

      for (const action of actions) {
        const result = await this.executeAction(action, job);
        log.push({ type: action.type, result });
      }

      await this.prisma.workflowRun.update({
        where: { id: run.id },
        data: { status: 'SUCCESS', log: log as any, completedAt: new Date() },
      });

      this.logger.log(`workflow ${job.workflowId} completed for ${job.entityType}:${job.entityId}`);
    } catch (err: any) {
      await this.prisma.workflowRun.update({
        where: { id: run.id },
        data: { status: 'FAILED', error: err.message, completedAt: new Date() },
      });
      this.logger.error(`workflow ${job.workflowId} failed: ${err.message}`);
    }
  }

  private async executeAction(
    action: WorkflowAction,
    job: WorkflowJob,
  ): Promise<Record<string, unknown>> {
    switch (action.type) {
      case 'UPDATE_FIELD':
        return this.actionUpdateField(action.params, job);
      case 'CREATE_TASK':
        return this.actionCreateTask(action.params, job);
      case 'ASSIGN':
        return this.actionAssign(action.params, job);
      case 'SEND_EMAIL':
        return { type: 'SEND_EMAIL', status: 'queued' };
      case 'CALL_WEBHOOK':
        return { type: 'CALL_WEBHOOK', status: 'queued' };
      case 'NOTIFY_USER':
        return this.actionNotifyUser(action.params, job);
      default:
        return { type: action.type, status: 'unsupported' };
    }
  }

  private async actionUpdateField(
    params: Record<string, unknown>,
    job: WorkflowJob,
  ): Promise<Record<string, unknown>> {
    const { fieldKey, value } = params;
    if (!fieldKey) return { error: 'missing fieldKey' };

    const table = job.entityType.toLowerCase();
    if (table === 'person') {
      await this.prisma.person.update({
        where: { id: job.entityId },
        data: { [fieldKey as string]: value },
      });
    } else if (table === 'deal') {
      await this.prisma.deal.update({
        where: { id: job.entityId },
        data: { [fieldKey as string]: value },
      });
    }
    return { updated: fieldKey, value };
  }

  private async actionCreateTask(
    params: Record<string, unknown>,
    job: WorkflowJob,
  ): Promise<Record<string, unknown>> {
    const activity = await this.prisma.activity.create({
      data: {
        workspaceId: job.workspaceId,
        parentEntity: job.entityType,
        parentId: job.entityId,
        type: 'TASK',
        subject: String(params.subject ?? 'Auto-created task'),
        body: params.body ? String(params.body) : null,
        ownerId: params.assignTo ? String(params.assignTo) : null,
        dueAt: params.dueDays
          ? new Date(Date.now() + Number(params.dueDays) * 86400_000)
          : null,
      },
    });
    return { activityId: activity.id };
  }

  private async actionAssign(
    params: Record<string, unknown>,
    job: WorkflowJob,
  ): Promise<Record<string, unknown>> {
    const { ownerId } = params;
    if (!ownerId) return { error: 'missing ownerId' };

    if (job.entityType === 'Person') {
      await this.prisma.person.update({
        where: { id: job.entityId },
        data: { ownerId: String(ownerId) },
      });
    } else if (job.entityType === 'Deal') {
      await this.prisma.deal.update({
        where: { id: job.entityId },
        data: { ownerId: String(ownerId) },
      });
    }
    return { assigned: ownerId };
  }

  private async actionNotifyUser(
    params: Record<string, unknown>,
    job: WorkflowJob,
  ): Promise<Record<string, unknown>> {
    const userId = params.userId as string | undefined;
    if (!userId) return { error: 'missing userId' };

    const notification = await this.notificationService.create({
      userId,
      type: 'WORKFLOW',
      title: String(params.title ?? `Workflow triggered on ${job.entityType}`),
      body: params.body ? String(params.body) : undefined,
      link: params.link ? String(params.link) : undefined,
    });
    return { notificationId: notification.id };
  }
}
