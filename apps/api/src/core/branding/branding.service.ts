import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { DEFAULT_BRANDING, WorkspaceBranding } from './branding.interface';

@Injectable()
export class BrandingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
  ) {}

  private requireWs(): string {
    const ws = this.tenant.getStore()?.workspaceId;
    if (!ws) throw new BadRequestException('no tenant context');
    return ws;
  }

  async resolve(): Promise<WorkspaceBranding> {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: this.requireWs() },
      select: { branding: true },
    });
    const stored = (ws?.branding || {}) as Partial<WorkspaceBranding>;
    return { ...DEFAULT_BRANDING, ...stored };
  }

  async update(partial: Partial<WorkspaceBranding>): Promise<WorkspaceBranding> {
    const current = await this.resolve();
    const merged = { ...current, ...partial };
    await this.prisma.workspace.update({
      where: { id: this.requireWs() },
      data: { branding: merged },
    });
    return merged;
  }

  async resolveBySlug(slug: string): Promise<WorkspaceBranding> {
    const ws = await this.prisma.workspace.findUnique({
      where: { slug },
      select: { branding: true },
    });
    const stored = (ws?.branding || {}) as Partial<WorkspaceBranding>;
    return { ...DEFAULT_BRANDING, ...stored };
  }
}
