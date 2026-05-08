import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

const STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'] as const;

export class QueryQuoteDto {
  @IsOptional() @IsString() dealId?: string;
  @IsOptional() @IsIn(STATUSES) status?: (typeof STATUSES)[number];
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @IsInt() @Min(1) @Max(200) @Type(() => Number) limit?: number;
  @IsOptional() @IsString() sort?: string;
}
