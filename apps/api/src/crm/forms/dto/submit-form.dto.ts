import { IsObject, IsOptional, IsString } from 'class-validator';

export class SubmitFormDto {
  @IsObject() data: Record<string, unknown>;
  @IsOptional() @IsString() _honeypot?: string;
}
