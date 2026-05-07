import { IsArray, IsBoolean, IsInt, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateFormDto {
  @IsString() name: string;
  @IsString() slug: string;
  @IsOptional() @IsBoolean() isPublic?: boolean;
  @IsOptional() @IsString() redirectUrl?: string;
  @IsArray() fields: any[];
  @IsOptional() @IsObject() mappings?: Record<string, unknown>;
  @IsOptional() @IsObject() successMessage?: Record<string, string>;
  @IsOptional() @IsBoolean() useHoneypot?: boolean;
  @IsOptional() @IsInt() rateLimit?: number;
}
