import { NotFoundException } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    workflow: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    workflowRun: { findMany: jest.fn() },
  };
}

function makeAudit() {
  return {
    log: jest.fn().mockResolvedValue(undefined),
    logUpdate: jest.fn().mockResolvedValue(undefined),
  };
}

function buildSvc() {
  const prisma = makePrisma();
  const tenant = new TenantContextService();
  const audit = makeAudit();
  const svc = new WorkflowService(prisma as any, tenant, audit as any);
  return { svc, tenant, prisma, audit };
}

const ctx = (workspaceId = 'ws_1') => ({
  workspaceId,
  userId: 'u_1',
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

describe('WorkflowService.create', () => {
  it('creates workflow with workspaceId', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.workflow.create.mockResolvedValue({ id: 'wf_1', name: 'On Deal Won' });
    await tenant.run(ctx(), async () => {
      await svc.create({
        name: 'On Deal Won',
        entityType: 'Deal',
        trigger: { event: 'deal.won' },
        conditions: { op: 'AND', items: [] },
        actions: [],
      });
    });
    const data = prisma.workflow.create.mock.calls[0][0].data;
    expect(data.workspaceId).toBe('ws_1');
    expect(data.name).toBe('On Deal Won');
  });
});

describe('WorkflowService.get', () => {
  it('throws NotFoundException for wrong workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.workflow.findUnique.mockResolvedValue({ id: 'wf_1', workspaceId: 'ws_other' });
    await tenant.run(ctx(), async () => {
      await expect(svc.get('wf_1')).rejects.toThrow(NotFoundException);
    });
  });
});

describe('WorkflowService.findMatchingWorkflows', () => {
  it('returns workflows matching entityType and event', async () => {
    const { svc, prisma } = buildSvc();
    prisma.workflow.findMany.mockResolvedValue([
      { id: 'wf_1', trigger: { event: 'deal.won' } },
      { id: 'wf_2', trigger: { event: 'deal.created' } },
    ]);
    const result = await svc.findMatchingWorkflows('Deal', 'deal.won', 'ws_1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('wf_1');
  });
});

describe('WorkflowService.create with cronExpression', () => {
  it('passes cronExpression to create data', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.workflow.create.mockResolvedValue({ id: 'wf_c', name: 'Daily cleanup' });
    await tenant.run(ctx(), async () => {
      await svc.create({
        name: 'Daily cleanup',
        entityType: 'Deal',
        trigger: { event: 'CRON' },
        conditions: { op: 'AND', items: [] },
        actions: [],
        cronExpression: '0 9 * * *',
      });
    });
    const data = prisma.workflow.create.mock.calls[0][0].data;
    expect(data.cronExpression).toBe('0 9 * * *');
  });
});

describe('WorkflowService.findScheduledWorkflows', () => {
  it('returns enabled workflows with cronExpression', async () => {
    const { svc, prisma } = buildSvc();
    prisma.workflow.findMany.mockResolvedValue([
      { id: 'wf_1', enabled: true, cronExpression: '0 * * * *' },
    ]);
    const result = await svc.findScheduledWorkflows();
    expect(prisma.workflow.findMany).toHaveBeenCalledWith({
      where: { enabled: true, cronExpression: { not: null } },
    });
    expect(result).toHaveLength(1);
  });
});

describe('WorkflowService.markRun', () => {
  it('updates lastRunAt to current time', async () => {
    const { svc, prisma } = buildSvc();
    prisma.workflow.update.mockResolvedValue({ id: 'wf_1', lastRunAt: new Date() });
    const before = Date.now();
    await svc.markRun('wf_1');
    const call = prisma.workflow.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'wf_1' });
    expect(call.data.lastRunAt).toBeInstanceOf(Date);
    expect(call.data.lastRunAt.getTime()).toBeGreaterThanOrEqual(before);
  });
});

describe('WorkflowService.update with cronExpression', () => {
  it('passes cronExpression when updating', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.workflow.findUnique.mockResolvedValue({ id: 'wf_1', workspaceId: 'ws_1' });
    prisma.workflow.update.mockResolvedValue({ id: 'wf_1', cronExpression: '*/30 * * * *' });
    await tenant.run(ctx(), async () => {
      await svc.update('wf_1', { cronExpression: '*/30 * * * *' });
    });
    const data = prisma.workflow.update.mock.calls[0][0].data;
    expect(data.cronExpression).toBe('*/30 * * * *');
  });
});

describe('WorkflowService.delete', () => {
  it('deletes workflow and logs audit', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.workflow.findUnique.mockResolvedValue({ id: 'wf_1', workspaceId: 'ws_1' });
    prisma.workflow.delete.mockResolvedValue({});
    await tenant.run(ctx(), async () => {
      await svc.delete('wf_1');
    });
    expect(prisma.workflow.delete).toHaveBeenCalledWith({ where: { id: 'wf_1' } });
    expect(audit.log).toHaveBeenCalled();
  });
});
