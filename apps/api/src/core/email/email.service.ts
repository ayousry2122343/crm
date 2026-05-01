import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  vars?: Record<string, string | number>;
  from?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'localhost',
      port: Number(process.env.SMTP_PORT ?? 1025),
      secure: false,
      ignoreTLS: true,
    });
  }

  render(template: string, vars: Record<string, unknown> = {}): string {
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) =>
      vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : ''
    );
  }

  async send(opts: SendEmailOptions) {
    const subject = this.render(opts.subject, opts.vars ?? {});
    const html = opts.html ? this.render(opts.html, opts.vars ?? {}) : undefined;
    const text = opts.text ? this.render(opts.text, opts.vars ?? {}) : undefined;
    const result = await this.transporter.sendMail({
      from: opts.from ?? process.env.SMTP_FROM ?? 'CRM <noreply@crm.local>',
      to: opts.to,
      subject,
      html,
      text,
    });
    this.logger.log(`sent email to=${opts.to} subject="${subject}" messageId=${result.messageId}`);
    return result;
  }

  async verify() {
    return this.transporter.verify();
  }
}
