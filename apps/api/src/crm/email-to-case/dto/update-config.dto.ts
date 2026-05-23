import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';

export class UpdateEmailToCaseConfigDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  defaultQueueId?: string;

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  defaultPriority?: string;

  @IsOptional()
  @IsBoolean()
  autoReply?: boolean;

  @IsOptional()
  @IsString()
  autoReplyTemplateId?: string;
}
