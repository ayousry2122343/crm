import { Test } from '@nestjs/testing';
import { ServiceDashboardService } from './service-dashboard.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { BadRequestException } from '@nestjs/common';

describe('ServiceDashboardService', () => {
  let svc: ServiceDashboardService;
  const WS = 'ws-1';

  const mockPrisma = {
    ticket: {
      count: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    satisfactionRating: {
      findMany: jest.fn(),
    },
    queue: {
      findMany: jest.fn(),
    },
  };

  const mockTenant = {
    getStore: jest.fn(() => ({ workspaceId: WS, userId: 'user-1' })),
  };

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        ServiceDashboardService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TenantContextService, useValue: mockTenant },
      ],
    }).compile();
    svc = mod.get(ServiceDashboardService);
    jest.clearAllMocks();
  });

  describe('overview', () => {
    it('returns correct aggregate stats', async () => {
      mockPrisma.ticket.count
        .mockResolvedValueOnce(10) // openTickets
        .mockResolvedValueOnce(3) // pendingTickets
        .mockResolvedValueOnce(5); // resolvedToday
      mockPrisma.ticket.findMany
        .mockResolvedValueOnce([
          {
            createdAt: new Date('2026-05-10T08:00:00Z'),
            resolvedAt: new Date('2026-05-10T12:00:00Z'),
            firstResponseAt: new Date('2026-05-10T09:00:00Z'),
          },
          {
            createdAt: new Date('2026-05-11T08:00:00Z'),
            resolvedAt: new Date('2026-05-11T10:00:00Z'),
            firstResponseAt: new Date('2026-05-11T08:30:00Z'),
          },
        ])
        .mockResolvedValueOnce([
          { slaResolutionBreached: false },
          { slaResolutionBreached: false },
          { slaResolutionBreached: true },
        ]);
      mockPrisma.satisfactionRating.findMany.mockResolvedValue([
        { rating: 4 },
        { rating: 5 },
      ]);

      const result = await svc.overview();
      expect(result.openTickets).toBe(10);
      expect(result.pendingTickets).toBe(3);
      expect(result.resolvedToday).toBe(5);
      expect(result.avgResolutionHours).toBe(3);
      expect(result.avgFirstResponseHours).toBe(0.8);
      expect(result.slaComplianceRate).toBe(66.7);
      expect(result.csatAverage).toBe(4.5);
    });

    it('handles empty state gracefully', async () => {
      mockPrisma.ticket.count.mockResolvedValue(0);
      mockPrisma.ticket.findMany.mockResolvedValue([]);
      mockPrisma.satisfactionRating.findMany.mockResolvedValue([]);

      const result = await svc.overview();
      expect(result.openTickets).toBe(0);
      expect(result.avgResolutionHours).toBe(0);
      expect(result.avgFirstResponseHours).toBe(0);
      expect(result.slaComplianceRate).toBe(100);
      expect(result.csatAverage).toBe(0);
    });

    it('throws when no tenant context', async () => {
      mockTenant.getStore.mockReturnValueOnce(null);
      await expect(svc.overview()).rejects.toThrow(BadRequestException);
    });
  });

  describe('ticketsByChannel', () => {
    it('groups tickets by channel', async () => {
      mockPrisma.ticket.groupBy.mockResolvedValue([
        { channel: 'EMAIL', _count: { id: 12 } },
        { channel: 'WEB_FORM', _count: { id: 8 } },
      ]);

      const result = await svc.ticketsByChannel();
      expect(result).toEqual([
        { channel: 'EMAIL', count: 12 },
        { channel: 'WEB_FORM', count: 8 },
      ]);
    });

    it('returns empty array when no tickets', async () => {
      mockPrisma.ticket.groupBy.mockResolvedValue([]);
      const result = await svc.ticketsByChannel();
      expect(result).toEqual([]);
    });
  });

  describe('ticketsByPriority', () => {
    it('groups tickets by priority', async () => {
      mockPrisma.ticket.groupBy.mockResolvedValue([
        { priority: 'HIGH', _count: { id: 5 } },
        { priority: 'LOW', _count: { id: 15 } },
      ]);

      const result = await svc.ticketsByPriority();
      expect(result).toEqual([
        { priority: 'HIGH', count: 5 },
        { priority: 'LOW', count: 15 },
      ]);
    });
  });

  describe('ticketsByStatus', () => {
    it('groups tickets by status', async () => {
      mockPrisma.ticket.groupBy.mockResolvedValue([
        { status: 'OPEN', _count: { id: 20 } },
        { status: 'RESOLVED', _count: { id: 50 } },
      ]);

      const result = await svc.ticketsByStatus();
      expect(result).toEqual([
        { status: 'OPEN', count: 20 },
        { status: 'RESOLVED', count: 50 },
      ]);
    });
  });

  describe('volumeOverTime', () => {
    it('respects 7d period filter', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);
      const result = await svc.volumeOverTime('7d');
      expect(result.length).toBe(7);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('created');
      expect(result[0]).toHaveProperty('resolved');
    });

    it('respects 30d period filter', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);
      const result = await svc.volumeOverTime('30d');
      expect(result.length).toBe(30);
    });

    it('respects 90d period filter', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);
      const result = await svc.volumeOverTime('90d');
      expect(result.length).toBe(90);
    });

    it('counts created and resolved tickets correctly', async () => {
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      mockPrisma.ticket.findMany.mockResolvedValue([
        { createdAt: today, resolvedAt: today },
        { createdAt: today, resolvedAt: null },
      ]);

      const result = await svc.volumeOverTime('7d');
      const todayEntry = result.find((r) => r.date === dateStr);
      expect(todayEntry?.created).toBe(2);
      expect(todayEntry?.resolved).toBe(1);
    });
  });

  describe('agentPerformance', () => {
    it('calculates per-agent metrics', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([
        {
          assigneeId: 'u1',
          assignee: { id: 'u1', fullName: 'Agent One' },
          status: 'RESOLVED',
          createdAt: new Date('2026-05-10T08:00:00Z'),
          resolvedAt: new Date('2026-05-10T11:00:00Z'),
          firstResponseAt: new Date('2026-05-10T08:30:00Z'),
          slaResolutionBreached: false,
          slaPolicyId: 'sla-1',
        },
        {
          assigneeId: 'u1',
          assignee: { id: 'u1', fullName: 'Agent One' },
          status: 'OPEN',
          createdAt: new Date('2026-05-11T08:00:00Z'),
          resolvedAt: null,
          firstResponseAt: null,
          slaResolutionBreached: false,
          slaPolicyId: null,
        },
      ]);
      mockPrisma.satisfactionRating.findMany.mockResolvedValue([
        { rating: 5, ticket: { assigneeId: 'u1' } },
      ]);

      const result = await svc.agentPerformance();
      expect(result).toHaveLength(1);
      expect(result[0].agentId).toBe('u1');
      expect(result[0].agentName).toBe('Agent One');
      expect(result[0].ticketsHandled).toBe(2);
      expect(result[0].avgResolutionHours).toBe(3);
      expect(result[0].avgFirstResponseHours).toBe(0.5);
      expect(result[0].slaComplianceRate).toBe(100);
      expect(result[0].csatAverage).toBe(5);
      expect(result[0].openTickets).toBe(1);
    });

    it('returns empty array when no assigned tickets', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);
      mockPrisma.satisfactionRating.findMany.mockResolvedValue([]);
      const result = await svc.agentPerformance();
      expect(result).toEqual([]);
    });
  });

  describe('queueStats', () => {
    it('returns correct queue statistics', async () => {
      mockPrisma.queue.findMany.mockResolvedValue([
        { id: 'q1', name: 'General Support', members: ['u1', 'u2', 'u3'] },
      ]);
      mockPrisma.ticket.count.mockResolvedValue(8);
      mockPrisma.ticket.findMany.mockResolvedValue([
        { createdAt: new Date(Date.now() - 30 * 60000) },
        { createdAt: new Date(Date.now() - 60 * 60000) },
      ]);

      const result = await svc.queueStats();
      expect(result).toHaveLength(1);
      expect(result[0].queueId).toBe('q1');
      expect(result[0].queueName).toBe('General Support');
      expect(result[0].openTickets).toBe(8);
      expect(result[0].agentsOnline).toBe(3);
      expect(result[0].avgWaitMinutes).toBeGreaterThan(0);
    });

    it('handles empty queues', async () => {
      mockPrisma.queue.findMany.mockResolvedValue([]);
      const result = await svc.queueStats();
      expect(result).toEqual([]);
    });
  });
});
