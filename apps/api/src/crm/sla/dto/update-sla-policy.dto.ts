import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SLARuleDto {
  priority: string;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  breachAction: string;
}

export class UpdateSLAPolicyDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() businessHoursId?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SLARuleDto) rules?: SLARuleDto[];
}
