import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../core/email/email.service';

interface NotificationEmailJob {
  notificationId: string;
  userId: string;
  workspaceId: string;
}

@Processor('notifications')
export class NotificationWorker extends WorkerHost {
  private readonly logger = new Logger(NotificationWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {
    super();
  }

  async process(job: Job<NotificationEmailJob>): Promise<void> {
    const { notificationId, userId } = job.data;

    const [notification, user] = await Promise.all([
      this.prisma.notification.findUnique({ where: { id: notificationId } }),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);

    if (!notification || !user) {
      this.logger.warn(`Skipping email: notification or user not found (${notificationId})`);
      return;
    }

    await this.email.send({
      to: user.email,
      subject: notification.title,
      html: `<p>${notification.body ?? notification.title}</p>${
        notification.link ? `<p><a href="${notification.link}">View</a></p>` : ''
      }`,
    });
  }
}
