import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class SLARuleDto {
  @IsString() priority: string;
  @IsNumber() firstResponseMinutes: number;
  @IsNumber() resolutionMinutes: number;
  @IsString() breachAction: string;
}

export class CreateSLAPolicyDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsString() businessHoursId: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsArray() @ValidateNested({ each: true }) @Type(() => SLARuleDto) rules: SLARuleDto[];
}
