import { Test } from '@nestjs/testing';
import { MacroService } from './macro.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('MacroService', () => {
  let svc: MacroService;
  const WS = 'ws-1';
  const USER = 'user-1';

  const mockPrisma = {
    macro: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
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
        MacroService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TenantContextService, useValue: mockTenant },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();
    svc = mod.get(MacroService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a macro with correct data', async () => {
      const dto = { name: 'Greeting', content: 'Hello {{name}}!' };
      const created = { id: 'm1', ...dto, workspaceId: WS, visibility: 'PERSONAL' };
      mockPrisma.macro.create.mockResolvedValue(created);

      const result = await svc.create(dto);
      expect(result.id).toBe('m1');
      expect(mockPrisma.macro.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Greeting', workspaceId: WS }),
        }),
      );
      expect(mockAudit.log).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('returns macros filtered by visibility', async () => {
      mockPrisma.macro.findMany.mockResolvedValue([{ id: 'm1' }]);
      const result = await svc.list({});
      expect(result).toHaveLength(1);
      const call = mockPrisma.macro.findMany.mock.calls[0][0];
      expect(call.where.workspaceId).toBe(WS);
      expect(call.where.archivedAt).toBeNull();
      expect(call.where.OR).toBeDefined();
    });

    it('filters by search term', async () => {
      mockPrisma.macro.findMany.mockResolvedValue([]);
      await svc.list({ search: 'greet' });
      const call = mockPrisma.macro.findMany.mock.calls[0][0];
      expect(call.where.name).toEqual({ contains: 'greet', mode: 'insensitive' });
    });
  });

  describe('get', () => {
    it('returns macro by id', async () => {
      const macro = { id: 'm1', workspaceId: WS, archivedAt: null };
      mockPrisma.macro.findUnique.mockResolvedValue(macro);
      const result = await svc.get('m1');
      expect(result.id).toBe('m1');
    });

    it('throws NotFoundException for wrong workspace', async () => {
      mockPrisma.macro.findUnique.mockResolvedValue({ id: 'm1', workspaceId: 'other' });
      await expect(svc.get('m1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for archived macro', async () => {
      mockPrisma.macro.findUnique.mockResolvedValue({ id: 'm1', workspaceId: WS, archivedAt: new Date() });
      await expect(svc.get('m1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates macro fields', async () => {
      const before = { id: 'm1', workspaceId: WS, name: 'Old' };
      mockPrisma.macro.findUnique.mockResolvedValue(before);
      mockPrisma.macro.update.mockResolvedValue({ ...before, name: 'New' });

      const result = await svc.update('m1', { name: 'New' });
      expect(result.name).toBe('New');
      expect(mockAudit.logUpdate).toHaveBeenCalledWith('Macro', 'm1', expect.anything(), expect.objectContaining({ name: 'New' }));
    });
  });

  describe('archive', () => {
    it('soft-deletes a macro', async () => {
      mockPrisma.macro.findUnique.mockResolvedValue({ id: 'm1', workspaceId: WS });
      mockPrisma.macro.update.mockResolvedValue({ id: 'm1', archivedAt: new Date() });

      await svc.archive('m1');
      expect(mockPrisma.macro.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ archivedAt: expect.any(Date) }) }),
      );
      expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'DELETE' }));
    });
  });

  describe('requireWs', () => {
    it('throws BadRequestException when no tenant context', async () => {
      mockTenant.getStore.mockReturnValueOnce(null);
      await expect(svc.create({ name: 'x', content: 'y' })).rejects.toThrow(BadRequestException);
    });
  });
});
