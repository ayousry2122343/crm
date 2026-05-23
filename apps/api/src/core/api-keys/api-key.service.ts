import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { AuditService } from '../audit/audit.service';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly audit: AuditService,
  ) {}

  private requireWs() {
    const store = this.tenant.getStore();
    if (!store?.workspaceId) throw new BadRequestException('no tenant context');
    return store;
  }

  async create(dto: { name: string; scopes: string[]; expiresAt?: string }) {
    const { workspaceId, userId } = this.requireWs();
    const rawSuffix = crypto.randomBytes(24).toString('base64url');
    const rawKey = `crm_live_${rawSuffix}`;
    const prefix = rawKey.slice(0, 16);
    const keyHash = await argon2.hash(rawKey);

    const record = await this.prisma.apiKey.create({
      data: {
        workspaceId,
        name: dto.name,
        keyHash,
        prefix,
        scopes: dto.scopes,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        createdById: userId!,
      },
      select: { id: true, name: true, prefix: true, scopes: true, expiresAt: true, createdAt: true },
    });

    await this.audit.log({ action: 'CREATE', entityType: 'ApiKey', entityId: record.id });

    return { ...record, rawKey };
  }

  async list() {
    const { workspaceId } = this.requireWs();
    return this.prisma.apiKey.findMany({
      where: { workspaceId, revokedAt: null },
      select: { id: true, name: true, prefix: true, scopes: true, lastUsedAt: true, expiresAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async authenticate(rawKey: string) {
    const prefix = rawKey.slice(0, 16);
    const candidate = await this.prisma.apiKey.findFirst({
      where: { prefix },
    });

    if (!candidate) throw new UnauthorizedException('Invalid API key');
    if (candidate.revokedAt) throw new UnauthorizedException('API key revoked');

    const valid = await argon2.verify(candidate.keyHash, rawKey);
    if (!valid) throw new UnauthorizedException('Invalid API key');

    if (candidate.expiresAt && candidate.expiresAt < new Date()) {
      throw new UnauthorizedException('API key expired');
    }

    await this.prisma.apiKey.update({
      where: { id: candidate.id },
      data: { lastUsedAt: new Date() },
    });

    return { workspaceId: candidate.workspaceId, scopes: candidate.scopes, apiKeyId: candidate.id };
  }

  async revoke(id: string) {
    const { workspaceId } = this.requireWs();
    const key = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!key || key.workspaceId !== workspaceId) throw new BadRequestException('Key not found');

    await this.prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
    await this.audit.log({ action: 'DELETE', entityType: 'ApiKey', entityId: id });
  }

  async update(id: string, dto: { name?: string; scopes?: string[]; expiresAt?: string }) {
    const { workspaceId } = this.requireWs();
    const key = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!key || key.workspaceId !== workspaceId) throw new BadRequestException('Key not found');

    return this.prisma.apiKey.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.scopes && { scopes: dto.scopes }),
        ...(dto.expiresAt !== undefined && { expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null }),
      },
      select: { id: true, name: true, prefix: true, scopes: true, expiresAt: true },
    });
  }
}
