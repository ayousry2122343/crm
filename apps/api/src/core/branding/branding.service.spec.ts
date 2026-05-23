import { BrandingService } from './branding.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { DEFAULT_BRANDING } from './branding.interface';

function makePrisma() {
  return {
    workspace: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
}

function ctx(workspaceId = 'ws1') {
  return { workspaceId, userId: 'u1', profileIds: [] as string[], permissionKeys: new Set<string>() };
}

function buildSvc() {
  const prisma = makePrisma();
  const tenant = new TenantContextService();
  const svc = new BrandingService(prisma as any, tenant);
  return { svc, tenant, prisma };
}

describe('BrandingService', () => {
  describe('resolve', () => {
    it('returns defaults when branding is null', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.workspace.findUnique.mockResolvedValue({ branding: null });

      const result = await tenant.run(ctx(), () => svc.resolve());
      expect(result.primaryColor).toBe(DEFAULT_BRANDING.primaryColor);
      expect(result.secondaryColor).toBe(DEFAULT_BRANDING.secondaryColor);
      expect(result.logo).toBeUndefined();
    });

    it('returns defaults when branding is empty object', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.workspace.findUnique.mockResolvedValue({ branding: {} });

      const result = await tenant.run(ctx(), () => svc.resolve());
      expect(result.primaryColor).toBe(DEFAULT_BRANDING.primaryColor);
      expect(result.secondaryColor).toBe(DEFAULT_BRANDING.secondaryColor);
    });

    it('merges custom values with defaults', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.workspace.findUnique.mockResolvedValue({
        branding: { primaryColor: '#FF0000', companyName: 'Acme Corp' },
      });

      const result = await tenant.run(ctx(), () => svc.resolve());
      expect(result.primaryColor).toBe('#FF0000');
      expect(result.companyName).toBe('Acme Corp');
      expect(result.secondaryColor).toBe(DEFAULT_BRANDING.secondaryColor);
    });

    it('preserves logo and favicon paths', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.workspace.findUnique.mockResolvedValue({
        branding: { logo: '/uploads/logo.png', favicon: '/uploads/fav.ico' },
      });

      const result = await tenant.run(ctx(), () => svc.resolve());
      expect(result.logo).toBe('/uploads/logo.png');
      expect(result.favicon).toBe('/uploads/fav.ico');
    });

    it('throws when no tenant context', async () => {
      const { svc } = buildSvc();
      await expect(svc.resolve()).rejects.toThrow('no tenant context');
    });
  });

  describe('update', () => {
    it('merges partial update with current branding', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.workspace.findUnique.mockResolvedValue({
        branding: { primaryColor: '#3B82F6', secondaryColor: '#1E293B' },
      });
      prisma.workspace.update.mockResolvedValue({});

      const result = await tenant.run(ctx(), () =>
        svc.update({ primaryColor: '#FF0000' }),
      );

      expect(result.primaryColor).toBe('#FF0000');
      expect(result.secondaryColor).toBe(DEFAULT_BRANDING.secondaryColor);
      expect(prisma.workspace.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ws1' },
          data: {
            branding: expect.objectContaining({ primaryColor: '#FF0000' }),
          },
        }),
      );
    });

    it('saves companyName and logo together', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.workspace.findUnique.mockResolvedValue({ branding: {} });
      prisma.workspace.update.mockResolvedValue({});

      const result = await tenant.run(ctx(), () =>
        svc.update({ companyName: 'TestCo', logo: '/uploads/test.png' }),
      );

      expect(result.companyName).toBe('TestCo');
      expect(result.logo).toBe('/uploads/test.png');
    });
  });

  describe('resolveBySlug', () => {
    it('returns branding for workspace slug', async () => {
      const { svc, prisma } = buildSvc();
      prisma.workspace.findUnique.mockResolvedValue({
        branding: { primaryColor: '#00FF00' },
      });

      const result = await svc.resolveBySlug('acme');
      expect(result.primaryColor).toBe('#00FF00');
      expect(prisma.workspace.findUnique).toHaveBeenCalledWith({
        where: { slug: 'acme' },
        select: { branding: true },
      });
    });

    it('returns defaults for workspace with no branding', async () => {
      const { svc, prisma } = buildSvc();
      prisma.workspace.findUnique.mockResolvedValue({ branding: null });

      const result = await svc.resolveBySlug('neworg');
      expect(result.primaryColor).toBe(DEFAULT_BRANDING.primaryColor);
    });
  });
});
