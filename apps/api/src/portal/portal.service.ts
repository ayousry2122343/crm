import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../core/tenant/tenant-context.service';
import { hashPassword, verifyPassword } from '../core/auth/password.util';
import * as jwt from 'jsonwebtoken';
import type { UpdatePortalDto, PortalRegisterDto, PortalLoginDto } from './dto/portal.dto';

@Injectable()
export class PortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly config: ConfigService,
  ) {}

  private requireWs(): string {
    const ws = this.tenant.getStore()?.workspaceId;
    if (!ws) throw new BadRequestException('no tenant context');
    return ws;
  }

  async getPortal() {
    const workspaceId = this.requireWs();
    return this.prisma.portal.findUnique({ where: { workspaceId } });
  }

  async upsertPortal(dto: UpdatePortalDto) {
    const workspaceId = this.requireWs();
    const existing = await this.prisma.portal.findUnique({ where: { workspaceId } });
    if (existing) {
      return this.prisma.portal.update({
        where: { workspaceId },
        data: {
          ...(dto.domain !== undefined ? { domain: dto.domain } : {}),
          ...(dto.theme !== undefined ? { theme: dto.theme } : {}),
          ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        },
      });
    }
    return this.prisma.portal.create({
      data: { workspaceId, domain: dto.domain, theme: dto.theme ?? {}, enabled: dto.enabled ?? false },
    });
  }

  async register(workspaceId: string, dto: PortalRegisterDto) {
    const portal = await this.prisma.portal.findUnique({ where: { workspaceId } });
    if (!portal?.enabled) throw new BadRequestException('Portal not enabled');

    const person = await this.prisma.person.findFirst({
      where: { workspaceId, emailNormalized: dto.email.toLowerCase().trim() },
    });
    if (!person) throw new NotFoundException('Contact not found');

    const existing = await this.prisma.portalUser.findUnique({
      where: { workspaceId_email: { workspaceId, email: dto.email.toLowerCase().trim() } },
    });
    if (existing) throw new BadRequestException('Already registered');

    const passwordHash = await hashPassword(dto.password);
    return this.prisma.portalUser.create({
      data: { workspaceId, personId: person.id, email: dto.email.toLowerCase().trim(), passwordHash },
    });
  }

  async login(workspaceId: string, dto: PortalLoginDto) {
    const portal = await this.prisma.portal.findUnique({ where: { workspaceId } });
    if (!portal?.enabled) throw new BadRequestException('Portal not enabled');

    const user = await this.prisma.portalUser.findUnique({
      where: { workspaceId_email: { workspaceId, email: dto.email.toLowerCase().trim() } },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await verifyPassword(user.passwordHash, dto.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.portalUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const secret = this.config.get('PORTAL_JWT_SECRET', 'portal-secret');
    const token = jwt.sign(
      { sub: user.id, personId: user.personId, workspaceId, type: 'portal' },
      secret,
      { expiresIn: '7d' },
    );
    return { token, user: { id: user.id, email: user.email, personId: user.personId } };
  }

  async getMyDeals(workspaceId: string, personId: string) {
    const person = await this.prisma.person.findUnique({ where: { id: personId } });
    if (!person || person.workspaceId !== workspaceId) return [];
    return this.prisma.deal.findMany({
      where: { workspaceId, primaryContactId: personId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getMyQuotes(workspaceId: string, personId: string) {
    return this.prisma.quote.findMany({
      where: { workspaceId, contactId: personId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { lineItems: true },
    });
  }

  async getMyActivities(workspaceId: string, personId: string) {
    return this.prisma.activity.findMany({
      where: { workspaceId, personId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getPortalProfile(workspaceId: string, personId: string) {
    return this.prisma.person.findFirst({
      where: { id: personId, workspaceId },
      select: { id: true, fullName: true, email: true, phone: true, companyName: true },
    });
  }
}
