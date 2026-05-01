import { IsBoolean, IsIn, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

const TYPES = [
  'TEXT',
  'LONG_TEXT',
  'NUMBER',
  'DECIMAL',
  'BOOLEAN',
  'DATE',
  'DATETIME',
  'PICKLIST',
  'MULTI_PICKLIST',
  'LOOKUP',
  'URL',
  'EMAIL',
  'PHONE',
  'FILE',
  'FORMULA',
  'ROLLUP',
] as const;

export class CreateCustomFieldDto {
  @IsString() @MinLength(1) entityType!: string;
  @IsString() @MinLength(1) key!: string;
  @IsObject() label!: { ar: string; en: string };
  @IsString() @IsIn(TYPES) type!: (typeof TYPES)[number];
  @IsOptional() @IsObject() options?: Record<string, unknown>;
  @IsOptional() @IsBoolean() required?: boolean;
  @IsOptional() @IsBoolean() unique?: boolean;
  @IsOptional() @IsBoolean() indexed?: boolean;
  @IsOptional() default?: unknown;
  @IsOptional() @IsObject() validation?: Record<string, unknown>;
  @IsOptional() @IsObject() helpText?: { ar?: string; en?: string };
  @IsOptional() visibleToProfileIds?: string[];
  @IsOptional() editableByProfileIds?: string[];
  @IsOptional() @IsString() formulaExpr?: string;
  @IsOptional() @IsObject() rollupConfig?: Record<string, unknown>;
}
