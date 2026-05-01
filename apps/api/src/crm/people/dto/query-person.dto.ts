import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

const STAGES = ['LEAD', 'MQL', 'SQL', 'OPP', 'CUSTOMER', 'EVANGELIST'] as const;

export class QueryPersonDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isCompany?: boolean;

  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @IsIn(STAGES) lifecycleStage?: (typeof STAGES)[number];
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @IsInt() @Min(1) @Max(200) @Type(() => Number) limit?: number;
  @IsOptional() @IsString() sort?: string;
}
