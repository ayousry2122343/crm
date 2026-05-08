import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import type { CreateSequenceDto } from './dto/create-sequence.dto';
import type { UpdateSequenceDto } from './dto/update-sequence.dto';
import type { QuerySequenceDto } from './dto/query-sequence.dto';

@Injectable()
export class SequenceService {
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

  private parseSort(sort?: string): any {
    if (!sort) return { createdAt: 'desc' };
    const fields = sort.split(',').map((s) => s.trim()).filter(Boolean);
    if (fields.length === 0) return { createdAt: 'desc' };
    return fields.map((f) => {
      if (f.startsWith('-')) return { [f.slice(1)]: 'desc' };
      return { [f]: 'asc' };
    });
  }

  private computeNextRun(step: any): Date {
    const now = new Date();
    const delayMs =
      step.delayUnit === 'days'
        ? step.delay * 86400000
        : step.delay * 3600000;
    return new Date(now.getTime() + delayMs);
  }

  async create(dto: CreateSequenceDto) {
    const workspaceId = this.requireWs();
    const sequence = await this.prisma.sequence.create({
      data: {
        workspaceId,
        name: dto.name,
        triggerEvent: dto.triggerEvent,
        steps: dto.steps ?? [],
        enabled: dto.enabled ?? false,
        createdById: this.currentUser(),
      },
    });

    await this.audit.log({
      entityType: 'Sequence',
      entityId: sequence.id,
      action: 'CREATE',
      newValue: { name: dto.name },
    });

    return sequence;
  }

  async list(q: QuerySequenceDto) {
    const workspaceId = this.requireWs();
    const limit = Math.min(q.limit ?? 50, 200);
    const where: any = { workspaceId, archivedAt: null };

    const orderBy = this.parseSort(q.sort);

    const items = await this.prisma.sequence.findMany({
      where: q.cursor ? { ...where, id: { lt: q.cursor } } : where,
      take: limit + 1,
      orderBy,
      include: { _count: { select: { enrollments: true } } },
    });

    const hasMore = items.length > limit;
    const trimmed = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? trimmed[trimmed.length - 1]?.id ?? null : null;
    return { items: trimmed, nextCursor, hasMore };
  }

  async get(id: string) {
    const workspaceId = this.requireWs();
    const sequence = await this.prisma.sequence.findUnique({
      where: { id },
      include: {
        _count: { select: { enrollments: true } },
        enrollments: {
          take: 50,
          orderBy: { createdAt: 'desc' },
          include: { person: { select: { fullName: true, email: true } } },
        },
      },
    });
    if (!sequence || sequence.workspaceId !== workspaceId || sequence.archivedAt) {
      throw new NotFoundException();
    }
    return sequence;
  }

  async update(id: string, dto: UpdateSequenceDto) {
    const workspaceId = this.requireWs();
    const before = await this.prisma.sequence.findUnique({ where: { id } });
    if (!before || before.workspaceId !== workspaceId) throw new NotFoundException();

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.triggerEvent !== undefined) data.triggerEvent = dto.triggerEvent;
    if (dto.steps !== undefined) data.steps = dto.steps;
    if (dto.enabled !== undefined) data.enabled = dto.enabled;

    const updated = await this.prisma.sequence.update({ where: { id }, data });
    await this.audit.logUpdate('Sequence', id, before as any, data);
    return updated;
  }

  async enroll(sequenceId: string, personId: string) {
    const workspaceId = this.requireWs();
    const sequence = await this.prisma.sequence.findUnique({ where: { id: sequenceId } });
    if (!sequence || sequence.workspaceId !== workspaceId) throw new NotFoundException();

    const steps = sequence.steps as any[];
    if (steps.length === 0) {
      throw new BadRequestException('Sequence has no steps');
    }

    const person = await this.prisma.person.findUnique({ where: { id: personId } });
    if (!person || person.workspaceId !== workspaceId) {
      throw new BadRequestException('Invalid person');
    }

    const existing = await this.prisma.sequenceEnrollment.findUnique({
      where: { sequenceId_personId: { sequenceId, personId } },
    });
    if (existing && existing.status === 'ACTIVE') {
      throw new ConflictException('Person already enrolled');
    }

    const nextRunAt = this.computeNextRun(steps[0]);

    if (existing) {
      return this.prisma.sequenceEnrollment.update({
        where: { id: existing.id },
        data: {
          status: 'ACTIVE',
          currentStep: 0,
          nextRunAt,
          exitedAt: null,
          exitReason: null,
          completedAt: null,
        },
      });
    }

    return this.prisma.sequenceEnrollment.create({
      data: {
        workspaceId,
        sequenceId,
        personId,
        currentStep: 0,
        nextRunAt,
      },
    });
  }

  async pauseEnrollment(enrollmentId: string) {
    const workspaceId = this.requireWs();
    const enrollment = await this.prisma.sequenceEnrollment.findUnique({
      where: { id: enrollmentId },
    });
    if (!enrollment || enrollment.workspaceId !== workspaceId) throw new NotFoundException();
    if (enrollment.status !== 'ACTIVE') {
      throw new BadRequestException('Only ACTIVE enrollments can be paused');
    }

    return this.prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: { status: 'PAUSED', nextRunAt: null },
    });
  }

  async resumeEnrollment(enrollmentId: string) {
    const workspaceId = this.requireWs();
    const enrollment = await this.prisma.sequenceEnrollment.findUnique({
      where: { id: enrollmentId },
    });
    if (!enrollment || enrollment.workspaceId !== workspaceId) throw new NotFoundException();
    if (enrollment.status !== 'PAUSED') {
      throw new BadRequestException('Only PAUSED enrollments can be resumed');
    }

    const sequence = await this.prisma.sequence.findUnique({
      where: { id: enrollment.sequenceId },
    });
    const steps = (sequence?.steps as any[]) ?? [];
    const step = steps[enrollment.currentStep];
    const nextRunAt = step ? this.computeNextRun(step) : null;

    return this.prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: { status: 'ACTIVE', nextRunAt },
    });
  }

  async exitEnrollment(enrollmentId: string, reason = 'manual') {
    const workspaceId = this.requireWs();
    const enrollment = await this.prisma.sequenceEnrollment.findUnique({
      where: { id: enrollmentId },
    });
    if (!enrollment || enrollment.workspaceId !== workspaceId) throw new NotFoundException();

    return this.prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'EXITED',
        exitedAt: new Date(),
        exitReason: reason,
        nextRunAt: null,
      },
    });
  }

  async processStep(enrollmentId: string) {
    const enrollment = await this.prisma.sequenceEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { sequence: true, person: true },
    });
    if (!enrollment || enrollment.status !== 'ACTIVE') return;

    const steps = enrollment.sequence.steps as any[];
    const currentStep = steps[enrollment.currentStep];
    if (!currentStep) {
      await this.prisma.sequenceEnrollment.update({
        where: { id: enrollmentId },
        data: { status: 'COMPLETED', completedAt: new Date(), nextRunAt: null },
      });
      return;
    }

    // Execute step action (placeholder — in production, integrate with email/field services)
    // For now, just advance to next step
    const nextStepIdx = enrollment.currentStep + 1;
    const nextStep = steps[nextStepIdx];

    if (nextStep) {
      const nextRunAt = this.computeNextRun(nextStep);
      await this.prisma.sequenceEnrollment.update({
        where: { id: enrollmentId },
        data: { currentStep: nextStepIdx, nextRunAt },
      });
    } else {
      await this.prisma.sequenceEnrollment.update({
        where: { id: enrollmentId },
        data: { status: 'COMPLETED', completedAt: new Date(), nextRunAt: null },
      });
    }
  }

  async archive(id: string) {
    const workspaceId = this.requireWs();
    const sequence = await this.prisma.sequence.findUnique({ where: { id } });
    if (!sequence || sequence.workspaceId !== workspaceId) throw new NotFoundException();

    const archived = await this.prisma.sequence.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    await this.audit.log({
      entityType: 'Sequence',
      entityId: id,
      action: 'DELETE',
    });

    return archived;
  }
}
