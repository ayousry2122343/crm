import { IsBoolean, IsIn, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

const ENTITY_TYPES = ['Person', 'Company', 'Deal', 'Activity'] as const;

export class CreateListDto {
  @IsIn(ENTITY_TYPES) entityType!: (typeof ENTITY_TYPES)[number];
  @IsString() @MinLength(1) name!: string;

  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isShared?: boolean;
  @IsObject() query!: Record<string, unknown>;
}
