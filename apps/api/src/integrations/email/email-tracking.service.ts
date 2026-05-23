import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EmailTrackingService {
  constructor(private readonly prisma: PrismaService) {}

  injectTrackingPixel(html: string, emailId: string, apiBase: string, doNotTrack = false): string {
    if (doNotTrack) return html;
    if (!html.includes('</body>')) return html;
    const pixel = `<img src="${apiBase}/track/open/${emailId}" width="1" height="1" style="display:none" alt="" />`;
    return html.replace('</body>', `${pixel}</body>`);
  }

  rewriteLinks(html: string, emailId: string, apiBase: string): string {
    return html.replace(/href="(https?:\/\/[^"]+)"/g, (match, url) => {
      if (url.includes('unsubscribe')) return match;
      const trackUrl = `${apiBase}/track/click/${emailId}?url=${encodeURIComponent(url)}`;
      return `href="${trackUrl}"`;
    });
  }

  async recordOpen(emailId: string, ip?: string, userAgent?: string): Promise<void> {
    const email = await this.prisma.outboundEmail.findUnique({ where: { id: emailId } });
    if (!email) return;

    await this.prisma.emailEvent.create({
      data: {
        workspaceId: email.workspaceId,
        outboundEmailId: emailId,
        type: 'OPEN',
        ipAddress: ip,
        userAgent,
      },
    });

    const updateData: Record<string, any> = { openCount: email.openCount + 1 };
    if (!email.openedAt) {
      updateData.openedAt = new Date();
    }

    await this.prisma.outboundEmail.update({
      where: { id: emailId },
      data: updateData,
    });
  }

  async recordClick(emailId: string, url: string, ip?: string, userAgent?: string): Promise<void> {
    const email = await this.prisma.outboundEmail.findUnique({ where: { id: emailId } });
    if (!email) return;

    await this.prisma.emailEvent.create({
      data: {
        workspaceId: email.workspaceId,
        outboundEmailId: emailId,
        type: 'CLICK',
        url,
        ipAddress: ip,
        userAgent,
      },
    });

    await this.prisma.outboundEmail.update({
      where: { id: emailId },
      data: {
        clickCount: email.clickCount + 1,
        lastClickedAt: new Date(),
      },
    });
  }

  async getEvents(outboundEmailId: string) {
    return this.prisma.emailEvent.findMany({
      where: { outboundEmailId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
