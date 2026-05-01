import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import { MetadataService } from '../../core/metadata/metadata.service';
import { computeFullName, normalizeEmail, normalizePhone } from './normalize.util';
import type { CreatePersonDto } from './dto/create-person.dto';
import type { UpdatePersonDto } from './dto/update-person.dto';
import type { QueryPersonDto } from './dto/query-person.dto';
import type { MergePeopleDto } from './dto/merge-people.dto';

@Injectable()
export class PersonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly audit: AuditService,
    private readonly metadata: MetadataService,
  ) {}

  private requireWs(): string {
    const ws = this.tenant.getStore()?.workspaceId;
    if (!ws) throw new BadRequestException('no tenant context');
    return ws;
  }

  private currentUser(): string | undefined {
    return this.tenant.getStore()?.userId;
  }

  async create(dto: CreatePersonDto) {
    const workspaceId = this.requireWs();
    const isCompany = dto.isCompany ?? false;

    if (isCompany && !dto.companyName) {
      throw new BadRequestException('companyName is required when isCompany=true');
    }
    if (
      !isCompany &&
      !dto.firstName &&
      !dto.lastName &&
      !dto.email &&
      !dto.companyName
    ) {
      throw new BadRequestException(
        'Person needs at least one of: firstName, lastName, email, companyName',
      );
    }

    if (dto.customFields) {
      await this.validateCustomFields(isCompany ? 'Company' : 'Person', dto.customFields);
    }

    const fullName = computeFullName({
      isCompany,
      firstName: dto.firstName,
      lastName: dto.lastName,
      companyName: dto.companyName,
      email: dto.email,
    });

    const row = await this.prisma.person.create({
      data: {
        workspaceId,
        isCompany,
        parentId: dto.parentId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        fullName,
        companyName: dto.companyName,
        email: dto.email,
        emailNormalized: normalizeEmail(dto.email ?? null),
        phone: dto.phone,
        phoneNormalized: normalizePhone(dto.phone ?? null),
        title: dto.title,
        industry: dto.industry,
        website: dto.website,
        address: (dto.address ?? undefined) as any,
        lifecycleStage: dto.lifecycleStage ?? 'LEAD',
        source: dto.source,
        ownerId: dto.ownerId,
        customFields: (dto.customFields ?? {}) as any,
        doNotContact: dto.doNotContact ?? false,
        createdById: this.currentUser(),
      },
    });

    await this.audit.log({
      entityType: isCompany ? 'Company' : 'Person',
      entityId: row.id,
      action: 'CREATE',
      newValue: { fullName: row.fullName, lifecycleStage: row.lifecycleStage },
    });

    return row;
  }

  async list(q: QueryPersonDto) {
    const workspaceId = this.requireWs();
    const limit = Math.min(q.limit ?? 50, 200);
    const where: any = { workspaceId, archivedAt: null };
    if (q.isCompany !== undefined) where.isCompany = q.isCompany;
    if (q.ownerId) where.ownerId = q.ownerId;
    if (q.lifecycleStage) where.lifecycleStage = q.lifecycleStage;
    if (q.search) {
      const search = q.search.trim();
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { emailNormalized: { contains: search.toLowerCase() } },
        { phoneNormalized: { contains: search.replace(/[\s\-().]/g, '') } },
      ];
    }

    const orderBy = this.parseSort(q.sort);

    const items = await this.prisma.person.findMany({
      where: q.cursor ? { ...where, id: { lt: q.cursor } } : where,
      take: limit + 1,
      orderBy,
    });

    const hasMore = items.length > limit;
    const trimmed = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? trimmed[trimmed.length - 1]?.id ?? null : null;

    return { items: trimmed, nextCursor };
  }

  private parseSort(sort?: string): any {
    if (!sort) return { createdAt: 'desc' };
    const fields = sort
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (fields.length === 0) return { createdAt: 'desc' };
    return fields.map((f) => {
      if (f.startsWith('-')) return { [f.slice(1)]: 'desc' };
      return { [f]: 'asc' };
    });
  }

  async get(id: string) {
    const workspaceId = this.requireWs();
    const p = await this.prisma.person.findUnique({ where: { id } });
    if (!p || p.workspaceId !== workspaceId || p.archivedAt) {
      throw new NotFoundException();
    }
    return p;
  }

  async update(id: string, dto: UpdatePersonDto) {
    const workspaceId = this.requireWs();
    const before = await this.prisma.person.findUnique({ where: { id } });
    if (!before || before.workspaceId !== workspaceId) throw new NotFoundException();

    if (dto.customFields) {
      await this.validateCustomFields(
        before.isCompany ? 'Company' : 'Person',
        dto.customFields,
      );
    }

    const merged = {
      isCompany: before.isCompany,
      firstName: dto.firstName !== undefined ? dto.firstName : before.firstName,
      lastName: dto.lastName !== undefined ? dto.lastName : before.lastName,
      companyName: dto.companyName !== undefined ? dto.companyName : before.companyName,
      email: dto.email !== undefined ? dto.email : before.email,
    };
    const fullName = computeFullName(merged);

    const data: any = {
      fullName,
      updatedById: this.currentUser(),
    };
    if (dto.isCompany !== undefined) data.isCompany = dto.isCompany;
    if (dto.parentId !== undefined) data.parentId = dto.parentId;
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.companyName !== undefined) data.companyName = dto.companyName;
    if (dto.email !== undefined) {
      data.email = dto.email;
      data.emailNormalized = normalizeEmail(dto.email ?? null);
    }
    if (dto.phone !== undefined) {
      data.phone = dto.phone;
      data.phoneNormalized = normalizePhone(dto.phone ?? null);
    }
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.industry !== undefined) data.industry = dto.industry;
    if (dto.website !== undefined) data.website = dto.website;
    if (dto.address !== undefined) data.address = dto.address as any;
    if (dto.lifecycleStage !== undefined) data.lifecycleStage = dto.lifecycleStage;
    if (dto.source !== undefined) data.source = dto.source;
    if (dto.ownerId !== undefined) data.ownerId = dto.ownerId;
    if (dto.customFields !== undefined) data.customFields = dto.customFields as any;
    if (dto.doNotContact !== undefined) data.doNotContact = dto.doNotContact;

    const after = await this.prisma.person.update({
      where: { id },
      data,
    });

    await this.audit.logUpdate(
      before.isCompany ? 'Company' : 'Person',
      id,
      before as any,
      after as any,
    );

    return after;
  }

  async archive(id: string) {
    const workspaceId = this.requireWs();
    const p = await this.prisma.person.findUnique({ where: { id } });
    if (!p || p.workspaceId !== workspaceId) throw new NotFoundException();
    const archived = await this.prisma.person.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
    await this.audit.log({
      entityType: p.isCompany ? 'Company' : 'Person',
      entityId: id,
      action: 'DELETE',
    });
    return archived;
  }

  async findDuplicates(email?: string, phone?: string): Promise<{ items: unknown[] }> {
    const workspaceId = this.requireWs();
    const conditions: Array<Record<string, string>> = [];
    if (email) {
      const e = normalizeEmail(email);
      if (e) conditions.push({ emailNormalized: e });
    }
    if (phone) {
      const p = normalizePhone(phone);
      if (p) conditions.push({ phoneNormalized: p });
    }
    if (conditions.length === 0) return { items: [] };
    const items = await this.prisma.person.findMany({
      where: { workspaceId, archivedAt: null, OR: conditions },
      take: 50,
    });
    return { items };
  }

  async merge(dto: MergePeopleDto) {
    const workspaceId = this.requireWs();
    const primary = await this.prisma.person.findUnique({ where: { id: dto.primaryId } });
    if (!primary || primary.workspaceId !== workspaceId) throw new NotFoundException();
    if (dto.mergedIds.includes(dto.primaryId)) {
      throw new BadRequestException('cannot merge primary into itself');
    }

    return this.prisma.$transaction(async (tx: any) => {
      for (const mergedId of dto.mergedIds) {
        const m = await tx.person.findUnique({ where: { id: mergedId } });
        if (!m || m.workspaceId !== workspaceId) continue;

        await tx.person.update({
          where: { id: mergedId },
          data: { archivedAt: new Date() },
        });

        await this.audit.log({
          entityType: 'Person',
          entityId: mergedId,
          action: 'DELETE',
          newValue: { mergedInto: dto.primaryId },
        });
      }
      return tx.person.findUnique({ where: { id: dto.primaryId } });
    });
  }

  private async validateCustomFields(
    entityType: string,
    customFields: Record<string, unknown>,
  ): Promise<void> {
    const meta = await this.metadata.getEntity(entityType);
    const validKeys = new Set(meta.fields.map((f) => f.key));
    const unknown = Object.keys(customFields).filter((k) => !validKeys.has(k));
    if (unknown.length > 0) {
      throw new BadRequestException(`unknown custom field keys: ${unknown.join(', ')}`);
    }
  }
}
