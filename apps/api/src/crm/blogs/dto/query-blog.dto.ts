import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

const STATUSES = ['DRAFT', 'PUBLISHED'] as const;

export class QueryBlogDto {
  @IsOptional() @IsIn(STATUSES) status?: (typeof STATUSES)[number];
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @IsInt() @Min(1) @Max(200) @Type(() => Number) limit?: number;
  @IsOptional() @IsString() sort?: string;
}
