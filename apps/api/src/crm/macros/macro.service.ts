import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import type { CreateMacroDto } from './dto/create-macro.dto';
import type { UpdateMacroDto } from './dto/update-macro.dto';
import type { QueryMacroDto } from './dto/query-macro.dto';

@Injectable()
export class MacroService {
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

  private currentUser(): string | undefined {
    return this.tenant.getStore()?.userId;
  }

  async create(dto: CreateMacroDto) {
    const workspaceId = this.requireWs();
    const macro = await this.prisma.macro.create({
      data: {
        workspaceId,
        name: dto.name,
        content: dto.content,
        category: dto.category,
        shortcut: dto.shortcut,
        visibility: dto.visibility ?? 'PERSONAL',
        createdById: this.currentUser()!,
      },
    });

    await this.audit.log({
      entityType: 'Macro',
      entityId: macro.id,
      action: 'CREATE',
      newValue: { name: dto.name },
    });

    return macro;
  }

  async list(q: QueryMacroDto) {
    const workspaceId = this.requireWs();
    const userId = this.currentUser();
    const where: any = { workspaceId, archivedAt: null };

    if (q.search) where.name = { contains: q.search, mode: 'insensitive' };
    if (q.category) where.category = q.category;

    if (q.visibility) {
      where.visibility = q.visibility;
    } else {
      where.OR = [
        { visibility: 'GLOBAL' },
        { visibility: 'TEAM' },
        { visibility: 'PERSONAL', createdById: userId },
      ];
    }

    return this.prisma.macro.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async get(id: string) {
    const workspaceId = this.requireWs();
    const macro = await this.prisma.macro.findUnique({ where: { id } });
    if (!macro || macro.workspaceId !== workspaceId || macro.archivedAt) {
      throw new NotFoundException();
    }
    return macro;
  }

  async update(id: string, dto: UpdateMacroDto) {
    const workspaceId = this.requireWs();
    const before = await this.prisma.macro.findUnique({ where: { id } });
    if (!before || before.workspaceId !== workspaceId) throw new NotFoundException();

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.shortcut !== undefined) data.shortcut = dto.shortcut;
    if (dto.visibility !== undefined) data.visibility = dto.visibility;

    const updated = await this.prisma.macro.update({ where: { id }, data });
    await this.audit.logUpdate('Macro', id, before as any, data);
    return updated;
  }

  async archive(id: string) {
    const workspaceId = this.requireWs();
    const macro = await this.prisma.macro.findUnique({ where: { id } });
    if (!macro || macro.workspaceId !== workspaceId) throw new NotFoundException();

    const archived = await this.prisma.macro.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    await this.audit.log({ entityType: 'Macro', entityId: id, action: 'DELETE' });
    return archived;
  }
}
