import { MCPService } from './mcp.service';
import { TenantContextService } from '../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    person: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    deal: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    ticket: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    kBArticle: {
      findMany: jest.fn(),
    },
  };
}

function buildSvc() {
  const prisma = makePrisma();
  const tenant = new TenantContextService();
  const svc = new MCPService(prisma as any, tenant);
  return { svc, prisma };
}

/* ──────────────────────── listTools ──────────────────────── */

describe('MCPService.listTools', () => {
  it('returns all 12 tool definitions', () => {
    const { svc } = buildSvc();
    const tools = svc.listTools();
    expect(tools).toHaveLength(12);
    expect(tools[0].name).toBe('search_people');
    expect(tools[11].name).toBe('search_kb');
  });

  it('each tool has name, description, and parameters', () => {
    const { svc } = buildSvc();
    const tools = svc.listTools();
    tools.forEach((tool) => {
      expect(tool.name).toBeDefined();
      expect(tool.description).toBeDefined();
      expect(tool.parameters).toBeDefined();
    });
  });
});

/* ──────────────────────── executeTool: search_people ──────────────────────── */

describe('MCPService.executeTool — search_people', () => {
  it('returns matching people', async () => {
    const { svc, prisma } = buildSvc();
    prisma.person.findMany.mockResolvedValue([
      { id: 'p_1', fullName: 'Ahmed Yousry', email: 'ahmed@test.com' },
    ]);

    const result = await svc.executeTool('search_people', { query: 'Ahmed' }, 'ws_1');
    expect(result.result).toHaveLength(1);
    expect(result.result[0].fullName).toBe('Ahmed Yousry');
    expect(result.error).toBeUndefined();
  });
});

/* ──────────────────────── executeTool: create_person ──────────────────────── */

describe('MCPService.executeTool — create_person', () => {
  it('creates contact and returns it', async () => {
    const { svc, prisma } = buildSvc();
    prisma.person.create.mockResolvedValue({ id: 'p_2', fullName: 'Sara Ali', email: 'sara@test.com' });

    const result = await svc.executeTool('create_person', { fullName: 'Sara Ali', email: 'sara@test.com' }, 'ws_1');
    expect(result.result.fullName).toBe('Sara Ali');
    expect(prisma.person.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ workspaceId: 'ws_1', fullName: 'Sara Ali' }),
      }),
    );
  });
});

/* ──────────────────────── executeTool: search_deals ──────────────────────── */

describe('MCPService.executeTool — search_deals', () => {
  it('returns deals filtered by status', async () => {
    const { svc, prisma } = buildSvc();
    prisma.deal.findMany.mockResolvedValue([
      { id: 'd_1', name: 'Enterprise Deal', amount: 50000, status: 'WON' },
    ]);

    const result = await svc.executeTool('search_deals', { status: 'WON' }, 'ws_1');
    expect(result.result).toHaveLength(1);
    expect(result.result[0].status).toBe('WON');
  });
});

/* ──────────────────────── executeTool: create_ticket ──────────────────────── */

describe('MCPService.executeTool — create_ticket', () => {
  it('creates ticket with auto-number', async () => {
    const { svc, prisma } = buildSvc();
    prisma.ticket.findFirst.mockResolvedValue({ ticketNumber: 5 });
    prisma.ticket.create.mockResolvedValue({
      id: 't_1',
      ticketNumber: 6,
      subject: 'Login issue',
      status: 'NEW',
      priority: 'MEDIUM',
    });

    const result = await svc.executeTool('create_ticket', { subject: 'Login issue' }, 'ws_1');
    expect(result.result.ticketNumber).toBe(6);
    expect(result.result.subject).toBe('Login issue');
  });
});

/* ──────────────────────── executeTool: update_ticket_status ──────────────────────── */

describe('MCPService.executeTool — update_ticket_status', () => {
  it('updates ticket status', async () => {
    const { svc, prisma } = buildSvc();
    prisma.ticket.findFirst.mockResolvedValue({ id: 't_1', workspaceId: 'ws_1', status: 'NEW' });
    prisma.ticket.update.mockResolvedValue({ id: 't_1', ticketNumber: 1, subject: 'Bug', status: 'OPEN' });

    const result = await svc.executeTool('update_ticket_status', { id: 't_1', status: 'OPEN' }, 'ws_1');
    expect(result.result.status).toBe('OPEN');
  });
});

/* ──────────────────────── executeTool: get_dashboard_stats ──────────────────────── */

describe('MCPService.executeTool — get_dashboard_stats', () => {
  it('returns aggregate stats', async () => {
    const { svc, prisma } = buildSvc();
    prisma.person.count.mockResolvedValue(100);
    prisma.deal.count.mockResolvedValue(50);
    prisma.ticket.count.mockResolvedValueOnce(30).mockResolvedValueOnce(12);
    prisma.deal.findMany.mockResolvedValue([{ amount: 10000 }, { amount: 25000 }]);

    const result = await svc.executeTool('get_dashboard_stats', {}, 'ws_1');
    expect(result.result.totalPeople).toBe(100);
    expect(result.result.totalDeals).toBe(50);
    expect(result.result.totalTickets).toBe(30);
    expect(result.result.openTickets).toBe(12);
    expect(result.result.dealsWonThisMonth).toBe(2);
    expect(result.result.revenue).toBe(35000);
  });
});

/* ──────────────────────── executeTool: unknown tool ──────────────────────── */

describe('MCPService.executeTool — unknown tool', () => {
  it('returns error for unknown tool', async () => {
    const { svc } = buildSvc();
    const result = await svc.executeTool('non_existent', {}, 'ws_1');
    expect(result.error).toBe('Unknown tool: non_existent');
    expect(result.result).toBeUndefined();
  });
});

/* ──────────────────────── executeTool: search_kb ──────────────────────── */

describe('MCPService.executeTool — search_kb', () => {
  it('returns published articles matching query', async () => {
    const { svc, prisma } = buildSvc();
    prisma.kBArticle.findMany.mockResolvedValue([
      { id: 'kb_1', title: 'How to reset password', slug: 'reset-password', categoryId: 'cat_1' },
    ]);

    const result = await svc.executeTool('search_kb', { query: 'password' }, 'ws_1');
    expect(result.result).toHaveLength(1);
    expect(result.result[0].title).toContain('password');
  });
});

/* ──────────────────────── executeTool: get_person ──────────────────────── */

describe('MCPService.executeTool — get_person', () => {
  it('returns person details', async () => {
    const { svc, prisma } = buildSvc();
    prisma.person.findFirst.mockResolvedValue({
      id: 'p_1',
      fullName: 'Ahmed',
      email: 'a@t.com',
      lifecycleStage: 'CUSTOMER',
    });

    const result = await svc.executeTool('get_person', { id: 'p_1' }, 'ws_1');
    expect(result.result.fullName).toBe('Ahmed');
    expect(result.result.lifecycleStage).toBe('CUSTOMER');
  });
});

/* ──────────────────────── executeTool: get_deal ──────────────────────── */

describe('MCPService.executeTool — get_deal', () => {
  it('returns deal details', async () => {
    const { svc, prisma } = buildSvc();
    prisma.deal.findFirst.mockResolvedValue({
      id: 'd_1',
      name: 'Big Deal',
      amount: 100000,
      status: 'OPEN',
    });

    const result = await svc.executeTool('get_deal', { id: 'd_1' }, 'ws_1');
    expect(result.result.name).toBe('Big Deal');
    expect(result.result.amount).toBe(100000);
  });
});

/* ──────────────────────── executeTool: get_ticket ──────────────────────── */

describe('MCPService.executeTool — get_ticket', () => {
  it('returns ticket details', async () => {
    const { svc, prisma } = buildSvc();
    prisma.ticket.findFirst.mockResolvedValue({
      id: 't_1',
      ticketNumber: 1,
      subject: 'Bug report',
      status: 'NEW',
      priority: 'HIGH',
    });

    const result = await svc.executeTool('get_ticket', { id: 't_1' }, 'ws_1');
    expect(result.result.subject).toBe('Bug report');
    expect(result.result.priority).toBe('HIGH');
  });
});
