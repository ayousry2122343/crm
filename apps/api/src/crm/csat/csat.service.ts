import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { randomBytes } from 'crypto';
import type { CreateCSATDto } from './dto/create-csat.dto';
import type { RespondCSATDto } from './dto/respond-csat.dto';
import type { QueryCSATDto } from './dto/query-csat.dto';

@Injectable()
export class CSATService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
  ) {}

  private requireWs(): string {
    const ws = this.tenant.getStore()?.workspaceId;
    if (!ws) throw new BadRequestException('no tenant context');
    return ws;
  }

  async send(dto: CreateCSATDto) {
    const workspaceId = this.requireWs();
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: dto.ticketId },
    });
    if (!ticket || ticket.workspaceId !== workspaceId) {
      throw new NotFoundException('Ticket not found');
    }

    const existing = await this.prisma.satisfactionRating.findFirst({
      where: { workspaceId, ticketId: dto.ticketId },
    });
    if (existing) {
      throw new BadRequestException('Survey already sent for this ticket');
    }

    const token = randomBytes(32).toString('hex');
    return this.prisma.satisfactionRating.create({
      data: {
        workspaceId,
        ticketId: dto.ticketId,
        contactId: ticket.contactId,
        rating: 0,
        token,
      },
    });
  }

  async respond(dto: RespondCSATDto) {
    const survey = await this.prisma.satisfactionRating.findUnique({
      where: { token: dto.token },
    });
    if (!survey) throw new NotFoundException('Survey not found');
    if (survey.respondedAt) throw new BadRequestException('Already responded');

    return this.prisma.satisfactionRating.update({
      where: { token: dto.token },
      data: {
        rating: dto.rating,
        comment: dto.comment,
        respondedAt: new Date(),
      },
    });
  }

  async list(q: QueryCSATDto) {
    const workspaceId = this.requireWs();
    const limit = Math.min(q.limit ?? 50, 200);
    const where: any = { workspaceId };
    if (q.ticketId) where.ticketId = q.ticketId;

    const items = await this.prisma.satisfactionRating.findMany({
      where: q.cursor ? { ...where, id: { lt: q.cursor } } : where,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
      include: { ticket: true, contact: true },
    });

    const hasMore = items.length > limit;
    const trimmed = hasMore ? items.slice(0, limit) : items;
    return {
      items: trimmed,
      nextCursor: hasMore ? trimmed[trimmed.length - 1]?.id ?? null : null,
    };
  }

  async stats() {
    const workspaceId = this.requireWs();
    const ratings = await this.prisma.satisfactionRating.findMany({
      where: { workspaceId, respondedAt: { not: null } },
      select: { rating: true },
    });

    if (ratings.length === 0) {
      return { total: 0, responded: 0, averageRating: 0, distribution: {} };
    }

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    for (const r of ratings) {
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
      sum += r.rating;
    }

    const totalSent = await this.prisma.satisfactionRating.count({
      where: { workspaceId },
    });

    return {
      total: totalSent,
      responded: ratings.length,
      averageRating: Math.round((sum / ratings.length) * 10) / 10,
      distribution,
    };
  }
}
