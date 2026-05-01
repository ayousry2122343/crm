import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { AuditService } from '../audit/audit.service';
import type { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly audit: AuditService,
  ) {}

  async getCurrent() {
    const wsId = this.tenant.getStore()?.workspaceId;
    if (!wsId) throw new NotFoundException();
    const ws = await this.prisma.workspace.findUnique({ where: { id: wsId } });
    if (!ws) throw new NotFoundException();
    return ws;
  }

  async update(dto: UpdateWorkspaceDto) {
    const wsId = this.tenant.getStore()?.workspaceId;
    if (!wsId) throw new NotFoundException();
    const before = await this.prisma.workspace.findUnique({ where: { id: wsId } });
    if (!before) throw new NotFoundException();
    const after = await this.prisma.workspace.update({
      where: { id: wsId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.branding !== undefined ? { branding: dto.branding as any } : {}),
        ...(dto.primaryLocale !== undefined ? { primaryLocale: dto.primaryLocale } : {}),
        ...(dto.primaryCurrency !== undefined ? { primaryCurrency: dto.primaryCurrency } : {}),
      },
    });
    await this.audit.logUpdate('Workspace', wsId, before as any, after as any);
    return after;
  }
}
