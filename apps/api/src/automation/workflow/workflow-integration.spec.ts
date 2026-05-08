import { WorkflowExecutor, type WorkflowJob } from './workflow.executor';
import { CronRunnerService } from './cron-runner.service';
import { WorkflowService } from './workflow.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makeExecutorPrisma() {
  return {
    workflow: { findUnique: jest.fn() },
    workflowRun: { create: jest.fn(), update: jest.fn() },
    person: { update: jest.fn(), findMany: jest.fn() },
    deal: { update: jest.fn(), findMany: jest.fn() },
    activity: { create: jest.fn(), findMany: jest.fn() },
  };
}

function makeNotificationService() {
  return { create: jest.fn().mockResolvedValue({ id: 'notif_1' }) };
}

function makeWorkflowService() {
  return {
    findScheduledWorkflows: jest.fn(),
    markRun: jest.fn().mockResolvedValue({}),
  };
}

describe('Workflow Integration: trigger → execution → audit log', () => {
  it('full workflow: conditions match → actions execute → run logged SUCCESS', async () => {
    const prisma = makeExecutorPrisma();
    const notifSvc = makeNotificationService();
    const executor = new WorkflowExecutor(prisma as any, notifSvc as any);

    prisma.workflow.findUnique.mockResolvedValue({
      id: 'wf_1',
      enabled: true,
      conditions: { op: 'AND', items: [{ field: 'lifecycleStage', op: 'eq', value: 'LEAD' }] },
      actions: [
        { type: 'UPDATE_FIELD', params: { fieldKey: 'source', value: 'AUTO' } },
        { type: 'CREATE_TASK', params: { subject: 'Review new lead' } },
      ],
    });
    prisma.workflowRun.create.mockResolvedValue({ id: 'run_1' });
    prisma.workflowRun.update.mockResolvedValue({});
    prisma.person.update.mockResolvedValue({});
    prisma.activity.create.mockResolvedValue({ id: 'act_1' });

    const job: WorkflowJob = {
      workflowId: 'wf_1',
      workspaceId: 'ws_1',
      entityType: 'Person',
      entityId: 'p_1',
      record: { fullName: 'Test', lifecycleStage: 'LEAD' },
    };

    await executor.execute(job);

    expect(prisma.workflowRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workflowId: 'wf_1',
          status: 'RUNNING',
        }),
      }),
    );
    expect(prisma.person.update).toHaveBeenCalled();
    expect(prisma.activity.create).toHaveBeenCalled();

    const successCall = prisma.workflowRun.update.mock.calls.find(
      (c: any) => c[0]?.data?.status === 'SUCCESS',
    );
    expect(successCall).toBeDefined();
    expect(successCall![0].data.log).toHaveLength(2);
  });

  it('full workflow: conditions do not match → run skipped', async () => {
    const prisma = makeExecutorPrisma();
    const notifSvc = makeNotificationService();
    const executor = new WorkflowExecutor(prisma as any, notifSvc as any);

    prisma.workflow.findUnique.mockResolvedValue({
      id: 'wf_2',
      enabled: true,
      conditions: { op: 'AND', items: [{ field: 'lifecycleStage', op: 'eq', value: 'CUSTOMER' }] },
      actions: [{ type: 'UPDATE_FIELD', params: { fieldKey: 'source', value: 'AUTO' } }],
    });
    prisma.workflowRun.create.mockResolvedValue({ id: 'run_2' });
    prisma.workflowRun.update.mockResolvedValue({});

    const job: WorkflowJob = {
      workflowId: 'wf_2',
      workspaceId: 'ws_1',
      entityType: 'Person',
      entityId: 'p_1',
      record: { fullName: 'Test', lifecycleStage: 'LEAD' },
    };

    await executor.execute(job);

    expect(prisma.person.update).not.toHaveBeenCalled();
    const skipCall = prisma.workflowRun.update.mock.calls[0][0];
    expect(skipCall.data.status).toBe('SUCCESS');
    expect(skipCall.data.log).toEqual({ skipped: 'conditions not met' });
  });
});

describe('CronRunner Integration: scheduled workflow → cron picks up', () => {
  it('tick finds scheduled workflows and executes matching ones', async () => {
    const prisma = makeExecutorPrisma();
    const notifSvc = makeNotificationService();
    const executor = new WorkflowExecutor(prisma as any, notifSvc as any);
    const workflowSvc = makeWorkflowService();

    const now = new Date();
    const cronExpr = `${now.getMinutes()} ${now.getHours()} * * *`;

    workflowSvc.findScheduledWorkflows.mockResolvedValue([
      {
        id: 'wf_sched',
        workspaceId: 'ws_1',
        entityType: 'Person',
        cronExpression: cronExpr,
        enabled: true,
        trigger: { query: {} },
      },
    ]);

    prisma.person.findMany.mockResolvedValue([
      { id: 'p_1', fullName: 'Ahmed', workspaceId: 'ws_1' },
    ]);

    prisma.workflow.findUnique.mockResolvedValue({
      id: 'wf_sched',
      enabled: true,
      conditions: { op: 'AND', items: [] },
      actions: [{ type: 'UPDATE_FIELD', params: { fieldKey: 'source', value: 'CRON' } }],
    });
    prisma.workflowRun.create.mockResolvedValue({ id: 'run_cron' });
    prisma.workflowRun.update.mockResolvedValue({});
    prisma.person.update.mockResolvedValue({});

    const runner = new CronRunnerService(workflowSvc as any, executor, prisma as any);
    const result = await runner.tick();

    expect(result.evaluated).toBe(1);
    expect(result.matched).toBe(1);
    expect(prisma.person.update).toHaveBeenCalled();
    expect(workflowSvc.markRun).toHaveBeenCalledWith('wf_sched');
  });

  it('tick skips workflows with non-matching cron expression', async () => {
    const prisma = makeExecutorPrisma();
    const notifSvc = makeNotificationService();
    const executor = new WorkflowExecutor(prisma as any, notifSvc as any);
    const workflowSvc = makeWorkflowService();

    workflowSvc.findScheduledWorkflows.mockResolvedValue([
      {
        id: 'wf_nomatch',
        workspaceId: 'ws_1',
        entityType: 'Person',
        cronExpression: '0 3 31 2 *',
        enabled: true,
        trigger: { query: {} },
      },
    ]);

    const runner = new CronRunnerService(workflowSvc as any, executor, prisma as any);
    const result = await runner.tick();

    expect(result.evaluated).toBe(1);
    expect(result.matched).toBe(0);
    expect(workflowSvc.markRun).not.toHaveBeenCalled();
  });

  it('tick with no scheduled workflows returns zero counts', async () => {
    const prisma = makeExecutorPrisma();
    const notifSvc = makeNotificationService();
    const executor = new WorkflowExecutor(prisma as any, notifSvc as any);
    const workflowSvc = makeWorkflowService();

    workflowSvc.findScheduledWorkflows.mockResolvedValue([]);

    const runner = new CronRunnerService(workflowSvc as any, executor, prisma as any);
    const result = await runner.tick();

    expect(result.evaluated).toBe(0);
    expect(result.matched).toBe(0);
  });
});

describe('Workflow Executor: action failure handling', () => {
  it('action failure marks run as FAILED and records error', async () => {
    const prisma = makeExecutorPrisma();
    const notifSvc = makeNotificationService();
    const executor = new WorkflowExecutor(prisma as any, notifSvc as any);

    prisma.workflow.findUnique.mockResolvedValue({
      id: 'wf_fail',
      enabled: true,
      conditions: { op: 'AND', items: [] },
      actions: [{ type: 'UPDATE_FIELD', params: { fieldKey: 'source', value: 'AUTO' } }],
    });
    prisma.workflowRun.create.mockResolvedValue({ id: 'run_fail' });
    prisma.workflowRun.update.mockResolvedValue({});
    prisma.person.update.mockRejectedValue(new Error('DB connection lost'));

    const job: WorkflowJob = {
      workflowId: 'wf_fail',
      workspaceId: 'ws_1',
      entityType: 'Person',
      entityId: 'p_1',
      record: { fullName: 'Test', lifecycleStage: 'LEAD' },
    };

    await executor.execute(job);

    const failCall = prisma.workflowRun.update.mock.calls.find(
      (c: any) => c[0]?.data?.status === 'FAILED',
    );
    expect(failCall).toBeDefined();
    expect(failCall![0].data.error).toBe('DB connection lost');
  });

  it('disabled workflow is skipped entirely', async () => {
    const prisma = makeExecutorPrisma();
    const notifSvc = makeNotificationService();
    const executor = new WorkflowExecutor(prisma as any, notifSvc as any);

    prisma.workflow.findUnique.mockResolvedValue({
      id: 'wf_disabled',
      enabled: false,
      conditions: {},
      actions: [],
    });

    const job: WorkflowJob = {
      workflowId: 'wf_disabled',
      workspaceId: 'ws_1',
      entityType: 'Person',
      entityId: 'p_1',
      record: {},
    };

    await executor.execute(job);

    expect(prisma.workflowRun.create).not.toHaveBeenCalled();
  });
});
