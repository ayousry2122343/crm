import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGoalDto {
  @IsString() name: string;
  @IsEnum(['REVENUE', 'DEAL_COUNT', 'ACTIVITY_COUNT', 'WON_DEAL_COUNT', 'AVG_DEAL_SIZE', 'CUSTOM'])
  metric: string;
  @IsNumber() @Type(() => Number) targetValue: number;
  @IsString() period: string;
  @Type(() => Date) startDate: Date;
  @Type(() => Date) endDate: Date;
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @IsString() teamId?: string;
}
