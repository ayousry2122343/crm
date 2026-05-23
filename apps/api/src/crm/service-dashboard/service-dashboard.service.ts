import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

@Injectable()
export class ServiceDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
  ) {}

  private requireWs(): string {
    const ws = this.tenant.getStore()?.workspaceId;
    if (!ws) throw new BadRequestException('no tenant context');
    return ws;
  }

  async overview() {
    const workspaceId = this.requireWs();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [openTickets, pendingTickets, resolvedToday] = await Promise.all([
      this.prisma.ticket.count({
        where: { workspaceId, status: { in: ['NEW', 'OPEN'] }, archivedAt: null },
      }),
      this.prisma.ticket.count({
        where: { workspaceId, status: 'PENDING', archivedAt: null },
      }),
      this.prisma.ticket.count({
        where: { workspaceId, resolvedAt: { gte: todayStart } },
      }),
    ]);

    const resolvedTickets = await this.prisma.ticket.findMany({
      where: { workspaceId, resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true, firstResponseAt: true },
    });

    let avgResolutionHours = 0;
    let avgFirstResponseHours = 0;
    if (resolvedTickets.length > 0) {
      let totalResolution = 0;
      let firstResponseCount = 0;
      let totalFirstResponse = 0;
      for (const t of resolvedTickets) {
        totalResolution += (t.resolvedAt!.getTime() - t.createdAt.getTime()) / 3600000;
        if (t.firstResponseAt) {
          totalFirstResponse += (t.firstResponseAt.getTime() - t.createdAt.getTime()) / 3600000;
          firstResponseCount++;
        }
      }
      avgResolutionHours = Math.round((totalResolution / resolvedTickets.length) * 10) / 10;
      avgFirstResponseHours = firstResponseCount > 0
        ? Math.round((totalFirstResponse / firstResponseCount) * 10) / 10
        : 0;
    }

    const allTicketsWithSla = await this.prisma.ticket.findMany({
      where: { workspaceId, slaPolicyId: { not: null } },
      select: { slaResolutionBreached: true },
    });
    const slaComplianceRate = allTicketsWithSla.length > 0
      ? Math.round(
          (allTicketsWithSla.filter((t) => !t.slaResolutionBreached).length /
            allTicketsWithSla.length) *
            1000,
        ) / 10
      : 100;

    const ratings = await this.prisma.satisfactionRating.findMany({
      where: { workspaceId, respondedAt: { not: null }, rating: { gt: 0 } },
      select: { rating: true },
    });
    const csatAverage = ratings.length > 0
      ? Math.round((ratings.reduce((s, r) => s + r.rating, 0) / ratings.length) * 10) / 10
      : 0;

    return {
      openTickets,
      pendingTickets,
      resolvedToday,
      avgResolutionHours,
      avgFirstResponseHours,
      slaComplianceRate,
      csatAverage,
    };
  }

  async ticketsByChannel() {
    const workspaceId = this.requireWs();
    const groups = await this.prisma.ticket.groupBy({
      by: ['channel'],
      where: { workspaceId, archivedAt: null },
      _count: { id: true },
    });
    return groups.map((g) => ({ channel: g.channel, count: g._count.id }));
  }

  async ticketsByPriority() {
    const workspaceId = this.requireWs();
    const groups = await this.prisma.ticket.groupBy({
      by: ['priority'],
      where: { workspaceId, archivedAt: null },
      _count: { id: true },
    });
    return groups.map((g) => ({ priority: g.priority, count: g._count.id }));
  }

  async ticketsByStatus() {
    const workspaceId = this.requireWs();
    const groups = await this.prisma.ticket.groupBy({
      by: ['status'],
      where: { workspaceId, archivedAt: null },
      _count: { id: true },
    });
    return groups.map((g) => ({ status: g.status, count: g._count.id }));
  }

  async volumeOverTime(period: string) {
    const workspaceId = this.requireWs();
    const days = period === '90d' ? 90 : period === '30d' ? 30 : 7;
    const now = new Date();
    const since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1);

    const tickets = await this.prisma.ticket.findMany({
      where: { workspaceId, createdAt: { gte: since } },
      select: { createdAt: true, resolvedAt: true },
    });

    const map = new Map<string, { created: number; resolved: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(since.getFullYear(), since.getMonth(), since.getDate() + i);
      map.set(this.toDateStr(d), { created: 0, resolved: 0 });
    }

    for (const t of tickets) {
      const createdDate = this.toDateStr(t.createdAt);
      const entry = map.get(createdDate);
      if (entry) entry.created++;
      if (t.resolvedAt) {
        const resolvedDate = this.toDateStr(t.resolvedAt);
        const rEntry = map.get(resolvedDate);
        if (rEntry) rEntry.resolved++;
      }
    }

    return Array.from(map.entries()).map(([date, data]) => ({
      date,
      created: data.created,
      resolved: data.resolved,
    }));
  }

  private toDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  async agentPerformance() {
    const workspaceId = this.requireWs();
    const tickets = await this.prisma.ticket.findMany({
      where: { workspaceId, assigneeId: { not: null } },
      select: {
        assigneeId: true,
        assignee: { select: { id: true, fullName: true } },
        status: true,
        createdAt: true,
        resolvedAt: true,
        firstResponseAt: true,
        slaResolutionBreached: true,
        slaPolicyId: true,
      },
    });

    const agentMap = new Map<
      string,
      {
        agentName: string;
        ticketsHandled: number;
        totalResolutionHours: number;
        resolvedCount: number;
        totalFirstResponseHours: number;
        firstResponseCount: number;
        slaTotal: number;
        slaCompliant: number;
        openTickets: number;
        csatRatings: number[];
      }
    >();

    for (const t of tickets) {
      const id = t.assigneeId!;
      if (!agentMap.has(id)) {
        agentMap.set(id, {
          agentName: t.assignee?.fullName ?? 'Unknown',
          ticketsHandled: 0,
          totalResolutionHours: 0,
          resolvedCount: 0,
          totalFirstResponseHours: 0,
          firstResponseCount: 0,
          slaTotal: 0,
          slaCompliant: 0,
          openTickets: 0,
          csatRatings: [],
        });
      }
      const ag = agentMap.get(id)!;
      ag.ticketsHandled++;
      if (t.resolvedAt) {
        ag.totalResolutionHours += (t.resolvedAt.getTime() - t.createdAt.getTime()) / 3600000;
        ag.resolvedCount++;
      }
      if (t.firstResponseAt) {
        ag.totalFirstResponseHours +=
          (t.firstResponseAt.getTime() - t.createdAt.getTime()) / 3600000;
        ag.firstResponseCount++;
      }
      if (t.slaPolicyId) {
        ag.slaTotal++;
        if (!t.slaResolutionBreached) ag.slaCompliant++;
      }
      if (['NEW', 'OPEN', 'PENDING', 'ON_HOLD'].includes(t.status)) {
        ag.openTickets++;
      }
    }

    const agentIds = Array.from(agentMap.keys());
    const ratings = await this.prisma.satisfactionRating.findMany({
      where: {
        workspaceId,
        respondedAt: { not: null },
        rating: { gt: 0 },
        ticket: { assigneeId: { in: agentIds } },
      },
      select: { rating: true, ticket: { select: { assigneeId: true } } },
    });

    for (const r of ratings) {
      const ag = agentMap.get(r.ticket.assigneeId!);
      if (ag) ag.csatRatings.push(r.rating);
    }

    return Array.from(agentMap.entries()).map(([agentId, ag]) => ({
      agentId,
      agentName: ag.agentName,
      ticketsHandled: ag.ticketsHandled,
      avgResolutionHours: ag.resolvedCount > 0
        ? Math.round((ag.totalResolutionHours / ag.resolvedCount) * 10) / 10
        : 0,
      avgFirstResponseHours: ag.firstResponseCount > 0
        ? Math.round((ag.totalFirstResponseHours / ag.firstResponseCount) * 10) / 10
        : 0,
      slaComplianceRate: ag.slaTotal > 0
        ? Math.round((ag.slaCompliant / ag.slaTotal) * 1000) / 10
        : 100,
      csatAverage: ag.csatRatings.length > 0
        ? Math.round(
            (ag.csatRatings.reduce((s, r) => s + r, 0) / ag.csatRatings.length) * 10,
          ) / 10
        : 0,
      openTickets: ag.openTickets,
    }));
  }

  async queueStats() {
    const workspaceId = this.requireWs();
    const queues = await this.prisma.queue.findMany({
      where: { workspaceId },
      select: { id: true, name: true, members: true },
    });

    const results = await Promise.all(
      queues.map(async (q) => {
        const openTickets = await this.prisma.ticket.count({
          where: {
            workspaceId,
            queueId: q.id,
            status: { in: ['NEW', 'OPEN', 'PENDING', 'ON_HOLD'] },
            archivedAt: null,
          },
        });

        const waitingTickets = await this.prisma.ticket.findMany({
          where: {
            workspaceId,
            queueId: q.id,
            status: { in: ['NEW', 'OPEN'] },
            archivedAt: null,
          },
          select: { createdAt: true },
        });

        const now = Date.now();
        const avgWaitMinutes = waitingTickets.length > 0
          ? Math.round(
              waitingTickets.reduce(
                (sum, t) => sum + (now - t.createdAt.getTime()) / 60000,
                0,
              ) / waitingTickets.length,
            )
          : 0;

        const memberIds: string[] = (q.members as string[]) ?? [];

        return {
          queueId: q.id,
          queueName: q.name,
          openTickets,
          avgWaitMinutes,
          agentsOnline: memberIds.length,
        };
      }),
    );

    return results;
  }
}
