import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateForecastEntryDto {
  @IsOptional() @IsNumber() @Type(() => Number) adjustedAmount?: number;
  @IsOptional() @IsString() note?: string;
}
