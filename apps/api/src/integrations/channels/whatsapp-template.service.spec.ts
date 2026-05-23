import { NotFoundException } from '@nestjs/common';
import { WhatsAppTemplateService } from './whatsapp-template.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    whatsAppTemplate: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    channelConfig: {
      findUnique: jest.fn(),
    },
  };
}

function makeAudit() {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

function buildSvc() {
  const prisma = makePrisma();
  const tenant = new TenantContextService();
  const audit = makeAudit();
  const svc = new WhatsAppTemplateService(prisma as any, tenant, audit as any);
  return { svc, tenant, prisma, audit };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

describe('WhatsAppTemplateService', () => {
  describe('listTemplates', () => {
    it('lists templates for a channel config', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.whatsAppTemplate.findMany.mockResolvedValue([
        { id: 'wt_1', name: 'welcome', status: 'APPROVED' },
      ]);

      await tenant.run(ctx(), async () => {
        const result = await svc.listTemplates('cc_1');
        expect(result).toHaveLength(1);
        expect(result[0]!.name).toBe('welcome');
      });

      expect(prisma.whatsAppTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workspaceId: 'ws_1', channelConfigId: 'cc_1' },
        }),
      );
    });
  });

  describe('syncTemplates', () => {
    it('upserts templates from external list', async () => {
      const { svc, tenant, prisma, audit } = buildSvc();
      prisma.channelConfig.findUnique.mockResolvedValue({
        id: 'cc_1',
        workspaceId: 'ws_1',
        provider: 'TWILIO',
      });
      prisma.whatsAppTemplate.upsert.mockResolvedValue({
        id: 'wt_1',
        name: 'welcome',
      });

      const externalTemplates = [
        {
          name: 'welcome',
          language: 'en',
          category: 'UTILITY',
          components: { body: 'Welcome {{1}}!' },
          status: 'APPROVED',
          externalId: 'ext_tpl_1',
        },
      ];

      await tenant.run(ctx(), async () => {
        const result = await svc.syncTemplates('cc_1', externalTemplates);
        expect(result).toHaveLength(1);
      });

      expect(prisma.whatsAppTemplate.upsert).toHaveBeenCalledTimes(1);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'WhatsAppTemplate',
          action: 'CREATE',
        }),
      );
    });
  });

  describe('getTemplate', () => {
    it('returns template by id', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.whatsAppTemplate.findUnique.mockResolvedValue({
        id: 'wt_1',
        workspaceId: 'ws_1',
        name: 'welcome',
      });

      await tenant.run(ctx(), async () => {
        const result = await svc.getTemplate('wt_1');
        expect(result.name).toBe('welcome');
      });
    });

    it('throws NotFoundException for missing template', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.whatsAppTemplate.findUnique.mockResolvedValue(null);

      await tenant.run(ctx(), async () => {
        await expect(svc.getTemplate('wt_missing')).rejects.toThrow(NotFoundException);
      });
    });
  });
});
