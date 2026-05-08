import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateGoalDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional()
  @IsEnum(['REVENUE', 'DEAL_COUNT', 'ACTIVITY_COUNT', 'WON_DEAL_COUNT', 'AVG_DEAL_SIZE', 'CUSTOM'])
  metric?: string;
  @IsOptional() @IsNumber() @Type(() => Number) targetValue?: number;
  @IsOptional() @IsNumber() @Type(() => Number) currentValue?: number;
  @IsOptional() @IsString() period?: string;
  @IsOptional() @Type(() => Date) startDate?: Date;
  @IsOptional() @Type(() => Date) endDate?: Date;
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @IsString() teamId?: string;
}
