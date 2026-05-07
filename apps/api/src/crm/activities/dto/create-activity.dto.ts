import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

const PARENT_ENTITIES = ['Person', 'Company', 'Deal'] as const;
const TYPES = ['CALL', 'MEETING', 'EMAIL', 'TASK', 'NOTE'] as const;

export class CreateActivityDto {
  @IsIn(PARENT_ENTITIES) parentEntity: string;
  @IsString() parentId: string;
  @IsIn(TYPES) type: string;
  @IsString() subject: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @Type(() => Date) dueAt?: Date;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}
