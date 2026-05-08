import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../core/tenant/tenant-context.service';
import { NotificationGateway } from './notification.gateway';
import type { NotificationChannel, NotificationType } from '@prisma/client';

export interface CreateNotificationDto {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}

export interface UpsertPreferenceDto {
  channel: string;
  type: string;
  enabled: boolean;
}

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly gateway: NotificationGateway,
    @InjectQueue('notifications') private readonly queue: Queue,
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

  async create(dto: CreateNotificationDto) {
    const workspaceId = this.requireWs();

    const notification = await this.prisma.notification.create({
      data: {
        workspaceId,
        userId: dto.userId,
        type: dto.type as NotificationType,
        title: dto.title,
        body: dto.body,
        link: dto.link,
      },
    });

    const prefs = await this.prisma.notificationPreference.findMany({
      where: { workspaceId, userId: dto.userId },
    });

    const inAppOff = prefs.some(
      (p) =>
        p.channel === 'IN_APP' &&
        p.type === dto.type &&
        p.enabled === false,
    );
    if (!inAppOff) {
      this.gateway.emitToUser(dto.userId, notification);
    }

    const emailOff = prefs.some(
      (p) =>
        p.channel === 'EMAIL' &&
        p.type === dto.type &&
        p.enabled === false,
    );
    if (!emailOff) {
      await this.queue.add('notification-email', {
        notificationId: notification.id,
        userId: dto.userId,
        workspaceId,
      });
    }

    return notification;
  }

  async markRead(id: string) {
    const workspaceId = this.requireWs();
    const userId = this.currentUser();

    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.workspaceId !== workspaceId || notif.userId !== userId) {
      throw new NotFoundException();
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead() {
    const workspaceId = this.requireWs();
    const userId = this.currentUser();

    return this.prisma.notification.updateMany({
      where: { workspaceId, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async list(q: { cursor?: string; limit?: number } = {}) {
    const workspaceId = this.requireWs();
    const userId = this.currentUser();
    const limit = Math.min(q.limit ?? 20, 100);

    const items = await this.prisma.notification.findMany({
      where: { workspaceId, userId },
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
      ...(q.cursor
        ? { cursor: { id: q.cursor }, skip: 1 }
        : {}),
    });

    const hasMore = items.length > limit;
    const trimmed = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? trimmed[trimmed.length - 1]?.id ?? null : null;

    return { items: trimmed, nextCursor };
  }

  async unreadCount(): Promise<number> {
    const workspaceId = this.requireWs();
    const userId = this.currentUser();

    return this.prisma.notification.count({
      where: { workspaceId, userId, isRead: false },
    });
  }

  async getPreferences() {
    const workspaceId = this.requireWs();
    const userId = this.currentUser();

    return this.prisma.notificationPreference.findMany({
      where: { workspaceId, userId },
    });
  }

  async upsertPreference(dto: UpsertPreferenceDto) {
    const workspaceId = this.requireWs();
    const userId = this.currentUser();

    return this.prisma.notificationPreference.upsert({
      where: {
        workspaceId_userId_channel_type: {
          workspaceId,
          userId,
          channel: dto.channel as NotificationChannel,
          type: dto.type as NotificationType,
        },
      },
      update: { enabled: dto.enabled },
      create: {
        workspaceId,
        userId,
        channel: dto.channel as NotificationChannel,
        type: dto.type as NotificationType,
        enabled: dto.enabled,
      },
    });
  }
}
