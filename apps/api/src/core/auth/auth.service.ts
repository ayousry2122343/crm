import { Injectable, ConflictException, UnauthorizedException, Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import slugify from 'slugify';
import { randomBytes, createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { ALL_PERMISSIONS, PERMISSIONS } from '../rbac/permissions.constants';
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

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

      // Seed default profiles for the new workspace.
      const adminProfile = await tx.profile.create({
        data: {
          workspaceId: ws.id,
          name: 'Admin',
          isSystem: true,
          permissions: ALL_PERMISSIONS,
        },
      });
      await tx.profile.create({
        data: {
          workspaceId: ws.id,
          name: 'Sales Manager',
          isSystem: true,
          permissions: [
            PERMISSIONS.PERSON_READ,
            PERMISSIONS.PERSON_WRITE,
            PERMISSIONS.COMPANY_READ,
            PERMISSIONS.COMPANY_WRITE,
            PERMISSIONS.DEAL_READ,
            PERMISSIONS.DEAL_WRITE,
            PERMISSIONS.DEAL_DELETE,
            PERMISSIONS.ACTIVITY_READ,
            PERMISSIONS.ACTIVITY_WRITE,
            PERMISSIONS.PIPELINE_WRITE,
            PERMISSIONS.LIST_READ,
            PERMISSIONS.LIST_WRITE,
            PERMISSIONS.TAG_WRITE,
            PERMISSIONS.REPORT_READ,
            PERMISSIONS.DASHBOARD_WRITE,
            PERMISSIONS.AI_USE,
          ],
        },
      });
      await tx.profile.create({
        data: {
          workspaceId: ws.id,
          name: 'Sales Rep',
          isSystem: true,
          permissions: [
            PERMISSIONS.PERSON_READ,
            PERMISSIONS.PERSON_WRITE,
            PERMISSIONS.COMPANY_READ,
            PERMISSIONS.COMPANY_WRITE,
            PERMISSIONS.DEAL_READ,
            PERMISSIONS.DEAL_WRITE,
            PERMISSIONS.ACTIVITY_READ,
            PERMISSIONS.ACTIVITY_WRITE,
            PERMISSIONS.LIST_READ,
            PERMISSIONS.REPORT_READ,
            PERMISSIONS.AI_USE,
          ],
        },
      });
      // Assign creator to Admin profile.
      await tx.userProfile.create({
        data: { workspaceId: ws.id, userId: user.id, profileId: adminProfile.id },
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

  async requestEmailVerification(userId: string, workspaceId: string): Promise<void> {
    const raw = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000); // 24h
    await this.prisma.emailVerificationToken.create({
      data: { userId, workspaceId, tokenHash, expiresAt },
    });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;
    const link = `${process.env.APP_BASE_URL ?? 'http://localhost:5174'}/verify-email?token=${raw}`;
    await this.email.send({
      to: user.email,
      subject: 'تأكيد البريد الإلكتروني | Confirm your email',
      html: `<p>اضغط الرابط لتأكيد بريدك:</p><p><a href="{{link}}">{{link}}</a></p><hr/><p>Click the link to confirm your email:</p><p><a href="{{link}}">{{link}}</a></p>`,
      text: `اضغط الرابط لتأكيد بريدك / Click to confirm: {{link}}`,
      vars: { link },
    });
  }

  async confirmEmailVerification(rawToken: string): Promise<{ ok: true }> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const stored = await this.prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.consumedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('invalid or expired token');
    }
    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: stored.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { emailVerifiedAt: new Date() },
      }),
    ]);
    return { ok: true };
  }

  async requestPasswordReset(workspaceSlug: string, email: string): Promise<{ ok: true }> {
    // Always return ok to avoid email enumeration.
    const ws = await this.prisma.workspace.findUnique({ where: { slug: workspaceSlug } });
    if (!ws) return { ok: true };
    const user = await this.prisma.user.findFirst({
      where: { workspaceId: ws.id, emailNormalized: email.trim().toLowerCase() },
    });
    if (!user) return { ok: true };

    const raw = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, workspaceId: ws.id, tokenHash, expiresAt },
    });
    const link = `${process.env.APP_BASE_URL ?? 'http://localhost:5174'}/reset-password?token=${raw}`;
    await this.email.send({
      to: user.email,
      subject: 'إعادة ضبط كلمة المرور | Password Reset',
      html: `<p>اضغط الرابط لإعادة ضبط كلمة المرور (صالح لساعة):</p><p><a href="{{link}}">{{link}}</a></p>`,
      text: `إعادة ضبط كلمة المرور: {{link}}`,
      vars: { link },
    });
    return { ok: true };
  }

  async confirmPasswordReset(rawToken: string, newPassword: string): Promise<{ ok: true }> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const stored = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.consumedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('invalid or expired token');
    }
    const passwordHash = await hashPassword(newPassword);
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { passwordHash },
      }),
      // Revoke all refresh tokens for this user — force re-login.
      this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { ok: true };
  }
}
