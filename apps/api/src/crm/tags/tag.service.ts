import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import type { CreateTagDto, UpdateTagDto } from './dto/create-tag.dto';
import type { AssignTagDto } from './dto/assign-tag.dto';

@Injectable()
export class TagService {
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

  async create(dto: CreateTagDto) {
    const workspaceId = this.requireWs();
    const dup = await this.prisma.tag.findFirst({ where: { workspaceId, name: dto.name } });
    if (dup) throw new ConflictException(`tag "${dto.name}" already exists`);

    const row = await this.prisma.tag.create({
      data: {
        workspaceId,
        name: dto.name,
        color: dto.color ?? '#6366f1',
      },
    });
    await this.audit.log({
      entityType: 'Tag',
      entityId: row.id,
      action: 'CREATE',
      newValue: { name: row.name, color: row.color },
    });
    return row;
  }

  async list() {
    const workspaceId = this.requireWs();
    return this.prisma.tag.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' },
    });
  }

  async update(id: string, dto: UpdateTagDto) {
    const workspaceId = this.requireWs();
    const before = await this.prisma.tag.findUnique({ where: { id } });
    if (!before || before.workspaceId !== workspaceId) throw new NotFoundException();

    const data: { name?: string; color?: string } = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.color !== undefined) data.color = dto.color;

    const after = await this.prisma.tag.update({
      where: { id },
      data,
    });
    await this.audit.logUpdate('Tag', id, before as any, after as any);
    return after;
  }

  async delete(id: string) {
    const workspaceId = this.requireWs();
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag || tag.workspaceId !== workspaceId) throw new NotFoundException();
    await this.prisma.tag.delete({ where: { id } });
    await this.audit.log({ entityType: 'Tag', entityId: id, action: 'DELETE' });
    return { id };
  }

  async assign(tagId: string, dto: AssignTagDto) {
    const workspaceId = this.requireWs();
    const tag = await this.prisma.tag.findUnique({ where: { id: tagId } });
    if (!tag || tag.workspaceId !== workspaceId) throw new NotFoundException();

    const result = await this.prisma.entityTag.createMany({
      data: dto.entityIds.map((entityId) => ({
        workspaceId,
        tagId,
        entityType: dto.entityType,
        entityId,
      })),
      skipDuplicates: true,
    });
    return { count: result.count };
  }

  async unassign(tagId: string, dto: AssignTagDto) {
    const workspaceId = this.requireWs();
    const tag = await this.prisma.tag.findUnique({ where: { id: tagId } });
    if (!tag || tag.workspaceId !== workspaceId) throw new NotFoundException();

    const result = await this.prisma.entityTag.deleteMany({
      where: {
        workspaceId,
        tagId,
        entityType: dto.entityType,
        entityId: { in: dto.entityIds },
      },
    });
    return { count: result.count };
  }
}
