import { Resolver, Query, ObjectType, Field, Int, Float } from '@nestjs/graphql';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

@ObjectType()
export class DashboardStatsType {
  @Field(() => Int) totalPeople!: number;
  @Field(() => Int) totalDeals!: number;
  @Field(() => Int) totalTickets!: number;
  @Field(() => Int) openTickets!: number;
  @Field(() => Int) dealsWonThisMonth!: number;
  @Field(() => Float) revenue!: number;
}

@Injectable()
@Resolver(() => DashboardStatsType)
export class DashboardResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
  ) {}

  @Query(() => DashboardStatsType)
  async dashboardStats() {
    const workspaceId = this.tenant.getStore()?.workspaceId;
    if (!workspaceId) {
      return { totalPeople: 0, totalDeals: 0, totalTickets: 0, openTickets: 0, dealsWonThisMonth: 0, revenue: 0 };
    }

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

    const dealsWonThisMonth = wonDeals.length;
    const revenue = wonDeals.reduce((sum, d) => sum + (d.amount?.toNumber?.() ?? d.amount ?? 0), 0);

    return { totalPeople, totalDeals, totalTickets, openTickets, dealsWonThisMonth, revenue };
  }
}
