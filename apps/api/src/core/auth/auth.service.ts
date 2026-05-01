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
}
