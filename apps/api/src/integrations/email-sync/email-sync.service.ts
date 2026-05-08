import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import type { ConnectAccountDto } from './dto/connect-account.dto';
import type { QueryThreadsDto } from './dto/query-threads.dto';

@Injectable()
export class EmailSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly audit: AuditService,
  ) {}

  private ctx() {
    const store = this.tenant.getStore();
    if (!store?.workspaceId || !store?.userId) throw new BadRequestException('no tenant context');
    return { workspaceId: store.workspaceId, userId: store.userId };
  }

  async connectAccount(dto: ConnectAccountDto) {
    const { workspaceId, userId } = this.ctx();
    const existing = await this.prisma.emailAccount.findUnique({
      where: { workspaceId_userId_emailAddress: { workspaceId, userId, emailAddress: dto.emailAddress } },
    });
    if (existing) throw new BadRequestException('Account already connected');

    const row = await this.prisma.emailAccount.create({
      data: {
        workspaceId,
        userId,
        provider: dto.provider,
        emailAddress: dto.emailAddress,
        credentials: { accessToken: dto.accessToken, refreshToken: dto.refreshToken ?? null },
      },
    });
    await this.audit.log({ entityType: 'EmailAccount', entityId: row.id, action: 'CREATE', newValue: { provider: dto.provider, emailAddress: dto.emailAddress } });
    return row;
  }

  async listAccounts() {
    const { workspaceId, userId } = this.ctx();
    return this.prisma.emailAccount.findMany({
      where: { workspaceId, userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAccount(id: string) {
    const { workspaceId, userId } = this.ctx();
    const acc = await this.prisma.emailAccount.findUnique({ where: { id } });
    if (!acc || acc.workspaceId !== workspaceId || acc.userId !== userId) throw new NotFoundException();
    return acc;
  }

  async disconnectAccount(id: string) {
    const { workspaceId, userId } = this.ctx();
    const acc = await this.prisma.emailAccount.findUnique({ where: { id } });
    if (!acc || acc.workspaceId !== workspaceId || acc.userId !== userId) throw new NotFoundException();
    await this.prisma.emailAccount.delete({ where: { id } });
    await this.audit.log({ entityType: 'EmailAccount', entityId: id, action: 'DELETE' });
  }

  async listThreads(dto: QueryThreadsDto) {
    const { workspaceId, userId } = this.ctx();
    const limit = dto.limit ?? 25;
    const where: any = {
      workspaceId,
      account: { userId },
      ...(dto.personId ? { personId: dto.personId } : {}),
    };
    const rows = await this.prisma.emailThread.findMany({
      where,
      include: { messages: { orderBy: { receivedAt: 'asc' } }, person: { select: { id: true, fullName: true, email: true } } },
      orderBy: { lastMessageAt: 'desc' },
      take: limit + 1,
      ...(dto.cursor ? { cursor: { id: dto.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    return { data, hasMore, nextCursor: hasMore ? data[data.length - 1].id : null };
  }

  async getThread(id: string) {
    const { workspaceId, userId } = this.ctx();
    const thread = await this.prisma.emailThread.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { receivedAt: 'asc' } },
        person: { select: { id: true, fullName: true, email: true } },
        account: { select: { id: true, emailAddress: true, provider: true } },
      },
    });
    if (!thread || thread.workspaceId !== workspaceId) throw new NotFoundException();
    const acc = await this.prisma.emailAccount.findUnique({ where: { id: thread.accountId } });
    if (!acc || acc.userId !== userId) throw new NotFoundException();
    return thread;
  }

  async syncMessages(accountId: string, messages: Array<{
    threadExternalId: string;
    subject: string;
    externalId: string;
    fromAddress: string;
    toAddresses: string[];
    ccAddresses?: string[];
    bodyText?: string;
    bodyHtml?: string;
    direction: 'IN' | 'OUT';
    receivedAt: Date;
  }>) {
    const acc = await this.prisma.emailAccount.findUnique({ where: { id: accountId } });
    if (!acc) throw new NotFoundException('Account not found');
    const { workspaceId } = acc;

    let synced = 0;
    for (const msg of messages) {
      let thread = await this.prisma.emailThread.findUnique({
        where: { accountId_externalId: { accountId, externalId: msg.threadExternalId } },
      });
      if (!thread) {
        const contactEmail = msg.direction === 'IN' ? msg.fromAddress : msg.toAddresses[0];
        const person = contactEmail
          ? await this.prisma.person.findFirst({ where: { workspaceId, emailNormalized: contactEmail.toLowerCase().trim() } })
          : null;

        thread = await this.prisma.emailThread.create({
          data: {
            workspaceId,
            accountId,
            externalId: msg.threadExternalId,
            subject: msg.subject,
            lastMessageAt: msg.receivedAt,
            personId: person?.id ?? null,
          },
        });
      }

      const existing = await this.prisma.emailMessage.findUnique({
        where: { threadId_externalId: { threadId: thread.id, externalId: msg.externalId } },
      });
      if (existing) continue;

      await this.prisma.emailMessage.create({
        data: {
          workspaceId,
          threadId: thread.id,
          externalId: msg.externalId,
          fromAddress: msg.fromAddress,
          toAddresses: msg.toAddresses,
          ccAddresses: msg.ccAddresses ?? [],
          subject: msg.subject,
          bodyText: msg.bodyText,
          bodyHtml: msg.bodyHtml,
          direction: msg.direction,
          receivedAt: msg.receivedAt,
        },
      });

      if (msg.receivedAt > thread.lastMessageAt) {
        await this.prisma.emailThread.update({
          where: { id: thread.id },
          data: { lastMessageAt: msg.receivedAt },
        });
      }
      synced++;
    }

    await this.prisma.emailAccount.update({
      where: { id: accountId },
      data: { lastSyncAt: new Date(), syncState: 'IDLE' },
    });

    return { synced };
  }

  async threadsForPerson(personId: string) {
    const { workspaceId } = this.ctx();
    return this.prisma.emailThread.findMany({
      where: { workspaceId, personId },
      include: { messages: { orderBy: { receivedAt: 'asc' } } },
      orderBy: { lastMessageAt: 'desc' },
      take: 50,
    });
  }
}
