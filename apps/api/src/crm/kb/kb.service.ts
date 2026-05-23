import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import type { CreateKBCategoryDto } from './dto/create-category.dto';
import type { CreateKBArticleDto } from './dto/create-article.dto';
import type { UpdateKBArticleDto } from './dto/update-article.dto';
import type { QueryKBArticleDto } from './dto/query-article.dto';

@Injectable()
export class KBService {
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

  // ── Categories ──

  async createCategory(dto: CreateKBCategoryDto) {
    const workspaceId = this.requireWs();
    const cat = await this.prisma.kBCategory.create({
      data: {
        workspaceId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        parentId: dto.parentId,
        order: dto.order ?? 0,
        createdById: this.currentUser()!,
      },
    });
    await this.audit.log({
      entityType: 'KBCategory',
      entityId: cat.id,
      action: 'CREATE',
      newValue: { name: dto.name },
    });
    return cat;
  }

  async listCategories() {
    const workspaceId = this.requireWs();
    return this.prisma.kBCategory.findMany({
      where: { workspaceId, archivedAt: null },
      orderBy: { order: 'asc' },
      include: { _count: { select: { articles: true } } },
    });
  }

  async updateCategory(id: string, dto: Partial<CreateKBCategoryDto>) {
    const workspaceId = this.requireWs();
    const before = await this.prisma.kBCategory.findUnique({ where: { id } });
    if (!before || before.workspaceId !== workspaceId) throw new NotFoundException();

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.parentId !== undefined) data.parentId = dto.parentId;
    if (dto.order !== undefined) data.order = dto.order;

    const updated = await this.prisma.kBCategory.update({ where: { id }, data });
    await this.audit.logUpdate('KBCategory', id, before as any, data);
    return updated;
  }

  async archiveCategory(id: string) {
    const workspaceId = this.requireWs();
    const cat = await this.prisma.kBCategory.findUnique({ where: { id } });
    if (!cat || cat.workspaceId !== workspaceId) throw new NotFoundException();

    await this.prisma.kBCategory.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
    await this.audit.log({ entityType: 'KBCategory', entityId: id, action: 'DELETE' });
  }

  // ── Articles ──

  async createArticle(dto: CreateKBArticleDto) {
    const workspaceId = this.requireWs();
    const data: any = {
      workspaceId,
      title: dto.title,
      slug: dto.slug,
      content: dto.content,
      createdById: this.currentUser()!,
    };
    if (dto.categoryId) data.categoryId = dto.categoryId;
    if (dto.status === 'PUBLISHED') {
      data.status = 'PUBLISHED';
      data.publishedAt = new Date();
    }

    const article = await this.prisma.kBArticle.create({ data });
    await this.audit.log({
      entityType: 'KBArticle',
      entityId: article.id,
      action: 'CREATE',
      newValue: { title: dto.title },
    });
    return article;
  }

  async listArticles(q: QueryKBArticleDto) {
    const workspaceId = this.requireWs();
    const limit = Math.min(q.limit ?? 50, 200);
    const where: any = { workspaceId, archivedAt: null };
    if (q.search) where.title = { contains: q.search, mode: 'insensitive' };
    if (q.categoryId) where.categoryId = q.categoryId;
    if (q.status) where.status = q.status;

    const items = await this.prisma.kBArticle.findMany({
      where: q.cursor ? { ...where, id: { lt: q.cursor } } : where,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
      include: { category: true },
    });

    const hasMore = items.length > limit;
    const trimmed = hasMore ? items.slice(0, limit) : items;
    return {
      items: trimmed,
      nextCursor: hasMore ? trimmed[trimmed.length - 1]?.id ?? null : null,
    };
  }

  async getArticle(id: string) {
    const workspaceId = this.requireWs();
    const article = await this.prisma.kBArticle.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!article || article.workspaceId !== workspaceId || article.archivedAt) {
      throw new NotFoundException();
    }
    return article;
  }

  async getArticleBySlug(slug: string, workspaceId: string) {
    const article = await this.prisma.kBArticle.findFirst({
      where: { workspaceId, slug, status: 'PUBLISHED', archivedAt: null },
      include: { category: true },
    });
    if (!article) throw new NotFoundException();
    await this.prisma.kBArticle.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
    });
    return article;
  }

  async updateArticle(id: string, dto: UpdateKBArticleDto) {
    const workspaceId = this.requireWs();
    const before = await this.prisma.kBArticle.findUnique({ where: { id } });
    if (!before || before.workspaceId !== workspaceId) throw new NotFoundException();

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === 'PUBLISHED' && before.status !== 'PUBLISHED') {
        data.publishedAt = new Date();
      }
    }

    const updated = await this.prisma.kBArticle.update({
      where: { id },
      data,
      include: { category: true },
    });
    await this.audit.logUpdate('KBArticle', id, before as any, data);
    return updated;
  }

  async archiveArticle(id: string) {
    const workspaceId = this.requireWs();
    const article = await this.prisma.kBArticle.findUnique({ where: { id } });
    if (!article || article.workspaceId !== workspaceId) throw new NotFoundException();

    await this.prisma.kBArticle.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
    await this.audit.log({ entityType: 'KBArticle', entityId: id, action: 'DELETE' });
  }

  async feedback(id: string, helpful: boolean) {
    const workspaceId = this.requireWs();
    const article = await this.prisma.kBArticle.findUnique({ where: { id } });
    if (!article || article.workspaceId !== workspaceId) throw new NotFoundException();

    return this.prisma.kBArticle.update({
      where: { id },
      data: helpful
        ? { helpfulCount: { increment: 1 } }
        : { notHelpfulCount: { increment: 1 } },
    });
  }
}
