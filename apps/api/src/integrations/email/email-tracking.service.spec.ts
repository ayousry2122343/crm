import { EmailTrackingService } from './email-tracking.service';

function makePrisma() {
  return {
    emailEvent: { create: jest.fn() },
    outboundEmail: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
}

function buildSvc() {
  const prisma = makePrisma();
  const svc = new EmailTrackingService(prisma as any);
  return { svc, prisma };
}

describe('EmailTrackingService', () => {
  describe('injectTrackingPixel', () => {
    it('injects 1x1 pixel before </body>', () => {
      const { svc } = buildSvc();
      const html = '<html><body><p>Hello</p></body></html>';
      const result = svc.injectTrackingPixel(html, 'email123', 'https://api.example.com');
      expect(result).toContain('track/open/email123');
      expect(result).toContain('width="1" height="1"');
      expect(result).toContain('</body>');
    });

    it('does not inject for doNotTrack recipients', () => {
      const { svc } = buildSvc();
      const html = '<html><body><p>Hello</p></body></html>';
      const result = svc.injectTrackingPixel(html, 'email123', 'https://api.example.com', true);
      expect(result).not.toContain('track/open');
      expect(result).toBe(html);
    });

    it('handles html without body tag gracefully', () => {
      const { svc } = buildSvc();
      const html = '<p>No body tag</p>';
      const result = svc.injectTrackingPixel(html, 'email123', 'https://api.example.com');
      expect(result).toBe(html);
    });
  });

  describe('rewriteLinks', () => {
    it('rewrites href links to tracking URLs', () => {
      const { svc } = buildSvc();
      const html = '<a href="https://example.com">Click</a>';
      const result = svc.rewriteLinks(html, 'email123', 'https://api.example.com');
      expect(result).toContain('track/click/email123');
      expect(result).toContain(encodeURIComponent('https://example.com'));
    });

    it('rewrites multiple links', () => {
      const { svc } = buildSvc();
      const html = '<a href="https://a.com">A</a> <a href="https://b.com">B</a>';
      const result = svc.rewriteLinks(html, 'e1', 'https://api.example.com');
      expect(result).toContain(encodeURIComponent('https://a.com'));
      expect(result).toContain(encodeURIComponent('https://b.com'));
    });

    it('skips unsubscribe links', () => {
      const { svc } = buildSvc();
      const html = '<a href="https://example.com/unsubscribe">Unsub</a>';
      const result = svc.rewriteLinks(html, 'email123', 'https://api.example.com');
      expect(result).toContain('href="https://example.com/unsubscribe"');
      expect(result).not.toContain('track/click');
    });

    it('skips mailto links', () => {
      const { svc } = buildSvc();
      const html = '<a href="mailto:test@test.com">Mail</a>';
      const result = svc.rewriteLinks(html, 'e1', 'https://api.example.com');
      expect(result).toContain('href="mailto:test@test.com"');
    });
  });

  describe('recordOpen', () => {
    it('creates event and sets openedAt on first open', async () => {
      const { svc, prisma } = buildSvc();
      prisma.outboundEmail.findUnique.mockResolvedValue({
        id: 'e1',
        workspaceId: 'ws1',
        openedAt: null,
        openCount: 0,
      });
      prisma.emailEvent.create.mockResolvedValue({ id: 'ev1' });
      prisma.outboundEmail.update.mockResolvedValue({});

      await svc.recordOpen('e1', '1.2.3.4', 'Mozilla/5.0');

      expect(prisma.emailEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'OPEN',
          outboundEmailId: 'e1',
          workspaceId: 'ws1',
          ipAddress: '1.2.3.4',
          userAgent: 'Mozilla/5.0',
        }),
      });
      expect(prisma.outboundEmail.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: expect.objectContaining({
          openCount: 1,
          openedAt: expect.any(Date),
        }),
      });
    });

    it('increments openCount without resetting openedAt on subsequent opens', async () => {
      const { svc, prisma } = buildSvc();
      const firstOpen = new Date('2026-01-01');
      prisma.outboundEmail.findUnique.mockResolvedValue({
        id: 'e1',
        workspaceId: 'ws1',
        openedAt: firstOpen,
        openCount: 3,
      });
      prisma.emailEvent.create.mockResolvedValue({ id: 'ev2' });
      prisma.outboundEmail.update.mockResolvedValue({});

      await svc.recordOpen('e1');

      expect(prisma.outboundEmail.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: { openCount: 4 },
      });
    });

    it('does nothing for unknown email', async () => {
      const { svc, prisma } = buildSvc();
      prisma.outboundEmail.findUnique.mockResolvedValue(null);

      await svc.recordOpen('nonexistent');

      expect(prisma.emailEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('recordClick', () => {
    it('creates click event and updates counters', async () => {
      const { svc, prisma } = buildSvc();
      prisma.outboundEmail.findUnique.mockResolvedValue({
        id: 'e1',
        workspaceId: 'ws1',
        clickCount: 0,
      });
      prisma.emailEvent.create.mockResolvedValue({ id: 'ev1' });
      prisma.outboundEmail.update.mockResolvedValue({});

      await svc.recordClick('e1', 'https://example.com', '1.2.3.4', 'Chrome');

      expect(prisma.emailEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'CLICK',
          url: 'https://example.com',
          outboundEmailId: 'e1',
        }),
      });
      expect(prisma.outboundEmail.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: {
          clickCount: 1,
          lastClickedAt: expect.any(Date),
        },
      });
    });

    it('increments clickCount on each click', async () => {
      const { svc, prisma } = buildSvc();
      prisma.outboundEmail.findUnique.mockResolvedValue({
        id: 'e1',
        workspaceId: 'ws1',
        clickCount: 5,
      });
      prisma.emailEvent.create.mockResolvedValue({ id: 'ev1' });
      prisma.outboundEmail.update.mockResolvedValue({});

      await svc.recordClick('e1', 'https://example.com');

      expect(prisma.outboundEmail.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: {
          clickCount: 6,
          lastClickedAt: expect.any(Date),
        },
      });
    });

    it('does nothing for unknown email', async () => {
      const { svc, prisma } = buildSvc();
      prisma.outboundEmail.findUnique.mockResolvedValue(null);

      await svc.recordClick('nonexistent', 'https://example.com');

      expect(prisma.emailEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('getEvents', () => {
    it('returns events for an outbound email', async () => {
      const { svc, prisma } = buildSvc();
      (prisma as any).emailEvent.findMany = jest.fn().mockResolvedValue([
        { id: 'ev1', type: 'OPEN', createdAt: new Date() },
        { id: 'ev2', type: 'CLICK', url: 'https://a.com', createdAt: new Date() },
      ]);

      const result = await svc.getEvents('e1');
      expect(result).toHaveLength(2);
    });
  });
});
