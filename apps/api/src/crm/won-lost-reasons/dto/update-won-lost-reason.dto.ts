import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateWonLostReasonDto {
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsInt() @Type(() => Number) order?: number;
}
