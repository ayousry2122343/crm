import { IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateWorkspaceDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsObject() branding?: Record<string, unknown>;
  @IsOptional() @IsString() primaryLocale?: string;
  @IsOptional() @IsString() primaryCurrency?: string;
}
