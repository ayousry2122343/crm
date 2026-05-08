import { WorkflowExecutor, type WorkflowJob } from './workflow.executor';

function makePrisma() {
  return {
    workflow: { findUnique: jest.fn() },
    workflowRun: { create: jest.fn(), update: jest.fn() },
    person: { update: jest.fn() },
    deal: { update: jest.fn() },
    activity: { create: jest.fn() },
  };
}

function makeNotificationService() {
  return { create: jest.fn().mockResolvedValue({ id: 'notif_1' }) };
}

function buildExecutor() {
  const prisma = makePrisma();
  const notificationService = makeNotificationService();
  const executor = new WorkflowExecutor(prisma as any, notificationService as any);
  return { executor, prisma, notificationService };
}

const baseJob: WorkflowJob = {
  workflowId: 'wf_1',
  workspaceId: 'ws_1',
  entityType: 'Person',
  entityId: 'p_1',
  record: { fullName: 'Ahmed', email: 'ahmed@test.com' },
};

describe('WorkflowExecutor.execute', () => {
  it('skips disabled workflow', async () => {
    const { executor, prisma } = buildExecutor();
    prisma.workflow.findUnique.mockResolvedValue({ id: 'wf_1', enabled: false });
    await executor.execute(baseJob);
    expect(prisma.workflowRun.create).not.toHaveBeenCalled();
  });

  it('skips when conditions not met', async () => {
    const { executor, prisma } = buildExecutor();
    prisma.workflow.findUnique.mockResolvedValue({
      id: 'wf_1',
      enabled: true,
      conditions: { op: 'AND', items: [{ field: 'fullName', op: 'eq', value: 'John' }] },
      actions: [],
    });
    prisma.workflowRun.create.mockResolvedValue({ id: 'run_1' });
    prisma.workflowRun.update.mockResolvedValue({});
    await executor.execute(baseJob);
    const updateCall = prisma.workflowRun.update.mock.calls[0][0];
    expect(updateCall.data.status).toBe('SUCCESS');
    expect(updateCall.data.log).toEqual({ skipped: 'conditions not met' });
  });

  it('executes UPDATE_FIELD action on Person', async () => {
    const { executor, prisma } = buildExecutor();
    prisma.workflow.findUnique.mockResolvedValue({
      id: 'wf_1',
      enabled: true,
      conditions: { op: 'AND', items: [] },
      actions: [{ type: 'UPDATE_FIELD', params: { fieldKey: 'source', value: 'WORKFLOW' } }],
    });
    prisma.workflowRun.create.mockResolvedValue({ id: 'run_1' });
    prisma.workflowRun.update.mockResolvedValue({});
    prisma.person.update.mockResolvedValue({});
    await executor.execute(baseJob);
    expect(prisma.person.update).toHaveBeenCalledWith({
      where: { id: 'p_1' },
      data: { source: 'WORKFLOW' },
    });
  });

  it('executes CREATE_TASK action', async () => {
    const { executor, prisma } = buildExecutor();
    prisma.workflow.findUnique.mockResolvedValue({
      id: 'wf_1',
      enabled: true,
      conditions: { op: 'AND', items: [] },
      actions: [{ type: 'CREATE_TASK', params: { subject: 'Follow up', dueDays: 3 } }],
    });
    prisma.workflowRun.create.mockResolvedValue({ id: 'run_1' });
    prisma.workflowRun.update.mockResolvedValue({});
    prisma.activity.create.mockResolvedValue({ id: 'act_1' });
    await executor.execute(baseJob);
    expect(prisma.activity.create).toHaveBeenCalled();
    const data = prisma.activity.create.mock.calls[0][0].data;
    expect(data.type).toBe('TASK');
    expect(data.subject).toBe('Follow up');
  });

  it('executes ASSIGN action', async () => {
    const { executor, prisma } = buildExecutor();
    prisma.workflow.findUnique.mockResolvedValue({
      id: 'wf_1',
      enabled: true,
      conditions: { op: 'AND', items: [] },
      actions: [{ type: 'ASSIGN', params: { ownerId: 'u_5' } }],
    });
    prisma.workflowRun.create.mockResolvedValue({ id: 'run_1' });
    prisma.workflowRun.update.mockResolvedValue({});
    prisma.person.update.mockResolvedValue({});
    await executor.execute(baseJob);
    expect(prisma.person.update).toHaveBeenCalledWith({
      where: { id: 'p_1' },
      data: { ownerId: 'u_5' },
    });
  });

  it('executes NOTIFY_USER action via NotificationService', async () => {
    const { executor, prisma, notificationService } = buildExecutor();
    prisma.workflow.findUnique.mockResolvedValue({
      id: 'wf_1',
      enabled: true,
      conditions: { op: 'AND', items: [] },
      actions: [{ type: 'NOTIFY_USER', params: { userId: 'u_1', title: 'Hello' } }],
    });
    prisma.workflowRun.create.mockResolvedValue({ id: 'run_1' });
    prisma.workflowRun.update.mockResolvedValue({});
    await executor.execute(baseJob);
    expect(notificationService.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u_1', type: 'WORKFLOW', title: 'Hello' }),
    );
  });

  it('marks run as FAILED on error', async () => {
    const { executor, prisma } = buildExecutor();
    prisma.workflow.findUnique.mockResolvedValue({
      id: 'wf_1',
      enabled: true,
      conditions: { op: 'AND', items: [] },
      actions: [{ type: 'UPDATE_FIELD', params: { fieldKey: 'name', value: 'X' } }],
    });
    prisma.workflowRun.create.mockResolvedValue({ id: 'run_1' });
    prisma.workflowRun.update.mockResolvedValue({});
    prisma.person.update.mockRejectedValue(new Error('DB error'));
    await executor.execute(baseJob);
    const failCall = prisma.workflowRun.update.mock.calls.find(
      (c: any) => c[0]?.data?.status === 'FAILED',
    );
    expect(failCall).toBeDefined();
  });

  it('returns unsupported status for unknown action type', async () => {
    const { executor, prisma } = buildExecutor();
    prisma.workflow.findUnique.mockResolvedValue({
      id: 'wf_1',
      enabled: true,
      conditions: { op: 'AND', items: [] },
      actions: [{ type: 'UNKNOWN_ACTION', params: {} }],
    });
    prisma.workflowRun.create.mockResolvedValue({ id: 'run_1' });
    prisma.workflowRun.update.mockResolvedValue({});
    await executor.execute(baseJob);
    const successCall = prisma.workflowRun.update.mock.calls.find(
      (c: any) => c[0]?.data?.status === 'SUCCESS',
    );
    expect(successCall).toBeDefined();
    expect(successCall![0].data.log).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'UNKNOWN_ACTION', result: { type: 'UNKNOWN_ACTION', status: 'unsupported' } })]),
    );
  });

  it('does nothing when workflow not found', async () => {
    const { executor, prisma } = buildExecutor();
    prisma.workflow.findUnique.mockResolvedValue(null);
    await executor.execute(baseJob);
    expect(prisma.workflowRun.create).not.toHaveBeenCalled();
  });

  it('executes UPDATE_FIELD on Deal entity', async () => {
    const { executor, prisma } = buildExecutor();
    prisma.workflow.findUnique.mockResolvedValue({
      id: 'wf_1',
      enabled: true,
      conditions: { op: 'AND', items: [] },
      actions: [{ type: 'UPDATE_FIELD', params: { fieldKey: 'status', value: 'OPEN' } }],
    });
    prisma.workflowRun.create.mockResolvedValue({ id: 'run_1' });
    prisma.workflowRun.update.mockResolvedValue({});
    prisma.deal.update.mockResolvedValue({});
    const dealJob = { ...baseJob, entityType: 'Deal', entityId: 'd_1' };
    await executor.execute(dealJob);
    expect(prisma.deal.update).toHaveBeenCalledWith({
      where: { id: 'd_1' },
      data: { status: 'OPEN' },
    });
  });

  it('ASSIGN action on Deal routes to deal.update', async () => {
    const { executor, prisma } = buildExecutor();
    prisma.workflow.findUnique.mockResolvedValue({
      id: 'wf_1',
      enabled: true,
      conditions: { op: 'AND', items: [] },
      actions: [{ type: 'ASSIGN', params: { ownerId: 'u_2' } }],
    });
    prisma.workflowRun.create.mockResolvedValue({ id: 'run_1' });
    prisma.workflowRun.update.mockResolvedValue({});
    prisma.deal.update.mockResolvedValue({});
    await executor.execute({ ...baseJob, entityType: 'Deal', entityId: 'd_1' });
    expect(prisma.deal.update).toHaveBeenCalledWith({
      where: { id: 'd_1' },
      data: { ownerId: 'u_2' },
    });
  });

  it('UPDATE_FIELD returns error when fieldKey is missing', async () => {
    const { executor, prisma } = buildExecutor();
    prisma.workflow.findUnique.mockResolvedValue({
      id: 'wf_1',
      enabled: true,
      conditions: { op: 'AND', items: [] },
      actions: [{ type: 'UPDATE_FIELD', params: { value: 'X' } }],
    });
    prisma.workflowRun.create.mockResolvedValue({ id: 'run_1' });
    prisma.workflowRun.update.mockResolvedValue({});
    await executor.execute(baseJob);
    const successCall = prisma.workflowRun.update.mock.calls.find(
      (c: any) => c[0]?.data?.status === 'SUCCESS',
    );
    expect(successCall![0].data.log).toEqual(
      expect.arrayContaining([expect.objectContaining({ result: { error: 'missing fieldKey' } })]),
    );
  });

  it('ASSIGN action returns error when ownerId is missing', async () => {
    const { executor, prisma } = buildExecutor();
    prisma.workflow.findUnique.mockResolvedValue({
      id: 'wf_1',
      enabled: true,
      conditions: { op: 'AND', items: [] },
      actions: [{ type: 'ASSIGN', params: {} }],
    });
    prisma.workflowRun.create.mockResolvedValue({ id: 'run_1' });
    prisma.workflowRun.update.mockResolvedValue({});
    await executor.execute(baseJob);
    const successCall = prisma.workflowRun.update.mock.calls.find(
      (c: any) => c[0]?.data?.status === 'SUCCESS',
    );
    expect(successCall![0].data.log).toEqual(
      expect.arrayContaining([expect.objectContaining({ result: { error: 'missing ownerId' } })]),
    );
  });

  it('NOTIFY_USER returns error when userId is missing', async () => {
    const { executor, prisma } = buildExecutor();
    prisma.workflow.findUnique.mockResolvedValue({
      id: 'wf_1',
      enabled: true,
      conditions: { op: 'AND', items: [] },
      actions: [{ type: 'NOTIFY_USER', params: {} }],
    });
    prisma.workflowRun.create.mockResolvedValue({ id: 'run_1' });
    prisma.workflowRun.update.mockResolvedValue({});
    await executor.execute(baseJob);
    const successCall = prisma.workflowRun.update.mock.calls.find(
      (c: any) => c[0]?.data?.status === 'SUCCESS',
    );
    expect(successCall![0].data.log).toEqual(
      expect.arrayContaining([expect.objectContaining({ result: { error: 'missing userId' } })]),
    );
  });

  it('executes multiple actions sequentially and logs all', async () => {
    const { executor, prisma, notificationService } = buildExecutor();
    prisma.workflow.findUnique.mockResolvedValue({
      id: 'wf_1',
      enabled: true,
      conditions: { op: 'AND', items: [] },
      actions: [
        { type: 'UPDATE_FIELD', params: { fieldKey: 'source', value: 'CAMPAIGN' } },
        { type: 'NOTIFY_USER', params: { userId: 'u_2', title: 'New lead' } },
      ],
    });
    prisma.workflowRun.create.mockResolvedValue({ id: 'run_1' });
    prisma.workflowRun.update.mockResolvedValue({});
    prisma.person.update.mockResolvedValue({});
    await executor.execute(baseJob);
    expect(prisma.person.update).toHaveBeenCalled();
    expect(notificationService.create).toHaveBeenCalled();
    const successCall = prisma.workflowRun.update.mock.calls.find(
      (c: any) => c[0]?.data?.status === 'SUCCESS',
    );
    expect(successCall![0].data.log).toHaveLength(2);
  });
});
