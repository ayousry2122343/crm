import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { SubmitFormDto } from './dto/submit-form.dto';

interface FormField {
  key: string;
  type: string;
  required?: boolean;
}

@Injectable()
export class FormSubmissionService {
  private readonly logger = new Logger(FormSubmissionService.name);
  private readonly rateLimitMap = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  private checkRateLimit(ip: string, limit: number): void {
    const now = Date.now();
    const entry = this.rateLimitMap.get(ip);
    if (entry && entry.resetAt > now) {
      if (entry.count >= limit) {
        throw new BadRequestException('Rate limit exceeded. Try again later.');
      }
      entry.count++;
    } else {
      this.rateLimitMap.set(ip, { count: 1, resetAt: now + 3600_000 });
    }
  }

  private validateFields(data: Record<string, unknown>, fields: FormField[]): void {
    for (const field of fields) {
      if (field.required && (data[field.key] === undefined || data[field.key] === '')) {
        throw new BadRequestException(`Field "${field.key}" is required`);
      }
    }
  }

  async submit(
    workspaceId: string,
    formId: string,
    fields: FormField[],
    mappings: Record<string, string>,
    dto: SubmitFormDto,
    ip?: string,
    userAgent?: string,
    rateLimit = 5,
    useHoneypot = true,
  ) {
    if (useHoneypot && dto._honeypot) {
      this.logger.warn(`honeypot triggered from ip=${ip}`);
      return { ok: true };
    }

    if (ip) this.checkRateLimit(ip, rateLimit);
    this.validateFields(dto.data, fields);

    let personId: string | undefined;
    const emailKey = Object.entries(mappings).find(([, v]) => v === 'email')?.[0];
    if (emailKey && dto.data[emailKey]) {
      const email = String(dto.data[emailKey]).toLowerCase().trim();
      const existing = await this.prisma.person.findFirst({
        where: { workspaceId, emailNormalized: email },
      });
      if (existing) {
        personId = existing.id;
      } else {
        const nameKey = Object.entries(mappings).find(([, v]) => v === 'fullName')?.[0];
        const fullName = nameKey ? String(dto.data[nameKey] ?? '') : email;
        const person = await this.prisma.person.create({
          data: {
            workspaceId,
            email,
            emailNormalized: email,
            fullName,
            source: 'FORM',
          },
        });
        personId = person.id;
      }
    }

    const submission = await this.prisma.formSubmission.create({
      data: {
        workspaceId,
        formId,
        data: dto.data as any,
        ipAddress: ip ?? null,
        userAgent: userAgent ?? null,
        personId: personId ?? null,
      },
    });

    this.logger.log(`form submission id=${submission.id} formId=${formId}`);
    return submission;
  }
}
