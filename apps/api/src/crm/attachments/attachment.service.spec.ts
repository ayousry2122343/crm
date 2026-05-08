import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AttachmentService } from './attachment.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    attachment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
}

function makeAudit() {
  return {
    log: jest.fn().mockResolvedValue(undefined),
    logUpdate: jest.fn().mockResolvedValue(undefined),
  };
}

function makeStorage() {
  return {
    upload: jest.fn().mockResolvedValue(undefined),
    getPresignedUrl: jest.fn().mockResolvedValue('https://minio/presigned-url'),
    delete: jest.fn().mockResolvedValue(undefined),
  };
}

function buildSvc() {
  const prisma = makePrisma();
  const tenant = new TenantContextService();
  const audit = makeAudit();
  const storage = makeStorage();
  const svc = new AttachmentService(
    prisma as any,
    tenant,
    audit as any,
    storage as any,
  );
  return { svc, tenant, prisma, audit, storage };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

const fakeFile = {
  originalname: 'report.pdf',
  mimetype: 'application/pdf',
  size: 1024,
  buffer: Buffer.from('fake-content'),
} as Express.Multer.File;

// ─── upload ───

describe('AttachmentService.upload', () => {
  it('uploads file to storage and creates DB record with workspace scope', async () => {
    const { svc, tenant, prisma, audit, storage } = buildSvc();
    prisma.attachment.create.mockResolvedValue({
      id: 'att_1',
      workspaceId: 'ws_1',
      entityType: 'PERSON',
      entityId: 'p_1',
      originalName: 'report.pdf',
    });

    await tenant.run(ctx(), async () => {
      await svc.upload('PERSON', 'p_1', fakeFile);
    });

    expect(storage.upload).toHaveBeenCalledWith(
      expect.stringContaining('ws_1/PERSON/p_1/'),
      fakeFile.buffer,
      'application/pdf',
    );
    const args = prisma.attachment.create.mock.calls[0][0];
    expect(args.data.workspaceId).toBe('ws_1');
    expect(args.data.entityType).toBe('PERSON');
    expect(args.data.entityId).toBe('p_1');
    expect(args.data.uploadedById).toBe('u_1');
    expect(args.data.originalName).toBe('report.pdf');
    expect(args.data.mimeType).toBe('application/pdf');
    expect(args.data.sizeBytes).toBe(1024);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'Attachment', action: 'CREATE' }),
    );
  });

  it('throws BadRequestException when no tenant context', async () => {
    const { svc } = buildSvc();
    await expect(svc.upload('PERSON', 'p_1', fakeFile)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

// ─── list ───

describe('AttachmentService.list', () => {
  it('returns paginated attachments for entity scoped to workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const rows = Array.from({ length: 3 }, (_, i) => ({
      id: `att_${i}`,
      originalName: `file_${i}.pdf`,
    }));
    prisma.attachment.findMany.mockResolvedValue(rows);

    const result = await tenant.run(ctx(), async () =>
      svc.list('PERSON', 'p_1', { limit: 2 }),
    );

    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe('att_1');
    const args = prisma.attachment.findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({
      workspaceId: 'ws_1',
      entityType: 'PERSON',
      entityId: 'p_1',
      archivedAt: null,
    });
  });
});

// ─── get ───

describe('AttachmentService.get', () => {
  it('returns attachment by id', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.attachment.findUnique.mockResolvedValue({
      id: 'att_1',
      workspaceId: 'ws_1',
      archivedAt: null,
    });
    const result = await tenant.run(ctx(), async () => svc.get('att_1'));
    expect(result.id).toBe('att_1');
  });

  it('throws NotFoundException when attachment does not exist', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.attachment.findUnique.mockResolvedValue(null);
    await expect(
      tenant.run(ctx(), async () => svc.get('nonexistent')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException for wrong workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.attachment.findUnique.mockResolvedValue({
      id: 'att_1',
      workspaceId: 'OTHER',
      archivedAt: null,
    });
    await expect(
      tenant.run(ctx(), async () => svc.get('att_1')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException for archived attachment', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.attachment.findUnique.mockResolvedValue({
      id: 'att_1',
      workspaceId: 'ws_1',
      archivedAt: new Date(),
    });
    await expect(
      tenant.run(ctx(), async () => svc.get('att_1')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ─── download ───

describe('AttachmentService.download', () => {
  it('returns presigned URL for valid attachment', async () => {
    const { svc, tenant, prisma, storage } = buildSvc();
    prisma.attachment.findUnique.mockResolvedValue({
      id: 'att_1',
      workspaceId: 'ws_1',
      storagePath: 'ws_1/PERSON/p_1/abc.pdf',
      archivedAt: null,
    });

    const url = await tenant.run(ctx(), async () => svc.download('att_1'));
    expect(url).toBe('https://minio/presigned-url');
    expect(storage.getPresignedUrl).toHaveBeenCalledWith(
      'ws_1/PERSON/p_1/abc.pdf',
    );
  });

  it('throws NotFoundException for wrong workspace on download', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.attachment.findUnique.mockResolvedValue({
      id: 'att_1',
      workspaceId: 'OTHER',
      archivedAt: null,
    });
    await expect(
      tenant.run(ctx(), async () => svc.download('att_1')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ─── delete (soft) ───

describe('AttachmentService.delete', () => {
  it('soft-deletes by setting archivedAt and audits DELETE', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.attachment.findUnique.mockResolvedValue({
      id: 'att_1',
      workspaceId: 'ws_1',
      archivedAt: null,
    });
    prisma.attachment.update.mockResolvedValue({
      id: 'att_1',
      archivedAt: new Date(),
    });

    await tenant.run(ctx(), async () => {
      await svc.delete('att_1');
    });

    expect(prisma.attachment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ archivedAt: expect.any(Date) }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'Attachment', action: 'DELETE' }),
    );
  });

  it('throws NotFoundException for wrong workspace on delete', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.attachment.findUnique.mockResolvedValue({
      id: 'att_1',
      workspaceId: 'OTHER',
      archivedAt: null,
    });
    await expect(
      tenant.run(ctx(), async () => svc.delete('att_1')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
