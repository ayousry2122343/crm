import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import { StorageService } from './storage.service';
import type { AttachmentEntityType } from '@prisma/client';

@Injectable()
export class AttachmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
  ) {}

  private requireWs(): string {
    const ws = this.tenant.getStore()?.workspaceId;
    if (!ws) throw new BadRequestException('no tenant context');
    return ws;
  }

  private currentUser(): string | undefined {
    return this.tenant.getStore()?.userId;
  }

  async upload(
    entityType: AttachmentEntityType,
    entityId: string,
    file: Express.Multer.File,
  ) {
    const workspaceId = this.requireWs();
    const ext = file.originalname.includes('.')
      ? file.originalname.slice(file.originalname.lastIndexOf('.'))
      : '';
    const filename = `${randomUUID()}${ext}`;
    const storagePath = `${workspaceId}/${entityType}/${entityId}/${filename}`;

    await this.storage.upload(storagePath, file.buffer, file.mimetype);

    const row = await this.prisma.attachment.create({
      data: {
        workspaceId,
        entityType,
        entityId,
        filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storagePath,
        uploadedById: this.currentUser()!,
      },
      include: { uploadedBy: true },
    });

    await this.audit.log({
      entityType: 'Attachment',
      entityId: row.id,
      action: 'CREATE',
      newValue: { originalName: row.originalName, entityType, entityId },
    });

    return row;
  }

  async list(
    entityType: AttachmentEntityType,
    entityId: string,
    q: { cursor?: string; limit?: number } = {},
  ) {
    const workspaceId = this.requireWs();
    const limit = Math.min(q.limit ?? 50, 200);
    const where: any = { workspaceId, entityType, entityId, archivedAt: null };

    const items = await this.prisma.attachment.findMany({
      where: q.cursor ? { ...where, id: { lt: q.cursor } } : where,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
      include: { uploadedBy: true },
    });

    const hasMore = items.length > limit;
    const trimmed = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? trimmed[trimmed.length - 1]?.id ?? null : null;

    return { items: trimmed, nextCursor };
  }

  async get(id: string) {
    const workspaceId = this.requireWs();
    const att = await this.prisma.attachment.findUnique({
      where: { id },
      include: { uploadedBy: true },
    });
    if (!att || att.workspaceId !== workspaceId || att.archivedAt) {
      throw new NotFoundException();
    }
    return att;
  }

  async download(id: string): Promise<string> {
    const att = await this.get(id);
    return this.storage.getPresignedUrl(att.storagePath);
  }

  async delete(id: string) {
    const workspaceId = this.requireWs();
    const att = await this.prisma.attachment.findUnique({ where: { id } });
    if (!att || att.workspaceId !== workspaceId) {
      throw new NotFoundException();
    }

    const archived = await this.prisma.attachment.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    await this.audit.log({
      entityType: 'Attachment',
      entityId: id,
      action: 'DELETE',
    });

    return archived;
  }
}
