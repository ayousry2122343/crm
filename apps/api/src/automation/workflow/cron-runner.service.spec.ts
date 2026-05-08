import { CronRunnerService } from './cron-runner.service';

function makeWorkflowService() {
  return {
    findScheduledWorkflows: jest.fn(),
    markRun: jest.fn().mockResolvedValue(undefined),
  };
}

function makeExecutor() {
  return {
    execute: jest.fn().mockResolvedValue(undefined),
  };
}

function makePrisma() {
  return {
    deal: { findMany: jest.fn() },
    person: { findMany: jest.fn() },
    activity: { findMany: jest.fn() },
  };
}

function buildSvc() {
  const workflowService = makeWorkflowService();
  const executor = makeExecutor();
  const prisma = makePrisma();
  const svc = new CronRunnerService(workflowService as any, executor as any, prisma as any);
  return { svc, workflowService, executor, prisma };
}

describe('CronRunnerService.tick', () => {
  it('evaluates and runs matching cron workflows', async () => {
    const { svc, workflowService, executor, prisma } = buildSvc();
    const now = new Date();
    const cronExpr = `${now.getMinutes()} ${now.getHours()} * * *`;

    workflowService.findScheduledWorkflows.mockResolvedValue([
      {
        id: 'w_1',
        workspaceId: 'ws_1',
        entityType: 'Deal',
        cronExpression: cronExpr,
        trigger: { event: 'SCHEDULED', query: {} },
        conditions: {},
        actions: [],
      },
    ]);
    prisma.deal.findMany.mockResolvedValue([
      { id: 'd_1', workspaceId: 'ws_1', name: 'Test Deal' },
    ]);

    const result = await svc.tick();
    expect(result.evaluated).toBe(1);
    expect(result.matched).toBe(1);
    expect(executor.execute).toHaveBeenCalledWith({
      workflowId: 'w_1',
      workspaceId: 'ws_1',
      entityType: 'Deal',
      entityId: 'd_1',
      record: expect.objectContaining({ id: 'd_1' }),
    });
    expect(workflowService.markRun).toHaveBeenCalledWith('w_1');
  });

  it('skips non-matching cron expressions', async () => {
    const { svc, workflowService, executor } = buildSvc();
    workflowService.findScheduledWorkflows.mockResolvedValue([
      {
        id: 'w_1',
        workspaceId: 'ws_1',
        entityType: 'Deal',
        cronExpression: '59 23 31 12 *',
        trigger: { event: 'SCHEDULED', query: {} },
        conditions: {},
        actions: [],
      },
    ]);

    const result = await svc.tick();
    expect(result.evaluated).toBe(1);
    expect(result.matched).toBe(0);
    expect(executor.execute).not.toHaveBeenCalled();
  });

  it('handles wildcard cron (every minute)', async () => {
    const { svc, workflowService, executor, prisma } = buildSvc();
    workflowService.findScheduledWorkflows.mockResolvedValue([
      {
        id: 'w_1',
        workspaceId: 'ws_1',
        entityType: 'Person',
        cronExpression: '* * * * *',
        trigger: { event: 'SCHEDULED', query: {} },
        conditions: {},
        actions: [],
      },
    ]);
    prisma.person.findMany.mockResolvedValue([
      { id: 'p_1', workspaceId: 'ws_1' },
    ]);

    const result = await svc.tick();
    expect(result.matched).toBe(1);
    expect(executor.execute).toHaveBeenCalled();
  });

  it('returns 0 matched when no workflows exist', async () => {
    const { svc, workflowService } = buildSvc();
    workflowService.findScheduledWorkflows.mockResolvedValue([]);

    const result = await svc.tick();
    expect(result.evaluated).toBe(0);
    expect(result.matched).toBe(0);
  });

  it('uses query conditions to filter entities', async () => {
    const { svc, workflowService, prisma, executor } = buildSvc();
    const now = new Date();
    const cronExpr = `${now.getMinutes()} ${now.getHours()} * * *`;

    workflowService.findScheduledWorkflows.mockResolvedValue([
      {
        id: 'w_1',
        workspaceId: 'ws_1',
        entityType: 'Deal',
        cronExpression: cronExpr,
        trigger: {
          event: 'SCHEDULED',
          query: {
            status: { operator: 'eq', value: 'OPEN' },
          },
        },
        conditions: {},
        actions: [],
      },
    ]);
    prisma.deal.findMany.mockResolvedValue([]);

    await svc.tick();
    const where = prisma.deal.findMany.mock.calls[0][0].where;
    expect(where.workspaceId).toBe('ws_1');
    expect(where.status).toBe('OPEN');
  });

  it('resolves $daysAgo dynamic values', async () => {
    const { svc, workflowService, prisma } = buildSvc();
    const now = new Date();
    const cronExpr = `${now.getMinutes()} ${now.getHours()} * * *`;

    workflowService.findScheduledWorkflows.mockResolvedValue([
      {
        id: 'w_1',
        workspaceId: 'ws_1',
        entityType: 'Deal',
        cronExpression: cronExpr,
        trigger: {
          event: 'SCHEDULED',
          query: {
            updatedAt: { operator: 'lt', value: '$daysAgo:7' },
          },
        },
        conditions: {},
        actions: [],
      },
    ]);
    prisma.deal.findMany.mockResolvedValue([]);

    await svc.tick();
    const where = prisma.deal.findMany.mock.calls[0][0].where;
    expect(where.updatedAt.lt).toBeInstanceOf(Date);
  });

  it('queries Person with archivedAt null', async () => {
    const { svc, workflowService, prisma } = buildSvc();
    workflowService.findScheduledWorkflows.mockResolvedValue([{
      id: 'w_1',
      workspaceId: 'ws_1',
      entityType: 'Person',
      cronExpression: '* * * * *',
      trigger: { event: 'SCHEDULED', query: {} },
    }]);
    prisma.person.findMany.mockResolvedValue([]);
    await svc.tick();
    const where = prisma.person.findMany.mock.calls[0][0].where;
    expect(where.archivedAt).toBeNull();
    expect(where.workspaceId).toBe('ws_1');
  });

  it('returns empty array for unknown entityType', async () => {
    const { svc, workflowService, executor } = buildSvc();
    workflowService.findScheduledWorkflows.mockResolvedValue([{
      id: 'w_1',
      workspaceId: 'ws_1',
      entityType: 'FooBar',
      cronExpression: '* * * * *',
      trigger: { event: 'SCHEDULED', query: {} },
    }]);
    await svc.tick();
    expect(executor.execute).not.toHaveBeenCalled();
  });

  it('continues processing when one workflow fails', async () => {
    const { svc, workflowService, executor, prisma } = buildSvc();
    workflowService.findScheduledWorkflows.mockResolvedValue([
      { id: 'w_fail', workspaceId: 'ws_1', entityType: 'Person', cronExpression: '* * * * *', trigger: { event: 'SCHEDULED', query: {} } },
      { id: 'w_ok', workspaceId: 'ws_1', entityType: 'Deal', cronExpression: '* * * * *', trigger: { event: 'SCHEDULED', query: {} } },
    ]);
    prisma.person.findMany.mockRejectedValue(new Error('DB error'));
    prisma.deal.findMany.mockResolvedValue([{ id: 'd_1' }]);
    await svc.tick();
    expect(workflowService.markRun).toHaveBeenCalledWith('w_ok');
    expect(workflowService.markRun).not.toHaveBeenCalledWith('w_fail');
  });

  it('passes correct WorkflowJob to executor', async () => {
    const { svc, workflowService, executor, prisma } = buildSvc();
    workflowService.findScheduledWorkflows.mockResolvedValue([{
      id: 'w_1',
      workspaceId: 'ws_1',
      entityType: 'Person',
      cronExpression: '* * * * *',
      trigger: { event: 'SCHEDULED', query: {} },
    }]);
    prisma.person.findMany.mockResolvedValue([{ id: 'p_5', fullName: 'Sara' }]);
    await svc.tick();
    expect(executor.execute).toHaveBeenCalledWith({
      workflowId: 'w_1',
      workspaceId: 'ws_1',
      entityType: 'Person',
      entityId: 'p_5',
      record: { id: 'p_5', fullName: 'Sara' },
    });
  });
});
