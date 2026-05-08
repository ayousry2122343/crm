import { IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCampaignDto {
  @IsString() name: string;
  @IsString() subject: string;
  @IsString() body: string;
  @IsOptional() @IsString() listId?: string;
  @IsOptional() @Type(() => Date) scheduledAt?: Date;
}
