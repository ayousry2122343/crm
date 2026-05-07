import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import type { CreateValidationRuleDto } from './dto/create-validation-rule.dto';
import type { UpdateValidationRuleDto } from './dto/update-validation-rule.dto';

@Injectable()
export class ValidationService {
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

  async create(dto: CreateValidationRuleDto) {
    const workspaceId = this.requireWs();
    const row = await this.prisma.validationRule.create({
      data: {
        workspaceId,
        entityType: dto.entityType,
        expression: dto.expression as any,
        errorMessage: dto.errorMessage as any,
        enabled: dto.enabled ?? true,
      },
    });
    await this.audit.log({
      entityType: 'ValidationRule',
      entityId: row.id,
      action: 'CREATE',
      newValue: { entityType: row.entityType },
    });
    return row;
  }

  async list() {
    const workspaceId = this.requireWs();
    return this.prisma.validationRule.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const workspaceId = this.requireWs();
    const r = await this.prisma.validationRule.findUnique({ where: { id } });
    if (!r || r.workspaceId !== workspaceId) throw new NotFoundException();
    return r;
  }

  async update(id: string, dto: UpdateValidationRuleDto) {
    const workspaceId = this.requireWs();
    const before = await this.prisma.validationRule.findUnique({ where: { id } });
    if (!before || before.workspaceId !== workspaceId) throw new NotFoundException();

    const data: any = {};
    if (dto.expression !== undefined) data.expression = dto.expression;
    if (dto.errorMessage !== undefined) data.errorMessage = dto.errorMessage;
    if (dto.enabled !== undefined) data.enabled = dto.enabled;

    const after = await this.prisma.validationRule.update({ where: { id }, data });
    await this.audit.logUpdate('ValidationRule', id, before as any, after as any);
    return after;
  }

  async delete(id: string) {
    const workspaceId = this.requireWs();
    const r = await this.prisma.validationRule.findUnique({ where: { id } });
    if (!r || r.workspaceId !== workspaceId) throw new NotFoundException();
    await this.prisma.validationRule.delete({ where: { id } });
    await this.audit.log({ entityType: 'ValidationRule', entityId: id, action: 'DELETE' });
  }
}
