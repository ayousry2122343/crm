import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateCustomFieldDto {
  @IsOptional() @IsObject() label?: { ar: string; en: string };
  @IsOptional() @IsObject() options?: Record<string, unknown>;
  @IsOptional() @IsBoolean() required?: boolean;
  @IsOptional() @IsBoolean() unique?: boolean;
  @IsOptional() default?: unknown;
  @IsOptional() @IsObject() validation?: Record<string, unknown>;
  @IsOptional() @IsObject() helpText?: { ar?: string; en?: string };
  @IsOptional() visibleToProfileIds?: string[];
  @IsOptional() editableByProfileIds?: string[];
  @IsOptional() @IsString() formulaExpr?: string;
  @IsOptional() @IsObject() rollupConfig?: Record<string, unknown>;
}
