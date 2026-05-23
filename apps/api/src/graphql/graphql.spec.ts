import { PersonResolver } from './resolvers/person.resolver';
import { DealResolver } from './resolvers/deal.resolver';
import { TicketResolver } from './resolvers/ticket.resolver';
import { ActivityResolver } from './resolvers/activity.resolver';
import { DashboardResolver } from './resolvers/dashboard.resolver';
import { TenantContextService } from '../core/tenant/tenant-context.service';

function makePersonService() {
  return {
    list: jest.fn().mockResolvedValue({ items: [{ id: 'p_1', fullName: 'Ahmed', email: 'a@t.com', createdAt: new Date() }] }),
    get: jest.fn().mockResolvedValue({ id: 'p_1', fullName: 'Ahmed', email: 'a@t.com', createdAt: new Date() }),
    create: jest.fn().mockResolvedValue({ id: 'p_2', fullName: 'Sara Ali', createdAt: new Date() }),
    update: jest.fn().mockResolvedValue({ id: 'p_1', fullName: 'Ahmed Y', createdAt: new Date() }),
  };
}

function makeDealService() {
  return {
    list: jest.fn().mockResolvedValue({ items: [{ id: 'd_1', name: 'Big Deal', amount: 50000, status: 'OPEN', createdAt: new Date() }] }),
    get: jest.fn().mockResolvedValue({ id: 'd_1', name: 'Big Deal', amount: 50000, status: 'OPEN', createdAt: new Date() }),
    create: jest.fn().mockResolvedValue({ id: 'd_2', name: 'New Deal', status: 'OPEN', createdAt: new Date() }),
    update: jest.fn().mockResolvedValue({ id: 'd_1', name: 'Updated', status: 'OPEN', createdAt: new Date() }),
  };
}

function makeTicketService() {
  return {
    list: jest.fn().mockResolvedValue({ items: [{ id: 't_1', ticketNumber: 1, subject: 'Bug', status: 'NEW', priority: 'HIGH', channel: 'EMAIL', createdAt: new Date() }] }),
    get: jest.fn().mockResolvedValue({ id: 't_1', ticketNumber: 1, subject: 'Bug', status: 'NEW', priority: 'HIGH', channel: 'EMAIL', createdAt: new Date() }),
    create: jest.fn().mockResolvedValue({ id: 't_2', ticketNumber: 2, subject: 'Feature', status: 'NEW', priority: 'LOW', channel: 'WEB', createdAt: new Date() }),
    changeStatus: jest.fn().mockResolvedValue({ id: 't_1', ticketNumber: 1, subject: 'Bug', status: 'OPEN', priority: 'HIGH', channel: 'EMAIL', createdAt: new Date() }),
  };
}

function makeActivityService() {
  return {
    list: jest.fn().mockResolvedValue({ items: [{ id: 'a_1', type: 'CALL', subject: 'Follow up', completed: false, createdAt: new Date() }] }),
    create: jest.fn().mockResolvedValue({ id: 'a_2', type: 'TASK', subject: 'New task', completed: false, createdAt: new Date() }),
    complete: jest.fn().mockResolvedValue({ id: 'a_1', type: 'CALL', subject: 'Follow up', completed: true, createdAt: new Date() }),
  };
}

function makePrisma() {
  return {
    person: { count: jest.fn().mockResolvedValue(100) },
    deal: { count: jest.fn().mockResolvedValue(50), findMany: jest.fn().mockResolvedValue([{ amount: 20000 }]) },
    ticket: { count: jest.fn().mockResolvedValueOnce(30).mockResolvedValueOnce(10) },
  };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

/* ──────────────────────── PersonResolver ──────────────────────── */

describe('PersonResolver', () => {
  it('people query returns list', async () => {
    const svc = makePersonService();
    const resolver = new PersonResolver(svc as any);
    const result = await resolver.people(10, 0, 'Ahmed');
    expect(result).toHaveLength(1);
    expect(result[0].fullName).toBe('Ahmed');
  });

  it('person query returns single', async () => {
    const svc = makePersonService();
    const resolver = new PersonResolver(svc as any);
    const result = await resolver.person('p_1');
    expect(result.id).toBe('p_1');
  });

  it('createPerson mutation works', async () => {
    const svc = makePersonService();
    const resolver = new PersonResolver(svc as any);
    const result = await resolver.createPerson({ firstName: 'Sara', lastName: 'Ali' } as any);
    expect(result.fullName).toBe('Sara Ali');
  });
});

/* ──────────────────────── DealResolver ──────────────────────── */

describe('DealResolver', () => {
  it('deals query returns list', async () => {
    const svc = makeDealService();
    const resolver = new DealResolver(svc as any);
    const result = await resolver.deals(10, 0, 'OPEN', undefined);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Big Deal');
  });
});

/* ──────────────────────── TicketResolver ──────────────────────── */

describe('TicketResolver', () => {
  it('tickets query returns list', async () => {
    const svc = makeTicketService();
    const resolver = new TicketResolver(svc as any);
    const result = await resolver.tickets(10, 0, 'NEW', undefined);
    expect(result).toHaveLength(1);
    expect(result[0].subject).toBe('Bug');
  });
});

/* ──────────────────────── DashboardResolver ──────────────────────── */

describe('DashboardResolver', () => {
  it('dashboardStats query returns counts', async () => {
    const prisma = makePrisma();
    const tenant = new TenantContextService();
    const resolver = new DashboardResolver(prisma as any, tenant);

    const result = await tenant.run(ctx(), async () => {
      return resolver.dashboardStats();
    });

    expect(result.totalPeople).toBe(100);
    expect(result.totalDeals).toBe(50);
    expect(result.totalTickets).toBe(30);
    expect(result.openTickets).toBe(10);
    expect(result.dealsWonThisMonth).toBe(1);
    expect(result.revenue).toBe(20000);
  });
});

/* ──────────────────────── ActivityResolver ──────────────────────── */

describe('ActivityResolver', () => {
  it('activities query returns list', async () => {
    const svc = makeActivityService();
    const resolver = new ActivityResolver(svc as any);
    const result = await resolver.activities(10, 0, 'CALL', undefined);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('CALL');
  });
});
