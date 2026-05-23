import { Test } from '@nestjs/testing';
import { CSATService } from './csat.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CSATService', () => {
  let svc: CSATService;
  const WS = 'ws-1';

  const mockPrisma = {
    ticket: { findUnique: jest.fn() },
    satisfactionRating: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockTenant = {
    getStore: jest.fn(() => ({ workspaceId: WS, userId: 'user-1' })),
  };

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        CSATService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TenantContextService, useValue: mockTenant },
      ],
    }).compile();
    svc = mod.get(CSATService);
    jest.clearAllMocks();
  });

  describe('send', () => {
    it('creates a survey with unique token', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({ id: 't1', workspaceId: WS, contactId: 'c1' });
      mockPrisma.satisfactionRating.findFirst.mockResolvedValue(null);
      mockPrisma.satisfactionRating.create.mockResolvedValue({ id: 'sr1', token: 'abc' });

      const result = await svc.send({ ticketId: 't1' });
      expect(result.token).toBe('abc');
      expect(mockPrisma.satisfactionRating.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ workspaceId: WS, ticketId: 't1', rating: 0 }),
        }),
      );
    });

    it('throws if ticket not found', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);
      await expect(svc.send({ ticketId: 'x' })).rejects.toThrow(NotFoundException);
    });

    it('throws if survey already sent', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({ id: 't1', workspaceId: WS });
      mockPrisma.satisfactionRating.findFirst.mockResolvedValue({ id: 'existing' });
      await expect(svc.send({ ticketId: 't1' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('respond', () => {
    it('records rating and marks as responded', async () => {
      mockPrisma.satisfactionRating.findUnique.mockResolvedValue({ id: 'sr1', respondedAt: null });
      mockPrisma.satisfactionRating.update.mockResolvedValue({ id: 'sr1', rating: 5, respondedAt: new Date() });

      const result = await svc.respond({ token: 'tok', rating: 5, comment: 'Great' });
      expect(result.rating).toBe(5);
      expect(mockPrisma.satisfactionRating.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ rating: 5, comment: 'Great' }),
        }),
      );
    });

    it('throws if already responded', async () => {
      mockPrisma.satisfactionRating.findUnique.mockResolvedValue({ id: 'sr1', respondedAt: new Date() });
      await expect(svc.respond({ token: 'tok', rating: 3 })).rejects.toThrow(BadRequestException);
    });

    it('throws if token not found', async () => {
      mockPrisma.satisfactionRating.findUnique.mockResolvedValue(null);
      await expect(svc.respond({ token: 'bad', rating: 3 })).rejects.toThrow(NotFoundException);
    });
  });

  describe('stats', () => {
    it('calculates average and distribution', async () => {
      mockPrisma.satisfactionRating.findMany.mockResolvedValue([
        { rating: 5 }, { rating: 4 }, { rating: 5 }, { rating: 3 },
      ]);
      mockPrisma.satisfactionRating.count.mockResolvedValue(6);

      const result = await svc.stats();
      expect(result.total).toBe(6);
      expect(result.responded).toBe(4);
      expect(result.averageRating).toBe(4.3);
      expect(result.distribution[5]).toBe(2);
      expect(result.distribution[4]).toBe(1);
      expect(result.distribution[3]).toBe(1);
    });

    it('handles zero ratings', async () => {
      mockPrisma.satisfactionRating.findMany.mockResolvedValue([]);
      const result = await svc.stats();
      expect(result.averageRating).toBe(0);
      expect(result.responded).toBe(0);
    });
  });

  describe('list', () => {
    it('returns paginated results', async () => {
      const items = Array.from({ length: 3 }, (_, i) => ({ id: `sr${i}` }));
      mockPrisma.satisfactionRating.findMany.mockResolvedValue(items);

      const result = await svc.list({ limit: 50 });
      expect(result.items).toHaveLength(3);
      expect(result.nextCursor).toBeNull();
    });
  });
});
