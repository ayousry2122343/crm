import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import type { CreateFormDto } from './dto/create-form.dto';
import type { UpdateFormDto } from './dto/update-form.dto';

@Injectable()
export class FormService {
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

  async create(dto: CreateFormDto) {
    const workspaceId = this.requireWs();
    const row = await this.prisma.form.create({
      data: {
        workspaceId,
        name: dto.name,
        slug: dto.slug,
        isPublic: dto.isPublic ?? true,
        redirectUrl: dto.redirectUrl ?? null,
        fields: dto.fields as any,
        mappings: (dto.mappings as any) ?? {},
        successMessage: dto.successMessage as any ?? null,
        useHoneypot: dto.useHoneypot ?? true,
        rateLimit: dto.rateLimit ?? 5,
      },
    });
    await this.audit.log({
      entityType: 'Form',
      entityId: row.id,
      action: 'CREATE',
      newValue: { name: row.name, slug: row.slug },
    });
    return row;
  }

  async list() {
    const workspaceId = this.requireWs();
    return this.prisma.form.findMany({
      where: { workspaceId, archivedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { submissions: true } } },
    });
  }

  async get(id: string) {
    const workspaceId = this.requireWs();
    const f = await this.prisma.form.findUnique({ where: { id } });
    if (!f || f.workspaceId !== workspaceId) throw new NotFoundException();
    return f;
  }

  async getBySlug(slug: string, workspaceId: string) {
    const f = await this.prisma.form.findUnique({
      where: { workspaceId_slug: { workspaceId, slug } },
    });
    if (!f || !f.isPublic || f.archivedAt) throw new NotFoundException();
    return f;
  }

  async update(id: string, dto: UpdateFormDto) {
    const workspaceId = this.requireWs();
    const before = await this.prisma.form.findUnique({ where: { id } });
    if (!before || before.workspaceId !== workspaceId) throw new NotFoundException();

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.isPublic !== undefined) data.isPublic = dto.isPublic;
    if (dto.redirectUrl !== undefined) data.redirectUrl = dto.redirectUrl;
    if (dto.fields !== undefined) data.fields = dto.fields;
    if (dto.mappings !== undefined) data.mappings = dto.mappings;
    if (dto.successMessage !== undefined) data.successMessage = dto.successMessage;
    if (dto.useHoneypot !== undefined) data.useHoneypot = dto.useHoneypot;
    if (dto.rateLimit !== undefined) data.rateLimit = dto.rateLimit;

    const after = await this.prisma.form.update({ where: { id }, data });
    await this.audit.logUpdate('Form', id, before as any, after as any);
    return after;
  }

  async archive(id: string) {
    const workspaceId = this.requireWs();
    const f = await this.prisma.form.findUnique({ where: { id } });
    if (!f || f.workspaceId !== workspaceId) throw new NotFoundException();
    await this.prisma.form.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
    await this.audit.log({ entityType: 'Form', entityId: id, action: 'DELETE' });
  }
}
