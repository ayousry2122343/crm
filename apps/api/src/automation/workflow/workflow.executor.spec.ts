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

function buildExecutor() {
  const prisma = makePrisma();
  const executor = new WorkflowExecutor(prisma as any);
  return { executor, prisma };
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
});
