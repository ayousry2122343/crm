import { OutboundEmailService } from './outbound-email.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    outboundEmail: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };
}

function makeEmailSvc() {
  return { send: jest.fn().mockResolvedValue({ messageId: 'msg_1' }) };
}

function makeTemplateSvc() {
  return {
    get: jest.fn().mockResolvedValue({ subject: 'Hi {{ name }}', body: '<p>{{ name }}</p>' }),
    renderTemplate: jest.fn((tpl: string, ctx: Record<string, unknown>) =>
      tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => String(ctx[k] ?? '')),
    ),
  };
}

function buildSvc() {
  const prisma = makePrisma();
  const tenant = new TenantContextService();
  const emailSvc = makeEmailSvc();
  const templateSvc = makeTemplateSvc();
  const svc = new OutboundEmailService(
    prisma as any,
    tenant,
    emailSvc as any,
    templateSvc as any,
  );
  return { svc, tenant, prisma, emailSvc, templateSvc };
}

const ctx = (workspaceId = 'ws_1') => ({
  workspaceId,
  userId: 'u_1',
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

describe('OutboundEmailService.send', () => {
  it('sends email and updates status to SENT', async () => {
    const { svc, tenant, prisma, emailSvc } = buildSvc();
    prisma.outboundEmail.create.mockResolvedValue({ id: 'oe_1', status: 'QUEUED' });
    prisma.outboundEmail.update.mockResolvedValue({});

    await tenant.run(ctx(), async () => {
      const result = await svc.send({
        to: 'test@example.com',
        subject: 'Test',
        body: '<p>Hello</p>',
      });
      expect(result.status).toBe('SENT');
    });

    expect(emailSvc.send).toHaveBeenCalledWith({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });
  });

  it('uses template when templateId is provided', async () => {
    const { svc, tenant, prisma, templateSvc } = buildSvc();
    prisma.outboundEmail.create.mockResolvedValue({ id: 'oe_2', status: 'QUEUED' });
    prisma.outboundEmail.update.mockResolvedValue({});

    await tenant.run(ctx(), async () => {
      await svc.send({
        to: 'test@example.com',
        subject: '',
        body: '',
        templateId: 'tpl_1',
        mergeContext: { name: 'Ahmed' },
      });
    });

    expect(templateSvc.get).toHaveBeenCalledWith('tpl_1');
    expect(templateSvc.renderTemplate).toHaveBeenCalled();
  });

  it('marks FAILED on email service error', async () => {
    const { svc, tenant, prisma, emailSvc } = buildSvc();
    prisma.outboundEmail.create.mockResolvedValue({ id: 'oe_3', status: 'QUEUED' });
    prisma.outboundEmail.update.mockResolvedValue({});
    emailSvc.send.mockRejectedValue(new Error('SMTP down'));

    await tenant.run(ctx(), async () => {
      await expect(
        svc.send({ to: 'test@example.com', subject: 'Test', body: 'Hi' }),
      ).rejects.toThrow('SMTP down');
    });

    const failCall = prisma.outboundEmail.update.mock.calls.find(
      (c: any) => c[0]?.data?.status === 'FAILED',
    );
    expect(failCall).toBeDefined();
  });
});
