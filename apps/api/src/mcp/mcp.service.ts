import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../core/tenant/tenant-context.service';

export interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface MCPExecuteResult {
  result?: any;
  error?: string;
}

const TOOLS: MCPTool[] = [
  {
    name: 'search_people',
    description: 'Search contacts by name or email',
    parameters: { query: { type: 'string', required: true }, limit: { type: 'number', required: false } },
  },
  {
    name: 'get_person',
    description: 'Get contact details by ID',
    parameters: { id: { type: 'string', required: true } },
  },
  {
    name: 'create_person',
    description: 'Create a new contact',
    parameters: { fullName: { type: 'string', required: true }, email: { type: 'string', required: false }, phone: { type: 'string', required: false }, companyName: { type: 'string', required: false } },
  },
  {
    name: 'search_deals',
    description: 'Search deals',
    parameters: { query: { type: 'string', required: false }, status: { type: 'string', required: false }, limit: { type: 'number', required: false } },
  },
  {
    name: 'get_deal',
    description: 'Get deal details by ID',
    parameters: { id: { type: 'string', required: true } },
  },
  {
    name: 'create_deal',
    description: 'Create a new deal',
    parameters: { name: { type: 'string', required: true }, amount: { type: 'number', required: false }, pipelineId: { type: 'string', required: false }, stageId: { type: 'string', required: false } },
  },
  {
    name: 'list_tickets',
    description: 'List support tickets',
    parameters: { status: { type: 'string', required: false }, limit: { type: 'number', required: false } },
  },
  {
    name: 'get_ticket',
    description: 'Get ticket details by ID',
    parameters: { id: { type: 'string', required: true } },
  },
  {
    name: 'create_ticket',
    description: 'Create a support ticket',
    parameters: { subject: { type: 'string', required: true }, description: { type: 'string', required: false }, priority: { type: 'string', required: false }, channel: { type: 'string', required: false } },
  },
  {
    name: 'update_ticket_status',
    description: 'Update ticket status',
    parameters: { id: { type: 'string', required: true }, status: { type: 'string', required: true } },
  },
  {
    name: 'get_dashboard_stats',
    description: 'Get CRM dashboard overview statistics',
    parameters: {},
  },
  {
    name: 'search_kb',
    description: 'Search knowledge base articles',
    parameters: { query: { type: 'string', required: true } },
  },
];

@Injectable()
export class MCPService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
  ) {}

  listTools(): MCPTool[] {
    return TOOLS;
  }

  async executeTool(toolName: string, params: Record<string, any>, workspaceId: string): Promise<MCPExecuteResult> {
    try {
      switch (toolName) {
        case 'search_people':
          return { result: await this.searchPeople(workspaceId, params.query, params.limit) };
        case 'get_person':
          return { result: await this.getPerson(workspaceId, params.id) };
        case 'create_person':
          return { result: await this.createPerson(workspaceId, params) };
        case 'search_deals':
          return { result: await this.searchDeals(workspaceId, params.query, params.status, params.limit) };
        case 'get_deal':
          return { result: await this.getDeal(workspaceId, params.id) };
        case 'create_deal':
          return { result: await this.createDeal(workspaceId, params) };
        case 'list_tickets':
          return { result: await this.listTickets(workspaceId, params.status, params.limit) };
        case 'get_ticket':
          return { result: await this.getTicket(workspaceId, params.id) };
        case 'create_ticket':
          return { result: await this.createTicket(workspaceId, params) };
        case 'update_ticket_status':
          return { result: await this.updateTicketStatus(workspaceId, params.id, params.status) };
        case 'get_dashboard_stats':
          return { result: await this.getDashboardStats(workspaceId) };
        case 'search_kb':
          return { result: await this.searchKB(workspaceId, params.query) };
        default:
          return { error: `Unknown tool: ${toolName}` };
      }
    } catch (err: any) {
      return { error: err.message ?? 'execution failed' };
    }
  }

  private async searchPeople(workspaceId: string, query: string, limit?: number) {
    return this.prisma.person.findMany({
      where: {
        workspaceId,
        archivedAt: null,
        OR: [
          { fullName: { contains: query, mode: 'insensitive' } },
          { emailNormalized: { contains: query.toLowerCase() } },
        ],
      },
      take: limit ?? 10,
      select: { id: true, fullName: true, email: true, phone: true, companyName: true, score: true },
    });
  }

  private async getPerson(workspaceId: string, id: string) {
    return this.prisma.person.findFirst({
      where: { id, workspaceId },
      select: { id: true, fullName: true, email: true, phone: true, companyName: true, score: true, lifecycleStage: true, createdAt: true },
    });
  }

  private async createPerson(workspaceId: string, params: any) {
    const names = params.fullName.split(' ');
    const firstName = names[0] || '';
    const lastName = names.slice(1).join(' ') || '';
    return this.prisma.person.create({
      data: {
        workspaceId,
        firstName,
        lastName,
        fullName: params.fullName,
        email: params.email ?? null,
        emailNormalized: params.email?.toLowerCase() ?? '',
        phone: params.phone ?? null,
        phoneNormalized: params.phone?.replace(/[\s\-().]/g, '') ?? '',
        companyName: params.companyName ?? null,
      },
      select: { id: true, fullName: true, email: true, phone: true },
    });
  }

  private async searchDeals(workspaceId: string, query?: string, status?: string, limit?: number) {
    const where: any = { workspaceId, archivedAt: null };
    if (query) where.name = { contains: query, mode: 'insensitive' };
    if (status) where.status = status;
    return this.prisma.deal.findMany({
      where,
      take: limit ?? 10,
      select: { id: true, name: true, amount: true, status: true, createdAt: true },
    });
  }

  private async getDeal(workspaceId: string, id: string) {
    return this.prisma.deal.findFirst({
      where: { id, workspaceId },
      select: { id: true, name: true, amount: true, status: true, stageId: true, pipelineId: true, createdAt: true },
    });
  }

  private async createDeal(workspaceId: string, params: any) {
    return this.prisma.deal.create({
      data: {
        workspaceId,
        name: params.name,
        amount: params.amount ?? null,
        pipelineId: params.pipelineId ?? null,
        stageId: params.stageId ?? null,
      },
      select: { id: true, name: true, amount: true, status: true },
    });
  }

  private async listTickets(workspaceId: string, status?: string, limit?: number) {
    const where: any = { workspaceId, archivedAt: null };
    if (status) where.status = status;
    return this.prisma.ticket.findMany({
      where,
      take: limit ?? 10,
      orderBy: { createdAt: 'desc' },
      select: { id: true, ticketNumber: true, subject: true, status: true, priority: true, createdAt: true },
    });
  }

  private async getTicket(workspaceId: string, id: string) {
    return this.prisma.ticket.findFirst({
      where: { id, workspaceId },
      select: { id: true, ticketNumber: true, subject: true, description: true, status: true, priority: true, channel: true, assigneeId: true, createdAt: true },
    });
  }

  private async createTicket(workspaceId: string, params: any) {
    const last = await this.prisma.ticket.findFirst({
      where: { workspaceId },
      orderBy: { ticketNumber: 'desc' },
      select: { ticketNumber: true },
    });
    const ticketNumber = (last?.ticketNumber ?? 0) + 1;

    return this.prisma.ticket.create({
      data: {
        workspaceId,
        ticketNumber,
        subject: params.subject,
        description: params.description ?? null,
        priority: params.priority ?? 'MEDIUM',
        channel: params.channel ?? 'API',
        createdById: 'mcp-agent',
      },
      select: { id: true, ticketNumber: true, subject: true, status: true, priority: true },
    });
  }

  private async updateTicketStatus(workspaceId: string, id: string, status: string) {
    const ticket = await this.prisma.ticket.findFirst({ where: { id, workspaceId } });
    if (!ticket) throw new BadRequestException('ticket not found');
    return this.prisma.ticket.update({
      where: { id },
      data: { status: status as any },
      select: { id: true, ticketNumber: true, subject: true, status: true },
    });
  }

  private async getDashboardStats(workspaceId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalPeople, totalDeals, totalTickets, openTickets, wonDeals] = await Promise.all([
      this.prisma.person.count({ where: { workspaceId, archivedAt: null } }),
      this.prisma.deal.count({ where: { workspaceId, archivedAt: null } }),
      this.prisma.ticket.count({ where: { workspaceId, archivedAt: null } }),
      this.prisma.ticket.count({ where: { workspaceId, archivedAt: null, status: { in: ['NEW', 'OPEN', 'PENDING'] } } }),
      this.prisma.deal.findMany({
        where: { workspaceId, status: 'WON', updatedAt: { gte: startOfMonth } },
        select: { amount: true },
      }),
    ]);

    const revenue = wonDeals.reduce((sum: number, d: any) => sum + (d.amount?.toNumber?.() ?? d.amount ?? 0), 0);
    return { totalPeople, totalDeals, totalTickets, openTickets, dealsWonThisMonth: wonDeals.length, revenue };
  }

  private async searchKB(workspaceId: string, query: string) {
    return this.prisma.kBArticle.findMany({
      where: {
        workspaceId,
        status: 'PUBLISHED',
        archivedAt: null,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 5,
      select: { id: true, title: true, slug: true, categoryId: true },
    });
  }
}
