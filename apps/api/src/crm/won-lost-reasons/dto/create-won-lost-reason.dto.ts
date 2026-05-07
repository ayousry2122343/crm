import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

const KINDS = ['WON', 'LOST'] as const;

export class CreateWonLostReasonDto {
  @IsIn(KINDS) kind: (typeof KINDS)[number];
  @IsString() label: string;
  @IsOptional() @IsInt() @Type(() => Number) order?: number;
}
