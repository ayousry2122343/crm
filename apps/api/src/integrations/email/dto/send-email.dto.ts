import { IsEmail, IsObject, IsOptional, IsString } from 'class-validator';

export class SendEmailDto {
  @IsEmail() to: string;
  @IsString() subject: string;
  @IsString() body: string;
  @IsOptional() @IsString() templateId?: string;
  @IsOptional() @IsString() entityType?: string;
  @IsOptional() @IsString() entityId?: string;
  @IsOptional() @IsObject() mergeContext?: Record<string, unknown>;
}
