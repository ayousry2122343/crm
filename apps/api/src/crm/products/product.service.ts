import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import type { CreateProductDto } from './dto/create-product.dto';
import type { UpdateProductDto } from './dto/update-product.dto';
import type { QueryProductDto } from './dto/query-product.dto';
import type { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class ProductService {
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

  // ─── Categories ───

  async createCategory(dto: CreateCategoryDto) {
    const workspaceId = this.requireWs();

    const dup = await this.prisma.productCategory.findFirst({
      where: { workspaceId, name: dto.name },
    });
    if (dup) throw new ConflictException(`Category "${dto.name}" already exists`);

    return this.prisma.productCategory.create({
      data: {
        workspaceId,
        name: dto.name,
        labelAr: dto.labelAr,
        labelEn: dto.labelEn,
        parentId: dto.parentId,
      },
    });
  }

  async listCategories() {
    const workspaceId = this.requireWs();
    return this.prisma.productCategory.findMany({
      where: { workspaceId, archivedAt: null },
      orderBy: { name: 'asc' },
      include: { children: true },
    });
  }

  // ─── Products ───

  async create(dto: CreateProductDto) {
    const workspaceId = this.requireWs();

    if (dto.categoryId) {
      const cat = await this.prisma.productCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!cat || cat.workspaceId !== workspaceId) {
        throw new BadRequestException('Invalid category');
      }
    }

    let row;
    try {
      row = await this.prisma.product.create({
        data: {
          workspaceId,
          name: dto.name,
          labelAr: dto.labelAr,
          labelEn: dto.labelEn,
          sku: dto.sku,
          description: dto.description,
          unitPrice: dto.unitPrice ?? 0,
          currency: dto.currency ?? 'EGP',
          isActive: dto.isActive ?? true,
          categoryId: dto.categoryId,
          customFields: (dto.customFields ?? {}) as any,
          createdById: this.currentUser(),
        },
        include: { category: true },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException('A product with this SKU already exists');
      }
      throw e;
    }

    await this.audit.log({
      entityType: 'Product',
      entityId: row.id,
      action: 'CREATE',
      newValue: { name: row.name, sku: row.sku },
    });

    return row;
  }

  async list(q: QueryProductDto) {
    const workspaceId = this.requireWs();
    const limit = Math.min(q.limit ?? 50, 200);
    const where: any = { workspaceId, archivedAt: null };

    if (q.isActive !== undefined) where.isActive = q.isActive;
    if (q.categoryId) where.categoryId = q.categoryId;
    if (q.search) {
      where.OR = [
        { name: { contains: q.search, mode: 'insensitive' } },
        { sku: { contains: q.search, mode: 'insensitive' } },
        { labelAr: { contains: q.search, mode: 'insensitive' } },
        { labelEn: { contains: q.search, mode: 'insensitive' } },
      ];
    }

    const orderBy = this.parseSort(q.sort);

    const items = await this.prisma.product.findMany({
      where: q.cursor ? { ...where, id: { lt: q.cursor } } : where,
      take: limit + 1,
      orderBy,
      include: { category: true },
    });

    const hasMore = items.length > limit;
    const trimmed = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? trimmed[trimmed.length - 1]?.id ?? null : null;

    return { items: trimmed, nextCursor };
  }

  private parseSort(sort?: string): any {
    if (!sort) return { createdAt: 'desc' };
    const fields = sort
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (fields.length === 0) return { createdAt: 'desc' };
    return fields.map((f) => {
      if (f.startsWith('-')) return { [f.slice(1)]: 'desc' };
      return { [f]: 'asc' };
    });
  }

  async get(id: string) {
    const workspaceId = this.requireWs();
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true, pricebookEntries: { include: { pricebook: true } } },
    });
    if (!product || product.workspaceId !== workspaceId || product.archivedAt) {
      throw new NotFoundException();
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const workspaceId = this.requireWs();
    const before = await this.prisma.product.findUnique({ where: { id } });
    if (!before || before.workspaceId !== workspaceId) throw new NotFoundException();

    if (dto.categoryId) {
      const cat = await this.prisma.productCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!cat || cat.workspaceId !== workspaceId) {
        throw new BadRequestException('Invalid category');
      }
    }

    const data: any = { updatedById: this.currentUser() };
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.labelAr !== undefined) data.labelAr = dto.labelAr;
    if (dto.labelEn !== undefined) data.labelEn = dto.labelEn;
    if (dto.sku !== undefined) data.sku = dto.sku;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.unitPrice !== undefined) data.unitPrice = dto.unitPrice;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
    if (dto.customFields !== undefined) data.customFields = dto.customFields as any;

    const after = await this.prisma.product.update({
      where: { id },
      data,
      include: { category: true },
    });

    await this.audit.logUpdate('Product', id, before as any, after as any);
    return after;
  }

  async archive(id: string) {
    const workspaceId = this.requireWs();
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product || product.workspaceId !== workspaceId) throw new NotFoundException();

    const archived = await this.prisma.product.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    await this.audit.log({
      entityType: 'Product',
      entityId: id,
      action: 'DELETE',
    });

    return archived;
  }
}
