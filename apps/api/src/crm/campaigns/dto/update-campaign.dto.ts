import { IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCampaignDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() listId?: string;
  @IsOptional() @Type(() => Date) scheduledAt?: Date;
}
