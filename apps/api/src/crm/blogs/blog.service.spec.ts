import { ConflictException, NotFoundException } from '@nestjs/common';
import { BlogService } from './blog.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    blog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    blogCategory: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };
}

function makeAudit() {
  return {
    log: jest.fn().mockResolvedValue(undefined),
    logUpdate: jest.fn().mockResolvedValue(undefined),
  };
}

function buildSvc() {
  const prisma = makePrisma();
  const tenant = new TenantContextService();
  const audit = makeAudit();
  const svc = new BlogService(prisma as any, tenant, audit as any);
  return { svc, tenant, prisma, audit };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

// ─── BlogCategory ───

describe('BlogService.createCategory', () => {
  it('creates a category scoped to workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.blogCategory.findFirst.mockResolvedValue(null);
    prisma.blogCategory.create.mockResolvedValue({
      id: 'bcat_1',
      workspaceId: 'ws_1',
      name: 'Tech',
      slug: 'tech',
    });
    const result = await tenant.run(ctx(), async () =>
      svc.createCategory({ name: 'Tech' }),
    );
    expect(result.id).toBe('bcat_1');
    const args = prisma.blogCategory.create.mock.calls[0][0];
    expect(args.data.workspaceId).toBe('ws_1');
    expect(args.data.slug).toBe('tech');
  });

  it('throws ConflictException on duplicate slug', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.blogCategory.findFirst.mockResolvedValue({ id: 'bcat_x' });
    await expect(
      tenant.run(ctx(), async () => svc.createCategory({ name: 'Dup' })),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('BlogService.listCategories', () => {
  it('returns categories for workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.blogCategory.findMany.mockResolvedValue([
      { id: 'bcat_1', name: 'News' },
    ]);
    const result = await tenant.run(ctx(), async () => svc.listCategories());
    expect(result).toHaveLength(1);
    const args = prisma.blogCategory.findMany.mock.calls[0][0];
    expect(args.where.workspaceId).toBe('ws_1');
  });
});

// ─── Blog CRUD ───

describe('BlogService.create', () => {
  it('creates a blog with workspace scope and audits', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.blog.findFirst.mockResolvedValue(null);
    prisma.blog.create.mockResolvedValue({
      id: 'blog_1',
      workspaceId: 'ws_1',
      title: 'Hello World',
      slug: 'hello-world',
      status: 'DRAFT',
    });
    await tenant.run(ctx(), async () => {
      await svc.create({
        title: 'Hello World',
        slug: 'hello-world',
        body: '# Hello',
      });
    });
    const args = prisma.blog.create.mock.calls[0][0];
    expect(args.data.workspaceId).toBe('ws_1');
    expect(args.data.authorId).toBe('u_1');
    expect(args.data.slug).toBe('hello-world');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'Blog', action: 'CREATE' }),
    );
  });

  it('throws ConflictException on duplicate slug in workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.blog.findFirst.mockResolvedValue({ id: 'blog_x' });
    await expect(
      tenant.run(ctx(), async () =>
        svc.create({ title: 'X', slug: 'dup', body: 'y' }),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('BlogService.list', () => {
  it('returns paginated blogs with cursor', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const rows = Array.from({ length: 3 }, (_, i) => ({
      id: `b_${i}`,
      title: `Blog ${i}`,
    }));
    prisma.blog.findMany.mockResolvedValue(rows);
    const result = await tenant.run(ctx(), async () =>
      svc.list({ limit: 2 }),
    );
    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe('b_1');
    const args = prisma.blog.findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({
      workspaceId: 'ws_1',
      archivedAt: null,
    });
  });

  it('filters by status', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.blog.findMany.mockResolvedValue([]);
    await tenant.run(ctx(), async () =>
      svc.list({ status: 'PUBLISHED' }),
    );
    const args = prisma.blog.findMany.mock.calls[0][0];
    expect(args.where.status).toBe('PUBLISHED');
  });

  it('filters by categoryId', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.blog.findMany.mockResolvedValue([]);
    await tenant.run(ctx(), async () =>
      svc.list({ categoryId: 'bcat_1' }),
    );
    const args = prisma.blog.findMany.mock.calls[0][0];
    expect(args.where.categoryId).toBe('bcat_1');
  });

  it('supports search filter', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.blog.findMany.mockResolvedValue([]);
    await tenant.run(ctx(), async () => svc.list({ search: 'hello' }));
    const args = prisma.blog.findMany.mock.calls[0][0];
    expect(args.where.OR).toBeDefined();
  });
});

describe('BlogService.get', () => {
  it('returns blog by id', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.blog.findUnique.mockResolvedValue({
      id: 'blog_1',
      workspaceId: 'ws_1',
      archivedAt: null,
    });
    const result = await tenant.run(ctx(), async () => svc.get('blog_1'));
    expect(result.id).toBe('blog_1');
  });

  it('throws NotFoundException for wrong workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.blog.findUnique.mockResolvedValue({
      id: 'blog_1',
      workspaceId: 'OTHER',
      archivedAt: null,
    });
    await expect(
      tenant.run(ctx(), async () => svc.get('blog_1')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException for archived blog', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.blog.findUnique.mockResolvedValue({
      id: 'blog_1',
      workspaceId: 'ws_1',
      archivedAt: new Date(),
    });
    await expect(
      tenant.run(ctx(), async () => svc.get('blog_1')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('BlogService.getBySlug', () => {
  it('returns published blog by slug', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.blog.findFirst.mockResolvedValue({
      id: 'blog_1',
      slug: 'hello-world',
      status: 'PUBLISHED',
    });
    const result = await tenant.run(ctx(), async () =>
      svc.getBySlug('hello-world'),
    );
    expect(result.slug).toBe('hello-world');
    const args = prisma.blog.findFirst.mock.calls[0][0];
    expect(args.where.status).toBe('PUBLISHED');
  });

  it('throws NotFoundException if slug not found or not published', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.blog.findFirst.mockResolvedValue(null);
    await expect(
      tenant.run(ctx(), async () => svc.getBySlug('nope')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('BlogService.update', () => {
  it('updates fields and audits changes', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.blog.findUnique.mockResolvedValue({
      id: 'blog_1',
      workspaceId: 'ws_1',
      title: 'Old',
      slug: 'old',
      archivedAt: null,
    });
    prisma.blog.findFirst.mockResolvedValue(null);
    prisma.blog.update.mockResolvedValue({
      id: 'blog_1',
      title: 'New',
      category: null,
      author: { id: 'u_1', fullName: 'Test' },
    });
    await tenant.run(ctx(), async () => {
      await svc.update('blog_1', { title: 'New' });
    });
    const args = prisma.blog.update.mock.calls[0][0];
    expect(args.data.title).toBe('New');
    expect(audit.logUpdate).toHaveBeenCalledWith(
      'Blog',
      'blog_1',
      expect.any(Object),
      expect.any(Object),
    );
  });

  it('throws ConflictException on slug collision during update', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.blog.findUnique.mockResolvedValue({
      id: 'blog_1',
      workspaceId: 'ws_1',
      slug: 'old',
      archivedAt: null,
    });
    prisma.blog.findFirst.mockResolvedValue({ id: 'blog_other' });
    await expect(
      tenant.run(ctx(), async () =>
        svc.update('blog_1', { slug: 'taken' }),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws NotFoundException for non-existent blog', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.blog.findUnique.mockResolvedValue(null);
    await expect(
      tenant.run(ctx(), async () => svc.update('bad', { title: 'X' })),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('BlogService.publish', () => {
  it('sets status PUBLISHED and publishedAt', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.blog.findUnique.mockResolvedValue({
      id: 'blog_1',
      workspaceId: 'ws_1',
      status: 'DRAFT',
      archivedAt: null,
    });
    prisma.blog.update.mockResolvedValue({
      id: 'blog_1',
      status: 'PUBLISHED',
      publishedAt: new Date(),
    });
    await tenant.run(ctx(), async () => {
      await svc.publish('blog_1');
    });
    const args = prisma.blog.update.mock.calls[0][0];
    expect(args.data.status).toBe('PUBLISHED');
    expect(args.data.publishedAt).toBeInstanceOf(Date);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PUBLISH' }),
    );
  });
});

describe('BlogService.unpublish', () => {
  it('sets status back to DRAFT', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.blog.findUnique.mockResolvedValue({
      id: 'blog_1',
      workspaceId: 'ws_1',
      status: 'PUBLISHED',
      archivedAt: null,
    });
    prisma.blog.update.mockResolvedValue({
      id: 'blog_1',
      status: 'DRAFT',
      publishedAt: null,
    });
    await tenant.run(ctx(), async () => {
      await svc.unpublish('blog_1');
    });
    const args = prisma.blog.update.mock.calls[0][0];
    expect(args.data.status).toBe('DRAFT');
    expect(args.data.publishedAt).toBeNull();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'UNPUBLISH' }),
    );
  });
});

describe('BlogService.archive', () => {
  it('sets archivedAt and audits DELETE', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.blog.findUnique.mockResolvedValue({
      id: 'blog_1',
      workspaceId: 'ws_1',
      archivedAt: null,
    });
    prisma.blog.update.mockResolvedValue({
      id: 'blog_1',
      archivedAt: new Date(),
    });
    await tenant.run(ctx(), async () => {
      await svc.archive('blog_1');
    });
    expect(prisma.blog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ archivedAt: expect.any(Date) }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'Blog', action: 'DELETE' }),
    );
  });
});

describe('BlogService.renderMarkdown', () => {
  it('converts markdown to HTML', () => {
    const { svc } = buildSvc();
    const html = svc.renderMarkdown('# Hello');
    expect(html).toContain('<h1>Hello</h1>');
  });

  it('renders inline markdown', () => {
    const { svc } = buildSvc();
    const html = svc.renderMarkdown('**bold**');
    expect(html).toContain('<strong>bold</strong>');
  });
});
