import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

const KINDS = ['WON', 'LOST'] as const;

export class QueryWonLostReasonDto {
  @IsOptional() @IsIn(KINDS) kind?: (typeof KINDS)[number];

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  includeArchived?: boolean;
}
