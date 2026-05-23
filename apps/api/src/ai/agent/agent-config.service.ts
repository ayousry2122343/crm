import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import type { CreateAgentConfigDto } from './dto/create-agent-config.dto';

@Injectable()
export class AgentConfigService {
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

  async create(dto: CreateAgentConfigDto) {
    const workspaceId = this.requireWs();
    const config = await this.prisma.agentConfig.create({
      data: {
        workspaceId,
        name: dto.name,
        type: dto.type as any,
        provider: dto.provider,
        model: dto.model,
        systemPrompt: dto.systemPrompt,
        tools: dto.tools,
        enabled: dto.enabled ?? false,
        queueIds: dto.queueIds,
        maxTurnsBeforeEscalation: dto.maxTurnsBeforeEscalation ?? 5,
        confidenceThreshold: dto.confidenceThreshold ?? 0.7,
        responseLanguage: dto.responseLanguage ?? 'auto',
        createdById: this.currentUser()!,
      },
    });

    await this.audit.log({
      entityType: 'AgentConfig',
      entityId: config.id,
      action: 'CREATE',
      newValue: { name: dto.name, type: dto.type },
    });

    return config;
  }

  async list() {
    const workspaceId = this.requireWs();
    return this.prisma.agentConfig.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const workspaceId = this.requireWs();
    const config = await this.prisma.agentConfig.findUnique({ where: { id } });
    if (!config || config.workspaceId !== workspaceId) throw new NotFoundException();
    return config;
  }

  async update(id: string, dto: Partial<CreateAgentConfigDto>) {
    const workspaceId = this.requireWs();
    const before = await this.prisma.agentConfig.findUnique({ where: { id } });
    if (!before || before.workspaceId !== workspaceId) throw new NotFoundException();

    const updated = await this.prisma.agentConfig.update({
      where: { id },
      data: dto as any,
    });

    await this.audit.logUpdate('AgentConfig', id, before as any, dto as any);
    return updated;
  }

  async getDashboardStats() {
    const workspaceId = this.requireWs();
    const [total, active, escalated, resolved] = await Promise.all([
      this.prisma.agentSession.count({ where: { workspaceId } }),
      this.prisma.agentSession.count({ where: { workspaceId, status: 'ACTIVE' } }),
      this.prisma.agentSession.count({ where: { workspaceId, status: 'ESCALATED' } }),
      this.prisma.agentSession.count({ where: { workspaceId, status: 'RESOLVED' } }),
    ]);
    return {
      totalSessions: total,
      activeSessions: active,
      escalatedSessions: escalated,
      resolvedSessions: resolved,
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
      escalationRate: total > 0 ? Math.round((escalated / total) * 100) : 0,
    };
  }
}
