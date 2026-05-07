import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';

export interface WebhookDispatchJob {
  webhookId: string;
  workspaceId: string;
  eventName: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class WebhookDispatcher {
  private readonly logger = new Logger(WebhookDispatcher.name);
  private readonly maxAttempts = 3;

  constructor(private readonly prisma: PrismaService) {}

  sign(body: string, secret: string): string {
    return createHmac('sha256', secret).update(body).digest('hex');
  }

  async dispatch(job: WebhookDispatchJob): Promise<void> {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id: job.webhookId },
    });
    if (!webhook || !webhook.enabled) return;

    const delivery = await this.prisma.webhookDelivery.create({
      data: {
        webhookId: job.webhookId,
        workspaceId: job.workspaceId,
        eventName: job.eventName,
        payload: job.payload as any,
        status: 'PENDING',
      },
    });

    const bodyStr = JSON.stringify(job.payload);
    const signature = this.sign(bodyStr, webhook.secret);

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CRM-Signature': signature,
            'X-CRM-Event': job.eventName,
          },
          body: bodyStr,
          signal: AbortSignal.timeout(10_000),
        });

        await this.prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: response.ok ? 'SUCCESS' : 'FAILED',
            statusCode: response.status,
            responseBody: await response.text().catch(() => null),
            attemptCount: attempt,
            deliveredAt: response.ok ? new Date() : null,
          },
        });

        if (response.ok) {
          this.logger.log(`webhook delivered id=${delivery.id} url=${webhook.url}`);
          return;
        }
      } catch (err: any) {
        this.logger.warn(`webhook attempt ${attempt}/${this.maxAttempts} failed: ${err.message}`);
        if (attempt === this.maxAttempts) {
          await this.prisma.webhookDelivery.update({
            where: { id: delivery.id },
            data: {
              status: 'FAILED',
              responseBody: err.message,
              attemptCount: attempt,
            },
          });
        }
      }
    }
  }
}
