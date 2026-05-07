import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import type { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import type { UpdateEmailTemplateDto } from './dto/update-email-template.dto';

@Injectable()
export class EmailTemplateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly audit: AuditService,
  ) {}

  private requireWs(): string {
    const ws = this.tenant.getStore()?.workspaceId;
    if (!ws) throw new BadRequestException('no tenant context');
    return ws;
  }

  renderTemplate(template: string, context: Record<string, unknown>): string {
    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path: string) => {
      const parts = path.split('.');
      let val: unknown = context;
      for (const part of parts) {
        if (val == null || typeof val !== 'object') return '';
        val = (val as Record<string, unknown>)[part];
      }
      return val != null ? String(val) : '';
    });
  }

  async create(dto: CreateEmailTemplateDto) {
    const workspaceId = this.requireWs();
    const row = await this.prisma.emailTemplate.create({
      data: {
        workspaceId,
        name: dto.name,
        subject: dto.subject,
        body: dto.body,
        mergeTagKeys: dto.mergeTagKeys ?? [],
        category: dto.category ?? null,
      },
    });
    await this.audit.log({
      entityType: 'EmailTemplate',
      entityId: row.id,
      action: 'CREATE',
      newValue: { name: row.name },
    });
    return row;
  }

  async list() {
    const workspaceId = this.requireWs();
    return this.prisma.emailTemplate.findMany({
      where: { workspaceId, archivedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const workspaceId = this.requireWs();
    const t = await this.prisma.emailTemplate.findUnique({ where: { id } });
    if (!t || t.workspaceId !== workspaceId) throw new NotFoundException();
    return t;
  }

  async update(id: string, dto: UpdateEmailTemplateDto) {
    const workspaceId = this.requireWs();
    const before = await this.prisma.emailTemplate.findUnique({ where: { id } });
    if (!before || before.workspaceId !== workspaceId) throw new NotFoundException();

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.subject !== undefined) data.subject = dto.subject;
    if (dto.body !== undefined) data.body = dto.body;
    if (dto.mergeTagKeys !== undefined) data.mergeTagKeys = dto.mergeTagKeys;
    if (dto.category !== undefined) data.category = dto.category;

    const after = await this.prisma.emailTemplate.update({ where: { id }, data });
    await this.audit.logUpdate('EmailTemplate', id, before as any, after as any);
    return after;
  }

  async archive(id: string) {
    const workspaceId = this.requireWs();
    const t = await this.prisma.emailTemplate.findUnique({ where: { id } });
    if (!t || t.workspaceId !== workspaceId) throw new NotFoundException();
    await this.prisma.emailTemplate.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
    await this.audit.log({ entityType: 'EmailTemplate', entityId: id, action: 'DELETE' });
  }
}
