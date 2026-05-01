import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { AuthService, type AuthResult } from '../auth/auth.service';
import { hashPassword } from '../auth/password.util';
import type { InviteUserDto } from './dto/invite-user.dto';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
    private readonly auth: AuthService,
  ) {}

  private requireWs(): string {
    const ws = this.tenant.getStore()?.workspaceId;
    if (!ws) throw new NotFoundException('no tenant context');
    return ws;
  }

  /**
   * Invites a user to the workspace by email. Generates a 7-day token whose
   * sha256 hash is stored, and emails the recipient a link with the raw token.
   * Dedupes against active users + outstanding invites.
   */
  async invite(dto: InviteUserDto, invitedByUserId: string) {
    const workspaceId = this.requireWs();
    const emailNormalized = dto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findFirst({
      where: { workspaceId, emailNormalized },
    });
    if (existingUser) {
      throw new ConflictException(`user with email ${dto.email} already exists in workspace`);
    }

    const existingInvite = await this.prisma.userInvite.findFirst({
      where: { workspaceId, emailNormalized, acceptedAt: null },
    });
    if (existingInvite) {
      throw new ConflictException(`a pending invite for ${dto.email} already exists`);
    }

    const raw = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    const invite = await this.prisma.userInvite.create({
      data: {
        workspaceId,
        email: dto.email,
        emailNormalized,
        fullName: dto.fullName,
        invitedById: invitedByUserId,
        tokenHash,
        expiresAt,
      },
    });

    const link = `${process.env.APP_BASE_URL ?? 'http://localhost:5174'}/accept-invite?token=${raw}`;
    await this.email.send({
      to: dto.email,
      subject: 'دعوة للانضمام | You are invited to join the CRM',
      html: `<p>تمت دعوتك للانضمام للمساحة. اضغط الرابط لإكمال التسجيل (صالح لمدة ٧ أيام):</p><p><a href="{{link}}">{{link}}</a></p><hr/><p>You have been invited to join the workspace. Click the link to complete sign-up (valid 7 days):</p><p><a href="{{link}}">{{link}}</a></p>`,
      text: `Accept invite: {{link}}`,
      vars: { link },
    });

    await this.audit.log({
      entityType: 'UserInvite',
      entityId: invite.id,
      action: 'CREATE',
      newValue: { email: dto.email, fullName: dto.fullName },
    });

    return { id: invite.id, email: invite.email, expiresAt: invite.expiresAt };
  }

  /**
   * Accepts an invite by raw token. Creates the user as ACTIVE with
   * emailVerifiedAt=now (since the link itself proves email ownership) and
   * signs an access + refresh token pair so the user is logged in immediately.
   */
  async acceptInvite(rawToken: string, password: string): Promise<AuthResult> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const invite = await this.prisma.userInvite.findUnique({ where: { tokenHash } });
    if (!invite) throw new UnauthorizedException('invalid or expired invite');
    if (invite.acceptedAt) throw new UnauthorizedException('invite already accepted/expired');
    if (invite.expiresAt < new Date()) throw new UnauthorizedException('invite expired');

    const passwordHash = await hashPassword(password);

    const created = await this.prisma.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          workspaceId: invite.workspaceId,
          email: invite.email,
          emailNormalized: invite.emailNormalized,
          fullName: invite.fullName,
          passwordHash,
          status: 'ACTIVE',
          locale: 'ar',
          emailVerifiedAt: new Date(),
        },
      });
      await tx.userInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });

      // Best-effort assignment to the Sales Rep profile (the lowest-privilege
      // default). Falls back to no profile if Sales Rep is missing.
      const repProfile = await tx.profile.findFirst({
        where: { workspaceId: invite.workspaceId, name: 'Sales Rep' },
      });
      if (repProfile) {
        await tx.userProfile.create({
          data: {
            workspaceId: invite.workspaceId,
            userId: user.id,
            profileId: repProfile.id,
          },
        });
      }
      return user;
    });

    const accessToken = this.auth.signAccessToken(created.id, invite.workspaceId);
    const refreshToken = await this.auth.issueRefreshToken(created.id, invite.workspaceId);

    const ws = await this.prisma.workspace.findUnique({ where: { id: invite.workspaceId } });
    return {
      user: {
        id: created.id,
        email: created.email,
        fullName: created.fullName,
        workspaceId: invite.workspaceId,
      },
      workspace: {
        id: invite.workspaceId,
        slug: ws?.slug ?? '',
        name: ws?.name ?? '',
      },
      accessToken,
      refreshToken,
    };
  }

  async list() {
    const workspaceId = this.requireWs();
    const [members, invites] = await Promise.all([
      this.prisma.user.findMany({
        where: { workspaceId },
        select: {
          id: true,
          email: true,
          fullName: true,
          status: true,
          emailVerifiedAt: true,
          lastLoginAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.userInvite.findMany({
        where: { workspaceId, acceptedAt: null },
        select: {
          id: true,
          email: true,
          fullName: true,
          expiresAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return { members, invites };
  }
}
