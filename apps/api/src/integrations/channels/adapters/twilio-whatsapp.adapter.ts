import { Injectable } from '@nestjs/common';
import { TwilioAdapter } from './twilio.adapter';
import type { SendOptions, ParsedMessage } from '../channel-adapter.interface';

const SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class TwilioWhatsAppAdapter extends TwilioAdapter {
  async send(
    config: { credentials: any; phoneNumber: string },
    to: string,
    content: string,
    options?: SendOptions,
  ): Promise<{ externalId: string }> {
    const client = (this as any).getClient(config.credentials);
    const params: any = {
      from: `whatsapp:${config.phoneNumber}`,
      to: `whatsapp:${to}`,
    };

    if (options?.templateName) {
      params.contentSid = options.templateName;
      if (options.templateVariables) {
        params.contentVariables = JSON.stringify(options.templateVariables);
      }
    } else {
      params.body = content;
    }

    if (options?.mediaUrl) {
      params.mediaUrl = [options.mediaUrl];
    }

    const msg = await client.messages.create(params);
    return { externalId: msg.sid };
  }

  parseWebhook(payload: any, headers: any): ParsedMessage {
    const base = super.parseWebhook(payload, headers);
    return {
      ...base,
      from: base.from.replace('whatsapp:', ''),
      to: base.to.replace('whatsapp:', ''),
      metadata: {
        ...base.metadata,
        isWhatsApp: true,
      },
    };
  }

  isWithinSessionWindow(lastInboundTimestamp: string | null): boolean {
    if (!lastInboundTimestamp) return false;
    const elapsed = Date.now() - new Date(lastInboundTimestamp).getTime();
    return elapsed < SESSION_WINDOW_MS;
  }

  fillTemplate(body: string, variables: Record<string, string>): string {
    return body.replace(/\{\{(\d+)\}\}/g, (match, num) => {
      return variables[num] ?? match;
    });
  }
}
