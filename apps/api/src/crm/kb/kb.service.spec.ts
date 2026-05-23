import { Test } from '@nestjs/testing';
import { KBService } from './kb.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import { NotFoundException } from '@nestjs/common';

describe('KBService', () => {
  let svc: KBService;
  const WS = 'ws-1';
  const USER = 'user-1';

  const mockPrisma = {
    kBCategory: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    kBArticle: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockTenant = {
    getStore: jest.fn(() => ({ workspaceId: WS, userId: USER })),
  };

  const mockAudit = {
    log: jest.fn(),
    logUpdate: jest.fn(),
  };

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        KBService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TenantContextService, useValue: mockTenant },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();
    svc = mod.get(KBService);
    jest.clearAllMocks();
  });

  describe('Categories', () => {
    it('creates a category', async () => {
      const dto = { name: 'FAQ', slug: 'faq', description: 'Frequently asked' };
      mockPrisma.kBCategory.create.mockResolvedValue({ id: 'c1', ...dto });

      const result = await svc.createCategory(dto);
      expect(result.id).toBe('c1');
      expect(mockAudit.log).toHaveBeenCalled();
    });

    it('lists categories ordered by order', async () => {
      mockPrisma.kBCategory.findMany.mockResolvedValue([{ id: 'c1' }]);
      const result = await svc.listCategories();
      expect(result).toHaveLength(1);
      const call = mockPrisma.kBCategory.findMany.mock.calls[0][0];
      expect(call.orderBy).toEqual({ order: 'asc' });
    });

    it('archives a category', async () => {
      mockPrisma.kBCategory.findUnique.mockResolvedValue({ id: 'c1', workspaceId: WS });
      mockPrisma.kBCategory.update.mockResolvedValue({});

      await svc.archiveCategory('c1');
      expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'DELETE' }));
    });

    it('throws NotFoundException for wrong workspace on archive', async () => {
      mockPrisma.kBCategory.findUnique.mockResolvedValue({ id: 'c1', workspaceId: 'other' });
      await expect(svc.archiveCategory('c1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Articles', () => {
    it('creates an article in draft', async () => {
      const dto = { title: 'How To', slug: 'how-to', content: 'Steps...' };
      mockPrisma.kBArticle.create.mockResolvedValue({ id: 'a1', status: 'DRAFT', ...dto });

      const result = await svc.createArticle(dto);
      expect(result.status).toBe('DRAFT');
      expect(mockAudit.log).toHaveBeenCalled();
    });

    it('creates a published article with publishedAt', async () => {
      const dto = { title: 'Guide', slug: 'guide', content: 'Content', status: 'PUBLISHED' as const };
      mockPrisma.kBArticle.create.mockResolvedValue({ id: 'a2', status: 'PUBLISHED', publishedAt: new Date() });

      await svc.createArticle(dto);
      const call = mockPrisma.kBArticle.create.mock.calls[0][0];
      expect(call.data.status).toBe('PUBLISHED');
      expect(call.data.publishedAt).toBeDefined();
    });

    it('lists articles with cursor pagination', async () => {
      const items = [{ id: 'a1' }, { id: 'a2' }];
      mockPrisma.kBArticle.findMany.mockResolvedValue(items);

      const result = await svc.listArticles({});
      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBeNull();
    });

    it('returns article by id', async () => {
      const article = { id: 'a1', workspaceId: WS, archivedAt: null };
      mockPrisma.kBArticle.findUnique.mockResolvedValue(article);

      const result = await svc.getArticle('a1');
      expect(result.id).toBe('a1');
    });

    it('throws NotFoundException for missing article', async () => {
      mockPrisma.kBArticle.findUnique.mockResolvedValue(null);
      await expect(svc.getArticle('bad')).rejects.toThrow(NotFoundException);
    });

    it('updates article and sets publishedAt on publish', async () => {
      const before = { id: 'a1', workspaceId: WS, status: 'DRAFT' };
      mockPrisma.kBArticle.findUnique.mockResolvedValue(before);
      mockPrisma.kBArticle.update.mockResolvedValue({ ...before, status: 'PUBLISHED' });

      await svc.updateArticle('a1', { status: 'PUBLISHED' });
      const call = mockPrisma.kBArticle.update.mock.calls[0][0];
      expect(call.data.publishedAt).toBeDefined();
    });

    it('increments helpfulCount on positive feedback', async () => {
      mockPrisma.kBArticle.findUnique.mockResolvedValue({ id: 'a1', workspaceId: WS });
      mockPrisma.kBArticle.update.mockResolvedValue({});

      await svc.feedback('a1', true);
      const call = mockPrisma.kBArticle.update.mock.calls[0][0];
      expect(call.data.helpfulCount).toEqual({ increment: 1 });
    });

    it('increments notHelpfulCount on negative feedback', async () => {
      mockPrisma.kBArticle.findUnique.mockResolvedValue({ id: 'a1', workspaceId: WS });
      mockPrisma.kBArticle.update.mockResolvedValue({});

      await svc.feedback('a1', false);
      const call = mockPrisma.kBArticle.update.mock.calls[0][0];
      expect(call.data.notHelpfulCount).toEqual({ increment: 1 });
    });

    it('getArticleBySlug increments viewCount', async () => {
      const article = { id: 'a1', workspaceId: WS, slug: 'test', status: 'PUBLISHED' };
      mockPrisma.kBArticle.findFirst.mockResolvedValue(article);
      mockPrisma.kBArticle.update.mockResolvedValue(article);

      await svc.getArticleBySlug('test', WS);
      const call = mockPrisma.kBArticle.update.mock.calls[0][0];
      expect(call.data.viewCount).toEqual({ increment: 1 });
    });
  });
});
