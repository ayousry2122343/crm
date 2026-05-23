import { Injectable } from '@nestjs/common';
import { Twilio } from 'twilio';
import * as crypto from 'crypto';
import type { IChannelAdapter, ParsedMessage, SendOptions } from '../channel-adapter.interface';

const STATUS_MAP: Record<string, string> = {
  queued: 'QUEUED',
  sent: 'SENT',
  delivered: 'DELIVERED',
  read: 'READ',
  failed: 'FAILED',
  undelivered: 'FAILED',
};

@Injectable()
export class TwilioAdapter implements IChannelAdapter {
  private getClient(credentials: { accountSid: string; authToken: string }): Twilio {
    return new Twilio(credentials.accountSid, credentials.authToken);
  }

  async send(
    config: { credentials: any; phoneNumber: string },
    to: string,
    content: string,
    options?: SendOptions,
  ): Promise<{ externalId: string }> {
    const client = this.getClient(config.credentials);
    const params: any = {
      body: content,
      from: config.phoneNumber,
      to,
    };
    if (options?.mediaUrl) {
      params.mediaUrl = [options.mediaUrl];
    }
    const msg = await client.messages.create(params);
    return { externalId: msg.sid };
  }

  parseWebhook(payload: any, _headers: any): ParsedMessage {
    const numMedia = parseInt(payload.NumMedia ?? '0', 10);
    let contentType = 'TEXT';
    let mediaUrl: string | undefined;

    if (numMedia > 0 && payload.MediaUrl0) {
      mediaUrl = payload.MediaUrl0;
      const mimeType: string = payload.MediaContentType0 ?? '';
      if (mimeType.startsWith('image/')) contentType = 'IMAGE';
      else if (mimeType.startsWith('application/')) contentType = 'DOCUMENT';
    }

    return {
      externalId: payload.MessageSid,
      from: payload.From,
      to: payload.To,
      content: payload.Body ?? '',
      contentType,
      mediaUrl,
      metadata: { numMedia, accountSid: payload.AccountSid },
    };
  }

  validateWebhook(payload: any, headers: any, secret: string): boolean {
    const signature = headers['x-twilio-signature'];
    if (!signature) return false;
    const computed = this.computeSignature(payload, secret);
    return signature === computed;
  }

  private computeSignature(payload: any, authToken: string): string {
    const data = Object.keys(payload)
      .sort()
      .reduce((acc, key) => acc + key + payload[key], '');
    return crypto
      .createHmac('sha1', authToken)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64');
  }

  async getMessageStatus(
    config: { credentials: any },
    externalId: string,
  ): Promise<string> {
    const client = this.getClient(config.credentials);
    const msg = await client.messages(externalId).fetch();
    return STATUS_MAP[msg.status] ?? 'QUEUED';
  }
}
