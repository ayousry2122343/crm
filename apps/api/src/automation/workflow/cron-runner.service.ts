import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WorkflowExecutor, type WorkflowJob } from './workflow.executor';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CronRunnerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CronRunnerService.name);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly workflowService: WorkflowService,
    private readonly executor: WorkflowExecutor,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    const intervalMs = parseInt(process.env.CRON_TICK_INTERVAL_MS ?? '60000', 10);
    this.intervalId = setInterval(() => void this.tick(), intervalMs);
    this.logger.log(`Cron runner started (interval=${intervalMs}ms)`);
  }

  onModuleDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private matchesCron(cronExpr: string, now: Date): boolean {
    const parts = cronExpr.trim().split(/\s+/);
    if (parts.length < 5) return false;

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    const checks = [
      { value: now.getMinutes(), field: minute },
      { value: now.getHours(), field: hour },
      { value: now.getDate(), field: dayOfMonth },
      { value: now.getMonth() + 1, field: month },
      { value: now.getDay(), field: dayOfWeek },
    ];

    return checks.every(({ value, field }) => {
      if (field === '*') return true;
      if (field.includes('/')) {
        const [, step] = field.split('/');
        return value % parseInt(step, 10) === 0;
      }
      if (field.includes(',')) {
        return field.split(',').map(Number).includes(value);
      }
      return parseInt(field, 10) === value;
    });
  }

  async tick() {
    const now = new Date();
    const workflows = await this.workflowService.findScheduledWorkflows();

    const matched = workflows.filter((w) =>
      w.cronExpression && this.matchesCron(w.cronExpression, now),
    );

    for (const workflow of matched) {
      try {
        const trigger = workflow.trigger as Record<string, unknown>;
        const entityType = workflow.entityType;
        const query = (trigger.query ?? {}) as Record<string, unknown>;

        const entities = await this.queryEntities(entityType, workflow.workspaceId, query);

        for (const entity of entities) {
          const job: WorkflowJob = {
            workflowId: workflow.id,
            workspaceId: workflow.workspaceId,
            entityType,
            entityId: entity.id,
            record: entity,
          };
          await this.executor.execute(job);
        }

        await this.workflowService.markRun(workflow.id);
      } catch (err) {
        this.logger.error(`Cron workflow ${workflow.id} failed: ${err}`);
      }
    }

    return { evaluated: workflows.length, matched: matched.length };
  }

  private async queryEntities(
    entityType: string,
    workspaceId: string,
    query: Record<string, unknown>,
  ): Promise<any[]> {
    const where: any = { workspaceId, ...this.buildWhere(query) };

    switch (entityType) {
      case 'Deal':
        return this.prisma.deal.findMany({ where, take: 200 });
      case 'Person':
        return this.prisma.person.findMany({ where: { ...where, archivedAt: null }, take: 200 });
      case 'Activity':
        return this.prisma.activity.findMany({ where, take: 200 });
      default:
        return [];
    }
  }

  private buildWhere(query: Record<string, unknown>): Record<string, unknown> {
    const where: Record<string, unknown> = {};
    for (const [key, condition] of Object.entries(query)) {
      if (typeof condition === 'object' && condition !== null) {
        const cond = condition as Record<string, unknown>;
        if (cond.operator === 'lt') where[key] = { lt: this.resolveValue(cond.value) };
        else if (cond.operator === 'gt') where[key] = { gt: this.resolveValue(cond.value) };
        else if (cond.operator === 'eq') where[key] = this.resolveValue(cond.value);
        else if (cond.operator === 'contains') where[key] = { contains: cond.value, mode: 'insensitive' };
        else where[key] = cond;
      } else {
        where[key] = condition;
      }
    }
    return where;
  }

  private resolveValue(val: unknown): unknown {
    if (val === '$now') return new Date();
    if (val === '$today') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
    }
    if (typeof val === 'string' && val.startsWith('$daysAgo:')) {
      const days = parseInt(val.split(':')[1], 10);
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d;
    }
    return val;
  }
}
