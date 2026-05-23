import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { generateSecret, generateSync, verifySync, generateURI } from 'otplib';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

@Injectable()
export class TwoFactorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
  ) {}

  private requireCtx() {
    const store = this.tenant.getStore();
    if (!store?.workspaceId || !store?.userId) {
      throw new BadRequestException('no tenant context');
    }
    return store;
  }

  async setup(): Promise<{ secret: string; qrCodeUri: string }> {
    const { userId, workspaceId } = this.requireCtx();

    const existing = await this.prisma.twoFactorSecret.findUnique({ where: { userId } });
    if (existing?.enabledAt) {
      throw new BadRequestException('2FA is already enabled');
    }

    const secret = generateSecret();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const qrCodeUri = generateURI({
      secret,
      issuer: 'CRM',
      accountName: user!.email,
      type: 'totp',
    });

    if (existing) {
      await this.prisma.twoFactorSecret.update({
        where: { userId },
        data: { secret },
      });
    } else {
      await this.prisma.twoFactorSecret.create({
        data: { workspaceId, userId, secret, backupCodes: [] },
      });
    }

    return { secret, qrCodeUri };
  }

  async confirm(code: string): Promise<{ backupCodes: string[] }> {
    const { userId } = this.requireCtx();

    const record = await this.prisma.twoFactorSecret.findUnique({ where: { userId } });
    if (!record || record.enabledAt) {
      throw new BadRequestException('No pending 2FA setup');
    }

    let isValid = false;
    try {
      const result = verifySync({ token: code, secret: record.secret });
      isValid = result.valid;
    } catch {
      // invalid token format
    }
    if (!isValid) {
      throw new UnauthorizedException('Invalid TOTP code');
    }

    const rawCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase(),
    );
    const hashedCodes = await Promise.all(rawCodes.map((c) => argon2.hash(c)));

    await this.prisma.twoFactorSecret.update({
      where: { userId },
      data: { enabledAt: new Date(), backupCodes: hashedCodes },
    });

    return { backupCodes: rawCodes };
  }

  async verifyCode(userId: string, code: string): Promise<boolean> {
    const record = await this.prisma.twoFactorSecret.findUnique({ where: { userId } });
    if (!record?.enabledAt) return false;

    try {
      const result = verifySync({ token: code, secret: record.secret });
      if (result.valid) return true;
    } catch {
      // invalid token format — fall through to backup code check
    }

    for (let i = 0; i < record.backupCodes.length; i++) {
      const match = await argon2.verify(record.backupCodes[i], code);
      if (match) {
        const remaining = [...record.backupCodes];
        remaining.splice(i, 1);
        await this.prisma.twoFactorSecret.update({
          where: { id: record.id },
          data: { backupCodes: remaining },
        });
        return true;
      }
    }

    return false;
  }

  async disable(code: string): Promise<void> {
    const { userId } = this.requireCtx();

    const record = await this.prisma.twoFactorSecret.findUnique({ where: { userId } });
    if (!record?.enabledAt) {
      throw new BadRequestException('2FA is not enabled');
    }

    const valid = await this.verifyCode(userId, code);
    if (!valid) throw new UnauthorizedException('Invalid code');

    await this.prisma.twoFactorSecret.delete({ where: { id: record.id } });
  }

  async isEnabled(userId: string): Promise<boolean> {
    const record = await this.prisma.twoFactorSecret.findUnique({ where: { userId } });
    return !!record?.enabledAt;
  }

  async checkEnforcement(userId: string, workspaceRequires2FA: boolean) {
    const userHas2FA = await this.isEnabled(userId);
    return {
      enforced: workspaceRequires2FA && !userHas2FA,
      userHas2FA,
    };
  }
}
