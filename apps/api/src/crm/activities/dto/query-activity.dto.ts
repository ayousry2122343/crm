import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

const TYPES = ['CALL', 'MEETING', 'EMAIL', 'TASK', 'NOTE', 'SYSTEM', 'FORM_SUBMISSION'] as const;
const STATUSES = ['OPEN', 'DONE', 'CANCELED'] as const;

export class QueryActivityDto {
  @IsOptional() @IsString() parentEntity?: string;
  @IsOptional() @IsString() parentId?: string;
  @IsOptional() @IsIn(TYPES) type?: string;
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @IsIn(STATUSES) status?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @IsInt() @Min(1) @Max(200) @Type(() => Number) limit?: number;
  @IsOptional() @IsString() sort?: string;
}
