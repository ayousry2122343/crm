import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import type { CreateQuoteDto, LineItemDto } from './dto/create-quote.dto';
import type { UpdateQuoteDto } from './dto/update-quote.dto';
import type { QueryQuoteDto } from './dto/query-quote.dto';

@Injectable()
export class QuoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly audit: AuditService,
  ) {}

  private requireWs(): string {
    const ws = this.tenant.getStore()?.workspaceId;
    if (!ws) throw new BadRequestException('no tenant context');
    return ws;
  }

  private currentUser(): string | undefined {
    return this.tenant.getStore()?.userId;
  }

  private async nextNumber(workspaceId: string): Promise<string> {
    const count = await this.prisma.quote.count({ where: { workspaceId } });
    return `Q-${String(count).padStart(4, '0')}`;
  }

  private computeTotals(
    items: LineItemDto[],
    discountPct = 0,
    taxPct = 0,
  ) {
    const lineItems = items.map((li, i) => {
      const lineDiscount = li.discountPct ?? 0;
      const lineTotal =
        li.quantity * li.unitPrice * (1 - lineDiscount / 100);
      return { ...li, discountPct: lineDiscount, total: lineTotal, sortOrder: i };
    });
    const subtotal = lineItems.reduce((sum, li) => sum + li.total, 0);
    const discountAmt = subtotal * (discountPct / 100);
    const afterDiscount = subtotal - discountAmt;
    const taxAmt = afterDiscount * (taxPct / 100);
    const total = afterDiscount + taxAmt;
    return { lineItems, subtotal, discountPct, discountAmt, taxPct, taxAmt, total };
  }

  async create(dto: CreateQuoteDto) {
    const workspaceId = this.requireWs();

    if (dto.dealId) {
      const deal = await this.prisma.deal.findUnique({ where: { id: dto.dealId } });
      if (!deal || deal.workspaceId !== workspaceId) {
        throw new BadRequestException('Invalid deal');
      }
    }

    const number = await this.nextNumber(workspaceId);
    const { lineItems, subtotal, discountPct, discountAmt, taxPct, taxAmt, total } =
      this.computeTotals(dto.lineItems, dto.discountPct, dto.taxPct);

    const quote = await this.prisma.quote.create({
      data: {
        workspaceId,
        number,
        dealId: dto.dealId,
        contactId: dto.contactId,
        currency: dto.currency ?? 'EGP',
        validUntil: dto.validUntil,
        notes: dto.notes,
        subtotal,
        discountPct,
        discountAmt,
        taxPct,
        taxAmt,
        total,
        createdById: this.currentUser(),
      },
    });

    await this.prisma.quoteLineItem.createMany({
      data: lineItems.map((li) => ({
        workspaceId,
        quoteId: quote.id,
        productId: li.productId,
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        discountPct: li.discountPct,
        total: li.total,
        sortOrder: li.sortOrder,
      })),
    });

    await this.audit.log({
      entityType: 'Quote',
      entityId: quote.id,
      action: 'CREATE',
      newValue: { number, dealId: dto.dealId, total },
    });

    return this.prisma.quote.findUnique({
      where: { id: quote.id },
      include: { lineItems: { orderBy: { sortOrder: 'asc' }, include: { product: true } }, deal: true, contact: true },
    });
  }

  async list(q: QueryQuoteDto) {
    const workspaceId = this.requireWs();
    const limit = Math.min(q.limit ?? 50, 200);
    const where: any = { workspaceId, archivedAt: null };
    if (q.dealId) where.dealId = q.dealId;
    if (q.status) where.status = q.status;

    const orderBy = this.parseSort(q.sort);

    const items = await this.prisma.quote.findMany({
      where: q.cursor ? { ...where, id: { lt: q.cursor } } : where,
      take: limit + 1,
      orderBy,
      include: { lineItems: { orderBy: { sortOrder: 'asc' } }, deal: true, contact: true },
    });

    const hasMore = items.length > limit;
    const trimmed = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? trimmed[trimmed.length - 1]?.id ?? null : null;
    return { items: trimmed, nextCursor };
  }

  private parseSort(sort?: string): any {
    if (!sort) return { createdAt: 'desc' };
    const fields = sort.split(',').map((s) => s.trim()).filter(Boolean);
    if (fields.length === 0) return { createdAt: 'desc' };
    return fields.map((f) => {
      if (f.startsWith('-')) return { [f.slice(1)]: 'desc' };
      return { [f]: 'asc' };
    });
  }

  async get(id: string) {
    const workspaceId = this.requireWs();
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        lineItems: { orderBy: { sortOrder: 'asc' }, include: { product: true } },
        deal: true,
        contact: true,
      },
    });
    if (!quote || quote.workspaceId !== workspaceId || quote.archivedAt) {
      throw new NotFoundException();
    }
    return quote;
  }

  async update(id: string, dto: UpdateQuoteDto) {
    const workspaceId = this.requireWs();
    const before = await this.prisma.quote.findUnique({ where: { id } });
    if (!before || before.workspaceId !== workspaceId) throw new NotFoundException();
    if (before.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT quotes can be edited');
    }

    const data: any = { updatedById: this.currentUser() };
    if (dto.contactId !== undefined) data.contactId = dto.contactId;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.validUntil !== undefined) data.validUntil = dto.validUntil;
    if (dto.notes !== undefined) data.notes = dto.notes;

    if (dto.lineItems) {
      await this.prisma.quoteLineItem.deleteMany({ where: { quoteId: id } });
      const { lineItems, subtotal, discountPct, discountAmt, taxPct, taxAmt, total } =
        this.computeTotals(dto.lineItems, dto.discountPct ?? Number(before.discountPct), dto.taxPct ?? Number(before.taxPct));

      await this.prisma.quoteLineItem.createMany({
        data: lineItems.map((li) => ({
          workspaceId,
          quoteId: id,
          productId: li.productId,
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          discountPct: li.discountPct,
          total: li.total,
          sortOrder: li.sortOrder,
        })),
      });

      data.subtotal = subtotal;
      data.discountPct = discountPct;
      data.discountAmt = discountAmt;
      data.taxPct = taxPct;
      data.taxAmt = taxAmt;
      data.total = total;
    }

    await this.prisma.quote.update({ where: { id }, data });
    await this.audit.logUpdate('Quote', id, before as any, data);

    return this.prisma.quote.findUnique({
      where: { id },
      include: { lineItems: { orderBy: { sortOrder: 'asc' }, include: { product: true } }, deal: true, contact: true },
    });
  }

  async updateStatus(id: string, status: 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED') {
    const workspaceId = this.requireWs();
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote || quote.workspaceId !== workspaceId) throw new NotFoundException();

    const data: any = { status, updatedById: this.currentUser() };
    if (status === 'SENT') data.sentAt = new Date();
    if (status === 'ACCEPTED') data.acceptedAt = new Date();
    if (status === 'REJECTED') data.rejectedAt = new Date();

    const updated = await this.prisma.quote.update({ where: { id }, data });

    await this.audit.log({
      entityType: 'Quote',
      entityId: id,
      action: 'UPDATE',
      newValue: { status },
    });

    return updated;
  }

  async archive(id: string) {
    const workspaceId = this.requireWs();
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote || quote.workspaceId !== workspaceId) throw new NotFoundException();

    const archived = await this.prisma.quote.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    await this.audit.log({
      entityType: 'Quote',
      entityId: id,
      action: 'DELETE',
    });

    return archived;
  }
}
