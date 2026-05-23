export interface SendOptions {
  mediaUrl?: string;
  contentType?: string;
  templateName?: string;
  templateVariables?: Record<string, string>;
}

export interface ParsedMessage {
  externalId: string;
  from: string;
  to: string;
  content: string;
  contentType: string;
  mediaUrl?: string;
  metadata?: Record<string, any>;
}

export interface IChannelAdapter {
  send(
    config: { credentials: any; phoneNumber: string },
    to: string,
    content: string,
    options?: SendOptions,
  ): Promise<{ externalId: string }>;

  parseWebhook(payload: any, headers: any): ParsedMessage;

  validateWebhook(payload: any, headers: any, secret: string): boolean;

  getMessageStatus(
    config: { credentials: any },
    externalId: string,
  ): Promise<string>;
}
