import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../core/tenant/tenant-context.service';
import { AuditService } from '../core/audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import { parseMentions } from './mention-parser';
import type { CommentEntityType } from '@prisma/client';

export interface CreateCommentDto {
  entityType: string;
  entityId: string;
  body: string;
  parentId?: string;
}

export interface UpdateCommentDto {
  body: string;
}

@Injectable()
export class CommentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly notifications: NotificationService,
    private readonly audit: AuditService,
  ) {}

  private requireWs(): string {
    const ws = this.tenant.getStore()?.workspaceId;
    if (!ws) throw new BadRequestException('no tenant context');
    return ws;
  }

  private currentUser(): string {
    const uid = this.tenant.getStore()?.userId;
    if (!uid) throw new BadRequestException('no tenant context');
    return uid;
  }

  async create(dto: CreateCommentDto) {
    const workspaceId = this.requireWs();
    const authorId = this.currentUser();
    const mentionIds = parseMentions(dto.body);

    const comment = await this.prisma.comment.create({
      data: {
        workspaceId,
        entityType: dto.entityType as CommentEntityType,
        entityId: dto.entityId,
        authorId,
        body: dto.body,
        mentions: mentionIds,
        parentId: dto.parentId,
      },
      include: { author: { select: { id: true, fullName: true, email: true } } },
    });

    await this.prisma.follower.upsert({
      where: {
        workspaceId_userId_entityType_entityId: {
          workspaceId,
          userId: authorId,
          entityType: dto.entityType as CommentEntityType,
          entityId: dto.entityId,
        },
      },
      update: {},
      create: {
        workspaceId,
        userId: authorId,
        entityType: dto.entityType as CommentEntityType,
        entityId: dto.entityId,
      },
    });

    for (const userId of mentionIds) {
      if (userId !== authorId) {
        await this.notifications.create({
          userId,
          type: 'MENTION',
          title: `You were mentioned in a comment`,
          body: dto.body.slice(0, 200),
          link: `/${dto.entityType.toLowerCase()}s/${dto.entityId}`,
        });
      }
    }

    const followers = await this.prisma.follower.findMany({
      where: {
        workspaceId,
        entityType: dto.entityType as CommentEntityType,
        entityId: dto.entityId,
      },
    });

    const mentionSet = new Set(mentionIds);
    for (const f of followers) {
      if (f.userId !== authorId && !mentionSet.has(f.userId)) {
        await this.notifications.create({
          userId: f.userId,
          type: 'SYSTEM',
          title: 'New comment on a record you follow',
          body: dto.body.slice(0, 200),
          link: `/${dto.entityType.toLowerCase()}s/${dto.entityId}`,
        });
      }
    }

    await this.audit.log({
      entityType: 'Comment',
      entityId: comment.id,
      action: 'CREATE',
      newValue: { entityType: dto.entityType, entityId: dto.entityId },
    });

    return comment;
  }

  async list(
    entityType: string,
    entityId: string,
    q: { cursor?: string; limit?: number } = {},
  ) {
    const workspaceId = this.requireWs();
    const limit = Math.min(q.limit ?? 20, 100);

    const items = await this.prisma.comment.findMany({
      where: {
        workspaceId,
        entityType: entityType as CommentEntityType,
        entityId,
        parentId: null,
        archivedAt: null,
      },
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      include: {
        author: { select: { id: true, fullName: true, email: true } },
        replies: {
          where: { archivedAt: null },
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    });

    const hasMore = items.length > limit;
    const trimmed = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? trimmed[trimmed.length - 1]?.id ?? null : null;

    return { items: trimmed, nextCursor };
  }

  async update(id: string, dto: UpdateCommentDto) {
    const workspaceId = this.requireWs();
    const userId = this.currentUser();

    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (
      !comment ||
      comment.workspaceId !== workspaceId ||
      comment.authorId !== userId ||
      comment.archivedAt
    ) {
      throw new NotFoundException();
    }

    const mentionIds = parseMentions(dto.body);

    return this.prisma.comment.update({
      where: { id },
      data: { body: dto.body, mentions: mentionIds },
      include: { author: { select: { id: true, fullName: true, email: true } } },
    });
  }

  async pin(id: string, isPinned: boolean) {
    const workspaceId = this.requireWs();

    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment || comment.workspaceId !== workspaceId || comment.archivedAt) {
      throw new NotFoundException();
    }

    return this.prisma.comment.update({
      where: { id },
      data: { isPinned },
    });
  }

  async archive(id: string) {
    const workspaceId = this.requireWs();
    const userId = this.currentUser();

    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (
      !comment ||
      comment.workspaceId !== workspaceId ||
      comment.authorId !== userId ||
      comment.archivedAt
    ) {
      throw new NotFoundException();
    }

    const archived = await this.prisma.comment.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    await this.audit.log({
      entityType: 'Comment',
      entityId: id,
      action: 'DELETE',
    });

    return archived;
  }

  // ─── Followers ───

  async follow(entityType: string, entityId: string) {
    const workspaceId = this.requireWs();
    const userId = this.currentUser();

    return this.prisma.follower.upsert({
      where: {
        workspaceId_userId_entityType_entityId: {
          workspaceId,
          userId,
          entityType: entityType as CommentEntityType,
          entityId,
        },
      },
      update: {},
      create: {
        workspaceId,
        userId,
        entityType: entityType as CommentEntityType,
        entityId,
      },
    });
  }

  async unfollow(entityType: string, entityId: string) {
    const workspaceId = this.requireWs();
    const userId = this.currentUser();

    return this.prisma.follower.deleteMany({
      where: {
        workspaceId,
        userId,
        entityType: entityType as CommentEntityType,
        entityId,
      },
    });
  }

  async listFollowers(entityType: string, entityId: string) {
    const workspaceId = this.requireWs();

    return this.prisma.follower.findMany({
      where: {
        workspaceId,
        entityType: entityType as CommentEntityType,
        entityId,
      },
      include: { user: { select: { id: true, fullName: true } } },
    });
  }
}
