import { IsString, IsOptional, IsArray } from 'class-validator';

export class InboundEmailDto {
  @IsString()
  from: string;

  @IsString()
  to: string;

  @IsString()
  subject: string;

  @IsOptional()
  @IsString()
  bodyText?: string;

  @IsOptional()
  @IsString()
  bodyHtml?: string;

  @IsOptional()
  @IsArray()
  cc?: string[];

  @IsOptional()
  @IsString()
  messageId?: string;

  @IsOptional()
  @IsString()
  inReplyTo?: string;
}
