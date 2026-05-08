import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import MarkdownIt from 'markdown-it';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import type { CreateBlogDto } from './dto/create-blog.dto';
import type { UpdateBlogDto } from './dto/update-blog.dto';
import type { QueryBlogDto } from './dto/query-blog.dto';
import type { CreateBlogCategoryDto } from './dto/create-blog-category.dto';

@Injectable()
export class BlogService {
  private readonly md = new MarkdownIt();

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

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-');
  }

  // ─── Categories ───

  async createCategory(dto: CreateBlogCategoryDto) {
    const workspaceId = this.requireWs();
    const slug = this.slugify(dto.name);

    const dup = await this.prisma.blogCategory.findFirst({
      where: { workspaceId, slug },
    });
    if (dup) throw new ConflictException(`Category "${dto.name}" already exists`);

    return this.prisma.blogCategory.create({
      data: { workspaceId, name: dto.name, slug },
    });
  }

  async listCategories() {
    const workspaceId = this.requireWs();
    return this.prisma.blogCategory.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' },
    });
  }

  // ─── Blogs ───

  async create(dto: CreateBlogDto) {
    const workspaceId = this.requireWs();

    const dup = await this.prisma.blog.findFirst({
      where: { workspaceId, slug: dto.slug },
    });
    if (dup) throw new ConflictException(`Slug "${dto.slug}" already exists`);

    const row = await this.prisma.blog.create({
      data: {
        workspaceId,
        title: dto.title,
        slug: dto.slug,
        body: dto.body,
        authorId: this.currentUser()!,
        tags: dto.tags ?? [],
        metaDescription: dto.metaDescription,
        categoryId: dto.categoryId,
      },
      include: { category: true, author: true },
    });

    await this.audit.log({
      entityType: 'Blog',
      entityId: row.id,
      action: 'CREATE',
      newValue: { title: row.title, slug: row.slug },
    });

    return row;
  }

  async list(q: QueryBlogDto) {
    const workspaceId = this.requireWs();
    const limit = Math.min(q.limit ?? 50, 200);
    const where: any = { workspaceId, archivedAt: null };

    if (q.status) where.status = q.status;
    if (q.categoryId) where.categoryId = q.categoryId;
    if (q.search) {
      where.OR = [
        { title: { contains: q.search, mode: 'insensitive' } },
        { body: { contains: q.search, mode: 'insensitive' } },
        { tags: { has: q.search } },
      ];
    }

    const orderBy = this.parseSort(q.sort);

    const items = await this.prisma.blog.findMany({
      where: q.cursor ? { ...where, id: { lt: q.cursor } } : where,
      take: limit + 1,
      orderBy,
      include: { category: true, author: true },
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
    const blog = await this.prisma.blog.findUnique({
      where: { id },
      include: { category: true, author: true },
    });
    if (!blog || blog.workspaceId !== workspaceId || blog.archivedAt) {
      throw new NotFoundException();
    }
    return blog;
  }

  async getBySlug(slug: string) {
    const workspaceId = this.requireWs();
    const blog = await this.prisma.blog.findFirst({
      where: { workspaceId, slug, status: 'PUBLISHED', archivedAt: null },
      include: { category: true, author: true },
    });
    if (!blog) throw new NotFoundException();
    return blog;
  }

  async update(id: string, dto: UpdateBlogDto) {
    const workspaceId = this.requireWs();
    const before = await this.prisma.blog.findUnique({ where: { id } });
    if (!before || before.workspaceId !== workspaceId || before.archivedAt) {
      throw new NotFoundException();
    }

    if (dto.slug && dto.slug !== before.slug) {
      const dup = await this.prisma.blog.findFirst({
        where: { workspaceId, slug: dto.slug, id: { not: id } },
      });
      if (dup) throw new ConflictException(`Slug "${dto.slug}" already taken`);
    }

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.body !== undefined) data.body = dto.body;
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.metaDescription !== undefined) data.metaDescription = dto.metaDescription;
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;

    const after = await this.prisma.blog.update({
      where: { id },
      data,
      include: { category: true, author: true },
    });

    await this.audit.logUpdate('Blog', id, before as any, after as any);
    return after;
  }

  async publish(id: string) {
    const workspaceId = this.requireWs();
    const blog = await this.prisma.blog.findUnique({ where: { id } });
    if (!blog || blog.workspaceId !== workspaceId || blog.archivedAt) {
      throw new NotFoundException();
    }

    const updated = await this.prisma.blog.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
      include: { category: true, author: true },
    });

    await this.audit.log({
      entityType: 'Blog',
      entityId: id,
      action: 'PUBLISH',
      newValue: { status: 'PUBLISHED' },
    });

    return updated;
  }

  async unpublish(id: string) {
    const workspaceId = this.requireWs();
    const blog = await this.prisma.blog.findUnique({ where: { id } });
    if (!blog || blog.workspaceId !== workspaceId || blog.archivedAt) {
      throw new NotFoundException();
    }

    const updated = await this.prisma.blog.update({
      where: { id },
      data: { status: 'DRAFT', publishedAt: null },
      include: { category: true, author: true },
    });

    await this.audit.log({
      entityType: 'Blog',
      entityId: id,
      action: 'UNPUBLISH',
      newValue: { status: 'DRAFT' },
    });

    return updated;
  }

  async archive(id: string) {
    const workspaceId = this.requireWs();
    const blog = await this.prisma.blog.findUnique({ where: { id } });
    if (!blog || blog.workspaceId !== workspaceId) throw new NotFoundException();

    const archived = await this.prisma.blog.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    await this.audit.log({
      entityType: 'Blog',
      entityId: id,
      action: 'DELETE',
    });

    return archived;
  }

  renderMarkdown(markdown: string): string {
    return this.md.render(markdown);
  }
}
