import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../core/tenant/tenant-context.service';

export interface CreateDashboardDto {
  name: string;
  layout?: { widgets: unknown[] };
  isDefault?: boolean;
}

export interface UpdateDashboardDto {
  name?: string;
  layout?: { widgets: unknown[] };
  isDefault?: boolean;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
  ) {}

  private ctx() {
    const store = this.tenant.getStore();
    if (!store) throw new BadRequestException('no tenant context');
    return store;
  }

  async list() {
    const { workspaceId, userId } = this.ctx();
    return this.prisma.dashboard.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const { workspaceId } = this.ctx();
    const row = await this.prisma.dashboard.findUnique({ where: { id } });
    if (!row || row.workspaceId !== workspaceId) {
      throw new NotFoundException('Dashboard not found');
    }
    return row;
  }

  async create(dto: CreateDashboardDto) {
    const { workspaceId, userId } = this.ctx();
    return this.prisma.dashboard.create({
      data: {
        workspaceId,
        ownerId: userId!,
        name: dto.name,
        layout: dto.layout ?? { widgets: [] },
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async update(id: string, dto: UpdateDashboardDto) {
    await this.get(id);
    return this.prisma.dashboard.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.layout !== undefined && { layout: dto.layout }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      },
    });
  }

  async delete(id: string) {
    await this.get(id);
    return this.prisma.dashboard.delete({ where: { id } });
  }
}
