import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import type { CreatePricebookDto } from './dto/create-pricebook.dto';
import type { UpdatePricebookDto } from './dto/update-pricebook.dto';
import type { SetEntryDto } from './dto/set-entry.dto';

@Injectable()
export class PricebookService {
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

  // ─── Pricebook CRUD ───

  async create(dto: CreatePricebookDto) {
    const workspaceId = this.requireWs();

    const dup = await this.prisma.pricebook.findFirst({
      where: { workspaceId, name: dto.name },
    });
    if (dup) throw new ConflictException(`Pricebook "${dto.name}" already exists`);

    if (dto.isDefault) {
      await this.prisma.pricebook.updateMany({
        where: { workspaceId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const row = await this.prisma.pricebook.create({
      data: {
        workspaceId,
        name: dto.name,
        currency: dto.currency ?? 'EGP',
        isDefault: dto.isDefault ?? false,
      },
    });

    await this.audit.log({
      entityType: 'Pricebook',
      entityId: row.id,
      action: 'CREATE',
      newValue: { name: row.name },
    });

    return row;
  }

  async list() {
    const workspaceId = this.requireWs();
    return this.prisma.pricebook.findMany({
      where: { workspaceId, archivedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { entries: true } } },
    });
  }

  async get(id: string) {
    const workspaceId = this.requireWs();
    const pb = await this.prisma.pricebook.findUnique({
      where: { id },
      include: { entries: { include: { product: true }, orderBy: { product: { name: 'asc' } } } },
    });
    if (!pb || pb.workspaceId !== workspaceId || pb.archivedAt) {
      throw new NotFoundException();
    }
    return pb;
  }

  async update(id: string, dto: UpdatePricebookDto) {
    const workspaceId = this.requireWs();
    const before = await this.prisma.pricebook.findUnique({ where: { id } });
    if (!before || before.workspaceId !== workspaceId) throw new NotFoundException();

    if (dto.isDefault) {
      await this.prisma.pricebook.updateMany({
        where: { workspaceId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.isDefault !== undefined) data.isDefault = dto.isDefault;

    const after = await this.prisma.pricebook.update({
      where: { id },
      data,
    });

    await this.audit.logUpdate('Pricebook', id, before as any, after as any);
    return after;
  }

  async archive(id: string) {
    const workspaceId = this.requireWs();
    const pb = await this.prisma.pricebook.findUnique({ where: { id } });
    if (!pb || pb.workspaceId !== workspaceId) throw new NotFoundException();

    const archived = await this.prisma.pricebook.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    await this.audit.log({
      entityType: 'Pricebook',
      entityId: id,
      action: 'DELETE',
    });

    return archived;
  }

  // ─── PricebookEntry ───

  async setEntry(pricebookId: string, dto: SetEntryDto) {
    const workspaceId = this.requireWs();

    const pb = await this.prisma.pricebook.findUnique({ where: { id: pricebookId } });
    if (!pb || pb.workspaceId !== workspaceId || pb.archivedAt) {
      throw new NotFoundException('Pricebook not found');
    }

    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product || product.workspaceId !== workspaceId) {
      throw new BadRequestException('Invalid product');
    }

    const minQty = dto.minQty ?? 1;

    return this.prisma.pricebookEntry.upsert({
      where: {
        pricebookId_productId_minQty: { pricebookId, productId: dto.productId, minQty },
      },
      create: {
        workspaceId,
        pricebookId,
        productId: dto.productId,
        unitPrice: dto.unitPrice,
        minQty,
      },
      update: {
        unitPrice: dto.unitPrice,
      },
    });
  }

  async removeEntry(entryId: string) {
    const workspaceId = this.requireWs();
    const entry = await this.prisma.pricebookEntry.findUnique({ where: { id: entryId } });
    if (!entry || entry.workspaceId !== workspaceId) {
      throw new NotFoundException();
    }
    return this.prisma.pricebookEntry.delete({ where: { id: entryId } });
  }
}
