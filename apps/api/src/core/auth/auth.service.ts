import { Injectable, ConflictException, UnauthorizedException, Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import slugify from 'slugify';
import { randomBytes, createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword, verifyPassword } from './password.util';
import type { SignUpDto } from './dto/sign-up.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends AuthTokens {
  user: { id: string; email: string; fullName: string; workspaceId: string };
  workspace: { id: string; slug: string; name: string };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async signUp(dto: SignUpDto): Promise<AuthResult> {
    const emailNormalized = dto.email.trim().toLowerCase();
    const slugBase = slugify(dto.workspaceName, { lower: true, strict: true }) || 'workspace';
    const slug = `${slugBase}-${randomBytes(3).toString('hex')}`;
    const passwordHash = await hashPassword(dto.password);

    const created = await this.prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: { slug, name: dto.workspaceName, primaryLocale: 'ar', primaryCurrency: 'EGP' },
      });
      const user = await tx.user.create({
        data: {
          workspaceId: ws.id,
          email: dto.email,
          emailNormalized,
          fullName: dto.fullName,
          passwordHash,
          status: 'ACTIVE',
          locale: 'ar',
        },
      });
      return { ws, user };
    });

    const accessToken = this.signAccessToken(created.user.id, created.ws.id);
    const refreshToken = await this.issueRefreshToken(created.user.id, created.ws.id);

    return {
      user: {
        id: created.user.id,
        email: created.user.email,
        fullName: created.user.fullName,
        workspaceId: created.ws.id,
      },
      workspace: { id: created.ws.id, slug: created.ws.slug, name: created.ws.name },
      accessToken,
      refreshToken,
    };
  }

  signAccessToken(userId: string, workspaceId: string): string {
    return jwt.sign(
      { sub: userId, ws: workspaceId, type: 'access' },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: Number(process.env.JWT_ACCESS_TTL ?? 900) }
    );
  }

  async issueRefreshToken(userId: string, workspaceId: string): Promise<string> {
    const raw = randomBytes(48).toString('base64url');
    const tokenHash = createHash('sha256').update(raw).digest('hex');
    const ttl = Number(process.env.JWT_REFRESH_TTL ?? 2592000);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        workspaceId,
        tokenHash,
        expiresAt: new Date(Date.now() + ttl * 1000),
      },
    });
    return raw;
  }

  async login(dto: { email: string; password: string; workspaceSlug: string }): Promise<AuthResult> {
    const ws = await this.prisma.workspace.findUnique({ where: { slug: dto.workspaceSlug } });
    if (!ws) throw new UnauthorizedException('invalid credentials');
    const user = await this.prisma.user.findFirst({
      where: { workspaceId: ws.id, emailNormalized: dto.email.trim().toLowerCase() },
    });
    if (!user) throw new UnauthorizedException('invalid credentials');
    const ok = await verifyPassword(user.passwordHash, dto.password);
    if (!ok) throw new UnauthorizedException('invalid credentials');
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('user disabled');

    const accessToken = this.signAccessToken(user.id, ws.id);
    const refreshToken = await this.issueRefreshToken(user.id, ws.id);
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return {
      user: { id: user.id, email: user.email, fullName: user.fullName, workspaceId: ws.id },
      workspace: { id: ws.id, slug: ws.slug, name: ws.name },
      accessToken,
      refreshToken,
    };
  }

  async refresh(dto: { refreshToken: string }): Promise<AuthTokens> {
    const tokenHash = createHash('sha256').update(dto.refreshToken).digest('hex');
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('invalid refresh token');
    }
    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    const accessToken = this.signAccessToken(stored.userId, stored.workspaceId);
    const refreshToken = await this.issueRefreshToken(stored.userId, stored.workspaceId);
    return { accessToken, refreshToken };
  }

  async logout(refreshToken: string): Promise<{ ok: true }> {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }
}
